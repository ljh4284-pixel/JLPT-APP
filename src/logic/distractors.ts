/**
 * 읽기 고르기(유형 B) 오답 생성 (PROJECT.md 3장 B)
 * 정답 읽기(히라가나)에 규칙을 적용해 오답을 만든다. 무작위 다른 단어는 쓰지 않는다.
 *
 * 소리 변형 규칙: 장음 추가/제거, 탁점·반탁점 추가/제거, 촉음 추가/제거, 요음 변형, (마지막) 글자 순서 바꾸기
 * 우선순위: 단어의 confusion 태그에 있는 규칙 → 나머지 규칙 → 순서 바꾸기
 * N4 이상: JLPT 漢字読み 오답이 "비슷한 분야의 다른 단어 읽기"이므로(docs/jlpt_exam_format.md 7-2)
 *   같은 품사이고 한자나 분야 태그를 공유하는 다른 단어의 읽기를 먼저 2개 쓰고, 나머지는 소리 변형으로 채운다
 * 유효성: 가나 조합으로 가능한 형태, 정답과 다름, 서로 다름
 * 외부 라이브러리 없이 순수 함수로만 구성한다.
 */
import type { Word } from '../types'

export type SoundRule = 'long' | 'dakuten' | 'handakuten' | 'sokuon' | 'yoon' | 'order'
export type Rule = SoundRule | 'other'   // other = 다른 단어의 읽기 (N4 이상)

export interface Distractor {
  text: string
  rule: Rule
  hint: string     // 틀린 지점 안내. 예: "탁음 아님 → か", "다른 단어 → 向かう"
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

const GENERATORS: Record<SoundRule, (m: string[]) => Candidate[]> = {
  long: genLong,
  dakuten: genDakuten,
  handakuten: genHandakuten,
  sokuon: genSokuon,
  yoon: genYoon,
  order: genOrder,
}
/** 태그가 없을 때의 기본 순서. JLPT N5 공식 예(てんき/でんき)처럼 탁음 변형이 가장 그럴듯해서 먼저 쓴다 */
const DEFAULT_ORDER: SoundRule[] = ['dakuten', 'handakuten', 'sokuon', 'yoon', 'long']

/** 규칙 적용 순서: confusion 태그 → 나머지 → 순서 바꾸기 */
export function ruleOrder(confusion: string[]): SoundRule[] {
  const tagged = confusion.filter((c): c is SoundRule => (DEFAULT_ORDER as string[]).includes(c))
  const rest = DEFAULT_ORDER.filter((r) => !tagged.includes(r))
  return [...tagged, ...rest, 'order']
}

// ---------------------------------------------------------------------------
// N4 이상: 다른 단어 읽기 오답 (PROJECT.md 3장 B, docs/jlpt_exam_format.md 7-2)
// JLPT N4 이상의 漢字読み 오답은 "비슷한 분야의 다른 단어 읽기"다 (通って → むかって/わたって).
// 무작위 단어는 쓰지 않고, 혼동 이유가 설명되는 후보만 쓴다 (검토 반영 2026-10-13):
//   kanji   : 한자를 공유 (入院 ↔ 退院)
//   reading : 읽기가 비슷 — 첫 모라가 같고(탁음 차이는 무시) 모라 수도 같음 (貿易 ぼうえき ↔ 翻訳 ほんやく)
//   field   : 같은 분야(넓은 태그 제외)이고 모라 수와 끝 모라가 같음 (通る とおる ↔ 渡る わたる)
// 같은 표기의 다른 유효 읽기(alt_readings)는 오답으로 쓰지 않는다. 후보가 모자라면 억지로 채우지 않고 소리 변형으로 넘어간다.
// ---------------------------------------------------------------------------

/** 급수별로 다른 단어 읽기 오답을 몇 개까지 쓰는지. 나머지는 소리 변형 오답으로 채운다 */
export function otherWordCount(level: string): number {
  return level === 'N5' ? 0 : 2
}

/** 분야를 좁히지 못하는 넓은 태그(표기 종류 태그 포함). 후보 자격과 점수에서 뺀다 */
export const BROAD_TAGS = new Set(['katakana', 'basic', 'daily', 'abstract', 'degree'])

function isKanji(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0
  return c >= 0x4e00 && c <= 0x9fff
}

function kanjiSet(s: string): Set<string> {
  return new Set(Array.from(s).filter(isKanji))
}

/** 탁음·반탁음을 청음으로 되돌린 모라 (ぼ→ほ, ぱ→は). 읽기 유사성 비교용 */
function plainMora(mora: string): string {
  const head = mora[0]
  return (UNDAKUTEN[head] ?? UNHANDAKUTEN[head] ?? head) + mora.slice(1)
}

export type OtherReason = 'kanji' | 'reading' | 'field'

export interface OtherCandidate {
  word: Word
  reason: OtherReason
  score: number
}

/**
 * 다른 단어 읽기 후보를 그럴듯한 순서로 돌려준다 (점수 높은 순, 같으면 id 순 → 항상 같은 결과).
 *  - 공통 조건: 같은 품사, 읽기가 다름, 같은 표기의 다른 읽기(alt_readings)가 아님, 모라 수 차이 1 이하
 *  - 자격: kanji / reading / field 중 하나 (위 설명)
 *  - 점수: 자격(kanji 30, reading 20, field 10) + 공유 태그 1씩 + 모라 수 같음 2 + 첫 모라 같음 2 + 끝 모라 같음 1
 */
export function otherWordCandidates(word: Word, pool: Word[]): OtherCandidate[] {
  const morae = toMorae(word.reading)
  const kanji = kanjiSet(word.word)
  const tags = word.tags.filter((t) => !BROAD_TAGS.has(t))
  const alt = new Set(word.alt_readings ?? [])
  const out: OtherCandidate[] = []
  for (const other of pool) {
    if (other.id === word.id || other.pos !== word.pos || other.reading === word.reading || alt.has(other.reading)) continue
    const m = toMorae(other.reading)
    if (Math.abs(m.length - morae.length) > 1) continue
    const sameLen = m.length === morae.length
    const sharedKanji = Array.from(kanjiSet(other.word)).some((k) => kanji.has(k))
    const sharedTags = tags.filter((t) => other.tags.includes(t)).length
    const sameFirst = plainMora(m[0]) === plainMora(morae[0])
    const sameLast = m[m.length - 1] === morae[morae.length - 1]
    let reason: OtherReason | null = null
    if (sharedKanji) reason = 'kanji'
    else if (sameFirst && sameLen) reason = 'reading'
    else if (sharedTags > 0 && sameLen && sameLast) reason = 'field'
    if (!reason) continue
    const base = reason === 'kanji' ? 30 : reason === 'reading' ? 20 : 10
    const score = base + sharedTags + (sameLen ? 2 : 0) + (sameFirst ? 2 : 0) + (sameLast ? 1 : 0)
    out.push({ word: other, reason, score })
  }
  out.sort((a, b) => b.score - a.score || (a.word.id < b.word.id ? -1 : 1))
  return out
}

/**
 * 오답을 우선순위대로 최대 `count` 개 만든다. 유효한 오답이 부족하면 더 적게 돌려준다.
 * 같은 단어에는 항상 같은 결과가 나온다 (무작위 없음).
 *  1) N4 이상이고 단어장(pool)이 있으면 다른 단어 읽기를 otherWordCount 개까지 먼저 (자격 있는 후보만)
 *  2) 소리 변형 규칙 (confusion 태그 → 나머지 → 순서 바꾸기)
 *  3) 그래도 부족하면 남은 다른 단어 읽기로 보충
 *  정답과 같은 표기의 다른 유효 읽기(alt_readings)는 어느 단계에서도 오답으로 쓰지 않는다
 */
export function makeDistractors(word: Word, count = 3, pool: Word[] = []): Distractor[] {
  const answer = word.reading
  const morae = toMorae(answer)
  const seen = new Set<string>([answer, ...(word.alt_readings ?? [])])
  const out: Distractor[] = []
  const push = (text: string, rule: Rule, hint: string): boolean => {
    if (out.length >= count || seen.has(text) || !isValidReading(text)) return false
    seen.add(text)
    out.push({ text, rule, hint })
    return true
  }
  // N5 는 소리 변형만 쓴다 (otherWordCount 0). 그 외 급수는 단어장이 있을 때 다른 단어 읽기를 후보로 둔다
  const others = pool.length > 0 && otherWordCount(word.level) > 0 ? otherWordCandidates(word, pool) : []
  let used = 0
  for (const o of others) {
    if (used >= otherWordCount(word.level)) break
    if (push(o.word.reading, 'other', `다른 단어 → ${o.word.word}`)) used++
  }
  for (const rule of ruleOrder(word.confusion)) {
    for (const c of GENERATORS[rule](morae)) {
      if (out.length >= count) return out
      push(c.text, rule, c.hint)
    }
  }
  for (const o of others) {
    if (out.length >= count) break
    push(o.word.reading, 'other', `다른 단어 → ${o.word.word}`)
  }
  return out
}

/** 이 단어로 읽기 고르기 문제를 낼 수 있는지 (유효한 오답 3개 이상). N4 이상은 단어장을 함께 준다 */
export function canMakeQuestion(word: Word, pool: Word[] = []): boolean {
  return makeDistractors(word, 3, pool).length >= 3
}
