/**
 * 읽기 판정 로직 (PROJECT.md 3장 C)
 * - 판정 기준은 읽기(히라가나). 한자 표기는 쓰지 않는다
 * - 판정 전 정규화: 앞뒤 공백 제거, 가타카나→히라가나
 * 외부 라이브러리 없이 순수 함수로만 구성한다.
 */

/** 가타카나 → 히라가나. 장음 기호(ー)는 그대로 둔다 */
export function kataToHira(s: string): string {
  let out = ''
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0
    // ァ(30A1) ~ ヶ(30F6) 만 0x60 만큼 내리면 히라가나
    out += code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : ch
  }
  return out
}

/** 판정 전 정규화 */
export function normalizeReading(input: string): string {
  // 일반 공백과 전각 공백(U+3000) 모두 앞뒤에서 제거
  const trimmed = input.replace(/^[\s　]+|[\s　]+$/g, '')
  return kataToHira(trimmed)
}

/** 사용자 입력이 정답 읽기와 같은지 */
export function judgeReading(input: string, reading: string): boolean {
  return normalizeReading(input) === normalizeReading(reading)
}
