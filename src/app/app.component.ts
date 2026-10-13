import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
@Component({ selector: 'ot-root', standalone: true, imports: [RouterLink, RouterLinkActive, RouterOutlet], template: `
<header class="site-header"><a routerLink="/" class="brand" aria-label="Onde Tem? início"><span>onde</span><b>tem?</b></a><nav aria-label="Navegação principal"><a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Início</a><a routerLink="/buscar" routerLinkActive="active">Buscar</a></nav><a routerLink="/buscar" class="header-search" aria-label="Abrir busca">⌕ <span>Buscar título</span></a></header>
<main><router-outlet /></main><footer><span class="brand"><span>onde</span><b>tem?</b></span><span>Descubra. Escolha. Assista.</span><small>© 2024 Onde Tem? · Catálogo demonstrativo</small></footer>`, styles: [`:host{display:block;min-height:100vh}`] })
export class AppComponent {}
