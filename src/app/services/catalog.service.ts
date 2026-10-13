import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { CatalogSource, CatalogTitle, HomeCatalogResponse, SearchResponse, TitleResponse } from '../models';

/** Base da API de catálogo. Em desenvolvimento o `ng serve` faz proxy de `/api` para o servidor Node (`server/`). */
export const CATALOG_API_URL = new InjectionToken<string>('CATALOG_API_URL', { providedIn: 'root', factory: () => '/api' });

export type HomeCatalog = Omit<HomeCatalogResponse, 'source'>;

// Cliente HTTP da API de catálogo. Credenciais e o fallback demo ficam no servidor; aqui só há chamadas relativas.
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(CATALOG_API_URL);

  /** Fonte da última resposta (`tmdb`/`demo`); usada só para a atribuição exigida pelo TMDB no rodapé. */
  readonly source = signal<CatalogSource | null>(null);

  home(): Observable<HomeCatalog> {
    return this.http.get<HomeCatalogResponse>(`${this.baseUrl}/catalog/home`).pipe(
      tap(response => this.source.set(response.source)),
      map(({ featured, trending, comingSoon }) => ({ featured, trending, comingSoon }))
    );
  }

  search(query: string): Observable<CatalogTitle[]> {
    const q = query.trim();
    if (!q) return of([]);
    return this.http.get<SearchResponse>(`${this.baseUrl}/catalog/search`, { params: { q } }).pipe(
      tap(response => this.source.set(response.source)),
      map(response => response.results)
    );
  }

  /** Emite `null` quando o título não existe (404); outros erros seguem para o chamador. */
  getById(id: string): Observable<CatalogTitle | null> {
    return this.http.get<TitleResponse>(`${this.baseUrl}/catalog/titles/${encodeURIComponent(id)}`).pipe(
      tap(response => this.source.set(response.source)),
      map(response => response.title),
      catchError((error: unknown) => error instanceof HttpErrorResponse && error.status === 404 ? of(null) : throwError(() => error))
    );
  }
}
