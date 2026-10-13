import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../services/catalog.service';
import { SearchBoxComponent } from '../components/search-box.component';
import { TitleCardComponent } from '../components/title-card.component';

@Component({
  selector: 'ot-home',
  standalone: true,
  imports: [RouterLink, SearchBoxComponent, TitleCardComponent],
  template: `
<section class="hero" [style.background-image]="heroBackground">
  <div class="hero-copy">
    <div class="eyebrow"><span></span> O mapa do streaming brasileiro</div>
    <h1>O próximo filme da<br><em>sua vida</em> está aqui.</h1>
    <p>Uma busca, todas as formas de assistir. Encontre seu próximo favorito sem abrir cinco aplicativos.</p>
    <ot-search-box />
  </div>
  <div class="hero-note">
    <span>EM DESTAQUE</span>
    <strong>{{featured.title}}</strong>
    <small>{{featured.year}} · {{featured.genres.join(' · ')}}</small>
  </div>
</section>

<section class="content">
  <div class="section-heading">
    <div><span class="kicker">O que está no radar</span><h2>Em alta agora <i>↗</i></h2></div>
    <a routerLink="/buscar" [queryParams]="{q:''}">Ver catálogo <span>→</span></a>
  </div>
  <div class="rail">
    <div class="cards-row" #trendingRail>
      @for (item of trending; track item.id) {<ot-title-card [title]="item" />}
    </div>
    <button class="rail-arrow prev" aria-label="Rolar para trás" (click)="trendingRail.scrollBy({left:-320,behavior:'smooth'})">←</button>
    <button class="rail-arrow next" aria-label="Rolar para a frente" (click)="trendingRail.scrollBy({left:320,behavior:'smooth'})">→</button>
  </div>

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

  <div class="coming">
    <div class="section-heading">
      <div><span class="kicker">Prepare a pipoca</span><h2>Em breve no cinema <i>◎</i></h2></div>
    </div>
    <div class="rail">
      <div class="cards-row" #comingRail>
        @for (item of coming; track item.id) {<ot-title-card [title]="item" />}
      </div>
      <button class="rail-arrow prev" aria-label="Rolar para trás" (click)="comingRail.scrollBy({left:-320,behavior:'smooth'})">←</button>
      <button class="rail-arrow next" aria-label="Rolar para a frente" (click)="comingRail.scrollBy({left:320,behavior:'smooth'})">→</button>
    </div>
  </div>
</section>`
})
export class HomeComponent {
  featured = this.catalog.getFeatured();
  trending = this.catalog.getTrending();
  coming = this.catalog.getComingSoon();
  genres = [
    { name: 'Ficção científica', image: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800' },
    { name: 'Drama', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800' },
    { name: 'Comédia', image: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800' },
    { name: 'Animação', image: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=800' }
  ];

  constructor(private catalog: CatalogService) {}

  get heroBackground() {
    return `radial-gradient(circle at 12% 10%,rgba(242,103,58,.16),transparent 55%),linear-gradient(100deg,rgba(5,6,10,.97) 4%,rgba(5,6,10,.82) 42%,rgba(5,6,10,.25) 78%),url(${this.featured.backdrop})`;
  }

  genreBackground(image: string) {
    return `linear-gradient(160deg,rgba(6,7,11,.25),rgba(6,7,11,.88)),url(${image})`;
  }
}
