import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CatalogService } from '../services/catalog.service';
import { CatalogTitle } from '../models';
import { SearchBoxComponent } from '../components/search-box.component';
import { TitleCardComponent } from '../components/title-card.component';

@Component({
  selector: 'ot-search-page',
  standalone: true,
  imports: [RouterLink, SearchBoxComponent, TitleCardComponent],
  template: `
<section class="search-page">
  <div class="search-intro">
    <span class="kicker">Explorar catálogo</span>
    <h1>Encontre seu<br><em>próximo filme.</em></h1>
    <ot-search-box />
  </div>
  @if (loading) {
    <div class="loading" role="status">
      <span></span><span></span><span></span><span></span><span></span>
      <p>Consultando o catálogo...</p>
    </div>
  } @else if (error) {
    <div class="empty" role="alert">
      <strong>Não foi possível consultar o catálogo.</strong>
      <p>Algo deu errado do nosso lado. Tente novamente em instantes.</p>
      <button type="button" class="retry" (click)="load()">Tentar novamente</button>
    </div>
  } @else if (query && results.length) {
    <div class="results-header">
      <h2>Resultados para <em>"{{query}}"</em></h2>
      <span>{{results.length}} {{results.length===1?'título encontrado':'títulos encontrados'}}</span>
    </div>
    <div class="results-grid">
      @for (item of results; track item.id) {<ot-title-card [title]="item" />}
    </div>
  } @else if (query) {
    <div class="empty">
      <strong>Não encontramos esse título.</strong>
      <p>Tente buscar por outro nome ou gênero. O catálogo está sempre crescendo.</p>
      <a routerLink="/buscar">Limpar busca →</a>
    </div>
  } @else {
    <div class="empty welcome">
      <strong>Digite para começar a descobrir.</strong>
      <p>Filmes, séries e histórias para todos os momentos.</p>
    </div>
  }
</section>`
})
export class SearchComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;

  query = '';
  results: CatalogTitle[] = [];
  loading = false;
  error = false;

  ngOnInit() {
    this.destroyRef.onDestroy(() => this.request?.unsubscribe());
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.query = (params.get('q') ?? '').trim();
      this.load();
    });
  }

  /** Busca a query atual; uma nova busca cancela a anterior para nunca exibir resultados fora de ordem. */
  load() {
    this.request?.unsubscribe();
    this.results = [];
    this.error = false;
    if (!this.query) {
      this.loading = false;
      return;
    }
    this.loading = true;
    this.request = this.catalog.search(this.query).subscribe({
      next: results => { this.results = results; this.loading = false; },
      error: () => { this.error = true; this.loading = false; }
    });
  }
}
