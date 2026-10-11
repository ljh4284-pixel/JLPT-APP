import { describe, expect, it } from 'vitest'
import type { Word, WordProgress } from '../types'
import wordsJson from '../data/words_n5.json'
import { applyRating, newCard } from './scheduler'
import { accuracyStats, gradeOf, levelStats, STABLE_DAYS } from './stats'

const wordsN5 = wordsJson as Word[]
const now = new Date('2026-10-12T09:00:00')

describe('진도 통계', () => {
  it('등급은 67% / 34% 를 기준으로 나뉜다', () => {
    expect(gradeOf(100)).toBe('A')
    expect(gradeOf(67)).toBe('A')
    expect(gradeOf(66)).toBe('B')
    expect(gradeOf(34)).toBe('B')
    expect(gradeOf(33)).toBe('C')
  })

  it('급수별 학습·정착 단어 수를 센다', () => {
    const learned = applyRating(newCard(now), 'good', now)
    const stable = { ...learned, stability: STABLE_DAYS + 5 }
    const progress: WordProgress[] = [
      { word_id: 'n5-0001', level: 'N5', fsrs_card: learned, review_log: [] },
      { word_id: 'n5-0002', level: 'N5', fsrs_card: stable, review_log: [] },
      { word_id: 'n4-0001', level: 'N4', fsrs_card: stable, review_log: [] },   // 다른 급수는 제외
    ]
    expect(levelStats(wordsN5, progress, 'N5')).toEqual({ level: 'N5', total: 50, learned: 2, stable: 1 })
  })

  it('정답률·등급·소요 시간·오늘 평가 수를 계산한다', () => {
    const card = applyRating(newCard(now), 'good', now)
    const progress: WordProgress[] = [{
      word_id: 'n5-0001', level: 'N5', fsrs_card: card,
      review_log: [
        { date: now.toISOString(), question_type: 'A', result: null, rating: 'good', duration_ms: 60000 },
        { date: now.toISOString(), question_type: 'C', result: 'wrong', rating: 'again', duration_ms: 30000 },
        { date: '2026-10-01T09:00:00', question_type: 'B', result: 'correct', rating: 'easy', duration_ms: 30000 },
      ],
    }]
    const s = accuracyStats(progress, now)
    expect(s.reviews).toBe(3)
    expect(s.correct).toBe(2)
    expect(s.rate).toBe(67)
    expect(s.grade).toBe('A')
    expect(s.totalMinutes).toBe(2)
    expect(s.todayReviews).toBe(2)
    expect(accuracyStats([], now).grade).toBeNull()
  })
})
