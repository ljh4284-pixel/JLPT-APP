import { describe, expect, it } from 'vitest'
import { wordsN5 } from '../data/words'
import { canMakeQuestion, isValidReading, makeDistractors, ruleOrder, toMorae } from './distractors'

const byWord = (w: string) => {
  const found = wordsN5.find((x) => x.word === w)
  if (!found) throw new Error(`단어장에 없음: ${w}`)
  return found
}

describe('모라 나누기와 유효성', () => {
  it('요음·촉음·ん 을 올바른 단위로 나눈다', () => {
    expect(toMorae('びょういん')).toEqual(['びょ', 'う', 'い', 'ん'])
    expect(toMorae('がっこう')).toEqual(['が', 'っ', 'こ', 'う'])
  })

  it('가나 조합으로 불가능한 형태를 거른다', () => {
    expect(isValidReading('がっこう')).toBe(true)
    expect(isValidReading('きゃ')).toBe(true)
    expect(isValidReading('っき')).toBe(false)   // 촉음으로 시작
    expect(isValidReading('きっ')).toBe(false)   // 촉음으로 끝
    expect(isValidReading('さゃ')).toBe(false)   // い단이 아닌 글자 뒤의 요음
    expect(isValidReading('っあ')).toBe(false)
    expect(isValidReading('ん')).toBe(false)
    expect(isValidReading('')).toBe(false)
  })
})

describe('오답 생성 규칙', () => {
  it('confusion 태그의 규칙을 먼저 쓰고 순서 바꾸기는 마지막이다', () => {
    expect(ruleOrder(['yoon', 'long'])).toEqual(['yoon', 'long', 'dakuten', 'handakuten', 'sokuon', 'order'])
    expect(ruleOrder([])).toEqual(['dakuten', 'handakuten', 'sokuon', 'yoon', 'long', 'order'])
  })

  it('学校: 촉음·장음 태그가 먼저 적용된다', () => {
    const d = makeDistractors(byWord('学校'))
    expect(d.map((x) => x.text)).toEqual(['がこう', 'がっこ', 'かっこう'])
    expect(d[0].hint).toBe('촉음 → っこ')
    expect(d[2].hint).toBe('탁음 → が')
  })

  it('天気: 태그가 없으면 탁음 변형(JLPT 공식 예시 てんき/でんき)이 먼저다', () => {
    const texts = makeDistractors(byWord('天気')).map((x) => x.text)
    expect(texts).toContain('でんき')
    expect(texts).toContain('てんぎ')
  })

  it('ん 바로 뒤에는 촉음을 넣지 않는다', () => {
    for (const w of wordsN5) {
      for (const d of makeDistractors(w)) expect(d.text).not.toMatch(/んっ/)
    }
  })

  it('오답은 정답과 다르고 서로 다르며 모두 유효한 형태다', () => {
    for (const w of wordsN5) {
      const d = makeDistractors(w)
      const texts = d.map((x) => x.text)
      expect(texts).not.toContain(w.reading)
      expect(new Set(texts).size).toBe(texts.length)
      for (const t of texts) expect(isValidReading(t)).toBe(true)
      for (const x of d) expect(x.hint).toMatch(/→/)
    }
  })

  it('N5 50개 중 유효 오답이 3개 미만인 단어는 電話·見る·買う 뿐이다', () => {
    const excluded = wordsN5.filter((w) => !canMakeQuestion(w)).map((w) => w.word)
    expect(excluded).toEqual(['電話', '見る', '買う'])
  })

  it('같은 단어에는 항상 같은 오답이 나온다 (무작위 없음)', () => {
    const w = byWord('病院')
    expect(makeDistractors(w)).toEqual(makeDistractors(w))
  })
})
