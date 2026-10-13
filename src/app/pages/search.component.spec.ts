import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SearchComponent } from './search.component';
describe('SearchComponent', () => { let fixture: ComponentFixture<SearchComponent>; beforeEach(async()=>{await TestBed.configureTestingModule({imports:[SearchComponent],providers:[provideRouter([])]}).compileComponents(); fixture=TestBed.createComponent(SearchComponent);}); it('renders the empty state without a query',()=>{fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Digite para começar');}); });
