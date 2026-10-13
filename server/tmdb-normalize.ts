import type { CatalogTitle, TitleType } from '../shared/catalog-contract';

// Normalização pura de respostas TMDB (API v3) para o contrato `CatalogTitle`.
// Disponibilidade de streaming NÃO vem do TMDB aqui: fica vazia com status `unavailable`
// até um provedor dedicado ser integrado.

export type TmdbMediaType = 'movie' | 'tv';

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

/** Campos que usamos de itens de lista (`/search/multi`, `/trending`, `/discover`, `/movie/upcoming`) e de detalhes. */
export interface TmdbTitle {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  runtime?: number | null;
  number_of_seasons?: number | null;
  number_of_episodes?: number | null;
  credits?: { cast?: { name: string; order?: number }[] };
}

export interface TmdbPage<T = TmdbTitle> { page?: number; results?: T[]; total_results?: number; }

// Nomes em pt-BR dos gêneros TMDB (estáveis; evitam uma chamada extra a /genre/*/list).
export const TMDB_GENRES: Record<TmdbMediaType, Record<number, string>> = {
  movie: {
    28: 'Ação', 12: 'Aventura', 16: 'Animação', 35: 'Comédia', 80: 'Crime', 99: 'Documentário', 18: 'Drama',
    10751: 'Família', 14: 'Fantasia', 36: 'História', 27: 'Terror', 10402: 'Música', 9648: 'Mistério',
    10749: 'Romance', 878: 'Ficção científica', 10770: 'Cinema TV', 53: 'Thriller', 10752: 'Guerra', 37: 'Faroeste'
  },
  tv: {
    10759: 'Ação e aventura', 16: 'Animação', 35: 'Comédia', 80: 'Crime', 99: 'Documentário', 18: 'Drama',
    10751: 'Família', 10762: 'Infantil', 9648: 'Mistério', 10763: 'Notícias', 10764: 'Reality',
    10765: 'Ficção científica e fantasia', 10766: 'Novela', 10767: 'Talk show', 10768: 'Guerra e política', 37: 'Faroeste'
  }
};

const CAST_LIMIT = 5;

export function toCatalogId(mediaType: TmdbMediaType, tmdbId: number): string {
  return `${mediaType}-${tmdbId}`;
}

export function parseCatalogId(id: string): { mediaType: TmdbMediaType; tmdbId: number } | null {
  const match = /^(movie|tv)-([1-9]\d{0,9})$/.exec(id);
  return match ? { mediaType: match[1] as TmdbMediaType, tmdbId: Number(match[2]) } : null;
}

export function imageUrl(path: string | null | undefined, size: 'w500' | 'w1280'): string {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path.startsWith('/') ? '' : '/'}${path}` : '';
}

export function yearFrom(date: string | undefined): number | null {
  const year = date ? Number(date.slice(0, 4)) : NaN;
  return Number.isInteger(year) && year > 1800 ? year : null;
}

export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}min`;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

export function formatTvLength(seasons: number | null | undefined, episodes: number | null | undefined): string {
  if (seasons && seasons > 0) return `${seasons} ${seasons === 1 ? 'temporada' : 'temporadas'}`;
  if (episodes && episodes > 0) return `${episodes} ${episodes === 1 ? 'episódio' : 'episódios'}`;
  return '';
}

function genreNames(raw: TmdbTitle, mediaType: TmdbMediaType): string[] {
  const table = TMDB_GENRES[mediaType];
  const fromDetails = raw.genres?.map(genre => table[genre.id] ?? genre.name);
  const names = fromDetails ?? (raw.genre_ids ?? []).map(id => table[id]).filter((name): name is string => !!name);
  return [...new Set(names.filter(Boolean))];
}

/**
 * Resolve o tipo de mídia de um item TMDB. Itens de `/search/multi` e `/trending/all` trazem `media_type`;
 * endpoints específicos (`/discover/movie`, detalhes) não, então o chamador informa `fallback`.
 */
export function mediaTypeOf(raw: TmdbTitle, fallback?: TmdbMediaType): TmdbMediaType | null {
  if (raw.media_type === 'movie' || raw.media_type === 'tv') return raw.media_type;
  if (raw.media_type) return null; // `person` e outros tipos não são títulos
  return fallback ?? null;
}

/** Normaliza um item TMDB (lista ou detalhes). Retorna `null` para pessoas, ids inválidos ou itens sem nome. */
export function normalizeTmdbTitle(raw: TmdbTitle, fallbackType?: TmdbMediaType): CatalogTitle | null {
  const mediaType = mediaTypeOf(raw, fallbackType);
  if (!mediaType || !Number.isInteger(raw.id) || raw.id <= 0) return null;
  const isMovie = mediaType === 'movie';
  const title = (isMovie ? raw.title ?? raw.original_title : raw.name ?? raw.original_name)?.trim();
  if (!title) return null;
  const type: TitleType = isMovie ? 'Filme' : 'Série';
  const cast = [...(raw.credits?.cast ?? [])]
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    .slice(0, CAST_LIMIT)
    .map(member => member.name)
    .filter(Boolean);
  const normalized: CatalogTitle = {
    id: toCatalogId(mediaType, raw.id),
    title,
    type,
    year: yearFrom(isMovie ? raw.release_date : raw.first_air_date),
    duration: isMovie ? formatRuntime(raw.runtime) : formatTvLength(raw.number_of_seasons, raw.number_of_episodes),
    genres: genreNames(raw, mediaType),
    synopsis: raw.overview?.trim() ?? '',
    poster: imageUrl(raw.poster_path, 'w500'),
    backdrop: imageUrl(raw.backdrop_path, 'w1280'),
    availability: [],
    availabilityStatus: 'unavailable'
  };
  if (cast.length) normalized.cast = cast;
  return normalized;
}

export function normalizeTmdbList(items: TmdbTitle[] | undefined, fallbackType?: TmdbMediaType): CatalogTitle[] {
  const seen = new Set<string>();
  const titles: CatalogTitle[] = [];
  for (const raw of items ?? []) {
    const title = normalizeTmdbTitle(raw, fallbackType);
    if (title && !seen.has(title.id)) {
      seen.add(title.id);
      titles.push(title);
    }
  }
  return titles;
}
