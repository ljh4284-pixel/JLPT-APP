import { describe, expect, it } from 'vitest'
import type { Word } from '../types'
import n3Json from '../data/words_n3.json'
import n4Json from '../data/words_n4.json'
import n5Json from '../data/words_n5.json'
import table from '../data/kanji_ko.json'
import { hanjaEntry, hanjaOf, isKanji } from './hanja'

const words = [...(n5Json as Word[]), ...(n4Json as Word[]), ...(n3Json as Word[])]

describe('한자 훈음', () => {
  it('단어장에 쓰인 모든 한자에 훈음이 있다', () => {
    const missing = new Set<string>()
    for (const w of words) for (const ch of w.word) if (isKanji(ch) && !hanjaEntry(ch)) missing.add(ch)
    expect(Array.from(missing)).toEqual([])
  })

  it('표의 값은 "훈 음", "정자|훈 음", "국자: 설명" 중 하나다', () => {
    for (const [ch, raw] of Object.entries(table as Record<string, string>)) {
      const e = hanjaEntry(ch)!
      if (e.kokuji) continue
      for (const part of e.hunum.split(',')) {
        expect(part.trim().replace(/\s*\(.*\)$/, ''), `${ch}: ${raw}`).toMatch(/^.+ [가-힣]$/)
      }
      if (e.ko) expect(e.ko, ch).not.toBe(ch)
    }
  })

  it('단어의 한자를 순서대로 한 번씩 풀어 준다', () => {
    expect(hanjaOf('勉強').map((e) => [e.ch, e.hunum])).toEqual([['勉', '힘쓸 면'], ['強', '강할 강']])
    expect(hanjaOf('気持ち')[0]).toEqual({ ch: '気', ko: '氣', hunum: '기운 기', kokuji: false })
    expect(hanjaOf('学生')[0].ko).toBe('學')
    expect(hanjaOf('日日')).toHaveLength(1)
    expect(hanjaOf('テキスト')).toEqual([])
  })

  it('일본에서 만든 글자는 국자로 표시한다', () => {
    const e = hanjaOf('申し込む')[1]
    expect(e.ch).toBe('込')
    expect(e.kokuji).toBe(true)
    expect(e.hunum).toContain('일본에서 만든')
  })
})
