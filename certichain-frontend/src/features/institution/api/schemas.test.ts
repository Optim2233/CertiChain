import { describe, expect, it } from 'vitest'
import { revokeCredentialSchema, updateInstitutionSchema } from './schemas'

describe('revokeCredentialSchema', () => {
  it('trims and accepts a real reason', () => {
    expect(revokeCredentialSchema.parse({ reason: '  fraud confirmed ' }))
      .toEqual({ reason: 'fraud confirmed' })
  })

  it('rejects empty / whitespace-only reasons', () => {
    expect(() => revokeCredentialSchema.parse({ reason: '' })).toThrow()
    expect(() => revokeCredentialSchema.parse({ reason: '   ' })).toThrow()
    expect(() => revokeCredentialSchema.parse({})).toThrow()
  })
})

describe('updateInstitutionSchema', () => {
  it('keeps "" distinct from undefined for profileImageUrl and brandColor', () => {
    // "" is the "clear this field" signal from the settings page; it must survive parsing.
    const cleared = updateInstitutionSchema.parse({ profileImageUrl: '', brandColor: '' })
    expect(cleared.profileImageUrl).toBe('')
    expect(cleared.brandColor).toBe('')

    const untouched = updateInstitutionSchema.parse({ name: 'UIT' })
    expect(untouched.profileImageUrl).toBeUndefined()
    expect(untouched.brandColor).toBeUndefined()
  })

  it('accepts a valid #RRGGBB brand colour and rejects a malformed one', () => {
    expect(updateInstitutionSchema.parse({ brandColor: '#1a1a2e' }).brandColor).toBe('#1a1a2e')
    expect(() => updateInstitutionSchema.parse({ brandColor: 'purple' })).toThrow()
  })

  it('constrains accentPattern to the three allowed values', () => {
    expect(updateInstitutionSchema.parse({ accentPattern: 'dots' }).accentPattern).toBe('dots')
    expect(() => updateInstitutionSchema.parse({ accentPattern: 'sparkles' })).toThrow()
  })
})
