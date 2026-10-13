import { CatalogTitle } from '../models';

export function catalogTitle(overrides: Partial<CatalogTitle> = {}): CatalogTitle {
  return {
    id: 'movie-693134', title: 'Duna: Parte Dois', type: 'Filme', year: 2024, duration: '2h 46min',
    genres: ['Ficção científica', 'Aventura'], synopsis: 'Paul Atreides se une aos Fremen.',
    poster: 'https://image.tmdb.org/t/p/w500/p.jpg', backdrop: 'https://image.tmdb.org/t/p/w1280/b.jpg',
    availability: [], availabilityStatus: 'unavailable', ...overrides
  };
}
