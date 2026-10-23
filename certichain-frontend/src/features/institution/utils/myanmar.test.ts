import { describe, expect, it } from 'vitest'
import {
  DISTRICTS, NRC_RE, NRC_TOWNSHIP_CODES, PASSPORT_RE, POSTAL_RE, STATE_REGIONS, TOWNSHIPS,
  buildNrc, normalizeMmPhone, parseNrc,
} from './myanmar'

describe('normalizeMmPhone', () => {
  it('canonicalizes every accepted local form to one string', () => {
    for (const raw of ['09123456789', '09 123 456 789', '9123456789', '959123456789', '+95 9123456789', '09-123-456-789']) {
      expect(normalizeMmPhone(raw)).toBe('+959123456789')
    }
  })
  it('rejects numbers that are not Myanmar mobiles', () => {
    for (const raw of ['', '0912', '123456789', '+1 555 0123', 'abc']) {
      expect(normalizeMmPhone(raw)).toBeNull()
    }
  })
  it('is idempotent', () => {
    const once = normalizeMmPhone('09123456789')!
    expect(normalizeMmPhone(once)).toBe(once)
  })
})

describe('NRC', () => {
  it('builds a string the validation regex accepts', () => {
    const nrc = buildNrc({ region: '12', township: 'MaBaNa', type: 'N', serial: '123456' })
    expect(nrc).toBe('12/MaBaNa(N)123456')
    expect(NRC_RE.test(nrc)).toBe(true)
  })
  it('returns empty until every part is chosen', () => {
    expect(buildNrc({ region: '12', township: '', type: 'N', serial: '123456' })).toBe('')
  })
  it('round-trips through parseNrc', () => {
    const parts = { region: '9', township: 'MaHaMa', type: 'TH', serial: '654321' }
    expect(parseNrc(buildNrc(parts))).toEqual(parts)
  })
  it('rejects malformed values', () => {
    for (const bad of ['12/MaBaNa(N)12345', '0/MaBaNa(N)123456', '15/MaBaNa(N)123456', '12-MaBaNa(N)123456', 'MA123456']) {
      expect(NRC_RE.test(bad)).toBe(false)
    }
    expect(parseNrc('nonsense')).toBeNull()
  })
  it('only offers township codes issued under the chosen region', () => {
    const r12 = NRC_TOWNSHIP_CODES.filter(c => c.region === 12)
    expect(r12.length).toBeGreaterThan(0)
    expect(r12.every(c => c.region === 12)).toBe(true)
  })
})

describe('address dataset', () => {
  it('gives every state/region at least one district', () => {
    for (const s of STATE_REGIONS) expect(DISTRICTS[s.value]?.length, s.value).toBeGreaterThan(0)
  })
  it('gives every district at least one township', () => {
    for (const s of STATE_REGIONS) {
      for (const d of DISTRICTS[s.value]) expect(TOWNSHIPS[d.value]?.length, `${s.value}/${d.value}`).toBeGreaterThan(0)
    }
  })
})

describe('formats', () => {
  it('postal code is exactly 5 digits', () => {
    expect(POSTAL_RE.test('11181')).toBe(true)
    for (const bad of ['1118', '111811', '1118a']) expect(POSTAL_RE.test(bad)).toBe(false)
  })
  it('passport is letters then digits', () => {
    expect(PASSPORT_RE.test('MA123456')).toBe(true)
    for (const bad of ['123456', 'MAB123456', 'MA12345']) expect(PASSPORT_RE.test(bad)).toBe(false)
  })
})
