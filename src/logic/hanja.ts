/**
 * 한자 훈음 (PROJECT.md 4장). 단어 제시·정답 화면에서 단어의 한자를 글자별로 "훈 음"과 함께 보여준다.
 * 표(src/data/kanji_ko.json)의 값 형식:
 *   "큰 대"                 훈 음 (여러 음은 쉼표로: "다닐 행, 항렬 항")
 *   "學|배울 학"            한국 정자|훈 음 (일본 신자체와 한국 글자가 다를 때)
 *   "국자: 설명"            일본에서 만든 글자 (한국 한자음 없음)
 * 표는 AI 가 작성하고 음은 Unihan 한국 한자음과 대조했다 (scripts/verify_kanji_ko.py). 훈은 비공식.
 * 문제 화면에는 쓰지 않는다 (한국 음이 읽기 힌트가 되므로). 순수 함수.
 */
import table from '../data/kanji_ko.json'

export interface HanjaEntry {
  ch: string          // 단어에 쓰인 글자 (일본 표기)
  ko: string | null   // 한국 정자 (ch 와 다를 때만)
  hunum: string       // "큰 대" / "다닐 행, 항렬 항" / 국자면 설명
  kokuji: boolean     // 일본에서 만든 글자
}

const TABLE = table as Record<string, string>

export function isKanji(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0
  return c >= 0x4e00 && c <= 0x9fff
}

/** 표 값 한 줄을 풀어 쓴다. 표에 없으면 null */
export function hanjaEntry(ch: string): HanjaEntry | null {
  const raw = TABLE[ch]
  if (!raw) return null
  if (raw.startsWith('국자')) return { ch, ko: null, hunum: raw.replace(/^국자:\s*/, ''), kokuji: true }
  const bar = raw.indexOf('|')
  if (bar >= 0) return { ch, ko: raw.slice(0, bar), hunum: raw.slice(bar + 1), kokuji: false }
  return { ch, ko: null, hunum: raw, kokuji: false }
}

/** 단어에 쓰인 한자를 나온 순서대로 (같은 글자는 한 번만). 표에 없는 글자는 뺀다 */
export function hanjaOf(word: string): HanjaEntry[] {
  const out: HanjaEntry[] = []
  const seen = new Set<string>()
  for (const ch of word) {
    if (!isKanji(ch) || seen.has(ch)) continue
    seen.add(ch)
    const e = hanjaEntry(ch)
    if (e) out.push(e)
  }
  return out
}
