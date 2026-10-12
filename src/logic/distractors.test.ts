import { describe, expect, it } from 'vitest'
import type { Word } from '../types'
import wordsJson from '../data/words_n5.json'
import n4Json from '../data/words_n4.json'
import { BROAD_TAGS, canMakeQuestion, isValidReading, makeDistractors, otherWordCandidates, ruleOrder, toMorae } from './distractors'

const wordsN5 = wordsJson as Word[]
const wordsN4 = n4Json as Word[]
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

  it('처음 50개 중 유효 오답이 3개 미만인 단어는 電話·見る·買う 뿐이다', () => {
    const first50 = wordsN5.filter((w) => w.id <= 'n5-0050')
    const excluded = first50.filter((w) => !canMakeQuestion(w)).map((w) => w.word)
    expect(excluded).toEqual(['電話', '見る', '買う'])
  })

  it('전체 단어 중 읽기 고르기를 낼 수 있는 단어가 80% 이상이다', () => {
    const ok = wordsN5.filter((w) => canMakeQuestion(w)).length
    expect(ok / wordsN5.length).toBeGreaterThanOrEqual(0.8)
  })

  it('같은 단어에는 항상 같은 오답이 나온다 (무작위 없음)', () => {
    const w = byWord('病院')
    expect(makeDistractors(w)).toEqual(makeDistractors(w))
  })
})

describe('N4 이상: 다른 단어 읽기 오답 (PROJECT.md 3장 B)', () => {
  const byN4 = (w: string) => {
    const found = wordsN4.find((x) => x.word === w)
    if (!found) throw new Error(`단어장에 없음: ${w}`)
    return found
  }

  it('入院: 한자·분야를 공유하는 다른 단어 읽기 2개 + 소리 변형 1개', () => {
    const d = makeDistractors(byN4('入院'), 3, wordsN4)
    expect(d.map((x) => [x.text, x.rule, x.hint])).toEqual([
      ['たいいん', 'other', '다른 단어 → 退院'],
      ['にゅうがく', 'other', '다른 단어 → 入学'],
      ['にゆういん', 'yoon', '요음 → にゅ'],
    ])
  })

  it('以上: 以内·以外 처럼 한자를 공유하는 단어가 먼저 온다', () => {
    const texts = makeDistractors(byN4('以上'), 3, wordsN4).map((x) => x.text)
    expect(texts.slice(0, 2)).toEqual(['いない', 'いがい'])
  })

  it('후보는 같은 품사이고 혼동 이유(한자 공유 / 읽기 비슷 / 같은 분야+같은 길이+같은 끝)가 있는 단어만이다', () => {
    const w = byN4('通る')
    const cands = otherWordCandidates(w, wordsN4)
    expect(cands.length).toBeGreaterThan(0)
    const len = toMorae(w.reading).length
    for (const c of cands) {
      expect(c.word.pos).toBe(w.pos)
      expect(c.word.reading).not.toBe(w.reading)
      const m = toMorae(c.word.reading)
      const sharesKanji = Array.from(c.word.word).some((ch) => ch >= '一' && ch <= '龥' && w.word.includes(ch))
      const narrowTag = c.word.tags.some((t) => !BROAD_TAGS.has(t) && w.tags.includes(t))
      const sameLast = m[m.length - 1] === toMorae(w.reading)[len - 1]
      if (c.reason === 'kanji') expect(sharesKanji).toBe(true)
      if (c.reason === 'reading') expect(m.length).toBe(len)
      if (c.reason === 'field') expect(narrowTag && m.length === len && sameLast).toBe(true)
    }
    // 넓은 태그(basic)만 공유하는 단어는 후보가 아니다
    const words = cands.map((c) => c.word.word)
    expect(words).not.toContain('出席')
  })

  it('같은 표기의 다른 유효 읽기(alt_readings)는 오답으로 쓰지 않는다', () => {
    const w = byWord('明日')                   // あした, 다른 읽기 あす
    expect(w.alt_readings).toContain('あす')
    const n5 = wordsN5
    expect(makeDistractors(w, 3, n5).map((x) => x.text)).not.toContain('あす')
    const withAlt = wordsN4.filter((x) => (x.alt_readings ?? []).length > 0)
    for (const x of withAlt) {
      const texts = makeDistractors(x, 3, wordsN4).map((d) => d.text)
      for (const a of x.alt_readings ?? []) expect(texts).not.toContain(a)
    }
  })

  it('다른 단어 읽기 오답은 모두 단어장에 있는 같은 품사 단어의 읽기이고, 전체가 유효하다', () => {
    const keys = new Set(wordsN4.map((x) => x.reading + '|' + x.pos))
    for (const w of wordsN4) {
      const d = makeDistractors(w, 3, wordsN4)
      const texts = d.map((x) => x.text)
      expect(texts).not.toContain(w.reading)
      expect(new Set(texts).size).toBe(texts.length)
      for (const x of d) {
        expect(isValidReading(x.text)).toBe(true)
        expect(x.hint).toMatch(/→/)
        if (x.rule === 'other') expect(keys.has(x.text + '|' + w.pos)).toBe(true)
      }
    }
  })

  it('N4 단어의 95% 이상이 읽기 고르기를 낼 수 있고, 70% 이상은 다른 단어 오답이 2개다', () => {
    const ok = wordsN4.filter((w) => canMakeQuestion(w, wordsN4)).length
    expect(ok / wordsN4.length).toBeGreaterThanOrEqual(0.95)
    const two = wordsN4.filter((w) => makeDistractors(w, 3, wordsN4).filter((x) => x.rule === 'other').length === 2).length
    expect(two / wordsN4.length).toBeGreaterThanOrEqual(0.7)
  })

  it('소리 변형만으로 부족한 N4 단어(以内)도 다른 단어 읽기로 문제를 낼 수 있고, 억지 후보뿐인 단어(血)는 제외한다', () => {
    const inai = byN4('以内')
    expect(canMakeQuestion(inai)).toBe(false)
    expect(canMakeQuestion(inai, wordsN4)).toBe(true)
    expect(canMakeQuestion(byN4('血'), wordsN4)).toBe(false)
  })

  it('N5 는 단어장을 넘겨도 소리 변형만 쓴다 (기존 결과와 같음)', () => {
    for (const w of wordsN5) expect(makeDistractors(w, 3, wordsN5)).toEqual(makeDistractors(w))
    expect(canMakeQuestion(byWord('電話'), wordsN5)).toBe(false)
  })

  it('같은 단어·같은 단어장에는 항상 같은 오답이 나온다', () => {
    const w = byN4('召し上がる')
    expect(makeDistractors(w, 3, wordsN4)).toEqual(makeDistractors(w, 3, wordsN4))
    expect(makeDistractors(w, 3, wordsN4).map((x) => x.text)).toEqual(['さしあげる', 'もうしあげる', 'めじあがる'])
  })
})
