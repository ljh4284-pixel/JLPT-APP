import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, normalizeSettings, typeCycle, weightsFor } from './settings'

describe('설정', () => {
  it('비중을 출제 순서로 바꾼다', () => {
    expect(typeCycle({ A: 2, B: 1, C: 1 })).toEqual(['A', 'B', 'C', 'A'])
    expect(typeCycle({ A: 1, B: 0, C: 1 })).toEqual(['A', 'C'])
    expect(typeCycle({ A: 0, B: 0, C: 0 })).toEqual(['A'])
    expect(typeCycle({ A: 3, B: 0, C: 0 })).toEqual(['A', 'A', 'A'])
  })

  it('없거나 이상한 값은 기본값과 범위 안으로 맞춘다', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    const s = normalizeSettings({ newPerDay: 99, inputMode: 'kana', weightsByLevel: { N5: { A: -1, B: 7, C: 'x' } } })
    expect(s.newPerDay).toBe(20)
    expect(s.inputMode).toBe('kana')
    expect(s.weightsByLevel.N5).toEqual({ A: 0, B: 3, C: 1 })
    expect(s.weightsByLevel.N4).toEqual(DEFAULT_SETTINGS.weightsByLevel.N4)
    expect(s.voice).toBe(DEFAULT_SETTINGS.voice)
    expect(s.level).toBe('N5')
    expect(s.onboarded).toBe(false)
    expect(normalizeSettings({ level: 'N3', onboarded: true }).level).toBe('N3')
    expect(normalizeSettings({ level: 'N9' }).level).toBe('N5')
  })

  it('모르는 급수는 N5 기본 비중을 쓴다', () => {
    expect(weightsFor(DEFAULT_SETTINGS, 'N9')).toEqual(DEFAULT_SETTINGS.weightsByLevel.N5)
  })
})
