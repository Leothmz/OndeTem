import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogTitle } from '../models';
@Component({ selector:'ot-title-card', standalone:true, imports:[RouterLink], template:`<a class="title-card" [routerLink]="['/titulo', title.id]" [attr.aria-label]="'Ver detalhes de '+title.title"><div class="poster-wrap"><img [src]="title.poster" [alt]="'Pôster de '+title.title" loading="lazy"><span class="type-pill">{{title.type}}</span><span class="play">↗</span></div><div class="card-meta"><h3>{{title.title}}</h3><p>{{title.year}} <i>·</i> {{title.genres[0]}}</p></div></a>` })
export class TitleCardComponent { @Input({required:true}) title!: CatalogTitle; }
