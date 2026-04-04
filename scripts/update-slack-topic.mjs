import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = resolve(__dirname, '..', 'public', 'data', 'state.json');

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
  console.log('No SLACK_BOT_TOKEN or SLACK_CHANNEL_ID set, skipping topic update.');
  process.exit(0);
}

const STAGES = [
  { name: 'Seed of Origin', threshold: 0, emoji: '\u{1F330}' },        // chestnut (seed)
  { name: 'Awakening Seed', threshold: 1, emoji: '\u{1F331}' },        // seedling
  { name: 'Sprout of Realms', threshold: 3, emoji: '\u{1F33F}' },      // herb
  { name: 'Roots of Wisdom', threshold: 8, emoji: '\u{1F33E}' },       // rice (rooted)
  { name: 'Trunk of Strength', threshold: 18, emoji: '\u{1FAB5}' },    // wood
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
    return '\u{1F480} Yggdralizy is dead \u{1F480} \u2014 waiting for resurrection...';
  }

  const now = new Date();
  const activityTs = state.last_activity_timestamp
    ? new Date(state.last_activity_timestamp).getTime()
    : now.getTime();
  const hoursElapsed = (now.getTime() - activityTs) / HOUR_MS;
  const stageIdx = getStageIndex(hoursElapsed);
  const stage = STAGES[stageIdx];

  const hearts = hpEmojis(state.current_hp, state.max_hp);
  const hpText = `${state.current_hp}/${state.max_hp}`;

  return `${stage.emoji} ${stage.name} ${hearts} ${hpText} HP`;
}

const state = JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
const topic = buildTopic(state);

console.log(`Setting channel topic: ${topic}`);

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
