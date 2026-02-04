import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { SpeedInsights } from '@vercel/speed-insights/react';

import Header from '../components/Header';

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools';

import AiDevtools from '../lib/ai-devtools';

import StoreDevtools from '../lib/demo-store-devtools';

import { getLocale } from '@/paraglide/runtime';

import appCss from '../styles.css?url';

import type { QueryClient } from '@tanstack/react-query';

import type { AuthStore } from '@/lib/auth-store';

interface MyRouterContext {
  queryClient: QueryClient;
  auth: AuthStore;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async ({ context }) => {
    await context.auth.ensureSession();
    // Other redirect strategies are possible; see
    // https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#offline-redirect
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', getLocale());
    }
  },

  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  notFoundComponent: () => {
    return (
      <div className='p-4'>
        <h1>404 - Not Found</h1>
        <p>The page you are looking for does not exist.</p>
      </div>
    );
  },

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()}>
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        {children}
        <SpeedInsights />
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
            AiDevtools,
            StoreDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
