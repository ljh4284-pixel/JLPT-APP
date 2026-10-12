import { describe, expect, it } from 'vitest'
import { finalizeRomaji, romajiToHiragana } from './romaji'

/** 일본어 IME(Microsoft IME) 와 같은 규칙임을 고정하는 테스트. 바꾸려면 PROJECT.md 3장 C 의 결정을 먼저 바꾼다 */
describe('로마자 입력 규칙 (일본어 IME 방식)', () => {
  it('촉음·요음·장음은 가나 철자대로 친다', () => {
    expect(romajiToHiragana('yukkuri')).toBe('ゆっくり')
    expect(romajiToHiragana('gakkou')).toBe('がっこう')
    expect(romajiToHiragana('kippu')).toBe('きっぷ')
    expect(romajiToHiragana('kyou')).toBe('きょう')
    expect(romajiToHiragana('toukyou')).toBe('とうきょう')
    expect(romajiToHiragana('ko-su')).toBe('こーす')
  })

  it('ん: 자음 앞은 n 하나, 끝은 n 또는 nn', () => {
    expect(romajiToHiragana('kanji')).toBe('かんじ')
    expect(romajiToHiragana('tenki')).toBe('てんき')
    expect(romajiToHiragana('hon')).toBe('ほん')
    expect(romajiToHiragana('honn')).toBe('ほん')
    expect(finalizeRomaji('ほn')).toBe('ほん')
  })

  it("ん 뒤에 모음·な행이 오면 nn 또는 n' (IME 와 같은 함정: minna → みんあ)", () => {
    expect(romajiToHiragana('minna')).toBe('みんあ')
    expect(romajiToHiragana('minnna')).toBe('みんな')
    expect(romajiToHiragana("min'na")).toBe('みんな')
    expect(romajiToHiragana('konnnichiha')).toBe('こんにちは')
    expect(romajiToHiragana("kin'en")).toBe('きんえん')
    expect(romajiToHiragana('kinnen')).toBe('きんえん')
  })

  it('헵번식과 훈령식 자음을 모두 받는다', () => {
    expect(romajiToHiragana('shi')).toBe(romajiToHiragana('si'))
    expect(romajiToHiragana('tsu')).toBe(romajiToHiragana('tu'))
    expect(romajiToHiragana('fu')).toBe(romajiToHiragana('hu'))
    expect(romajiToHiragana('ji')).toBe(romajiToHiragana('zi'))
  })

  it('더하지 않은 예외: tch 는 변환되지 않고 cc 로 친다', () => {
    expect(romajiToHiragana('maccha')).toBe('まっちゃ')
    expect(romajiToHiragana('matcha')).not.toBe('まっちゃ')
  })
})
