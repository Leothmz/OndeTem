import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogTitle } from '../models';

@Component({
  selector: 'ot-title-card',
  standalone: true,
  imports: [RouterLink],
  template: `
<a class="title-card" [routerLink]="['/titulo', title.id]" [attr.aria-label]="'Ver detalhes de '+title.title">
  <div class="poster-wrap">
    @if (title.poster && !imgError) {
      <img [src]="title.poster" [alt]="'Pôster de '+title.title" loading="lazy" (error)="imgError=true">
    } @else {
      <div class="poster-fallback" aria-hidden="true"><span>{{title.title.charAt(0)}}</span></div>
    }
    <span class="type-pill">{{title.type}}</span>
    @if (title.comingSoon) {
      <span class="status-pill soon">Em breve</span>
    } @else if (title.availability.length) {
      <span class="status-pill count">{{title.availability.length}} {{title.availability.length===1?'opção':'opções'}}</span>
    }
    <span class="play" aria-hidden="true">↗</span>
  </div>
  <div class="card-meta"><h3>{{title.title}}</h3><p>{{title.year}} <i [hidden]="!title.year || !title.genres[0]">·</i> {{title.genres[0]}}</p></div>
</a>`
})
export class TitleCardComponent {
  @Input({ required: true }) title!: CatalogTitle;
  imgError = false;
}
