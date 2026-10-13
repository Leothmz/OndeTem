import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CatalogTitle } from '../shared/catalog-contract';
import type { CatalogProvider, HomeCatalog } from './catalog-provider';
import { CatalogService, UpstreamUnavailableError } from './catalog-service';
import { DemoCatalogProvider } from './demo-catalog';
import { recordingLogger } from './test-helpers';
import { TtlCache } from './ttl-cache';

const tmdbTitle: CatalogTitle = {
  id: 'movie-1', title: 'Real', type: 'Filme', year: 2024, duration: '', genres: [], synopsis: '',
  poster: '', backdrop: '', availability: [], availabilityStatus: 'unavailable'
};

class FakeTmdb implements CatalogProvider {
  readonly source = 'tmdb' as const;
  calls = 0;
  fail = false;
  private check() { this.calls++; if (this.fail) throw new Error('TMDB /x: HTTP 503'); }
  async home(): Promise<HomeCatalog> { this.check(); return { featured: tmdbTitle, trending: [tmdbTitle], comingSoon: [] }; }
  async search(): Promise<CatalogTitle[]> { this.check(); return [tmdbTitle]; }
  async title(id: string): Promise<CatalogTitle | null> { this.check(); return id === tmdbTitle.id ? tmdbTitle : null; }
}

function setup(withTmdb = true, now = () => 0) {
  const tmdb = new FakeTmdb();
  const logger = recordingLogger();
  const service = new CatalogService({
    demo: new DemoCatalogProvider(), tmdb: withTmdb ? tmdb : undefined, logger,
    cache: new TtlCache({ ttlMs: 1000, maxEntries: 10, now })
  });
  return { tmdb, logger, service };
}

describe('CatalogService', () => {
  it('serves the demo catalog when TMDB is not configured', async () => {
    const { service } = setup(false);
    assert.equal(service.primarySource, 'demo');
    const home = await service.home();
    assert.equal(home.source, 'demo');
    assert.equal(home.featured?.id, 'duna-parte-dois');
    assert.ok(home.trending.length > 0 && home.comingSoon.length > 0);
    const search = await service.search('DUNA');
    assert.deepEqual(search.results.map(r => r.id), ['duna-parte-dois']);
    assert.ok(search.results.every(r => r.availabilityStatus === 'demo'));
    assert.equal(await service.title('movie-1'), null);
  });

  it('uses TMDB when configured and caches responses within the TTL', async () => {
    let clock = 0;
    const { service, tmdb } = setup(true, () => clock);
    assert.equal((await service.search('Real')).source, 'tmdb');
    await service.search(' real ');
    assert.equal(tmdb.calls, 1, 'second identical search is cached');
    clock = 1001;
    await service.search('real');
    assert.equal(tmdb.calls, 2, 'expired entries are refreshed');
  });

  it('falls back to demo data for home and search when TMDB fails', async () => {
    const { service, tmdb, logger } = setup();
    tmdb.fail = true;
    const home = await service.home();
    assert.equal(home.source, 'demo');
    const search = await service.search('duna');
    assert.equal(search.source, 'demo');
    assert.equal(search.results[0]?.id, 'duna-parte-dois');
    assert.ok(logger.lines.some(line => line.startsWith('warn TMDB unavailable for search')));
  });

  it('serves stale cached TMDB data when a refresh fails', async () => {
    let clock = 0;
    const { service, tmdb, logger } = setup(true, () => clock);
    await service.home();
    clock = 5000;
    tmdb.fail = true;
    const home = await service.home();
    assert.equal(home.source, 'tmdb');
    assert.ok(logger.lines.some(line => line.includes('serving stale cache')));
  });

  it('resolves demo slugs locally and TMDB ids upstream', async () => {
    const { service } = setup();
    assert.equal((await service.title('flow'))?.source, 'demo');
    assert.equal((await service.title('movie-1'))?.title.title, 'Real');
    assert.equal(await service.title('movie-2'), null);
    assert.equal(await service.title('nao-existe'), null);
  });

  it('reports upstream failures for TMDB titles instead of faking data', async () => {
    const { service, tmdb } = setup();
    tmdb.fail = true;
    await assert.rejects(service.title('movie-1'), UpstreamUnavailableError);
  });

  it('does not hit any source for empty queries', async () => {
    const { service, tmdb } = setup();
    assert.deepEqual((await service.search('   ')).results, []);
    assert.equal(tmdb.calls, 0);
  });
});

describe('TtlCache', () => {
  it('dedupes concurrent loads and evicts the oldest entries', async () => {
    const cache = new TtlCache({ ttlMs: 1000, maxEntries: 2, now: () => 0 });
    let loads = 0;
    const load = async () => ++loads;
    const [a, b] = await Promise.all([cache.getOrLoad('a', load), cache.getOrLoad('a', load)]);
    assert.equal(a, 1);
    assert.equal(b, 1);
    await cache.getOrLoad('b', load);
    await cache.getOrLoad('c', load);
    assert.equal(cache.size, 2);
    assert.equal(await cache.getOrLoad('a', load), 4, 'evicted key is reloaded');
  });

  it('does not cache when the TTL is zero', async () => {
    const cache = new TtlCache({ ttlMs: 0, maxEntries: 10 });
    let loads = 0;
    await cache.getOrLoad('a', async () => ++loads);
    await cache.getOrLoad('a', async () => ++loads);
    assert.equal(loads, 2);
  });

  it('propagates errors when there is nothing cached', async () => {
    const cache = new TtlCache({ ttlMs: 1000, maxEntries: 10 });
    await assert.rejects(cache.getOrLoad('a', async () => { throw new Error('down'); }), /down/);
  });
});
