import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { makeWrapper } from '@/test/query-wrapper'

const revokeMutate = vi.fn()
const unrevokeMutate = vi.fn()

vi.mock('@/features/institution', () => ({
  useBatches: vi.fn(),
  useBatchMembers: vi.fn(),
  useRevokeBatch: vi.fn(() => ({ mutate: revokeMutate, isPending: false })),
  useUnrevokeBatch: vi.fn(() => ({ mutate: unrevokeMutate, isPending: false })),
}))

import { useBatches, useBatchMembers } from '@/features/institution'
import BatchesPage from './page'

const useBatchesMock = vi.mocked(useBatches)
const useBatchMembersMock = vi.mocked(useBatchMembers)

function batchesResult(overrides: Partial<ReturnType<typeof useBatches>> = {}) {
  return {
    isLoading: false,
    isError: false,
    data: { data: [{ batchId: 'b1', batchName: null, issuedAt: '2026-01-01T10:00:00Z', total: 10, revoked: 2 }] },
    ...overrides,
  } as ReturnType<typeof useBatches>
}

function membersResult(overrides: Partial<ReturnType<typeof useBatchMembers>> = {}) {
  return {
    isLoading: false,
    data: {
      data: [
        { id: 'c1', graduateEmail: 'active@example.com', status: 'ISSUED' },
        { id: 'c2', graduateEmail: 'revoked@example.com', status: 'REVOKED' },
      ],
    },
    ...overrides,
  } as ReturnType<typeof useBatchMembers>
}

beforeEach(() => {
  vi.clearAllMocks()
  useBatchesMock.mockReturnValue(batchesResult())
  useBatchMembersMock.mockReturnValue(membersResult())
})

describe('BatchesPage', () => {
  it('renders a batch row with the revoked chip and untitled-batch fallback', () => {
    render(<BatchesPage />, { wrapper: makeWrapper() })

    expect(screen.getByRole('heading', { name: 'Batches' })).toBeInTheDocument()
    expect(screen.getByText('Untitled batch')).toBeInTheDocument()
    expect(screen.getByText('2 / 10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revoke batch' })).toBeInTheDocument()
  })

  it('shows the batch name when set', () => {
    useBatchesMock.mockReturnValue(batchesResult({
      data: { data: [{ batchId: 'b1', batchName: 'Fall 2026 Cohort', issuedAt: '2026-01-01T10:00:00Z', total: 10, revoked: 2 }] },
    } as never))
    render(<BatchesPage />, { wrapper: makeWrapper() })
    expect(screen.getByText('Fall 2026 Cohort')).toBeInTheDocument()
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

  it('hides the revoke button for a fully-revoked batch and shows restore', () => {
    useBatchesMock.mockReturnValue(batchesResult({
      data: { data: [{ batchId: 'b1', batchName: null, issuedAt: '2026-01-01T10:00:00Z', total: 5, revoked: 5 }] },
    } as never))
    render(<BatchesPage />, { wrapper: makeWrapper() })
    expect(screen.queryByRole('button', { name: 'Revoke batch' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restore batch' })).toBeInTheDocument()
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
    expect(revokeMutate).not.toHaveBeenCalled()

    await user.type(within(dialog).getByRole('textbox'), 'accreditation lapsed')
    await user.click(within(dialog).getByRole('button', { name: 'Revoke batch' }))

    expect(revokeMutate).toHaveBeenCalledWith(
      { batchId: 'b1', reason: 'accreditation lapsed', credentialIds: undefined },
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
    const onSuccess = revokeMutate.mock.calls[0][1].onSuccess as (r: unknown) => void
    onSuccess({ data: { revoked: 6, alreadyRevoked: 2 } })

    expect(toast.success).toHaveBeenCalledWith('6 revoked, 2 already revoked')
  })

  it('opens the restore modal and calls unrevoke mutate with selected members', async () => {
    const user = userEvent.setup()
    useBatchesMock.mockReturnValue(batchesResult({
      data: { data: [{ batchId: 'b1', batchName: null, issuedAt: '2026-01-01T10:00:00Z', total: 5, revoked: 5 }] },
    } as never))
    render(<BatchesPage />, { wrapper: makeWrapper() })

    await user.click(screen.getByRole('button', { name: 'Restore batch' }))
    const dialog = screen.getByText(/Restore 5 credentials in this batch\?/).closest('div') as HTMLElement
    await user.click(within(dialog).getByRole('button', { name: 'Restore batch' }))

    expect(unrevokeMutate).toHaveBeenCalledWith(
      { batchId: 'b1', credentialIds: undefined },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    )
  })
})
