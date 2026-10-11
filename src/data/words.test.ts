import { describe, expect, it } from 'vitest'
import { availableLevels, hasWordList, LEVELS, loadWords } from './words'

describe('급수별 단어장 로딩', () => {
  it('급수 순서는 쉬운 순이다', () => {
    expect(LEVELS).toEqual(['N5', 'N4', 'N3', 'N2', 'N1'])
  })

  it('준비된 급수만 불러온다', async () => {
    expect(hasWordList('N5')).toBe(true)
    expect(availableLevels()).toContain('N5')
    const n5 = await loadWords('N5')
    expect(n5.length).toBeGreaterThanOrEqual(50)
    expect(n5[0].id).toBe('n5-0001')
    expect(n5.every((w) => w.level === 'N5')).toBe(true)
    expect(await loadWords('N9')).toEqual([])
  })

  it('id 는 급수 접두사 + 4자리이고 겹치지 않는다', async () => {
    const n5 = await loadWords('N5')
    for (const w of n5) expect(w.id).toMatch(/^n5-\d{4}$/)
    expect(new Set(n5.map((w) => w.id)).size).toBe(n5.length)
  })
})
