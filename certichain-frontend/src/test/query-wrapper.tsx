import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import en from '../../messages/en.json'

/**
 * A throwaway QueryClient per call, retries off so error-path tests fail fast.
 * Never use the app's getQueryClient() singleton in tests - it leaks state between them.
 * Includes NextIntlClientProvider so useTranslations works under test (locale en).
 */
export function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={en}>
          {children}
        </NextIntlClientProvider>
      </QueryClientProvider>
    )
  }
}
