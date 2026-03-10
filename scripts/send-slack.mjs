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

// Note: We don't embed the OG image in Slack notifications because GitHub Pages
// deploys asynchronously — the snapshot URL won't be available when the message is sent.
// The OG image is used for link unfurling when someone shares the live tree URL instead.

try {
  const res = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn(`Slack notification failed: ${res.status} - ${body}`);
  } else {
    console.log('Slack notification sent');
  }
} catch (err) {
  console.warn('Slack notification error:', err.message);
}

// Clean up pending file
unlinkSync(PENDING_PATH);
