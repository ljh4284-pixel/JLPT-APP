/**
 * 로마자 입력 규칙 (PROJECT.md 3장 C). 일본어 키보드 입력기(IME) 방식을 그대로 따른다 (결정 2026-10-11).
 * wanakana 의 IME 모드가 Microsoft IME 와 같은 규칙이라 그대로 쓴다. 예외 규칙은 더하지 않는다.
 *  - 헵번식·훈령식 자음 모두 허용 (shi/si, tsu/tu, fu/hu, ji/zi)
 *  - 촉음은 자음 두 번 (yukkuri → ゆっくり), 요음은 kya·sha·cha, 장음은 가나 철자대로 (toukyou), 가타카나 장음은 -
 *  - ん: 자음 앞은 n 하나 (kanji), 끝은 n 또는 nn, 모음·な행 앞은 nn 또는 n'
 *    IME 와 같은 함정: minna → みんあ. みんな는 minnna(n 세 번) 또는 min'na. (2026-10-13 확인, 도움말에 적음)
 *  - 더하지 않는 것: 장음 기호 ō, 여권식 oh, shimbun 의 m, tch(matcha). maccha 로 친다
 */
import * as wanakana from 'wanakana'

/** 입력칸 실시간 변환(wanakana.bind)에 넘기는 설정. 규칙을 바꾸려면 여기 한 곳만 */
export const ROMAJI_BIND_OPTIONS = { IMEMode: 'toHiragana' as const }

/**
 * 제출 시 남은 로마자를 마저 변환한다.
 * 입력칸 값은 이미 대부분 가나이고, 끝에 변환을 기다리는 n 만 남아 있을 수 있다 (hon → ほn → ほん)
 */
export function finalizeRomaji(raw: string): string {
  return wanakana.toHiragana(raw)
}

/** 테스트·설명용: 로마자 문자열 전체를 한 번에 변환 (입력칸의 실시간 변환 + 제출 변환과 같은 결과) */
export function romajiToHiragana(romaji: string): string {
  return finalizeRomaji(wanakana.toKana(romaji, ROMAJI_BIND_OPTIONS))
}

/** 도움말 표 한 줄: 소리, 치는 법, 예시 [로마자, 결과] 목록. 예시는 테스트로 실제 변환 결과와 같음을 확인한다 */
export interface RomajiHelpRow {
  sound: string
  how: string
  examples: [string, string][]
}

/** 로마자 입력 도움말 (화면 RomajiHelp 에서 표로 보여준다) */
export const ROMAJI_HELP_ROWS: RomajiHelpRow[] = [
  { sound: '작은 っ', how: '자음을 두 번 (kk·tt·pp·ss·cc)', examples: [['yukkuri', 'ゆっくり'], ['kippu', 'きっぷ'], ['maccha', 'まっちゃ']] },
  { sound: '요음 (きゃ·しゅ·ちょ)', how: 'kya·shu·cho 처럼 y 나 h 를 끼운다', examples: [['kyou', 'きょう'], ['shashin', 'しゃしん'], ['ocha', 'おちゃ']] },
  { sound: '장음', how: '가나 철자대로 (ou·uu·ei·ii)', examples: [['toukyou', 'とうきょう'], ['kuuki', 'くうき'], ['oniisan', 'おにいさん']] },
  { sound: 'ん (자음 앞·단어 끝)', how: 'n 하나', examples: [['kanji', 'かんじ'], ['hon', 'ほん']] },
  { sound: 'ん (모음·な행 앞)', how: "nn 또는 n' (n 하나면 な행이 됩니다)", examples: [["kin'en", 'きんえん'], ['minnna', 'みんな'], ['konnnichiha', 'こんにちは']] },
  { sound: '가타카나 장음 ー', how: '하이픈 -', examples: [['ko-su', 'こーす'], ['su-pa-', 'すーぱー']] },
  { sound: '헵번식·훈령식', how: '둘 다 됩니다', examples: [['shi', 'し'], ['si', 'し'], ['tsu', 'つ'], ['tu', 'つ'], ['fu', 'ふ'], ['hu', 'ふ'], ['ji', 'じ'], ['zi', 'じ']] },
  { sound: '작은 ぁ·ぃ·ゃ 만', how: 'x 나 l 을 앞에', examples: [['xa', 'ぁ'], ['xya', 'ゃ'], ['fa', 'ふぁ'], ['thi', 'てぃ']] },
]
