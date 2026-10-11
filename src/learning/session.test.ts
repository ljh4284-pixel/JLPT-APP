import { describe, expect, it } from 'vitest'
import type { WordProgress } from '../types'
import { wordsN5 } from '../data/words'
import { applyRating, newCard } from './scheduler'
import {
  afterRating,
  answeredCorrectlyBefore,
  buildSession,
  canAskB,
  dueTomorrowCount,
  dueWords,
  interleave,
  isDueToday,
  newWords,
  peekNext,
  takeNext,
  typeFor,
} from './session'

const now = new Date('2026-10-12T09:00:00')
const OPTS = { newPerDay: 5, weights: { A: 2, B: 1, C: 1 } }
const word = (i: number) => wordsN5[i]

/** 평가 한 번을 거친 학습 상태를 만든다 */
function progressAfter(i: number, rating: 'again' | 'hard' | 'good' | 'easy', at: Date, type: 'A' | 'C' = 'A'): WordProgress {
  return {
    word_id: word(i).id,
    level: 'N5',
    fsrs_card: applyRating(newCard(at), rating, at),
    review_log: [{ date: at.toISOString(), question_type: type, result: type === 'C' ? (rating === 'again' ? 'wrong' : 'correct') : null, rating }],
  }
}

describe('세션 구성', () => {
  it('유형 순환: 신규는 읽기 고르기를 빼고, 복습은 조건 미달이면 뜻 회상', () => {
    const cycle = ['A', 'B', 'C', 'A'] as const
    expect([0, 1, 2, 3].map((i) => typeFor([...cycle], i, true, true))).toEqual(['A', 'C', 'A', 'A'])
    expect([0, 1, 2, 3].map((i) => typeFor([...cycle], i, false, true))).toEqual(['A', 'B', 'C', 'A'])
    expect(typeFor([...cycle], 1, false, false)).toBe('A')
    expect(typeFor(['B'], 0, true, true)).toBe('A')
  })

  it('신규를 복습 사이에 고르게 섞는다', () => {
    expect(interleave(['R1', 'R2', 'R3', 'R4'], ['N1', 'N2'])).toEqual(['R1', 'N1', 'R2', 'R3', 'N2', 'R4'])
    expect(interleave([], ['N1'])).toEqual(['N1'])
    expect(interleave(['R1'], [])).toEqual(['R1'])
  })

  it('기록이 없으면 신규 5개, 복습 0개', () => {
    const s = buildSession(wordsN5, [], now, OPTS)
    expect(s.queue).toHaveLength(5)
    expect(s.queue.every((c) => c.isNew)).toBe(true)
    expect(s.queue.map((c) => c.questionType)).toEqual(['A', 'C', 'A', 'A', 'C'])   // 신규는 순환 [A,B,C,A] 에서 B 를 뺀 [A,C,A]
    expect(newWords(wordsN5, [], 3).map((w) => w.id)).toEqual(['n5-0001', 'n5-0002', 'n5-0003'])
  })

  it('복습 기한: 복습 상태는 오늘 안이면, 짧은 간격 상태는 시각이 지나야 낸다', () => {
    const good = progressAfter(0, 'good', now)                       // 2일 뒤
    expect(isDueToday(good, now)).toBe(false)
    expect(isDueToday(good, new Date(good.fsrs_card.due.getTime() - 3 * 3600_000))).toBe(true)   // 같은 날 몇 시간 전이면 포함
    const again = progressAfter(1, 'again', now)                     // 10분 뒤
    expect(isDueToday(again, now)).toBe(false)
    expect(isDueToday(again, new Date(now.getTime() + 11 * 60000))).toBe(true)
    expect(dueWords(wordsN5, [good, again], new Date(now.getTime() + 11 * 60000)).map((w) => w.id)).toEqual(['n5-0002'])
  })

  it('내일 예정 수는 내일 기한인 카드만 센다', () => {
    const tomorrow = new Date('2026-10-13T10:00:00')
    const p: WordProgress = { ...progressAfter(0, 'good', now), fsrs_card: { ...progressAfter(0, 'good', now).fsrs_card, due: tomorrow } }
    expect(dueTomorrowCount([p], now)).toBe(1)
    expect(dueTomorrowCount([progressAfter(1, 'again', now)], now)).toBe(0)
  })

  it('읽기 고르기는 뜻 회상·발음 입력에서 맞힌 뒤에만, 오답 3개가 되는 단어에만 낸다', () => {
    expect(answeredCorrectlyBefore(undefined)).toBe(false)
    expect(answeredCorrectlyBefore(progressAfter(0, 'again', now))).toBe(false)
    expect(answeredCorrectlyBefore(progressAfter(0, 'hard', now))).toBe(true)
    expect(answeredCorrectlyBefore(progressAfter(0, 'good', now, 'C'))).toBe(true)
    expect(canAskB(word(0), progressAfter(0, 'good', now))).toBe(true)
    const denwa = wordsN5.findIndex((w) => w.word === '電話')
    expect(canAskB(word(denwa), progressAfter(denwa, 'good', now))).toBe(false)   // 유효 오답 부족
  })

  it('평가 후 짧은 간격 상태면 재출제 대기에 들어가고, 대기열이 비면 대기 화면 → 기한 뒤 카드', () => {
    const s0 = buildSession(wordsN5, [], now, OPTS)
    const [step, s1] = takeNext(s0, now)
    if (step.kind !== 'card') throw new Error('카드가 나와야 함')
    const p = progressAfter(0, 'again', now)
    const s2 = afterRating({ ...s1, queue: [] }, step.card, 'again', p)
    expect(s2.answered).toBe(1)
    expect(s2.correct).toBe(0)
    expect(s2.relearn).toHaveLength(1)
    expect(s2.relearn[0].card.isNew).toBe(false)
    expect(s2.relearn[0].card.questionType).toBe('C')          // 틀린 카드는 읽기 고르기 조건 미달 → 발음 입력
    expect(peekNext(s2, now).kind).toBe('wait')
    expect(peekNext(s2, now, true).kind).toBe('card')          // 바로 보기
    expect(peekNext(s2, new Date(now.getTime() + 11 * 60000)).kind).toBe('card')
    const [, s3] = takeNext(s2, now, true)
    expect(peekNext(s3, now).kind).toBe('done')
  })

  it('어려움을 받은 카드는 재출제 때 읽기 고르기가 된다', () => {
    const s0 = buildSession(wordsN5, [], now, OPTS)
    const [step, s1] = takeNext(s0, now)
    if (step.kind !== 'card') throw new Error('카드가 나와야 함')
    const s2 = afterRating(s1, step.card, 'hard', progressAfter(0, 'hard', now))
    expect(s2.relearn[0].card.questionType).toBe('B')
    expect(s2.correct).toBe(1)
  })
})
