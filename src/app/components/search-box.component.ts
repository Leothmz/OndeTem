import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
@Component({ selector:'ot-search-box', standalone:true, imports:[FormsModule], template:`<form class="search-box" (ngSubmit)="submit()"><label for="catalog-search">O que você quer assistir?</label><div class="input-row"><span aria-hidden="true">⌕</span><input id="catalog-search" name="query" [(ngModel)]="query" placeholder="Busque por título, gênero..." autocomplete="off"><button type="submit">Buscar <span>→</span></button></div></form>` })
export class SearchBoxComponent { @Output() searched = new EventEmitter<string>(); query=''; constructor(private router:Router){} submit(){ const value=this.query.trim(); if(value){ this.searched.emit(value); this.router.navigate(['/buscar'],{queryParams:{q:value}}); } } }
