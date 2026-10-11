import type { Card } from 'ts-fsrs'

/** 단어장 한 항목 (PROJECT.md 7장) */
export interface Word {
  id: string             // 급수 접두사 문자열 (예: n5-0001). 한 번 쓴 id 는 재사용하지 않는다
  level: string
  word: string            // 표기 (한자 또는 가나)
  reading: string         // 히라가나 읽기. 정답 판정 기준
  meaning_ko: string
  example_ja: string
  example_reading: string // 예문 전체의 히라가나 읽기
  example_ko: string
  pos: string
  tags: string[]
  confusion: string[]
  hanja_ko: string | null
  audio: string | null    // 음성 파일명(확장자 제외). 없으면 null
}

/** 자기평가 4단계 */
export type Rating = 'again' | 'hard' | 'good' | 'easy'

/** 문제 유형 (PROJECT.md 3장). A 뜻 회상, B 읽기 고르기, C 발음 입력 */
export type QuestionType = 'A' | 'B' | 'C'

/** 세션에서 어떤 유형을 낼지 (홈에서 선택) */
export type SessionMode = 'A' | 'C' | 'mix'

/** 유형 C 입력 방식: 로마자(실시간 히라가나 변환) / 일본어 자판 직접 입력 */
export type InputMode = 'romaji' | 'kana'

/** 자동 판정 결과 (유형 B, C) */
export interface JudgeResult {
  correct: boolean
  answer: string      // 정규화된 사용자 입력 또는 고른 선택지
  hintUsed: boolean   // 유형 C 힌트 사용 여부
  wrongPoint?: string // 유형 B 오답일 때 틀린 지점. 예: "탁음 아님 → か"
}

/** 복습 기록 한 줄 (PROJECT.md 7장 review_log) */
export interface ReviewLogEntry {
  date: string                          // ISO 문자열
  question_type: QuestionType
  result: 'correct' | 'wrong' | null    // 자동 판정 결과. 유형 A 는 null
  rating: Rating
  duration_ms?: number                  // 카드가 보인 뒤 평가까지 걸린 시간 (8단계 계획 계산용)
}

/** 단어 하나의 학습 상태 (PROJECT.md 7장) */
export interface WordProgress {
  word_id: string
  level: string
  fsrs_card: Card       // ts-fsrs 카드 (difficulty, stability, due, state, reps, lapses, last_review ...)
  review_log: ReviewLogEntry[]
  known_by_test?: boolean   // 레벨 테스트로 "안다"고 판정된 단어 (8단계). 없으면 false
}

/** 세션 대기열의 카드 한 장 */
export interface SessionCard {
  word: Word
  isNew: boolean            // true 면 문제 전에 단어 제시 화면을 먼저 보여준다
  questionType: QuestionType
}
