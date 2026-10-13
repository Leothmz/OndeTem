import type { CatalogSource, CatalogTitle, HomeCatalogResponse } from '../shared/catalog-contract';

export type HomeCatalog = Omit<HomeCatalogResponse, 'source'>;

/** Fonte de catálogo já normalizada para o contrato `CatalogTitle`. */
export interface CatalogProvider {
  readonly source: CatalogSource;
  home(): Promise<HomeCatalog>;
  search(query: string): Promise<CatalogTitle[]>;
  /** `null` quando o título não existe nesta fonte. */
  title(id: string): Promise<CatalogTitle | null>;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export const consoleLogger: Logger = {
  info: message => console.log(`[ondetem-api] ${message}`),
  warn: message => console.warn(`[ondetem-api] ${message}`),
  error: message => console.error(`[ondetem-api] ${message}`)
};
