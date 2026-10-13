export interface ApiConfig {
  host: string;
  port: number;
  tmdbApiKey?: string;
  tmdbReadAccessToken?: string;
  tmdbBaseUrl?: string;
  tmdbLanguage: string;
  tmdbRegion: string;
  tmdbTimeoutMs: number;
  cacheTtlSeconds: number;
  cacheMaxEntries: number;
}

function numberFrom(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative number (got "${value}")`);
  return parsed;
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Lê a configuração da API a partir de variáveis de ambiente (ver `.env.example`). */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    host: optional(env['API_HOST']) ?? '127.0.0.1',
    port: numberFrom(env['API_PORT'] ?? env['PORT'], 3000, 'API_PORT'),
    tmdbApiKey: optional(env['TMDB_API_KEY']),
    tmdbReadAccessToken: optional(env['TMDB_READ_ACCESS_TOKEN']),
    tmdbBaseUrl: optional(env['TMDB_API_BASE_URL']),
    tmdbLanguage: optional(env['TMDB_LANGUAGE']) ?? 'pt-BR',
    tmdbRegion: optional(env['TMDB_REGION']) ?? 'BR',
    tmdbTimeoutMs: numberFrom(env['TMDB_TIMEOUT_MS'], 5000, 'TMDB_TIMEOUT_MS'),
    cacheTtlSeconds: numberFrom(env['CATALOG_CACHE_TTL_SECONDS'], 600, 'CATALOG_CACHE_TTL_SECONDS'),
    cacheMaxEntries: numberFrom(env['CATALOG_CACHE_MAX_ENTRIES'], 500, 'CATALOG_CACHE_MAX_ENTRIES')
  };
}
