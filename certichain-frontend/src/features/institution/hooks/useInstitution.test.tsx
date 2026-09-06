import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/api', () => ({
  institutionService: {
    listBatches: vi.fn(),
    revokeBatch: vi.fn(),
    issueBatch: vi.fn(),
  },
}))

import { institutionService } from '../api/api'
import { useBatches, useIssueBatch, useRevokeBatch } from './useInstitution'

const svc = vi.mocked(institutionService)

function wrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { Wrapper, invalidateSpy }
}

beforeEach(() => vi.clearAllMocks())

describe('useBatches', () => {
  it('exposes the ApiResponse from listBatches under the institution-batches key', async () => {
    svc.listBatches.mockResolvedValue({
      status: 200,
      data: [{ batchId: 'b1', issuedAt: '2026-01-01T00:00:00Z', total: 10, revoked: 2 }],
    })
    const { Wrapper } = wrapperWithClient()

    const { result } = renderHook(() => useBatches(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0].batchId).toBe('b1')
  })
})

describe('useRevokeBatch', () => {
  it('calls revokeBatch(batchId, reason) and invalidates the related queries', async () => {
    svc.revokeBatch.mockResolvedValue({ status: 200, data: { revoked: 8, alreadyRevoked: 2 } })
    const { Wrapper, invalidateSpy } = wrapperWithClient()

    const { result } = renderHook(() => useRevokeBatch(), { wrapper: Wrapper })
    result.current.mutate({ batchId: 'b1', reason: 'issued in error' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(svc.revokeBatch).toHaveBeenCalledWith('b1', 'issued in error')

    const keys = invalidateSpy.mock.calls.map((c) => (c[0] as { queryKey: string[] }).queryKey[0])
    expect(keys).toEqual(
      expect.arrayContaining([
        'institution-batches',
        'institution-credentials',
        'institution-credential-summary',
      ]),
    )
  })
})

describe('useIssueBatch', () => {
  it('invalidates the batches list on success so a new upload shows up', async () => {
    svc.issueBatch.mockResolvedValue({ status: 200, data: [] })
    const { Wrapper, invalidateSpy } = wrapperWithClient()

    const { result } = renderHook(() => useIssueBatch(), { wrapper: Wrapper })
    result.current.mutate(new File(['x'], 'b.csv'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const keys = invalidateSpy.mock.calls.map((c) => (c[0] as { queryKey: string[] }).queryKey[0])
    expect(keys).toContain('institution-batches')
  })
})
