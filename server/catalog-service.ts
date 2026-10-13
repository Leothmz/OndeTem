import type { HomeCatalogResponse, SearchResponse, TitleResponse } from '../shared/catalog-contract';
import type { CatalogProvider, Logger } from './catalog-provider';
import { foldText } from './demo-catalog';
import { parseCatalogId } from './tmdb-normalize';
import { TtlCache } from './ttl-cache';

/** O título pertence ao TMDB, mas o TMDB não respondeu (e não há cópia em cache). */
export class UpstreamUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpstreamUnavailableError';
  }
}

export interface CatalogServiceOptions {
  demo: CatalogProvider;
  /** Ausente quando não há credencial TMDB configurada. */
  tmdb?: CatalogProvider;
  cache: TtlCache;
  logger: Logger;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Orquestra as fontes de catálogo: TMDB quando configurado (com cache), catálogo demo como fallback
 * quando não há credencial ou quando o TMDB falha. A fonte usada vai em `source` e nos logs.
 */
export class CatalogService {
  constructor(private readonly options: CatalogServiceOptions) {}

  get primarySource(): 'tmdb' | 'demo' { return this.options.tmdb ? 'tmdb' : 'demo'; }

  async home(): Promise<HomeCatalogResponse> {
    const { tmdb, demo } = this.options;
    if (tmdb) {
      try {
        return { source: 'tmdb', ...await this.cached('home', () => tmdb.home()) };
      } catch (error) {
        this.options.logger.warn(`TMDB unavailable for home (${describe(error)}); serving demo fallback`);
      }
    }
    return { source: 'demo', ...await demo.home() };
  }

  async search(query: string): Promise<SearchResponse> {
    const trimmed = query.trim();
    const { tmdb, demo } = this.options;
    if (!trimmed) return { source: this.primarySource, query: trimmed, results: [] };
    if (tmdb) {
      try {
        const results = await this.cached(`search:${foldText(trimmed)}`, () => tmdb.search(trimmed));
        return { source: 'tmdb', query: trimmed, results };
      } catch (error) {
        this.options.logger.warn(`TMDB unavailable for search (${describe(error)}); serving demo fallback`);
      }
    }
    return { source: 'demo', query: trimmed, results: await demo.search(trimmed) };
  }

  /** `null` quando o título não existe. Lança `UpstreamUnavailableError` se um título TMDB não puder ser carregado. */
  async title(id: string): Promise<TitleResponse | null> {
    const { tmdb, demo } = this.options;
    if (!parseCatalogId(id)) {
      const title = await demo.title(id);
      return title ? { source: 'demo', title } : null;
    }
    if (!tmdb) {
      this.options.logger.warn(`title ${id} looks like a TMDB id but TMDB is not configured`);
      return null;
    }
    try {
      const title = await this.cached(`title:${id}`, () => tmdb.title(id));
      return title ? { source: 'tmdb', title } : null;
    } catch (error) {
      this.options.logger.warn(`TMDB unavailable for title ${id} (${describe(error)})`);
      throw new UpstreamUnavailableError('O catálogo está temporariamente indisponível.');
    }
  }

  private cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    return this.options.cache.getOrLoad(key, load, error =>
      this.options.logger.warn(`TMDB refresh failed for ${key} (${describe(error)}); serving stale cache`));
  }
}
