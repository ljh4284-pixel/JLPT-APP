/**
 * 읽기 고르기(유형 B) 오답 생성 (PROJECT.md 3장 B)
 * 정답 읽기(히라가나)에 규칙을 적용해 오답을 만든다. 무작위 다른 단어는 쓰지 않는다.
 *
 * 규칙: 장음 추가/제거, 탁점·반탁점 추가/제거, 촉음 추가/제거, 요음 변형, (마지막) 글자 순서 바꾸기
 * 우선순위: 단어의 confusion 태그에 있는 규칙 → 나머지 규칙 → 순서 바꾸기
 * 유효성: 가나 조합으로 가능한 형태, 정답과 다름, 서로 다름
 * 외부 라이브러리 없이 순수 함수로만 구성한다.
 */
import type { Word } from '../types'

export type Rule = 'long' | 'dakuten' | 'handakuten' | 'sokuon' | 'yoon' | 'order'

export interface Distractor {
  text: string
  rule: Rule
  hint: string     // 틀린 지점 안내. 예: "탁음 아님 → か"
}

// ---------------------------------------------------------------------------
// 가나 표
// ---------------------------------------------------------------------------
const ROWS: Record<string, string> = {
  a: 'あかさたなはまやらわがざだばぱ',
  i: 'いきしちにひみりぎじぢびぴ',
  u: 'うくすつぬふむゆるぐずづぶぷ',
  e: 'えけせてねへめれげぜでべぺ',
  o: 'おこそとのほもよろをごぞどぼぽ',
}
const SMALL_YOON = 'ゃゅょ'
const SMALL_VOWEL = 'ぁぃぅぇぉ'
const I_ROW = 'きしちにひみりぎじぢびぴ'          // 요음이 붙을 수 있는 글자
const SOKUON_NEXT = 'かきくけこさしすせそたちつてとぱぴぷぺぽがぎぐげござじずぜぞだぢづでどばびぶべぼ'
const BARE_VOWELS = ['あ', 'い', 'う', 'え', 'お']

/** 청음 → 탁음 */
const DAKUTEN: Record<string, string> = {
  か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご',
  さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ',
  た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど',
  は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ',
}
const UNDAKUTEN: Record<string, string> = Object.fromEntries(Object.entries(DAKUTEN).map(([k, v]) => [v, k]))
/** は행 → 반탁음 */
const HANDAKUTEN: Record<string, string> = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ' }
const UNHANDAKUTEN: Record<string, string> = Object.fromEntries(Object.entries(HANDAKUTEN).map(([k, v]) => [v, k]))
/** 탁음 ↔ 반탁음 (ば ↔ ぱ) */
const B_TO_P: Record<string, string> = { ば: 'ぱ', び: 'ぴ', ぶ: 'ぷ', べ: 'ぺ', ぼ: 'ぽ' }
const P_TO_B: Record<string, string> = Object.fromEntries(Object.entries(B_TO_P).map(([k, v]) => [v, k]))

/** 모음별 장음 글자 (앞 모라의 모음 → 뒤에 오는 장음 표기) */
const LENGTHENER: Record<string, string[]> = { a: ['あ'], i: ['い'], u: ['う'], e: ['い', 'え'], o: ['う', 'お'] }
const YOON_VOWEL: Record<string, string> = { ゃ: 'a', ゅ: 'u', ょ: 'o' }
const BIG_YOON: Record<string, string> = { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ' }
const SMALL_OF: Record<string, string> = { や: 'ゃ', ゆ: 'ゅ', よ: 'ょ' }

// ---------------------------------------------------------------------------
// 모라(拍) 단위 처리
// ---------------------------------------------------------------------------
/** 읽기를 모라 단위로 나눈다. 요음(きょ)은 한 모라, っ·ん·ー는 각각 한 모라 */
export function toMorae(s: string): string[] {
  const out: string[] = []
  for (const ch of s) {
    if ((SMALL_YOON.includes(ch) || SMALL_VOWEL.includes(ch)) && out.length > 0) {
      out[out.length - 1] += ch
    } else {
      out.push(ch)
    }
  }
  return out
}

/** 모라의 모음. 알 수 없으면 null */
function vowelOf(mora: string): string | null {
  const last = mora[mora.length - 1]
  if (YOON_VOWEL[last]) return YOON_VOWEL[last]
  if (mora === 'ー') return null
  for (const [v, kana] of Object.entries(ROWS)) if (kana.includes(last)) return v
  if (SMALL_VOWEL.includes(last)) return 'aiueo'['ぁぃぅぇぉ'.indexOf(last)]
  return null
}

/** 가나 조합으로 가능한 형태인지 */
export function isValidReading(s: string): boolean {
  if (!s) return false
  const chars = Array.from(s)
  const first = chars[0]
  if (first === 'っ' || first === 'ん' || first === 'ー' || SMALL_YOON.includes(first) || SMALL_VOWEL.includes(first)) return false
  if (chars[chars.length - 1] === 'っ') return false
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    const prev = chars[i - 1]
    const next = chars[i + 1]
    if (SMALL_YOON.includes(c) && !(prev && I_ROW.includes(prev))) return false
    if (c === 'っ' && !(next && SOKUON_NEXT.includes(next))) return false
    if (c === 'っ' && prev === 'っ') return false
    if (c === 'ー' && (!prev || prev === 'っ' || prev === 'ん')) return false
  }
  return true
}

// ---------------------------------------------------------------------------
// 규칙별 후보 생성. 각 함수는 (후보 문자열, 틀린 지점 안내) 목록을 돌려준다
// ---------------------------------------------------------------------------
type Candidate = { text: string; hint: string }

function replaceAt(m: string[], i: number, mora: string): string {
  return [...m.slice(0, i), mora, ...m.slice(i + 1)].join('')
}
function insertAt(m: string[], i: number, mora: string): string {
  return [...m.slice(0, i), mora, ...m.slice(i)].join('')
}
function removeAt(m: string[], i: number): string {
  return [...m.slice(0, i), ...m.slice(i + 1)].join('')
}

function genDakuten(m: string[]): Candidate[] {
  const out: Candidate[] = []
  m.forEach((mora, i) => {
    const head = mora[0]
    const rest = mora.slice(1)
    if (DAKUTEN[head]) out.push({ text: replaceAt(m, i, DAKUTEN[head] + rest), hint: `탁음 아님 → ${mora}` })
    if (UNDAKUTEN[head]) out.push({ text: replaceAt(m, i, UNDAKUTEN[head] + rest), hint: `탁음 → ${mora}` })
  })
  return out
}

function genHandakuten(m: string[]): Candidate[] {
  const out: Candidate[] = []
  m.forEach((mora, i) => {
    const head = mora[0]
    const rest = mora.slice(1)
    if (HANDAKUTEN[head]) out.push({ text: replaceAt(m, i, HANDAKUTEN[head] + rest), hint: `반탁음 아님 → ${mora}` })
    if (UNHANDAKUTEN[head]) out.push({ text: replaceAt(m, i, UNHANDAKUTEN[head] + rest), hint: `반탁음 → ${mora}` })
    if (B_TO_P[head]) out.push({ text: replaceAt(m, i, B_TO_P[head] + rest), hint: `탁음 → ${mora}` })
    if (P_TO_B[head]) out.push({ text: replaceAt(m, i, P_TO_B[head] + rest), hint: `반탁음 → ${mora}` })
  })
  return out
}

/**
 * 장음: 제거(がっこう → がっこ)를 먼저, 추가(じしょ → じしょう)는 뒤에.
 * 추가는 혼동이 실제로 잦은 お단·う단 뒤의 う, え단 뒤의 い(ん·っ 앞은 제외)만 만든다.
 * あいうえお 글자 자체 뒤에는 붙이지 않는다 (모음이 세 번 겹치는 형태를 막기 위해).
 */
function genLong(m: string[]): Candidate[] {
  const removals: Candidate[] = []
  const additions: Candidate[] = []
  m.forEach((mora, i) => {
    const v = vowelOf(mora)
    if (!v) return
    const next = m[i + 1]
    const lengtheners = LENGTHENER[v] ?? []
    if (next && (lengtheners.includes(next) || next === 'ー')) {
      removals.push({ text: removeAt(m, i + 1), hint: `장음 → ${mora}${next}` })
      return
    }
    if (BARE_VOWELS.includes(mora)) return
    if (v === 'o' || v === 'u') {
      additions.push({ text: insertAt(m, i + 1, 'う'), hint: `장음 아님 → ${mora}` })
    } else if (v === 'e' && next !== 'ん' && next !== 'っ') {
      additions.push({ text: insertAt(m, i + 1, 'い'), hint: `장음 아님 → ${mora}` })
    }
  })
  return [...removals, ...additions]
}

function genSokuon(m: string[]): Candidate[] {
  const out: Candidate[] = []
  m.forEach((mora, i) => {
    if (mora === 'っ') {
      out.push({ text: removeAt(m, i), hint: `촉음 → っ${m[i + 1] ?? ''}` })
    } else if (i >= 1 && m[i - 1] !== 'っ' && m[i - 1] !== 'ん' && SOKUON_NEXT.includes(mora[0])) {
      out.push({ text: insertAt(m, i, 'っ'), hint: `촉음 없음 → ${m[i - 1]}${mora}` })
    }
  })
  return out
}

function genYoon(m: string[]): Candidate[] {
  const out: Candidate[] = []
  m.forEach((mora, i) => {
    const last = mora[mora.length - 1]
    if (SMALL_YOON.includes(last)) {
      const base = mora.slice(0, -1)
      // 요음 → 두 글자 (きょ → きよ)
      out.push({ text: [...m.slice(0, i), base, BIG_YOON[last], ...m.slice(i + 1)].join(''), hint: `요음 → ${mora}` })
      // 요음 모음 바꾸기 (きょ → きゃ, きゅ)
      for (const other of SMALL_YOON) {
        if (other !== last) out.push({ text: replaceAt(m, i, base + other), hint: `요음 → ${mora}` })
      }
    } else if (I_ROW.includes(last) && m[i + 1] && SMALL_OF[m[i + 1]]) {
      // 두 글자 → 요음 (きよ → きょ)
      out.push({ text: [...m.slice(0, i), mora + SMALL_OF[m[i + 1]], ...m.slice(i + 2)].join(''), hint: `요음 아님 → ${mora}${m[i + 1]}` })
    }
  })
  return out
}

function genOrder(m: string[]): Candidate[] {
  const out: Candidate[] = []
  for (let i = 0; i + 1 < m.length; i++) {
    if (m[i] === m[i + 1]) continue
    out.push({ text: [...m.slice(0, i), m[i + 1], m[i], ...m.slice(i + 2)].join(''), hint: `순서 → ${m[i]}${m[i + 1]}` })
  }
  return out
}

const GENERATORS: Record<Rule, (m: string[]) => Candidate[]> = {
  long: genLong,
  dakuten: genDakuten,
  handakuten: genHandakuten,
  sokuon: genSokuon,
  yoon: genYoon,
  order: genOrder,
}
/** 태그가 없을 때의 기본 순서. JLPT N5 공식 예(てんき/でんき)처럼 탁음 변형이 가장 그럴듯해서 먼저 쓴다 */
const DEFAULT_ORDER: Rule[] = ['dakuten', 'handakuten', 'sokuon', 'yoon', 'long']

/** 규칙 적용 순서: confusion 태그 → 나머지 → 순서 바꾸기 */
export function ruleOrder(confusion: string[]): Rule[] {
  const tagged = confusion.filter((c): c is Rule => (DEFAULT_ORDER as string[]).includes(c))
  const rest = DEFAULT_ORDER.filter((r) => !tagged.includes(r))
  return [...tagged, ...rest, 'order']
}

/**
 * 오답을 우선순위대로 최대 `count` 개 만든다. 유효한 오답이 부족하면 더 적게 돌려준다.
 * 같은 단어에는 항상 같은 결과가 나온다 (무작위 없음).
 */
export function makeDistractors(word: Word, count = 3): Distractor[] {
  const answer = word.reading
  const morae = toMorae(answer)
  const seen = new Set<string>([answer])
  const out: Distractor[] = []
  for (const rule of ruleOrder(word.confusion)) {
    for (const c of GENERATORS[rule](morae)) {
      if (out.length >= count) return out
      if (seen.has(c.text) || !isValidReading(c.text)) continue
      seen.add(c.text)
      out.push({ text: c.text, rule, hint: c.hint })
    }
  }
  return out
}

/** 이 단어로 읽기 고르기 문제를 낼 수 있는지 (유효한 오답 3개 이상) */
export function canMakeQuestion(word: Word): boolean {
  return makeDistractors(word).length >= 3
}
