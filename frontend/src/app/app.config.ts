import { ApplicationConfig, InjectionToken } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../backend/src/trpc/trpc.router';
import { routes } from './app.routes';

/**
 * Typed tRPC client injection token.
 *
 * We use the InjectionToken pattern rather than ngx-trpc's provider helper
 * because it gives us full type safety through the AppRouter type without
 * coupling to ngx-trpc's internal API.  The `AppRouter` import is type-only
 * so no backend code is ever bundled into the frontend.
 */
export const TRPC_CLIENT = new InjectionToken<
  ReturnType<typeof createTRPCClient<AppRouter>>
>('TRPC_CLIENT');

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    {
      provide: TRPC_CLIENT,
      useFactory: () =>
        createTRPCClient<AppRouter>({
          links: [
            httpBatchLink({
              url: '/trpc',
            }),
          ],
        }),
    },
  ],
};
