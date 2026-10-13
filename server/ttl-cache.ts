export interface TtlCacheOptions {
  ttlMs: number;
  maxEntries: number;
  now?: () => number;
}

interface Entry<T> { value: T; expiresAt: number; }

/**
 * Cache em memória com expiração por tempo e limite de entradas (descarta as mais antigas).
 * `getOrLoad` deduplica cargas simultâneas da mesma chave e, se a carga falhar,
 * devolve o último valor conhecido (expirado) em vez do erro.
 */
export class TtlCache {
  private readonly entries = new Map<string, Entry<unknown>>();
  private readonly pending = new Map<string, Promise<unknown>>();
  private readonly now: () => number;

  constructor(private readonly options: TtlCacheOptions) {
    this.now = options.now ?? Date.now;
  }

  get size(): number { return this.entries.size; }

  async getOrLoad<T>(key: string, load: () => Promise<T>, onStale?: (error: unknown) => void): Promise<T> {
    const entry = this.entries.get(key) as Entry<T> | undefined;
    if (entry && entry.expiresAt > this.now()) return entry.value;
    if (this.options.ttlMs <= 0) return load();

    const inFlight = this.pending.get(key) as Promise<T> | undefined;
    if (inFlight) return inFlight;

    const promise = load()
      .then(value => { this.set(key, value); return value; })
      .catch(error => {
        if (entry) { onStale?.(error); return entry.value; }
        throw error;
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return promise;
  }

  private set(key: string, value: unknown): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + this.options.ttlMs });
    while (this.entries.size > this.options.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}
