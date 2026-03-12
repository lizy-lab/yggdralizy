/**
 * Cloudflare Worker - Lumigo webhook → GitHub repository_dispatch proxy
 *
 * Environment variables (set via wrangler secret):
 *   GITHUB_TOKEN  - Fine-grained PAT with contents:write on lizy-lab/yggdralizy
 *   WEBHOOK_SECRET - (optional) shared secret to validate incoming requests
 */

const GITHUB_REPO = 'lizy-lab/yggdralizy';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Optional: validate shared secret via query param or header
    if (env.WEBHOOK_SECRET) {
      const url = new URL(request.url);
      const secret = url.searchParams.get('secret') || request.headers.get('x-webhook-secret');
      if (secret !== env.WEBHOOK_SECRET) {
        console.log('Rejected: invalid secret');
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    let payload;
    let rawBody;
    try {
      rawBody = await request.text();
      payload = JSON.parse(rawBody);
    } catch {
      console.log('Rejected: invalid JSON', rawBody?.substring(0, 500));
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Log incoming payload for debugging
    console.log('Received webhook:', JSON.stringify(payload).substring(0, 1000));

    // Accept any valid JSON payload — don't reject based on structure
    // Lumigo payloads may vary in format
    if (typeof payload !== 'object' || payload === null) {
      console.log('Rejected: payload is not an object');
      return Response.json({ error: 'Invalid payload: expected JSON object' }, { status: 400 });
    }

    // Forward to GitHub as repository_dispatch
    // Wrap the entire payload under client_payload.source + client_payload.lumigo
    const dispatchBody = {
      event_type: 'update-state',
      client_payload: {
        source: 'lumigo',
        lumigo: payload,
      },
    };

    console.log('Dispatching to GitHub:', JSON.stringify(dispatchBody).substring(0, 500));

    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'yggdralizy-webhook-proxy',
      },
      body: JSON.stringify(dispatchBody),
    });

    if (!res.ok) {
      const body = await res.text();
      console.log('GitHub API error:', res.status, body);
      return Response.json({ error: 'GitHub API error', status: res.status, body }, { status: 502 });
    }

    console.log('Dispatch successful');
    return Response.json({ ok: true, message: 'Dispatch triggered' });
  },
};
