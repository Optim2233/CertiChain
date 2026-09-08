import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/config/axioconfig', () => ({
  API_BASE_URL: 'http://test.local',
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    postMultipart: vi.fn(),
    putMultipart: vi.fn(),
  },
}))

import { apiClient } from '@/shared/config/axioconfig'
import { institutionService } from './api'

const client = vi.mocked(apiClient)

beforeEach(() => vi.clearAllMocks())

describe('institutionService batch methods', () => {
  it('listBatches GETs the batches endpoint', async () => {
    client.get.mockResolvedValue({ status: 200, data: [] })

    await institutionService.listBatches()

    expect(client.get).toHaveBeenCalledWith('/api/institution/credentials/batches', undefined)
  })

  it('revokeBatch POSTs to the per-batch revoke endpoint with a parsed reason', async () => {
    client.post.mockResolvedValue({ status: 200, data: { revoked: 3, alreadyRevoked: 0 } })

    await institutionService.revokeBatch('batch-1', '  accreditation lapsed  ')

    expect(client.post).toHaveBeenCalledWith(
      '/api/institution/credentials/batches/batch-1/revoke',
      { reason: 'accreditation lapsed' }, // schema trims
      undefined,
    )
  })

  it('revokeBatch rejects a blank reason before any HTTP call', async () => {
    await expect(institutionService.revokeBatch('batch-1', '   ')).rejects.toThrow()
    expect(client.post).not.toHaveBeenCalled()
  })

  it('issueBatch sends the file as multipart FormData', async () => {
    client.postMultipart.mockResolvedValue({ status: 200, data: [] })
    const file = new File(['graduate_email,degree\na@x.com,BSc'], 'batch.csv', { type: 'text/csv' })

    await institutionService.issueBatch(file)

    expect(client.postMultipart).toHaveBeenCalledTimes(1)
    const [endpoint, formData] = client.postMultipart.mock.calls[0]
    expect(endpoint).toBe('/api/institution/credentials/batch')
    expect(formData).toBeInstanceOf(FormData)
    expect((formData as FormData).get('file')).toBe(file)
  })
})
