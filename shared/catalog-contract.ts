// Contrato compartilhado entre a API (`server/`) e o frontend Angular (`src/`).
// Apenas tipos: nada aqui é emitido para o bundle do navegador.

export type TitleType = 'Filme' | 'Série';
export type AccessType = 'subscription' | 'rent' | 'buy';

/** De onde vieram os dados de uma resposta. Informativo para desenvolvimento, não para a UI. */
export type CatalogSource = 'tmdb' | 'demo';

/**
 * `demo`: disponibilidade editorial de demonstração (catálogo local).
 * `unavailable`: ainda não há provedor de disponibilidade integrado; `availability` vem vazio.
 */
export type AvailabilityStatus = 'demo' | 'unavailable';

export interface Availability { service: string; access: AccessType; price?: string; color: string; }

export interface CatalogTitle {
  /** Slug local (`duna-parte-dois`) ou id TMDB prefixado pelo tipo (`movie-693134`, `tv-1396`). */
  id: string;
  title: string;
  type: TitleType;
  /** `null` quando a fonte não informa data de lançamento. */
  year: number | null;
  /** Texto pronto para exibição (`2h 46min`, `3 temporadas`); vazio quando desconhecido. */
  duration: string;
  genres: string[];
  synopsis: string;
  /** URL absoluta da imagem; vazio quando não há pôster/fundo. */
  poster: string;
  backdrop: string;
  cast?: string[];
  availability: Availability[];
  availabilityStatus: AvailabilityStatus;
  featured?: boolean;
  trending?: boolean;
  comingSoon?: boolean;
}

export interface HomeCatalogResponse {
  source: CatalogSource;
  featured: CatalogTitle | null;
  trending: CatalogTitle[];
  comingSoon: CatalogTitle[];
}

export interface SearchResponse { source: CatalogSource; query: string; results: CatalogTitle[]; }

export interface TitleResponse { source: CatalogSource; title: CatalogTitle; }

export type ApiErrorCode = 'bad_request' | 'not_found' | 'method_not_allowed' | 'upstream_unavailable' | 'internal_error';

export interface ApiErrorResponse { error: { code: ApiErrorCode; message: string; }; }
