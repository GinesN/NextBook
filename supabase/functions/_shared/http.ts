export class RequestInputError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export function allowedCarlinOrigin(origin: string | null) {
  if (!origin) return null;
  if (origin === 'https://ginesn.github.io') return origin;
  try {
    const url = new URL(origin);
    if (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
      && url.origin === origin) return origin;
  } catch { /* Untrusted Origin header. */ }
  return null;
}

export function carlinJson(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Access-Control-Allow-Origin': allowedCarlinOrigin(origin) ?? 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
      'Vary': 'Origin',
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(status === 405 ? { Allow: 'POST, OPTIONS' } : {}),
    },
  });
}

export async function readCarlinRequest(request: Request, timeoutMs = 5000): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new RequestInputError(415, 'Utiliza una solicitud JSON.');
  }
  const limit = 8192;
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > limit) throw new RequestInputError(413, 'Solicitud demasiado grande.');
  const reader = request.body?.getReader();
  if (!reader) throw new RequestInputError(400, 'Faltan las respuestas.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}); }, timeoutMs);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        void reader.cancel().catch(() => {});
        throw new RequestInputError(413, 'Solicitud demasiado grande.');
      }
      chunks.push(value);
    }
  } finally { clearTimeout(timer); reader.releaseLock(); }
  if (timedOut) throw new RequestInputError(408, 'La solicitud ha tardado demasiado.');
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let input: unknown;
  try { input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new RequestInputError(400, 'Las respuestas no tienen un formato válido.'); }
  const record = (value: unknown) => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!record(input) || !record((input as Record<string, unknown>).profile)) {
    throw new RequestInputError(400, 'Faltan las respuestas del cuestionario.');
  }
  return input as Record<string, unknown>;
}
