import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CatalogService } from '../services/catalog.service';
import { CatalogTitle, AccessType } from '../models';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

@Component({
  selector: 'ot-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
@if (state === 'ready' && title) {
  <section class="detail" [style.background-image]="backdropFor(title)">
    <a routerLink="/" class="back">← Voltar para início</a>
    <div class="detail-body">
      @if (title.poster && !posterError) {
        <img class="detail-poster" [src]="title.poster" [alt]="'Pôster de '+title.title" (error)="posterError=true">
      } @else {
        <div class="detail-poster-fallback" aria-hidden="true"><span>{{title.title.charAt(0)}}</span></div>
      }
      <div class="detail-copy">
        <span class="kicker">{{title.type}}@if (title.year) { · {{title.year}}}</span>
        <h1>{{title.title}}</h1>
        @if (facts(title).length) {
          <div class="facts">
            @for (fact of facts(title); track $index; let last = $last) {<span>{{fact}}</span>@if (!last) {<span>•</span>}}
          </div>
        }
        <p class="synopsis">{{title.synopsis || 'Sinopse ainda não disponível.'}}</p>
        @if (title.cast?.length) {<p class="cast"><b>Elenco</b> {{title.cast?.join(' · ')}}</p>}
        <div class="where">
          <div class="where-title">
            <div><span class="kicker">Disponibilidade</span><h2>Onde assistir</h2></div>
            <small>{{title.availabilityStatus === 'demo' ? 'Dados demonstrativos' : 'Em breve'}}</small>
          </div>
          <div class="availability">
            @if (title.availability.length) {
              @for (item of title.availability; track item.service) {
                <div class="service">
                  <span class="service-logo" [style.background]="item.color">{{item.service.charAt(0)}}</span>
                  <div><strong>{{item.service}}</strong><small>{{accessLabel(item.access)}}</small></div>
                  @if(item.price){<b>{{item.price}}</b>}
                  <span class="service-arrow">→</span>
                </div>
              }
            } @else if (title.availabilityStatus === 'unavailable') {
              <p class="not-available">Ainda não temos informações de onde assistir este título.</p>
            } @else {
              <p class="not-available">Ainda não temos uma opção de streaming para este título.</p>
            }
          </div>
        </div>
      </div>
    </div>
  </section>
} @else if (state === 'loading') {
  <section class="detail" role="status" aria-label="Carregando título">
    <a routerLink="/" class="back">← Voltar para início</a>
    <div class="detail-body">
      <div class="detail-poster skeleton"></div>
      <div class="detail-copy detail-skeleton">
        <span class="skeleton line short"></span>
        <span class="skeleton line title"></span>
        <span class="skeleton line"></span>
        <span class="skeleton line"></span>
      </div>
    </div>
  </section>
} @else if (state === 'error') {
  <div class="empty" role="alert">
    <strong>Não foi possível carregar este título.</strong>
    <p>O catálogo está temporariamente indisponível. Tente novamente em instantes.</p>
    <button type="button" class="retry" (click)="load()">Tentar novamente</button>
  </div>
} @else {
  <div class="empty"><strong>Título não encontrado.</strong><a routerLink="/">Voltar para início</a></div>
}`
})
export class DetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private id = '';

  state: LoadState = 'loading';
  title?: CatalogTitle;
  posterError = false;

  ngOnInit() {
    this.destroyRef.onDestroy(() => this.request?.unsubscribe());
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.id = params.get('id') ?? '';
      this.load();
    });
  }

  load() {
    this.request?.unsubscribe();
    this.state = 'loading';
    this.title = undefined;
    this.posterError = false;
    if (!this.id) {
      this.state = 'not-found';
      return;
    }
    this.request = this.catalog.getById(this.id).subscribe({
      next: title => {
        this.title = title ?? undefined;
        this.state = title ? 'ready' : 'not-found';
      },
      error: () => { this.state = 'error'; }
    });
  }

  facts(title: CatalogTitle) {
    return [title.duration, title.genres.join(' · ')].filter(Boolean);
  }

  accessLabel(access: AccessType) {
    return access === 'subscription' ? 'Incluído na assinatura' : access === 'rent' ? 'Aluguel' : 'Compra';
  }

  backdropFor(title: CatalogTitle) {
    const shade = 'linear-gradient(100deg,#05060a 8%,rgba(5,6,10,.9) 38%,rgba(5,6,10,.35))';
    return title.backdrop ? `${shade},url(${title.backdrop})` : shade;
  }
}
