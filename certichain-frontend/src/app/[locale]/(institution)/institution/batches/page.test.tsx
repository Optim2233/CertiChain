import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { makeWrapper } from '@/test/query-wrapper'

const mutate = vi.fn()

vi.mock('@/features/institution', () => ({
  useBatches: vi.fn(),
  useRevokeBatch: vi.fn(() => ({ mutate, isPending: false })),
}))

import { useBatches } from '@/features/institution'
import BatchesPage from './page'

const useBatchesMock = vi.mocked(useBatches)

function batchesResult(overrides: Partial<ReturnType<typeof useBatches>> = {}) {
  return {
    isLoading: false,
    isError: false,
    data: { data: [{ batchId: 'b1', issuedAt: '2026-01-01T10:00:00Z', total: 10, revoked: 2 }] },
    ...overrides,
  } as ReturnType<typeof useBatches>
}

beforeEach(() => {
  vi.clearAllMocks()
  useBatchesMock.mockReturnValue(batchesResult())
})

describe('BatchesPage', () => {
  it('renders a batch row with the revoked chip', () => {
    render(<BatchesPage />, { wrapper: makeWrapper() })

    expect(screen.getByRole('heading', { name: 'Batches' })).toBeInTheDocument()
    expect(screen.getByText('2 / 10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revoke batch' })).toBeInTheDocument()
  })

  it('shows the empty state when there are no batches', () => {
    useBatchesMock.mockReturnValue(batchesResult({ data: { data: [] } } as never))
    render(<BatchesPage />, { wrapper: makeWrapper() })
    expect(screen.getByText('No batches issued yet.')).toBeInTheDocument()
  })

  it('shows the loading skeleton', () => {
    useBatchesMock.mockReturnValue(batchesResult({ isLoading: true, data: undefined } as never))
    render(<BatchesPage />, { wrapper: makeWrapper() })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows the error state', () => {
    useBatchesMock.mockReturnValue(batchesResult({ isError: true, data: undefined } as never))
    render(<BatchesPage />, { wrapper: makeWrapper() })
    expect(screen.getByText("Couldn't load batches.")).toBeInTheDocument()
  })

  it('hides the revoke button for a fully-revoked batch', () => {
    useBatchesMock.mockReturnValue(batchesResult({
      data: { data: [{ batchId: 'b1', issuedAt: '2026-01-01T10:00:00Z', total: 5, revoked: 5 }] },
    } as never))
    render(<BatchesPage />, { wrapper: makeWrapper() })
    expect(screen.queryByRole('button', { name: 'Revoke batch' })).not.toBeInTheDocument()
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
  })

  it('blocks revoke until a reason is entered, then calls mutate with batchId + reason', async () => {
    const user = userEvent.setup()
    render(<BatchesPage />, { wrapper: makeWrapper() })

    await user.click(screen.getByRole('button', { name: 'Revoke batch' }))

    const dialog = screen.getByText(/Revoke this batch of 8 credentials\?/).closest('div') as HTMLElement

    // empty reason -> validation message, no mutate
    await user.click(within(dialog).getByRole('button', { name: 'Revoke batch' }))
    expect(screen.getByText('A reason is required before revoking.')).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()

    await user.type(within(dialog).getByRole('textbox'), 'accreditation lapsed')
    await user.click(within(dialog).getByRole('button', { name: 'Revoke batch' }))

    expect(mutate).toHaveBeenCalledWith(
      { batchId: 'b1', reason: 'accreditation lapsed' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    )
  })

  it('toasts the revoked / already-revoked counts on success', async () => {
    const user = userEvent.setup()
    render(<BatchesPage />, { wrapper: makeWrapper() })

    await user.click(screen.getByRole('button', { name: 'Revoke batch' }))
    const dialog = screen.getByText(/Revoke this batch of 8 credentials\?/).closest('div') as HTMLElement
    await user.type(within(dialog).getByRole('textbox'), 'reason')
    await user.click(within(dialog).getByRole('button', { name: 'Revoke batch' }))

    // fire the onSuccess callback the page passed to mutate
    const onSuccess = mutate.mock.calls[0][1].onSuccess as (r: unknown) => void
    onSuccess({ data: { revoked: 6, alreadyRevoked: 2 } })

    expect(toast.success).toHaveBeenCalledWith('6 revoked, 2 already revoked')
  })
})
