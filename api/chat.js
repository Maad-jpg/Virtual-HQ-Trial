// Virtual HQ AI proxy.
// Sits between the page and Anthropic so the API key never reaches a browser.
// The model and response size are fixed HERE, and only the fields the Assistant
// actually uses are passed through, so a caller cannot pick a bigger model,
// ask for a longer answer, or send anything else along with the key.

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;
const MAX_MESSAGES = 40;
const MAX_CHARS = 200000; // total across the system prompt and every message (about 50,000 tokens)

function refuse(res, status, message) {
  return res.status(status).json({ error: { message: message } });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return refuse(res, 405, 'Method not allowed');

  // Only this site's own pages may call this. A browser always sends Origin on a POST
  // from a page, so a page on any other site is refused. Direct (non-browser) calls
  // are not stopped by this check; that takes the login check in the security phase.
  const origin = req.headers.origin;
  if (origin) {
    let originHost = '';
    try { originHost = new URL(origin).host; } catch (e) { return refuse(res, 403, 'Not allowed'); }
    const ownHosts = [req.headers.host, req.headers['x-forwarded-host']].filter(Boolean);
    if (!ownHosts.includes(originHost)) return refuse(res, 403, 'Not allowed');
  }

  const body = req.body;
  if (!body || typeof body !== 'object') return refuse(res, 400, 'Invalid request');

  const { system, messages } = body;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return refuse(res, 400, 'Invalid messages');
  }
  if (system !== undefined && typeof system !== 'string') return refuse(res, 400, 'Invalid system prompt');

  let total = (system || '').length;
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      return refuse(res, 400, 'Invalid message');
    }
    total += m.content.length;
  }
  if (total > MAX_CHARS) return refuse(res, 413, 'Request too large');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      // Nothing from the caller is forwarded except the system prompt and the messages.
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return refuse(res, 500, 'Internal server error');
  }
}
