import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = resolve(__dirname, '..', 'public', 'data', 'state.json');

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const PAGES_URL = GITHUB_REPOSITORY
  ? `https://${GITHUB_REPOSITORY.split('/')[0]}.github.io/${GITHUB_REPOSITORY.split('/')[1]}/`
  : null;

if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
  console.log('No SLACK_BOT_TOKEN or SLACK_CHANNEL_ID set, skipping topic update.');
  process.exit(0);
}

const STAGES = [
  { name: 'Seed of Origin', threshold: 0, emoji: '\u{1F330}' },        // chestnut (seed)
  { name: 'Awakening Seed', threshold: 1, emoji: '\u{1F331}' },        // seedling
  { name: 'Sprout of Realms', threshold: 3, emoji: '\u{1F33F}' },      // herb
  { name: 'Roots of Wisdom', threshold: 8, emoji: '\u{1F33E}' },       // rice (rooted)
  { name: 'Trunk of Strength', threshold: 18, emoji: '\u{1F333}' },    // deciduous tree
  { name: 'Branches of Fate', threshold: 36, emoji: '\u{1F333}' },     // deciduous tree
  { name: 'Guardian of Worlds', threshold: 72, emoji: '\u{1F333}' },   // deciduous tree
  { name: 'Yggdrasil Ascendant', threshold: 144, emoji: '\u{1F333}' }, // deciduous tree
];
const HOUR_MS = 60 * 60 * 1000;

function getStageIndex(hoursSinceActivity) {
  let idx = STAGES.findIndex(s => hoursSinceActivity < s.threshold) - 1;
  if (idx === -2) idx = STAGES.length - 1;
  if (idx < 0) idx = 0;
  return idx;
}

function hpEmojis(hp, max) {
  const pct = hp / max;
  const totalHearts = 5;
  const full = Math.round(pct * totalHearts);
  return '\u2764\uFE0F'.repeat(full) + '\u{1F5A4}'.repeat(totalHearts - full);
}

function buildTopic(state) {
  const isDead = state.status === 'dead';

  if (isDead) {
    const dead = '\u{1F480} Yggdralizy is dead \u{1F480}';
    return PAGES_URL ? `${dead} | ${PAGES_URL}` : dead;
  }

  const now = new Date();
  const activityTs = state.last_activity_timestamp
    ? new Date(state.last_activity_timestamp).getTime()
    : now.getTime();
  const hoursElapsed = (now.getTime() - activityTs) / HOUR_MS;
  const stageIdx = getStageIndex(hoursElapsed);
  const stage = STAGES[stageIdx];

  const pct = (state.current_hp / state.max_hp) * 100;
  const isTree = stageIdx >= 4; // Trunk of Strength onward (🌳)
  let emoji = stage.emoji;
  if (isTree && pct <= 50) emoji = '\u{1FABE}';       // 🪾 leafless tree (critical)
  else if (isTree && pct <= 80) emoji = '\u{1F342}';   // 🍂 fallen leaf (hurt)

  const hearts = hpEmojis(state.current_hp, state.max_hp);

  const parts = [`${emoji} ${stage.name} ${hearts}`];
  if (PAGES_URL) parts.push(PAGES_URL);
  return parts.join(' | ');
}

const state = JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
const topic = buildTopic(state);

console.log(`Setting channel topic: ${topic}`);

// Ensure bot is in the channel (requires channels:join scope)
try {
  const joinRes = await fetch('https://slack.com/api/conversations.join', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel: SLACK_CHANNEL_ID }),
  });
  const joinData = await joinRes.json();
  if (!joinData.ok && joinData.error !== 'already_in_channel') {
    console.warn(`Slack channel join failed: ${joinData.error}`);
  }
} catch (err) {
  console.warn('Slack channel join error:', err.message);
}

// Slack returns emojis as shortcodes (:heart:) and URLs wrapped in <>.
// Strip those so we can compare the meaningful text content.
function normalize(s) {
  return s
    .replace(/<(https?:\/\/[^>|]+)(?:\|[^>]*)?>/g, '$1') // <url> or <url|label> → url
    .replace(/:[a-z0-9_+-]+:/g, '')                        // strip :emoji_shortcodes:
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '') // strip unicode emojis
    .replace(/\s+/g, ' ')
    .trim();
}

// Fetch current topic to avoid unnecessary updates (which post a notification)
try {
  const infoRes = await fetch(`https://slack.com/api/conversations.info?channel=${SLACK_CHANNEL_ID}`, {
    headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
  });
  const infoData = await infoRes.json();
  if (!infoData.ok) {
    console.warn(`conversations.info failed: ${infoData.error}`);
  } else {
    const currentTopic = infoData.channel?.topic?.value ?? '';
    const currentNorm = normalize(currentTopic);
    const newNorm = normalize(topic);
    console.log(`Current (normalized): ${currentNorm}`);
    console.log(`New     (normalized): ${newNorm}`);
    if (currentNorm === newNorm) {
      console.log('Topic unchanged, skipping update');
      process.exit(0);
    }
  }
} catch (err) {
  console.warn('Could not check current topic, proceeding with update:', err.message);
}

try {
  const res = await fetch('https://slack.com/api/conversations.setTopic', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL_ID,
      topic,
    }),
  });
  const data = await res.json();
  if (!data.ok) {
    console.warn(`Slack topic update failed: ${data.error}`);
  } else {
    console.log('Channel topic updated successfully');
  }
} catch (err) {
  console.warn('Slack topic update error:', err.message);
}
