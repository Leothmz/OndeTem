import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { SearchComponent } from './pages/search.component';
import { DetailComponent } from './pages/detail.component';
export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Onde Tem? — descubra onde assistir' },
  { path: 'buscar', component: SearchComponent, title: 'Buscar — Onde Tem?' },
  { path: 'titulo/:id', component: DetailComponent },
  { path: '**', redirectTo: '' }
];
