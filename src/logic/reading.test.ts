import { describe, expect, it } from 'vitest'
import { judgeReading, kataToHira, normalizeReading } from './reading'

describe('읽기 정규화·판정', () => {
  it('가타카나를 히라가나로 바꾼다 (ー 는 그대로)', () => {
    expect(kataToHira('ガッコウ')).toBe('がっこう')
    expect(kataToHira('ラーメン')).toBe('らーめん')
    expect(kataToHira('がっこう')).toBe('がっこう')
  })

  it('앞뒤 공백(전각 포함)을 지운다', () => {
    expect(normalizeReading('  せんせい ')).toBe('せんせい')
    expect(normalizeReading('　きょう　')).toBe('きょう')
  })

  it('읽기 기준으로 판정한다', () => {
    expect(judgeReading('がっこう', 'がっこう')).toBe(true)
    expect(judgeReading('ガッコウ', 'がっこう')).toBe(true)
    expect(judgeReading(' がっこう', 'がっこう')).toBe(true)
    expect(judgeReading('がこう', 'がっこう')).toBe(false)
    expect(judgeReading('', 'がっこう')).toBe(false)
  })
})
