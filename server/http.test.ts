import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import { createServer, Server } from 'node:http';
import { after, before, describe, it } from 'node:test';
import { loadConfig } from './config';
import { createApiHandler } from './http';
import { createCatalogService } from './main';
import { fakeFetch, recordingLogger } from './test-helpers';

async function listen(server: Server): Promise<string> {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

describe('catalog HTTP API (demo mode)', () => {
  const server = createServer();
  let base = '';
  before(async () => {
    const logger = recordingLogger();
    server.on('request', createApiHandler(createCatalogService(loadConfig({}), logger), logger));
    base = await listen(server);
  });
  after(() => new Promise<void>(resolve => server.close(() => resolve())));

  it('reports health and the active source', async () => {
    const res = await fetch(`${base}/api/health`);
    assert.deepEqual(await res.json(), { status: 'ok', source: 'demo' });
  });

  it('returns curated home data', async () => {
    const res = await fetch(`${base}/api/catalog/home`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-catalog-source'), 'demo');
    const body = await res.json() as any;
    assert.equal(body.featured.id, 'duna-parte-dois');
    assert.ok(Array.isArray(body.trending) && Array.isArray(body.comingSoon));
  });

  it('searches and validates query length', async () => {
    const ok = await (await fetch(`${base}/api/catalog/search?q=${encodeURIComponent('Animação')}`)).json() as any;
    assert.deepEqual(ok.results.map((r: { id: string }) => r.id), ['flow']);
    const empty = await (await fetch(`${base}/api/catalog/search`)).json() as any;
    assert.deepEqual(empty.results, []);
    const tooLong = await fetch(`${base}/api/catalog/search?q=${'a'.repeat(101)}`);
    assert.equal(tooLong.status, 400);
    assert.equal((await tooLong.json() as any).error.code, 'bad_request');
  });

  it('looks up titles and returns typed 404s', async () => {
    const found = await fetch(`${base}/api/catalog/titles/flow`);
    assert.equal((await found.json() as any).title.title, 'Flow');
    for (const id of ['nao-existe', 'movie-1', '..%2F..', 'UPPER']) {
      const res = await fetch(`${base}/api/catalog/titles/${id}`);
      assert.equal(res.status, 404, id);
      assert.equal((await res.json() as any).error.code, 'not_found');
    }
  });

  it('rejects other methods and unknown routes', async () => {
    const post = await fetch(`${base}/api/catalog/home`, { method: 'POST' });
    assert.equal(post.status, 405);
    assert.equal(post.headers.get('allow'), 'GET, HEAD');
    assert.equal((await fetch(`${base}/api/nope`)).status, 404);
    assert.equal((await fetch(`${base}/`)).status, 404);
  });
});

describe('catalog HTTP API (TMDB mode)', () => {
  it('returns 502 for TMDB titles when upstream is down, but falls back for search', async () => {
    const logger = recordingLogger();
    const down = fakeFetch({}, []);
    const failing: typeof fetch = async (input, init) => {
      const res = await down(input, init);
      return new Response('unavailable', { status: 503, headers: res.headers });
    };
    const service = createCatalogService(loadConfig({ TMDB_API_KEY: 'k' }), logger, failing);
    const server = createServer(createApiHandler(service, logger));
    const base = await listen(server);
    try {
      const title = await fetch(`${base}/api/catalog/titles/movie-1`);
      assert.equal(title.status, 502);
      assert.equal((await title.json() as any).error.code, 'upstream_unavailable');
      const search = await fetch(`${base}/api/catalog/search?q=duna`);
      assert.equal(search.headers.get('x-catalog-source'), 'demo');
      assert.ok(logger.lines.some(line => line.includes('serving demo fallback')));
      assert.ok(logger.lines.every(line => !line.includes('api_key')));
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});
