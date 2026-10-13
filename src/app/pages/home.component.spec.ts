import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HomeComponent } from './home.component';
import { CatalogService } from '../services/catalog.service';
import { catalogTitle } from '../testing/catalog-fixtures';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let home: jasmine.Spy;

  beforeEach(async () => {
    home = jasmine.createSpy('home');
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), { provide: CatalogService, useValue: { home } }]
    }).compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
  });

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('renders featured, trending and coming-soon rails from the API', () => {
    const featured = catalogTitle({ featured: true });
    home.and.returnValue(of({ featured, trending: [featured, catalogTitle({ id: 'tv-1', title: 'Ruptura' })], comingSoon: [catalogTitle({ id: 'movie-2', title: 'Futuro', comingSoon: true })] }));
    fixture.detectChanges();
    expect(text()).toContain('EM DESTAQUE');
    expect(text()).toContain('Ruptura');
    expect(text()).toContain('Em breve no cinema');
    expect(fixture.nativeElement.querySelectorAll('ot-title-card').length).toBe(3);
    expect(fixture.nativeElement.querySelector('.hero').style.backgroundImage).toContain('w1280/b.jpg');
  });

  it('shows a retryable error state and keeps search and genres usable', () => {
    home.and.returnValue(throwError(() => new Error('down')));
    fixture.detectChanges();
    expect(text()).toContain('Não foi possível carregar o catálogo');
    expect(fixture.nativeElement.querySelector('ot-search-box')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.genre-chip').length).toBe(4);
    home.and.returnValue(of({ featured: null, trending: [], comingSoon: [] }));
    (fixture.nativeElement.querySelector('button.retry') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(home).toHaveBeenCalledTimes(2);
    expect(text()).toContain('Nada em alta por aqui ainda');
    expect(text()).not.toContain('Em breve no cinema');
  });
});
