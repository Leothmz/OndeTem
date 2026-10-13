import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FakeCall, fakeFetch } from './test-helpers';
import { TmdbCatalogProvider, TmdbError, genreQuery } from './tmdb-provider';

const base = { language: 'pt-BR', region: 'BR', timeoutMs: 1000 };

describe('TmdbCatalogProvider', () => {
  it('sends the v3 key as a query param and language on every request', async () => {
    const calls: FakeCall[] = [];
    const provider = new TmdbCatalogProvider({ ...base, apiKey: 'k3y', fetch: fakeFetch({ '/search/multi': { results: [] } }, calls) });
    await provider.search('duna');
    assert.equal(calls[0].url.searchParams.get('api_key'), 'k3y');
    assert.equal(calls[0].url.searchParams.get('language'), 'pt-BR');
    assert.equal(calls[0].url.searchParams.get('query'), 'duna');
    assert.equal(calls[0].headers['authorization'], undefined);
  });

  it('prefers the v4 read access token as a Bearer header', async () => {
    const calls: FakeCall[] = [];
    const provider = new TmdbCatalogProvider({ ...base, apiKey: 'k3y', readAccessToken: 'tok', fetch: fakeFetch({ '/search/multi': { results: [] } }, calls) });
    await provider.search('duna');
    assert.equal(calls[0].headers['authorization'], 'Bearer tok');
    assert.equal(calls[0].url.searchParams.has('api_key'), false);
  });

  it('refuses to start without credentials', () => {
    assert.throws(() => new TmdbCatalogProvider({ ...base }), /credentials/);
  });

  it('searches titles via /search/multi and drops people', async () => {
    const provider = new TmdbCatalogProvider({ ...base, apiKey: 'k', fetch: fakeFetch({
      '/search/multi': { results: [
        { id: 1, media_type: 'movie', title: 'Duna', release_date: '2021-09-15' },
        { id: 2, media_type: 'person', name: 'Denis Villeneuve' },
        { id: 3, media_type: 'tv', name: 'Duna: A Profecia', first_air_date: '2024-11-17' }
      ] }
    }) });
    const results = await provider.search('  duna ');
    assert.deepEqual(results.map(r => r.id), ['movie-1', 'tv-3']);
  });

  it('maps genre searches (home chips) to /discover for movies and series', async () => {
    const calls: FakeCall[] = [];
    const provider = new TmdbCatalogProvider({ ...base, apiKey: 'k', fetch: fakeFetch({
      '/discover/movie': { results: [{ id: 10, title: 'Interestelar' }, { id: 11, title: 'Matrix' }] },
      '/discover/tv': { results: [{ id: 20, name: 'Ruptura' }] }
    }, calls) });
    const results = await provider.search('Ficção científica');
    assert.deepEqual(results.map(r => r.id), ['movie-10', 'tv-20', 'movie-11']);
    assert.equal(calls.find(c => c.url.pathname.endsWith('/discover/movie'))?.url.searchParams.get('with_genres'), '878');
    assert.equal(calls.find(c => c.url.pathname.endsWith('/discover/tv'))?.url.searchParams.get('with_genres'), '10765');
  });

  it('recognizes genre names accent-insensitively', () => {
    assert.deepEqual(genreQuery('animacao'), { movie: 16, tv: 16 });
    assert.deepEqual(genreQuery('Terror'), { movie: 27 });
    assert.deepEqual(genreQuery('Fantasia'), { movie: 14, tv: 10765 });
    assert.equal(genreQuery('Duna'), null);
  });

  it('builds home rails from trending and upcoming (future releases only)', async () => {
    const provider = new TmdbCatalogProvider({ ...base, apiKey: 'k', fetch: fakeFetch({
      '/trending/all/week': { results: [
        { id: 1, media_type: 'movie', title: 'Sem fundo', backdrop_path: null },
        { id: 2, media_type: 'tv', name: 'Com fundo', backdrop_path: '/b.jpg' },
        { id: 3, media_type: 'person', name: 'Alguém' }
      ] },
      '/movie/upcoming': (url: URL) => {
        assert.equal(url.searchParams.get('region'), 'BR');
        return { results: [{ id: 7, title: 'Futuro', release_date: '2999-01-01' }, { id: 8, title: 'Passado', release_date: '2000-01-01' }] };
      }
    }) });
    const home = await provider.home();
    assert.deepEqual(home.trending.map(t => t.id), ['movie-1', 'tv-2']);
    assert.ok(home.trending.every(t => t.trending));
    assert.equal(home.featured?.id, 'tv-2');
    assert.equal(home.featured?.featured, true);
    assert.deepEqual(home.comingSoon.map(t => [t.id, t.comingSoon]), [['movie-7', true]]);
  });

  it('loads title details with credits and returns null for TMDB 404 or non-TMDB ids', async () => {
    const calls: FakeCall[] = [];
    const provider = new TmdbCatalogProvider({ ...base, apiKey: 'k', fetch: fakeFetch({
      '/tv/1396': { id: 1396, name: 'Breaking Bad', number_of_seasons: 5, credits: { cast: [{ name: 'Bryan Cranston', order: 0 }] } }
      ,'/tv/1396/watch/providers': { results: { BR: { flatrate: [{ provider_id: 8, provider_name: 'Netflix' }] } } }
    }, calls) });
    const title = await provider.title('tv-1396');
    assert.equal(title?.title, 'Breaking Bad');
    assert.equal(title?.duration, '5 temporadas');
    assert.deepEqual(title?.cast, ['Bryan Cranston']);
    assert.deepEqual(title?.availability.map(item => [item.service, item.access]), [['Netflix', 'subscription']]);
    assert.equal(title?.availabilityStatus, 'tmdb');
    assert.equal(calls[0].url.searchParams.get('append_to_response'), 'credits');
    assert.equal(await provider.title('movie-404'), null);
    assert.equal(await provider.title('duna-parte-dois'), null);
  });

  it('raises TmdbError without leaking the key on upstream failures', async () => {
    const provider = new TmdbCatalogProvider({ ...base, apiKey: 'sup3r-secret', fetch: fakeFetch({
      '/search/multi': new Response('boom', { status: 503 }),
      '/trending/all/week': new TypeError('fetch failed')
    }) });
    await assert.rejects(provider.search('duna'), (error: unknown) =>
      error instanceof TmdbError && error.status === 503 && !error.message.includes('sup3r-secret'));
    await assert.rejects(provider.home(), (error: unknown) =>
      error instanceof TmdbError && /network error/.test(error.message) && !error.message.includes('sup3r-secret'));
  });
});
