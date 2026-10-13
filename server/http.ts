import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ApiErrorCode, ApiErrorResponse } from '../shared/catalog-contract';
import type { Logger } from './catalog-provider';
import { CatalogService, UpstreamUnavailableError } from './catalog-service';

export const MAX_QUERY_LENGTH = 100;
const TITLE_ID = /^[a-z0-9][a-z0-9-]{0,79}$/;

class HttpError extends Error {
  constructor(readonly status: number, readonly code: ApiErrorCode, message: string) { super(message); }
}

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': status === 200 ? 'public, max-age=60' : 'no-store',
    'x-content-type-options': 'nosniff',
    ...headers
  });
  res.end(JSON.stringify(body));
}

async function route(service: CatalogService, method: string, url: URL): Promise<{ body: unknown; source?: string }> {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (!path.startsWith('/api/')) throw new HttpError(404, 'not_found', 'Rota não encontrada.');
  if (method !== 'GET' && method !== 'HEAD') throw new HttpError(405, 'method_not_allowed', 'Use GET.');

  if (path === '/api/health') return { body: { status: 'ok', source: service.primarySource } };

  if (path === '/api/catalog/home') {
    const body = await service.home();
    return { body, source: body.source };
  }

  if (path === '/api/catalog/search') {
    const query = url.searchParams.get('q') ?? '';
    if (query.length > MAX_QUERY_LENGTH) throw new HttpError(400, 'bad_request', `A busca aceita até ${MAX_QUERY_LENGTH} caracteres.`);
    const body = await service.search(query);
    return { body, source: body.source };
  }

  const titleMatch = /^\/api\/catalog\/titles\/([^/]+)$/.exec(path);
  if (titleMatch) {
    let id: string;
    try { id = decodeURIComponent(titleMatch[1]); } catch { id = ''; }
    const body = TITLE_ID.test(id) ? await service.title(id) : null;
    if (!body) throw new HttpError(404, 'not_found', 'Título não encontrado.');
    return { body, source: body.source };
  }

  throw new HttpError(404, 'not_found', 'Rota não encontrada.');
}

/** Handler HTTP da API de catálogo (somente leitura, JSON). */
export function createApiHandler(service: CatalogService, logger: Logger) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const started = Date.now();
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', 'http://localhost');
    let status = 200;
    let source: string | undefined;
    try {
      const result = await route(service, method, url);
      source = result.source;
      send(res, 200, method === 'HEAD' ? undefined : result.body, source ? { 'x-catalog-source': source } : {});
    } catch (error) {
      let httpError: HttpError;
      if (error instanceof HttpError) httpError = error;
      else if (error instanceof UpstreamUnavailableError) httpError = new HttpError(502, 'upstream_unavailable', error.message);
      else {
        logger.error(`unexpected error on ${method} ${url.pathname}: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
        httpError = new HttpError(500, 'internal_error', 'Erro interno.');
      }
      status = httpError.status;
      const body: ApiErrorResponse = { error: { code: httpError.code, message: httpError.message } };
      send(res, status, body, status === 405 ? { allow: 'GET, HEAD' } : {});
    }
    logger.info(`${method} ${url.pathname}${url.search} ${status}${source ? ` source=${source}` : ''} ${Date.now() - started}ms`);
  };
}
