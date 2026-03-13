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

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const PAGES_URL = `https://${OWNER}.github.io/${REPO}/`;

const STAGES = [
  { name: 'Seed of Origin', threshold: 0 },
  { name: 'Awakening Seed', threshold: 1 },
  { name: 'Sprout of Realms', threshold: 3 },
  { name: 'Roots of Wisdom', threshold: 8 },
  { name: 'Trunk of Strength', threshold: 18 },
  { name: 'Branches of Fate', threshold: 36 },
  { name: 'Guardian of Worlds', threshold: 72 },
  { name: 'Yggdrasil Ascendant', threshold: 144 },
];
const HOUR_MS = 60 * 60 * 1000;

function getStageIndex(hoursSinceActivity) {
  let idx = STAGES.findIndex(s => hoursSinceActivity < s.threshold) - 1;
  if (idx === -2) idx = STAGES.length - 1;
  if (idx < 0) idx = 0;
  return idx;
}

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
    if (payload.source !== 'lumigo') return null;

    const lumigo = payload.lumigo;
    if (!lumigo) {
      console.warn('Lumigo payload present but missing lumigo key. Full payload:', JSON.stringify(payload).substring(0, 500));
      return null;
    }

    // Try multiple payload structures:
    // Structure 1: { message: "{\"lumigoProject\":..., \"issue\":..., \"resource\":...}" } (stringified JSON)
    // Structure 2: { data: { issue: {...}, resource: {...} } }
    // Structure 3: { issue: {...}, resource: {...} } (flat)
    let issue, resource, lumigoProject;

    if (typeof lumigo.message === 'string') {
      // Real Lumigo webhook: alert data is stringified JSON inside lumigo.message
      try {
        const parsed = JSON.parse(lumigo.message);
        issue = parsed.issue;
        resource = parsed.resource;
        lumigoProject = parsed.lumigoProject;
      } catch (e) {
        console.warn('Failed to parse lumigo.message as JSON:', e.message);
      }
    }

    if (!issue && lumigo.data?.issue) {
      issue = lumigo.data.issue;
      resource = lumigo.data.resource;
      lumigoProject = lumigo.data.lumigoProject;
    }

    if (!issue && lumigo.issue) {
      issue = lumigo.issue;
      resource = lumigo.resource;
      lumigoProject = lumigo.lumigoProject;
    }

    if (!issue) {
      console.warn('Lumigo payload has no recognizable issue structure:', JSON.stringify(lumigo).substring(0, 500));
      return {
        level: 'info',
        name: lumigo.event || 'Unknown Lumigo event',
        resource: 'unknown',
        hpDelta: HP_LUMIGO_INFO,
        url: null,
      };
    }

    const level = (issue.level || issue.type || '').toLowerCase();
    const name = issue.name || issue.message || 'Unknown issue';
    const resourceName = resource?.name || 'unknown resource';

    // Use direct URL from issue if available, otherwise build from project + issue IDs
    const url = issue.url
      || (lumigoProject?.id && issue.id
        ? `https://platform.lumigo.io/project/${lumigoProject.id}/issues/${issue.id}`
        : null);

    let hpDelta;
    switch (level) {
      case 'critical': case 'error': hpDelta = HP_LUMIGO_CRITICAL; break;
      case 'warning':  hpDelta = HP_LUMIGO_WARNING; break;
      default:         hpDelta = HP_LUMIGO_INFO; break;
    }

    return { level, name, resource: resourceName, hpDelta, url };
  } catch (err) {
    console.warn('Failed to parse Lumigo payload:', err.message);
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

function hpBar(hp, max) {
  const filled = Math.round((hp / max) * 10);
  return '`' + '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled) + '`';
}

function treeEmoji(hp, max, isDead) {
  if (isDead) return ':skull:';
  const pct = (hp / max) * 100;
  if (pct > 80) return ':deciduous_tree:';
  if (pct > 40) return ':fallen_leaf:';
  return ':seedling:';
}

async function notifySlack(state, hpBefore, messageParts, isDeath, isResurrection, isLevelUp, isGrowthRestart) {
  if (!SLACK_WEBHOOK_URL) return;

  // Only notify on significant events
  const isFirstDamage = hpBefore === MAX_HP && state.current_hp < MAX_HP;
  if (!isDeath && !isResurrection && !isFirstDamage && !isLevelUp && !isGrowthRestart) return;

  const emoji = treeEmoji(state.current_hp, state.max_hp, state.status === 'dead');

  let color = '#22c55e'; // green
  if (state.status === 'dead') color = '#000000';
  else if (state.current_hp / state.max_hp <= 0.2) color = '#6b7280';
  else if (state.current_hp / state.max_hp <= 0.8) color = '#eab308';

  // Build the Slack payload without image (image URL injected later after OG generation)
  const blocks = {
    attachments: [{
      color,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} ${hpBar(state.current_hp, state.max_hp)} ${state.current_hp}/${state.max_hp} HP\n${messageParts.join('\n')}`,
          },
        },
        {
          type: 'context',
          elements: [{
            type: 'mrkdwn',
            text: `<${PAGES_URL}|View live tree>`,
          }],
        },
      ],
    }],
  };

  // Write pending Slack payload to file (send-slack.mjs will inject image and send)
  const pendingPath = resolve(__dirname, '..', 'public', 'data', '.slack-pending.json');
  writeFileSync(pendingPath, JSON.stringify(blocks, null, 2), 'utf-8');
  console.log('Slack notification saved to pending file (will be sent after OG image generation)');
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
      messageParts.push('RAGNAROK: Tree has died!');
      console.log('Tree died!');
    } else {
      state.current_hp = newHp;
      state.status = 'healthy';
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
    const entry = {
      timestamp: now.toISOString(),
      message: messageParts.join(' | '),
      hp_before: hpBefore,
      hp_after: state.current_hp,
    };
    if (lumigoEvent?.url) entry.url = lumigoEvent.url;
    eventLog.push(entry);
  }
  state.event_log = eventLog.slice(-20);

  // Detect significant events
  const isDeath = state.status === 'dead' && hpBefore > 0;
  const isResurrection = state.status === 'healthy' && hpBefore === 0 && state.current_hp > 0;

  // Detect level up BEFORE resetting activity timestamp
  const activityTs = state.last_activity_timestamp ? new Date(state.last_activity_timestamp).getTime() : now.getTime();
  const hoursBefore = Math.max(0, Math.floor((lastUpdate.getTime() - activityTs) / HOUR_MS));
  const hoursNow = Math.max(0, Math.floor((now.getTime() - activityTs) / HOUR_MS));
  const stageBefore = getStageIndex(hoursBefore);
  const stageNow = getStageIndex(hoursNow);
  const isLevelUp = stageNow > stageBefore;
  if (isLevelUp) {
    messageParts.push(`LEVEL UP: ${STAGES[stageNow].name} (Level ${stageNow + 1})`);
  }

  // Reset last_activity_timestamp when damage occurs (tree growth restarts)
  const hasDamage = damageOnly < 0;
  const isGrowthRestart = hasDamage && stageNow > 0;
  if (hasDamage) {
    state.last_activity_timestamp = now.toISOString();
    if (isGrowthRestart) {
      messageParts.push(`Growth reset: tree returns to ${STAGES[0].name} (was ${STAGES[stageNow].name})`);
    }
  }

  saveState(state);
  console.log(`State updated: HP=${state.current_hp}/${state.max_hp}, status=${state.status}`);

  // Notify Slack on significant events
  await notifySlack(state, hpBefore, messageParts, isDeath, isResurrection, isLevelUp, isGrowthRestart);
}

main().catch((err) => {
  console.error('State update failed:', err);
  process.exit(1);
});
