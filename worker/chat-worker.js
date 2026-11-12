// Cloudflare Worker: AI चैट के लिए सुरक्षित प्रॉक्सी (Groq, free tier)।
// API key Cloudflare में Secret के रूप में GROQ_API_KEY है।
// Bindings: KV namespace "LIMITS" (variable name) → chat-limits
const ALLOWED_ORIGIN = 'https://avyentra.github.io';
const MODEL = 'openai/gpt-oss-20b';
const DAILY_LIMIT = 5;

const LIMIT_MSG = {
  en: 'Today’s free questions are over. Please try again tomorrow. Your reading and numbers are still visible in the tabs.',
  hi: 'आज के मुफ़्त सवाल खत्म हो गए हैं। कल फिर कोशिश करें। आपके राशिफल और अंक टैब में अभी भी दिख रहे हैं।',
  pa: 'ਅੱਜ ਦੇ ਮੁਫ਼ਤ ਸਵਾਲ ਖ਼ਤਮ ਹੋ ਗਏ ਹਨ। ਕੱਲ੍ਹ ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ। ਤੁਹਾਡਾ ਰਾਸ਼ੀਫਲ ਅਤੇ ਅੰਕ ਟੈਬਾਂ ਵਿੱਚ ਅਜੇ ਵੀ ਦਿਖ ਰਹੇ ਹਨ।',
};

const json = (obj, cors, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });
    if (origin !== ALLOWED_ORIGIN) return new Response('Forbidden', { status: 403, headers: cors });

    let body;
    try { body = await request.json(); }
    catch { return new Response('Bad JSON', { status: 400, headers: cors }); }

    const question = String(body.question || '').slice(0, 800);
    const ctx = body.context || {};
    const lang = ['en', 'hi', 'pa'].includes(ctx.language) ? ctx.language : 'en';
    if (!question) return json({ answer: '' }, cors);

    // रोज़ की सीमा (KV)
    const day = new Date().toISOString().slice(0, 10);
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const key = `${day}:${ip}`;
    const used = Number(await env.LIMITS.get(key)) || 0;
    if (used >= DAILY_LIMIT) return json({ answer: LIMIT_MSG[lang], limited: true }, cors);
    await env.LIMITS.put(key, String(used + 1), { expirationTtl: 60 * 60 * 26 });

    const langName = { en: 'English', hi: 'Hindi (देवनागरी)', pa: 'Punjabi (Gurmukhi)' }[lang];
    const system =
      `You are a friendly Vedic astrology assistant. Reply in ${langName}, in simple short language. ` +
      'Present astrology as entertainment and cultural guidance. Do not make certain predictions. ' +
      'For health, legal or financial decisions, always suggest consulting a qualified expert.';

    const userMsg =
      `User details: rashi ${ctx.rashi || '-'}, mulank ${ctx.mulank ?? '-'}, bhagyank ${ctx.bhagyank ?? '-'}.\n\n` +
      `Question: ${question}`;

    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        reasoning_effort: 'low',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
      }),
    });

    if (!upstream.ok) return new Response('upstream error', { status: 502, headers: cors });
    const data = await upstream.json();
    const answer = data.choices?.[0]?.message?.content || '';
    return json({ answer }, cors);
  },
};
