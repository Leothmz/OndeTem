import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../services/catalog.service';
import { CatalogTitle } from '../models';
import { SearchBoxComponent } from '../components/search-box.component';
import { TitleCardComponent } from '../components/title-card.component';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'ot-home',
  standalone: true,
  imports: [RouterLink, SearchBoxComponent, TitleCardComponent],
  template: `
<section class="hero">
  <div class="hero-backdrop" [class.hero-backdrop-fade]="heroChanging" [style.background-image]="heroBackground"></div>
  <div class="hero-copy">
    <div class="eyebrow"><span></span> O mapa do streaming brasileiro</div>
    <h1>O próximo filme da<br><em>sua vida</em> está aqui.</h1>
    <p>Uma busca, todas as formas de assistir. Encontre seu próximo favorito sem abrir cinco aplicativos.</p>
    <ot-search-box />
  </div>
  @if (featured) {
    <a class="hero-note" [routerLink]="['/titulo', featured.id]">
      <span>EM DESTAQUE</span>
      <strong>{{featured.title}}</strong>
      <small>{{metaLine(featured)}}</small>
    </a>
  }
</section>

<section class="content">
  <div class="section-heading">
    <div><span class="kicker">O que está no radar</span><h2>Em alta agora <i>↗</i></h2></div>
    <a routerLink="/buscar" [queryParams]="{q:''}">Ver catálogo <span>→</span></a>
  </div>
  @if (state === 'loading') {
    <div class="loading" role="status" aria-label="Carregando títulos em alta">
      <span></span><span></span><span></span><span></span><span></span>
    </div>
  } @else if (state === 'error') {
    <div class="rail-state" role="alert">
      <strong>Não foi possível carregar o catálogo.</strong>
      <p>Verifique sua conexão e tente novamente em instantes.</p>
      <button type="button" class="retry" (click)="load()">Tentar novamente</button>
    </div>
  } @else if (trending.length) {
    <div class="rail">
      <div class="cards-row" #trendingRail>
        @for (item of trending; track item.id) {<ot-title-card [title]="item" />}
      </div>
      <button class="rail-arrow prev" aria-label="Rolar para trás" (click)="trendingRail.scrollBy({left:-320,behavior:'smooth'})">←</button>
      <button class="rail-arrow next" aria-label="Rolar para a frente" (click)="trendingRail.scrollBy({left:320,behavior:'smooth'})">→</button>
    </div>
  } @else {
    <div class="rail-state"><strong>Nada em alta por aqui ainda.</strong><p>Use a busca para encontrar um título.</p></div>
  }

  <div class="section-heading genre-heading">
    <div><span class="kicker">Escolha seu clima</span><h2>Histórias que combinam <i>✦</i></h2></div>
  </div>
  <div class="genre-grid">
    @for (genre of genres; track genre.name) {
      <a routerLink="/buscar" [queryParams]="{q:genre.name}" class="genre-chip" [style.background-image]="genreBackground(genre.image)">
        <span>{{genre.name}}</span><b>→</b>
      </a>
    }
  </div>

  @if (state === 'loading' || coming.length) {
    <div class="coming">
      <div class="section-heading">
        <div><span class="kicker">Prepare a pipoca</span><h2>Em breve no cinema <i>◎</i></h2></div>
      </div>
      @if (state === 'loading') {
        <div class="loading" role="status" aria-label="Carregando lançamentos">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
      } @else {
        <div class="rail">
          <div class="cards-row" #comingRail>
            @for (item of coming; track item.id) {<ot-title-card [title]="item" />}
          </div>
          <button class="rail-arrow prev" aria-label="Rolar para trás" (click)="comingRail.scrollBy({left:-320,behavior:'smooth'})">←</button>
          <button class="rail-arrow next" aria-label="Rolar para a frente" (click)="comingRail.scrollBy({left:320,behavior:'smooth'})">→</button>
        </div>
      }
    </div>
  }
</section>`
})
export class HomeComponent implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly destroyRef = inject(DestroyRef);

  state: LoadState = 'loading';
  featured: CatalogTitle | null = null;
  trending: CatalogTitle[] = [];
  coming: CatalogTitle[] = [];
  heroChanging = false;
  private rotationItems: CatalogTitle[] = [];
  private rotationIndex = 0;
  private rotationTimer?: ReturnType<typeof setInterval>;
  genres = [
    { name: 'Ficção científica', image: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800' },
    { name: 'Drama', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800' },
    { name: 'Comédia', image: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800' },
    { name: 'Animação', image: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=800' }
  ];

  ngOnInit() {
    this.destroyRef.onDestroy(() => this.stopRotation());
    this.load();
  }

  load() {
    this.stopRotation();
    this.state = 'loading';
    this.catalog.home().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: home => {
        this.trending = home.trending;
        this.rotationItems = [...home.trending];
        const initialIndex = this.rotationItems.findIndex(item => item.id === home.featured?.id);
        this.rotationIndex = initialIndex >= 0 ? initialIndex : 0;
        this.featured = this.rotationItems[this.rotationIndex] ?? home.featured;
        this.coming = home.comingSoon;
        this.state = 'ready';
        this.startRotation();
      },
      error: () => { this.state = 'error'; }
    });
  }

  private startRotation() {
    if (this.rotationItems.length < 2) return;
    this.rotationTimer = setInterval(() => {
      this.rotationIndex = (this.rotationIndex + 1) % this.rotationItems.length;
      this.heroChanging = false;
      requestAnimationFrame(() => {
        this.featured = this.rotationItems[this.rotationIndex];
        this.heroChanging = true;
      });
    }, 7000);
  }

  private stopRotation() {
    if (this.rotationTimer) clearInterval(this.rotationTimer);
    this.rotationTimer = undefined;
  }

  get heroBackground() {
    const layers = 'radial-gradient(circle at 12% 10%,rgba(242,103,58,.16),transparent 55%),linear-gradient(100deg,rgba(5,6,10,.97) 4%,rgba(5,6,10,.82) 42%,rgba(5,6,10,.25) 78%)';
    return this.featured?.backdrop ? `${layers},url(${this.featured.backdrop})` : layers;
  }

  metaLine(title: CatalogTitle) {
    return [title.year, ...title.genres.slice(0, 3)].filter(Boolean).join(' · ');
  }

  genreBackground(image: string) {
    return `linear-gradient(160deg,rgba(6,7,11,.25),rgba(6,7,11,.88)),url(${image})`;
  }
}
