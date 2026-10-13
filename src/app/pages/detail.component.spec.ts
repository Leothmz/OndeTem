import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DetailComponent } from './detail.component';
import { CatalogService } from '../services/catalog.service';
import { catalogTitle } from '../testing/catalog-fixtures';

describe('DetailComponent', () => {
  let fixture: ComponentFixture<DetailComponent>;
  let getById: jasmine.Spy;

  beforeEach(async () => {
    getById = jasmine.createSpy('getById');
    await TestBed.configureTestingModule({
      imports: [DetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'movie-693134' })) } },
        { provide: CatalogService, useValue: { getById } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(DetailComponent);
  });

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('renders a TMDB title without claiming streaming availability', () => {
    getById.and.returnValue(of(catalogTitle({ cast: ['Zendaya'] })));
    fixture.detectChanges();
    expect(getById).toHaveBeenCalledWith('movie-693134');
    expect(text()).toContain('Duna: Parte Dois');
    expect(text()).toContain('Zendaya');
    expect(text()).toContain('Ainda não temos informações de onde assistir');
    expect(text()).not.toContain('Dados demonstrativos');
  });

  it('labels demo availability as demonstrative', () => {
    getById.and.returnValue(of(catalogTitle({ availabilityStatus: 'demo', availability: [{ service: 'Max', access: 'subscription', color: '#000' }] })));
    fixture.detectChanges();
    expect(text()).toContain('Dados demonstrativos');
    expect(text()).toContain('Incluído na assinatura');
  });

  it('shows not-found and error states', () => {
    getById.and.returnValue(of(null));
    fixture.detectChanges();
    expect(text()).toContain('Título não encontrado');

    getById.and.returnValue(throwError(() => new Error('502')));
    fixture.componentInstance.load();
    fixture.detectChanges();
    expect(text()).toContain('Não foi possível carregar este título');
  });

  it('falls back to an initial when there is no poster', () => {
    getById.and.returnValue(of(catalogTitle({ poster: '', backdrop: '', year: null })));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.detail-poster-fallback')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.kicker').textContent.trim()).toBe('Filme');
  });
});
