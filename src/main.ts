import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withViewTransitions } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
bootstrapApplication(AppComponent, { providers: [provideRouter(routes, withViewTransitions()), provideHttpClient(withFetch())] }).catch(console.error);
