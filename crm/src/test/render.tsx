import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, User } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';

export interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  route?: string;
  user?: Partial<User> | null;
  queryClient?: QueryClient;
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

import { setMockUser } from './handlers/auth';

export function renderWithProviders(
  ui: ReactElement,
  options: ExtendedRenderOptions = {}
) {
  const {
    route = '/',
    user = {
      id: 1,
      email: 'owner@test.local',
      name: 'Test Owner',
      role: 'owner',
      permissions: { '*': 'all' },
    },
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  if (user) {
    setMockUser(user as Parameters<typeof setMockUser>[0]);
  } else {
    setMockUser(null);
  }


  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider initialUser={user as User | null}>
              <MemoryRouter initialEntries={[route]}>
                {children}
              </MemoryRouter>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}
