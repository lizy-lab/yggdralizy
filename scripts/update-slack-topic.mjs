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
  : 'https://example.com';

const BOOKMARK_TITLE_PREFIX = 'YggdraLizy';

if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
  console.log('No SLACK_BOT_TOKEN or SLACK_CHANNEL_ID set, skipping.');
  process.exit(0);
}

const STAGES = [
  { name: 'Seed of Origin', threshold: 0, emoji: '\u{1F330}' },        // 🌰
  { name: 'Awakening Seed', threshold: 1, emoji: '\u{1F331}' },        // 🌱
  { name: 'Sprout of Realms', threshold: 3, emoji: '\u{1F33F}' },      // 🌿
  { name: 'Roots of Wisdom', threshold: 8, emoji: '\u{1F33E}' },       // 🌾
  { name: 'Trunk of Strength', threshold: 18, emoji: '\u{1F333}' },    // 🌳
  { name: 'Branches of Fate', threshold: 36, emoji: '\u{1F333}' },     // 🌳
  { name: 'Guardian of Worlds', threshold: 72, emoji: '\u{1F333}' },   // 🌳
  { name: 'Yggdrasil Ascendant', threshold: 144, emoji: '\u{1F333}' }, // 🌳
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

function buildTitle(state) {
  if (state.status === 'dead') {
    return `\u{1F480} ${BOOKMARK_TITLE_PREFIX} is dead`;
  }

  const now = new Date();
  const activityTs = state.last_activity_timestamp
    ? new Date(state.last_activity_timestamp).getTime()
    : now.getTime();
  const hoursElapsed = (now.getTime() - activityTs) / HOUR_MS;
  const stageIdx = getStageIndex(hoursElapsed);
  const stage = STAGES[stageIdx];

  const pct = (state.current_hp / state.max_hp) * 100;
  const isTree = stageIdx >= 4;
  let emoji = stage.emoji;
  if (isTree && pct <= 50) emoji = '\u{1FABE}';       // 🪾 leafless tree
  else if (isTree && pct <= 80) emoji = '\u{1F342}';   // 🍂 fallen leaf

  const hearts = hpEmojis(state.current_hp, state.max_hp);

  return `${emoji} ${stage.name} ${hearts} ${state.current_hp}/${state.max_hp} HP`;
}

async function slackApi(method, body) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function slackGet(method, params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`https://slack.com/api/${method}?${qs}`, {
    headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
  });
  return res.json();
}

const state = JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
const title = buildTitle(state);

console.log(`Bookmark title: ${title}`);

// Find existing YggdraLizy bookmark
const listData = await slackGet('bookmarks.list', { channel_id: SLACK_CHANNEL_ID });
if (!listData.ok) {
  console.warn(`bookmarks.list failed: ${listData.error}`);
  console.warn('Make sure the bot has bookmarks:read and bookmarks:write scopes.');
  process.exit(1);
}

const existing = listData.bookmarks?.find(b => b.title?.startsWith(BOOKMARK_TITLE_PREFIX));

if (existing) {
  // Update existing bookmark (silent, no channel notification)
  if (existing.title === title && existing.link === PAGES_URL) {
    console.log('Bookmark unchanged, skipping');
    process.exit(0);
  }
  const editData = await slackApi('bookmarks.edit', {
    channel_id: SLACK_CHANNEL_ID,
    bookmark_id: existing.id,
    title,
    link: PAGES_URL,
  });
  if (!editData.ok) {
    console.warn(`bookmarks.edit failed: ${editData.error}`);
  } else {
    console.log('Bookmark updated successfully');
  }
} else {
  // Create new bookmark
  const addData = await slackApi('bookmarks.add', {
    channel_id: SLACK_CHANNEL_ID,
    title,
    type: 'link',
    link: PAGES_URL,
  });
  if (!addData.ok) {
    console.warn(`bookmarks.add failed: ${addData.error}`);
  } else {
    console.log('Bookmark created successfully');
  }
}
