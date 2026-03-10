import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PENDING_PATH = resolve(__dirname, '..', 'public', 'data', '.slack-pending.json');

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SNAPSHOT_NAME = process.env.OG_SNAPSHOT_NAME; // e.g. "og-1741554000.png"
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

if (!existsSync(PENDING_PATH)) {
  console.log('No pending Slack notification.');
  process.exit(0);
}

if (!SLACK_WEBHOOK_URL) {
  console.log('No SLACK_WEBHOOK_URL set, skipping.');
  unlinkSync(PENDING_PATH);
  process.exit(0);
}

const payload = JSON.parse(readFileSync(PENDING_PATH, 'utf-8'));

// Inject the snapshot image before the context block
if (SNAPSHOT_NAME && GITHUB_REPOSITORY) {
  const [owner] = GITHUB_REPOSITORY.split('/');
  const repo = GITHUB_REPOSITORY.split('/')[1];
  const imageUrl = `https://${owner}.github.io/${repo}/og-snapshots/${SNAPSHOT_NAME}`;

  const blocks = payload.attachments[0].blocks;
  // Insert image block before the last block (context)
  const contextBlock = blocks.pop();
  blocks.push({
    type: 'image',
    image_url: imageUrl,
    alt_text: 'Yggdralizy tree status',
  });
  blocks.push(contextBlock);
}

try {
  const res = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.warn(`Slack notification failed: ${res.status}`);
  else console.log('Slack notification sent');
} catch (err) {
  console.warn('Slack notification error:', err.message);
}

// Clean up pending file
unlinkSync(PENDING_PATH);
