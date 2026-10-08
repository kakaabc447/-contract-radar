const WEEX = 'https://api-contract.weex.com';

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '*';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: cors(origin) });

    const u = new URL(request.url);
    if (u.pathname === '/') return new Response('WEEX Contract Radar proxy OK', { headers: cors(origin) });
    if (!u.pathname.startsWith('/weex/')) return new Response('Not Found', { status: 404, headers: cors(origin) });

    const allowed = [
      '/capi/v3/market/exchangeInfo',
      '/capi/v3/market/klines',
      '/capi/v3/market/symbolPrice',
      '/capi/v3/market/ticker/24hr',
      '/capi/v3/market/premiumIndex',
    ];
    const targetPath = u.pathname.slice('/weex'.length);
    if (!allowed.includes(targetPath)) return new Response('Endpoint not allowed', { status: 403, headers: cors(origin) });

    const target = new URL(WEEX + targetPath);
    for (const [k, v] of u.searchParams) target.searchParams.set(k, v);

    try {
      const r = await fetch(target.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'User-Agent': 'Contract-Radar/1.0' },
        cf: { cacheTtl: 0, cacheEverything: false },
      });
      const body = await r.arrayBuffer();
      const headers = new Headers(r.headers);
      for (const [k, v] of Object.entries(cors(origin))) headers.set(k, v);
      headers.set('Cache-Control', 'no-store');
      return new Response(body, { status: r.status, headers });
    } catch (e) {
      return new Response(JSON.stringify({ code: -1, msg: String(e) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...cors(origin) },
      });
    }
  }
};
