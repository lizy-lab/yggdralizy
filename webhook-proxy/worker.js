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
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate Lumigo payload structure
    if (!payload.event || !payload.data) {
      return Response.json({ error: 'Invalid payload: missing event or data' }, { status: 400 });
    }

    // Forward to GitHub as repository_dispatch
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'yggdralizy-webhook-proxy',
      },
      body: JSON.stringify({
        event_type: 'update-state',
        client_payload: {
          source: 'lumigo',
          lumigo: payload,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return Response.json({ error: 'GitHub API error', status: res.status, body }, { status: 502 });
    }

    return Response.json({ ok: true, message: 'Dispatch triggered' });
  },
};
