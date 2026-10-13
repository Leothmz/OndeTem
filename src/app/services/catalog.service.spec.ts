import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogService } from './catalog.service';
import { CatalogTitle } from '../models';
import { catalogTitle } from '../testing/catalog-fixtures';

describe('CatalogService', () => {
  let service: CatalogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CatalogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('searches through the backend API with an encoded query', () => {
    let results: CatalogTitle[] | undefined;
    service.search('  ficção científica ').subscribe(value => results = value);
    const req = http.expectOne(r => r.url === '/api/catalog/search');
    expect(req.request.params.get('q')).toBe('ficção científica');
    req.flush({ source: 'tmdb', query: 'ficção científica', results: [catalogTitle()] });
    expect(results?.map(r => r.id)).toEqual(['movie-693134']);
    expect(service.source()).toBe('tmdb');
  });

  it('does not call the API for blank queries', () => {
    let results: CatalogTitle[] | undefined;
    service.search('   ').subscribe(value => results = value);
    http.expectNone('/api/catalog/search');
    expect(results).toEqual([]);
  });

  it('loads curated home rails and records the source', () => {
    service.home().subscribe(home => {
      expect(home.featured?.id).toBe('duna-parte-dois');
      expect(home.trending.length).toBe(1);
    });
    http.expectOne('/api/catalog/home').flush({
      source: 'demo', featured: catalogTitle({ id: 'duna-parte-dois', availabilityStatus: 'demo' }),
      trending: [catalogTitle({ id: 'duna-parte-dois' })], comingSoon: []
    });
    expect(service.source()).toBe('demo');
  });

  it('maps a 404 title lookup to null and propagates other errors', () => {
    let notFound: CatalogTitle | null | undefined;
    service.getById('tv-1').subscribe(value => notFound = value);
    http.expectOne('/api/catalog/titles/tv-1').flush({ error: { code: 'not_found', message: 'x' } }, { status: 404, statusText: 'Not Found' });
    expect(notFound).toBeNull();

    let failed = false;
    service.getById('movie-1').subscribe({ error: () => failed = true });
    http.expectOne('/api/catalog/titles/movie-1').flush({ error: { code: 'upstream_unavailable', message: 'x' } }, { status: 502, statusText: 'Bad Gateway' });
    expect(failed).toBeTrue();
  });
});
