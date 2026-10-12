/**
 * 읽기 입력(C) 문제에 보여줄 예문 빈칸 (PROJECT.md 3장 C, 검토 반영 2026-10-13)
 * 뜻만으로는 답이 하나로 정해지지 않는 단어가 있어서, 예문에서 그 단어를 가린 문장을 함께 보여 문맥으로 답을 좁힌다.
 *  - 한자 단어: 마지막 한자까지의 어간을 가린다 (通る → 通, 引っ越す → 引っ越). 뒤의 보내는 가나(ります)는 남는다
 *  - 가나 동사·い형용사(3글자 이상): 끝 글자를 뺀 어간을 가린다 (つける → つけ)
 *  - 그 밖의 가나 단어: 통째로 가린다 (テキスト, なるべく)
 *  - 찾지 못하면(する·いる 같은 짧은 동사) found=false. 화면은 예문을 숨긴다 (답이 드러나므로)
 * 외부 라이브러리 없이 순수 함수로만 구성한다.
 */
import type { Word } from '../types'

export const BLANK = '（　　）'

function isKana(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0
  return (c >= 0x3041 && c <= 0x309f) || (c >= 0x30a0 && c <= 0x30ff)
}

function isKanji(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0
  return c >= 0x4e00 && c <= 0x9fff
}

/** 예문에서 찾을 어간 */
export function stemOf(word: Word): string {
  const chars = Array.from(word.word)
  if (chars.every(isKana)) {
    if ((word.pos === 'verb' || word.pos === 'i-adj') && chars.length >= 3) return chars.slice(0, -1).join('')
    return word.word
  }
  let last = -1
  chars.forEach((ch, i) => {
    if (isKanji(ch)) last = i
  })
  return chars.slice(0, last + 1).join('')
}

/** 예문에서 단어를 가린 문장. found=false 면 text 는 원문 그대로 */
export function blankExample(word: Word): { text: string; found: boolean } {
  const stem = stemOf(word)
  const idx = stem ? word.example_ja.indexOf(stem) : -1
  if (idx < 0) return { text: word.example_ja, found: false }
  return { text: word.example_ja.slice(0, idx) + BLANK + word.example_ja.slice(idx + stem.length), found: true }
}

/** 품사 표시 이름 (단어장 pos 값 → 한국어) */
const POS_LABEL: Record<string, string> = {
  noun: '명사',
  verb: '동사',
  'i-adj': 'い형용사',
  'na-adj': 'な형용사',
  adverb: '부사',
  conjunction: '접속사',
  pronoun: '대명사',
  counter: '조수사',
  phrase: '표현',
  expression: '표현',
  particle: '조사',
  'pre-noun': '연체사',
}

export function posLabel(pos: string): string {
  return POS_LABEL[pos] ?? pos
}
