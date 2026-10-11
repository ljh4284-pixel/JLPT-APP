/**
 * 진도 통계 (PROJECT.md 6장 진도 화면). 순수 함수.
 */
import { State } from 'ts-fsrs'
import type { Word, WordProgress } from '../types'

/** 안정성(stability, 기억이 90% 남는 데 걸리는 날 수)이 이 값 이상이면 "정착"으로 본다 */
export const STABLE_DAYS = 21

export interface LevelStats {
  level: string
  total: number        // 단어장 단어 수
  learned: number      // 기록이 있는 단어 수
  stable: number       // 정착 단어 수
}

export interface AccuracyStats {
  reviews: number       // 평가 횟수
  correct: number       // '다시' 가 아닌 평가 수 (자동 판정 유형은 정답 수)
  rate: number          // 0~100
  grade: 'A' | 'B' | 'C' | null   // JLPT 성적표 참고정보 기준: 67% 이상 A, 34% 이상 B, 그 미만 C
  totalMinutes: number  // 기록된 소요 시간 합계 (분)
  todayReviews: number
}

export function levelStats(words: Word[], progress: WordProgress[], level: string): LevelStats {
  const ids = new Set(words.filter((w) => w.level === level).map((w) => w.id))
  const mine = progress.filter((p) => ids.has(p.word_id))
  return {
    level,
    total: ids.size,
    learned: mine.length,
    stable: mine.filter((p) => p.fsrs_card.state === State.Review && p.fsrs_card.stability >= STABLE_DAYS).length,
  }
}

export function gradeOf(rate: number): 'A' | 'B' | 'C' {
  if (rate >= 67) return 'A'
  if (rate >= 34) return 'B'
  return 'C'
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function accuracyStats(progress: WordProgress[], now: Date): AccuracyStats {
  let reviews = 0
  let correct = 0
  let ms = 0
  let todayReviews = 0
  for (const p of progress) {
    for (const e of p.review_log) {
      reviews++
      const ok = e.result !== null ? e.result === 'correct' : e.rating !== 'again'
      if (ok) correct++
      if (e.duration_ms) ms += e.duration_ms
      if (sameDay(new Date(e.date), now)) todayReviews++
    }
  }
  const rate = reviews === 0 ? 0 : Math.round((correct / reviews) * 100)
  return {
    reviews,
    correct,
    rate,
    grade: reviews === 0 ? null : gradeOf(rate),
    totalMinutes: Math.round(ms / 60000),
    todayReviews,
  }
}
