import type { CatalogTitle } from '../shared/catalog-contract';
import type { CatalogProvider, HomeCatalog } from './catalog-provider';
import { foldText } from './demo-catalog';
import {
  TMDB_GENRES, TmdbMediaType, TmdbPage, TmdbTitle,
  normalizeTmdbList, normalizeTmdbTitle, parseCatalogId
} from './tmdb-normalize';

export const TMDB_API_BASE = 'https://api.themoviedb.org/3';

export interface TmdbCredentials {
  /** Chave v3 (`api_key`). */
  apiKey?: string;
  /** Token de leitura v4 (Bearer). Tem precedência sobre `apiKey`. */
  readAccessToken?: string;
}

export interface TmdbProviderOptions extends TmdbCredentials {
  language: string;
  region: string;
  timeoutMs: number;
  /** Injetável para testes. */
  fetch?: typeof fetch;
  baseUrl?: string;
}

/** Falha ao falar com o TMDB (rede, timeout, status não 2xx). Nunca contém a credencial. */
export class TmdbError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'TmdbError';
  }
}

const RAIL_LIMIT = 12;
const SEARCH_LIMIT = 20;

export function hasTmdbCredentials(credentials: TmdbCredentials): boolean {
  return !!(credentials.apiKey || credentials.readAccessToken);
}

/** Ids de gênero TMDB que correspondem exatamente a uma busca (ex.: chips de gênero da home). */
export function genreQuery(query: string): Partial<Record<TmdbMediaType, number>> | null {
  const needle = foldText(query);
  if (!needle) return null;
  const match: Partial<Record<TmdbMediaType, number>> = {};
  for (const mediaType of ['movie', 'tv'] as const) {
    for (const [id, name] of Object.entries(TMDB_GENRES[mediaType])) {
      const folded = foldText(name);
      // Gêneros compostos de TV ("Ficção científica e fantasia") também respondem por cada parte.
      if (folded === needle || folded.split(' e ').includes(needle)) {
        match[mediaType] = Number(id);
        break;
      }
    }
  }
  return match.movie || match.tv ? match : null;
}

function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

export class TmdbCatalogProvider implements CatalogProvider {
  readonly source = 'tmdb' as const;
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly options: TmdbProviderOptions) {
    if (!hasTmdbCredentials(options)) throw new Error('TmdbCatalogProvider requires TMDB credentials');
    this.fetchFn = options.fetch ?? fetch;
    this.baseUrl = options.baseUrl ?? TMDB_API_BASE;
  }

  async home(): Promise<HomeCatalog> {
    const [trendingPage, upcomingPage] = await Promise.all([
      this.get<TmdbPage>('/trending/all/week'),
      this.get<TmdbPage>('/movie/upcoming', { region: this.options.region })
    ]);
    const trending = normalizeTmdbList(trendingPage.results).slice(0, RAIL_LIMIT).map(item => ({ ...item, trending: true }));
    const today = new Date().toISOString().slice(0, 10);
    const comingSoon = normalizeTmdbList(
      (upcomingPage.results ?? []).filter(item => !item.release_date || item.release_date >= today),
      'movie'
    ).slice(0, RAIL_LIMIT).map(item => ({ ...item, comingSoon: true }));
    const featuredBase = trending.find(item => item.backdrop) ?? trending[0] ?? null;
    return { featured: featuredBase ? { ...featuredBase, featured: true } : null, trending, comingSoon };
  }

  async search(query: string): Promise<CatalogTitle[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const genres = genreQuery(trimmed);
    if (genres) return this.discoverByGenre(genres);
    const page = await this.get<TmdbPage>('/search/multi', { query: trimmed, include_adult: 'false' });
    return normalizeTmdbList(page.results).slice(0, SEARCH_LIMIT);
  }

  async title(id: string): Promise<CatalogTitle | null> {
    const parsed = parseCatalogId(id);
    if (!parsed) return null;
    try {
      const raw = await this.get<TmdbTitle>(`/${parsed.mediaType}/${parsed.tmdbId}`, { append_to_response: 'credits' });
      return normalizeTmdbTitle(raw, parsed.mediaType);
    } catch (error) {
      if (error instanceof TmdbError && error.status === 404) return null;
      throw error;
    }
  }

  private async discoverByGenre(genres: Partial<Record<TmdbMediaType, number>>): Promise<CatalogTitle[]> {
    const discover = (mediaType: TmdbMediaType, genreId: number | undefined) => genreId
      ? this.get<TmdbPage>(`/discover/${mediaType}`, {
          with_genres: String(genreId), sort_by: 'popularity.desc', include_adult: 'false', 'vote_count.gte': '50'
        }).then(page => normalizeTmdbList(page.results, mediaType))
      : Promise.resolve([]);
    const [movies, shows] = await Promise.all([discover('movie', genres.movie), discover('tv', genres.tv)]);
    return interleave(movies, shows).slice(0, SEARCH_LIMIT);
  }

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('language', this.options.language);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const headers: Record<string, string> = { accept: 'application/json' };
    if (this.options.readAccessToken) headers['authorization'] = `Bearer ${this.options.readAccessToken}`;
    else if (this.options.apiKey) url.searchParams.set('api_key', this.options.apiKey);

    let response: Response;
    try {
      response = await this.fetchFn(url, { headers, signal: AbortSignal.timeout(this.options.timeoutMs) });
    } catch (error) {
      const reason = error instanceof Error && error.name === 'TimeoutError' ? `timeout after ${this.options.timeoutMs}ms` : 'network error';
      // Só o caminho: a URL completa pode conter `api_key`.
      throw new TmdbError(`TMDB ${path}: ${reason}`);
    }
    if (!response.ok) throw new TmdbError(`TMDB ${path}: HTTP ${response.status}`, response.status);
    try {
      return await response.json() as T;
    } catch {
      throw new TmdbError(`TMDB ${path}: invalid JSON`, response.status);
    }
  }
}
