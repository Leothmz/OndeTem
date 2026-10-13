import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatRuntime, formatTvLength, imageUrl, normalizeTmdbList, normalizeTmdbTitle, parseCatalogId, yearFrom
} from './tmdb-normalize';

describe('TMDB normalization', () => {
  it('normalizes movie details into CatalogTitle without inventing availability', () => {
    const title = normalizeTmdbTitle({
      id: 693134, title: 'Duna: Parte Dois', original_title: 'Dune: Part Two', release_date: '2024-02-27',
      overview: '  Paul Atreides se une a Chani.  ', poster_path: '/poster.jpg', backdrop_path: '/backdrop.jpg',
      runtime: 166, genres: [{ id: 878, name: 'Science Fiction' }, { id: 12, name: 'Aventura' }],
      credits: { cast: [{ name: 'Zendaya', order: 1 }, { name: 'Timothée Chalamet', order: 0 }] }
    }, 'movie');
    assert.deepEqual(title, {
      id: 'movie-693134', title: 'Duna: Parte Dois', type: 'Filme', year: 2024, duration: '2h 46min',
      genres: ['Ficção científica', 'Aventura'], synopsis: 'Paul Atreides se une a Chani.',
      poster: 'https://image.tmdb.org/t/p/w500/poster.jpg', backdrop: 'https://image.tmdb.org/t/p/w1280/backdrop.jpg',
      cast: ['Timothée Chalamet', 'Zendaya'], availability: [], availabilityStatus: 'unavailable'
    });
  });

  it('normalizes TV list items using media_type, genre ids and first_air_date', () => {
    const title = normalizeTmdbTitle({
      id: 136315, media_type: 'tv', name: 'O Urso', first_air_date: '2022-06-23', genre_ids: [18, 35, 10765, 99999],
      poster_path: null, backdrop_path: '/b.jpg'
    });
    assert.equal(title?.id, 'tv-136315');
    assert.equal(title?.type, 'Série');
    assert.equal(title?.year, 2022);
    assert.deepEqual(title?.genres, ['Drama', 'Comédia', 'Ficção científica e fantasia']);
    assert.equal(title?.poster, '');
    assert.equal(title?.duration, '');
    assert.equal(title?.synopsis, '');
    assert.equal(title?.cast, undefined);
  });

  it('uses season/episode counts for TV details', () => {
    assert.equal(normalizeTmdbTitle({ id: 1, name: 'X', number_of_seasons: 3 }, 'tv')?.duration, '3 temporadas');
    assert.equal(formatTvLength(1, 8), '1 temporada');
    assert.equal(formatTvLength(null, 7), '7 episódios');
    assert.equal(formatTvLength(0, 1), '1 episódio');
  });

  it('drops people, unknown media types and nameless items, and dedupes', () => {
    const titles = normalizeTmdbList([
      { id: 1, media_type: 'person', name: 'Zendaya' },
      { id: 2, media_type: 'collection', name: 'Coleção' },
      { id: 3, media_type: 'movie' },
      { id: 4, media_type: 'movie', title: 'Rivais' },
      { id: 4, media_type: 'movie', title: 'Rivais' },
      { id: 4, media_type: 'tv', name: 'Rivais (série)' }
    ]);
    assert.deepEqual(titles.map(t => t.id), ['movie-4', 'tv-4']);
  });

  it('falls back to original names and requires a media type', () => {
    assert.equal(normalizeTmdbTitle({ id: 9, original_title: 'Flow' }, 'movie')?.title, 'Flow');
    assert.equal(normalizeTmdbTitle({ id: 9, title: 'Sem tipo' }), null);
  });

  it('formats runtimes, years and image URLs defensively', () => {
    assert.equal(formatRuntime(166), '2h 46min');
    assert.equal(formatRuntime(120), '2h');
    assert.equal(formatRuntime(45), '45min');
    assert.equal(formatRuntime(0), '');
    assert.equal(formatRuntime(null), '');
    assert.equal(yearFrom('2025-11-01'), 2025);
    assert.equal(yearFrom(''), null);
    assert.equal(yearFrom(undefined), null);
    assert.equal(imageUrl(null, 'w500'), '');
    assert.equal(imageUrl('/a.jpg', 'w1280'), 'https://image.tmdb.org/t/p/w1280/a.jpg');
  });

  it('parses only well-formed prefixed TMDB ids', () => {
    assert.deepEqual(parseCatalogId('movie-693134'), { mediaType: 'movie', tmdbId: 693134 });
    assert.deepEqual(parseCatalogId('tv-1'), { mediaType: 'tv', tmdbId: 1 });
    assert.equal(parseCatalogId('duna-parte-dois'), null);
    assert.equal(parseCatalogId('movie-0'), null);
    assert.equal(parseCatalogId('person-12'), null);
  });
});
