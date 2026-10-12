import { describe, expect, it } from 'vitest'
import type { Word } from '../types'
import n4Json from '../data/words_n4.json'
import n5Json from '../data/words_n5.json'
import { BLANK, blankExample, posLabel, stemOf } from './example'

const words = [...(n5Json as Word[]), ...(n4Json as Word[])]
const byWord = (w: string) => {
  const found = words.find((x) => x.word === w)
  if (!found) throw new Error(`단어장에 없음: ${w}`)
  return found
}

describe('읽기 입력 예문 빈칸', () => {
  it('한자 단어는 마지막 한자까지의 어간을 가리고 보내는 가나는 남긴다', () => {
    expect(stemOf(byWord('通る'))).toBe('通')
    expect(blankExample(byWord('通る'))).toEqual({ text: `毎日この道を${BLANK}ります。`, found: true })
    expect(blankExample(byWord('引っ越す')).text).toBe(`来月${BLANK}します。`)
    expect(blankExample(byWord('冷たい')).text).toBe(`${BLANK}たい水を飲みます。`)
  })

  it('가나 단어는 통째로, 가나 동사는 끝 글자를 뺀 어간을 가린다', () => {
    expect(blankExample(byWord('テキスト')).text).toBe(`${BLANK}を開いてください。`)
    expect(stemOf(byWord('つける'))).toBe('つけ')
    expect(blankExample(byWord('つける')).text).toBe(`テレビを${BLANK}ます。`)
  })

  it('예문에서 찾지 못하면 found=false 이고 원문을 돌려준다', () => {
    const iru = byWord('いる')
    expect(blankExample(iru)).toEqual({ text: iru.example_ja, found: false })
  })

  it('단어장 대부분(99% 이상)에서 빈칸을 만들 수 있다', () => {
    const ok = words.filter((w) => blankExample(w).found).length
    expect(ok / words.length).toBeGreaterThanOrEqual(0.99)
    for (const w of words) expect(blankExample(w).text).not.toContain(w.word.length > 1 ? w.word : '\u0000')
  })

  it('품사 이름을 한국어로 보여준다', () => {
    expect(posLabel('verb')).toBe('동사')
    expect(posLabel('i-adj')).toBe('い형용사')
    expect(posLabel('unknown')).toBe('unknown')
  })
})
