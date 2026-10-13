import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SearchComponent } from './search.component';
describe('SearchComponent', () => {
  let fixture: ComponentFixture<SearchComponent>;
  let queryParams: BehaviorSubject<Record<string, string>>;
  beforeEach(async () => {
    queryParams = new BehaviorSubject<Record<string, string>>({});
    await TestBed.configureTestingModule({
      imports: [SearchComponent],
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { queryParams } }]
    }).compileComponents();
    fixture = TestBed.createComponent(SearchComponent);
  });
  it('renders the empty state without a query', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Digite para começar');
  });
  it('clears the loading state immediately when the search query is removed', fakeAsync(() => {
    fixture.detectChanges();
    queryParams.next({ q: 'duna' });
    expect(fixture.componentInstance.loading).toBeTrue();
    queryParams.next({});
    expect(fixture.componentInstance.loading).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Digite para começar');
    tick(280);
  }));
});
