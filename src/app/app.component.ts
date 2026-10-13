import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CatalogService } from './services/catalog.service';

@Component({
  selector: 'ot-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
<a class="skip-link" href="#main-content">Ir para o conteúdo</a>
<header class="site-header">
  <a routerLink="/" class="brand" aria-label="Onde Tem? início"><span>onde</span><b>tem?</b></a>
  <nav aria-label="Navegação principal">
    <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Início</a>
    <a routerLink="/buscar" routerLinkActive="active">Buscar</a>
  </nav>
  <a routerLink="/buscar" class="header-search" aria-label="Abrir busca">⌕ <span>Buscar título</span></a>
</header>
<main id="main-content"><router-outlet /></main>
<footer>
  <span class="brand"><span>onde</span><b>tem?</b></span>
  <span>Descubra. Escolha. Assista.</span>
  @if (catalog.source() === 'tmdb') {
    <small class="attribution">Dados de títulos e imagens: <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a>. Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.</small>
  } @else if (catalog.source() === 'demo') {
    <small>© 2024 Onde Tem? · Catálogo demonstrativo</small>
  } @else {
    <small>© 2024 Onde Tem?</small>
  }
</footer>`,
  styles: [`:host{display:block;min-height:100vh}`]
})
export class AppComponent {
  protected readonly catalog = inject(CatalogService);
}
