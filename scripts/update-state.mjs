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

// HP rules
const HP_FAILED_RUN = -10;
const HP_OPEN_ALERT = -5;
const HP_LUMIGO_CRITICAL = -15;
const HP_LUMIGO_WARNING = -10;
const HP_LUMIGO_INFO = -5;
const HP_REGEN_PER_HOUR = 10;
const MAX_HP = 100;
const MAX_LOOKBACK_MS = 24 * 60 * 60 * 1000;

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
      last_update_timestamp: new Date().toISOString(),
      last_update_message: 'Initial state',
      cycles_since_incident: 0,
      metrics: { failed_runs: 0, open_alerts: 0, lumigo_alert: null },
      event_log: [],
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

  // Fetch GitHub metrics in parallel
  const [failedRuns, openAlerts] = await Promise.all([
    getFailedRuns(since),
    getOpenAlerts(),
  ]);

  console.log(`Metrics: failed_runs=${failedRuns}, open_alerts=${openAlerts}`);

  // Check for Lumigo webhook payload
  const lumigoEvent = parseLumigoPayload();
  if (lumigoEvent) {
    console.log(`Lumigo alert: [${lumigoEvent.level}] ${lumigoEvent.name} on ${lumigoEvent.resource} (${lumigoEvent.hpDelta} HP)`);
  }

  // Calculate passive regeneration based on time since last update
  const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
  const regenAmount = Math.floor(hoursSinceUpdate * HP_REGEN_PER_HOUR);

  // Calculate HP delta
  let delta = 0;
  delta += failedRuns * HP_FAILED_RUN;
  delta += openAlerts * HP_OPEN_ALERT;
  if (lumigoEvent) delta += lumigoEvent.hpDelta;

  // Apply regen only if tree is alive and not already at max
  const damageOnly = delta;
  if (state.status !== 'dead' && state.current_hp < MAX_HP && regenAmount > 0) {
    delta += regenAmount;
  }

  console.log(`HP delta: ${delta} (damage=${damageOnly}, regen=+${regenAmount})`);

  // Build update message parts
  const messageParts = [];
  const hpBefore = state.current_hp;

  // Apply HP changes
  if (state.status === 'dead') {
    // Passive regen revives the tree over time
    if (regenAmount > 0) {
      state.current_hp = clamp(regenAmount, 0, MAX_HP);
      state.status = 'healthy';
      state.cycles_since_incident = 0;
      messageParts.push(`RESURRECTION: Tree revived by natural regeneration (+${state.current_hp} HP)`);
      console.log('Tree resurrected via passive regen!');
    } else {
      state.current_hp = 0;
      console.log('Tree still dead.');
    }
  } else {
    const newHp = clamp(state.current_hp + delta, 0, MAX_HP);

    if (failedRuns > 0) messageParts.push(`${failedRuns} failed run(s) (-${failedRuns * Math.abs(HP_FAILED_RUN)} HP)`);
    if (openAlerts > 0) messageParts.push(`${openAlerts} open alert(s) (-${openAlerts * Math.abs(HP_OPEN_ALERT)} HP)`);
    if (lumigoEvent) messageParts.push(`Lumigo [${lumigoEvent.level}]: ${lumigoEvent.name} (-${Math.abs(lumigoEvent.hpDelta)} HP)`);
    if (regenAmount > 0 && state.current_hp < MAX_HP) messageParts.push(`Passive regen (+${Math.min(regenAmount, MAX_HP - state.current_hp)} HP)`);

    if (newHp <= 0) {
      state.current_hp = 0;
      state.status = 'dead';
      state.cycles_since_incident = 0;
      messageParts.push('RAGNAROK: Tree has died!');
      console.log('Tree died!');
    } else {
      state.current_hp = newHp;
      state.status = 'healthy';

      if (failedRuns === 0 && openAlerts === 0 && !lumigoEvent) {
        state.cycles_since_incident = (state.cycles_since_incident ?? 0) + 1;
      } else {
        state.cycles_since_incident = 0;
      }
    }
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
    lumigo_alert: lumigoEvent ? `${lumigoEvent.level}: ${lumigoEvent.name}` : null,
  };

  // Append to event log (keep last 20 entries)
  const eventLog = Array.isArray(state.event_log) ? state.event_log : [];
  if (messageParts.length > 0) {
    eventLog.push({
      timestamp: now.toISOString(),
      message: messageParts.join(' | '),
      hp_before: hpBefore,
      hp_after: state.current_hp,
    });
  }
  state.event_log = eventLog.slice(-20);

  saveState(state);
  console.log(`State updated: HP=${state.current_hp}/${state.max_hp}, status=${state.status}, cycles=${state.cycles_since_incident}`);
}

main().catch((err) => {
  console.error('State update failed:', err);
  process.exit(1);
});
