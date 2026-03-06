import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = resolve(__dirname, '..', 'public', 'data', 'state.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
  console.error('Missing GITHUB_TOKEN or GITHUB_REPOSITORY environment variables');
  process.exit(1);
}

const [OWNER, REPO] = GITHUB_REPOSITORY.split('/');
const API_BASE = 'https://api.github.com';
const HEADERS = {
  'Authorization': `Bearer ${GITHUB_TOKEN}`,
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

const FIX_PATTERN = /\b(fix|hotfix|patch|resolve|closes?|closed|bug)\b/i;
const BOT_COMMIT_TAG = '[state-update]';

// HP rules
const HP_FAILED_RUN = -10;
const HP_OPEN_ALERT = -5;
const HP_FIX_COMMIT = 15;
const HP_LUMIGO_CRITICAL = -15;
const HP_LUMIGO_WARNING = -10;
const HP_LUMIGO_INFO = -5;
const MAX_HP = 100;
const RESURRECTION_HP = 15;
const MAX_LOOKBACK_MS = 24 * 60 * 60 * 1000; // 24 hours

function parseLumigoPayload() {
  const raw = process.env.DISPATCH_PAYLOAD;
  if (!raw || raw === 'null' || raw === '{}') return null;

  try {
    const payload = JSON.parse(raw);
    if (payload.source !== 'lumigo' || !payload.lumigo) return null;

    const { event, data } = payload.lumigo;
    if (event !== 'alert' || !data?.issue) return null;

    const level = (data.issue.level || '').toLowerCase();
    const name = data.issue.name || 'Unknown issue';
    const resource = data.resource?.name || 'unknown resource';

    let hpDelta;
    switch (level) {
      case 'critical': hpDelta = HP_LUMIGO_CRITICAL; break;
      case 'warning':  hpDelta = HP_LUMIGO_WARNING; break;
      default:         hpDelta = HP_LUMIGO_INFO; break;
    }

    return { level, name, resource, hpDelta };
  } catch {
    return null;
  }
}

async function githubFetch(path) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    if (res.status === 404) return null;
    console.warn(`GitHub API ${res.status} for ${path}: ${res.statusText}`);
    return null;
  }
  return res.json();
}

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    return {
      current_hp: MAX_HP,
      max_hp: MAX_HP,
      status: 'healthy',
      last_activity_timestamp: new Date().toISOString(),
      last_update_timestamp: new Date().toISOString(),
      last_update_message: 'Initial state',
      cycles_since_incident: 0,
      metrics: { failed_runs: 0, open_alerts: 0, fix_commits: 0, lumigo_alert: null },
    };
  }
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf-8');
}

async function getFailedRuns(since) {
  const sinceStr = since.toISOString().replace(/\.\d+Z$/, 'Z');
  const data = await githubFetch(
    `/repos/${OWNER}/${REPO}/actions/runs?status=failure&created=%3E%3D${sinceStr}&per_page=100`
  );
  return data?.total_count ?? 0;
}

async function getOpenAlerts() {
  const data = await githubFetch(
    `/repos/${OWNER}/${REPO}/code-scanning/alerts?state=open&per_page=100`
  );
  if (!data) return 0;
  return Array.isArray(data) ? data.length : 0;
}

async function getFixCommits(since) {
  const sinceStr = since.toISOString();
  const data = await githubFetch(
    `/repos/${OWNER}/${REPO}/commits?since=${sinceStr}&per_page=100`
  );
  if (!data || !Array.isArray(data)) return { fixCount: 0, totalCount: 0 };

  const nonBotCommits = data.filter(
    (c) => !c.commit?.message?.includes(BOT_COMMIT_TAG)
  );
  const fixCommits = nonBotCommits.filter((c) =>
    FIX_PATTERN.test(c.commit?.message ?? '')
  );

  return { fixCount: fixCommits.length, totalCount: nonBotCommits.length };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function main() {
  const state = loadState();
  const now = new Date();

  // Determine lookback window (capped at 24h)
  const lastUpdate = state.last_update_timestamp
    ? new Date(state.last_update_timestamp)
    : new Date(now.getTime() - MAX_LOOKBACK_MS);
  const since = new Date(
    Math.max(lastUpdate.getTime(), now.getTime() - MAX_LOOKBACK_MS)
  );

  console.log(`Fetching metrics since ${since.toISOString()}...`);

  // Fetch all metrics in parallel
  const [failedRuns, openAlerts, { fixCount, totalCount }] = await Promise.all([
    getFailedRuns(since),
    getOpenAlerts(),
    getFixCommits(since),
  ]);

  console.log(`Metrics: failed_runs=${failedRuns}, open_alerts=${openAlerts}, fix_commits=${fixCount}, total_commits=${totalCount}`);

  // Check for Lumigo webhook payload
  const lumigoEvent = parseLumigoPayload();
  if (lumigoEvent) {
    console.log(`Lumigo alert: [${lumigoEvent.level}] ${lumigoEvent.name} on ${lumigoEvent.resource} (${lumigoEvent.hpDelta} HP)`);
  }

  // Calculate HP delta
  let delta = 0;
  delta += failedRuns * HP_FAILED_RUN;
  delta += openAlerts * HP_OPEN_ALERT;
  delta += fixCount * HP_FIX_COMMIT;
  if (lumigoEvent) delta += lumigoEvent.hpDelta;

  console.log(`HP delta: ${delta}`);

  // Build update message parts
  const messageParts = [];

  // Apply HP changes
  if (state.status === 'dead') {
    if (fixCount > 0) {
      // Resurrection
      state.current_hp = RESURRECTION_HP;
      state.status = 'healthy';
      state.cycles_since_incident = 0;
      messageParts.push(`RESURRECTION: Tree revived by fix commit (+${RESURRECTION_HP} HP)`);
      console.log('Tree resurrected!');
    } else {
      state.current_hp = 0;
      messageParts.push('Tree remains dead. Push a fix commit to resurrect.');
      console.log('Tree still dead, no fix commits found.');
    }
  } else {
    const newHp = clamp(state.current_hp + delta, 0, MAX_HP);

    if (failedRuns > 0) messageParts.push(`${failedRuns} failed run(s) (${failedRuns * Math.abs(HP_FAILED_RUN)} HP lost)`);
    if (openAlerts > 0) messageParts.push(`${openAlerts} open alert(s) (${openAlerts * Math.abs(HP_OPEN_ALERT)} HP lost)`);
    if (fixCount > 0) messageParts.push(`${fixCount} fix commit(s) (+${fixCount * HP_FIX_COMMIT} HP)`);
    if (lumigoEvent) messageParts.push(`Lumigo [${lumigoEvent.level}]: ${lumigoEvent.name} (${Math.abs(lumigoEvent.hpDelta)} HP lost)`);
    if (newHp <= 0) {
      state.current_hp = 0;
      state.status = 'dead';
      state.cycles_since_incident = 0;
      messageParts.push('RAGNAROK: Tree has died!');
      console.log('Tree died!');
    } else {
      state.current_hp = newHp;
      state.status = 'healthy';

      // Update cycles: increment if no problems, else reset
      if (failedRuns === 0 && openAlerts === 0) {
        state.cycles_since_incident = (state.cycles_since_incident ?? 0) + 1;
      } else {
        state.cycles_since_incident = 0;
      }
    }
  }

  // Update activity timestamp if there was any activity
  if (totalCount > 0) {
    state.last_activity_timestamp = now.toISOString();
  }

  // Update metadata
  state.max_hp = MAX_HP;
  state.last_update_timestamp = now.toISOString();
  state.last_update_message = messageParts.length > 0
    ? messageParts.join(' | ')
    : 'No changes detected';
  state.metrics = {
    failed_runs: failedRuns,
    open_alerts: openAlerts,
    fix_commits: fixCount,
    lumigo_alert: lumigoEvent ? `${lumigoEvent.level}: ${lumigoEvent.name}` : null,
  };

  saveState(state);
  console.log(`State updated: HP=${state.current_hp}/${state.max_hp}, status=${state.status}, cycles=${state.cycles_since_incident}`);
}

main().catch((err) => {
  console.error('State update failed:', err);
  process.exit(1);
});
