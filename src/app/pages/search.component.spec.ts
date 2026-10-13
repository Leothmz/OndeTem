import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, Subject, of, throwError } from 'rxjs';
import { SearchComponent } from './search.component';
import { CatalogService } from '../services/catalog.service';
import { CatalogTitle } from '../models';
import { catalogTitle } from '../testing/catalog-fixtures';

describe('SearchComponent', () => {
  let fixture: ComponentFixture<SearchComponent>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let search: jasmine.Spy<(query: string) => Observable<CatalogTitle[]>>;

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({}));
    search = jasmine.createSpy('search');
    await TestBed.configureTestingModule({
      imports: [SearchComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: params } },
        { provide: CatalogService, useValue: { search } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(SearchComponent);
  });

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('renders the welcome state without a query', () => {
    fixture.detectChanges();
    expect(text()).toContain('Digite para começar');
    expect(search).not.toHaveBeenCalled();
  });

  it('shows loading, then results from the API', () => {
    const response = new Subject<CatalogTitle[]>();
    search.and.returnValue(response);
    params.next(convertToParamMap({ q: 'duna' }));
    fixture.detectChanges();
    expect(text()).toContain('Consultando o catálogo');
    response.next([catalogTitle()]);
    response.complete();
    fixture.detectChanges();
    expect(search).toHaveBeenCalledWith('duna');
    expect(text()).toContain('Resultados para');
    expect(text()).toContain('1 título encontrado');
    expect(fixture.nativeElement.querySelectorAll('ot-title-card').length).toBe(1);
  });

  it('shows the empty state when nothing matches', () => {
    search.and.returnValue(of([]));
    params.next(convertToParamMap({ q: 'zzz' }));
    fixture.detectChanges();
    expect(text()).toContain('Não encontramos esse título');
  });

  it('shows an error state with retry when the API fails', () => {
    search.and.returnValue(throwError(() => new Error('down')));
    params.next(convertToParamMap({ q: 'duna' }));
    fixture.detectChanges();
    expect(text()).toContain('Não foi possível consultar o catálogo');
    search.and.returnValue(of([catalogTitle()]));
    (fixture.nativeElement.querySelector('button.retry') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(search).toHaveBeenCalledTimes(2);
    expect(text()).toContain('Resultados para');
  });

  it('ignores a stale response after the query changes', () => {
    const first = new Subject<CatalogTitle[]>();
    search.and.returnValues(first, of([catalogTitle({ id: 'tv-1', title: 'Ruptura', type: 'Série' })]));
    params.next(convertToParamMap({ q: 'duna' }));
    fixture.detectChanges();
    params.next(convertToParamMap({ q: 'ruptura' }));
    first.next([catalogTitle()]);
    fixture.detectChanges();
    expect(text()).toContain('Ruptura');
    expect(text()).not.toContain('Duna: Parte Dois');
  });
});
