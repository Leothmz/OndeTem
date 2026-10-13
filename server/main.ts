import { existsSync } from 'node:fs';
import { createServer, Server } from 'node:http';
import { consoleLogger, Logger } from './catalog-provider';
import { CatalogService } from './catalog-service';
import { ApiConfig, loadConfig } from './config';
import { DemoCatalogProvider } from './demo-catalog';
import { createApiHandler } from './http';
import { TmdbCatalogProvider } from './tmdb-provider';
import { TtlCache } from './ttl-cache';

export function createCatalogService(config: ApiConfig, logger: Logger, fetchFn?: typeof fetch): CatalogService {
  const credentials = { apiKey: config.tmdbApiKey, readAccessToken: config.tmdbReadAccessToken };
  const tmdb = credentials.apiKey || credentials.readAccessToken
    ? new TmdbCatalogProvider({
        ...credentials,
        language: config.tmdbLanguage,
        region: config.tmdbRegion,
        timeoutMs: config.tmdbTimeoutMs,
        baseUrl: config.tmdbBaseUrl,
        fetch: fetchFn
      })
    : undefined;
  return new CatalogService({
    demo: new DemoCatalogProvider(),
    tmdb,
    cache: new TtlCache({ ttlMs: config.cacheTtlSeconds * 1000, maxEntries: config.cacheMaxEntries }),
    logger
  });
}

export function startServer(config: ApiConfig, logger: Logger = consoleLogger): Server {
  const service = createCatalogService(config, logger);
  const server = createServer(createApiHandler(service, logger));
  server.listen(config.port, config.host, () => {
    const source = service.primarySource === 'tmdb'
      ? `TMDB (${config.tmdbLanguage}/${config.tmdbRegion}, cache ${config.cacheTtlSeconds}s; demo fallback on errors)`
      : 'DEMO local catalog (set TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN to use TMDB)';
    logger.info(`listening on http://${config.host}:${config.port} — catalog source: ${source}`);
  });
  return server;
}

if (require.main === module) {
  // `.env` opcional na raiz do projeto (Node 20.12+); variáveis já exportadas têm precedência.
  if (existsSync('.env') && typeof process.loadEnvFile === 'function') process.loadEnvFile('.env');
  const server = startServer(loadConfig());
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
