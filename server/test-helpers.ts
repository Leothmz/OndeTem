import type { Logger } from './catalog-provider';

export interface RecordingLogger extends Logger { lines: string[]; }

export function recordingLogger(): RecordingLogger {
  const lines: string[] = [];
  return { lines, info: m => lines.push(`info ${m}`), warn: m => lines.push(`warn ${m}`), error: m => lines.push(`error ${m}`) };
}

export interface FakeCall { url: URL; headers: Record<string, string>; }

/** `fetch` falso que responde por caminho TMDB (sem `/3`) e registra as chamadas. */
export function fakeFetch(routes: Record<string, unknown | ((url: URL) => unknown)>, calls: FakeCall[] = []): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const path = url.pathname.replace(/^\/3/, '');
    const route = routes[path];
    if (route === undefined) return new Response(JSON.stringify({ status_message: 'not found' }), { status: 404 });
    const body = typeof route === 'function' ? (route as (url: URL) => unknown)(url) : route;
    if (body instanceof Response) return body;
    if (body instanceof Error) throw body;
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}
