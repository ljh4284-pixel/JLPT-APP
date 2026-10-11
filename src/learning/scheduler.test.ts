import { describe, expect, it } from 'vitest'
import { applyRating, formatInterval, isNewCard, isShortTerm, newCard, previewDue } from './scheduler'

const now = new Date('2026-10-12T09:00:00')
const minutes = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 60000)

describe('FSRS 스케줄러 (학습 단계 10분)', () => {
  it('새 카드: 다시 10분, 어려움 15분, 보통 약 2일, 쉬움 약 8일', () => {
    const due = previewDue(newCard(now), now)
    expect(minutes(now, due.again)).toBe(10)
    expect(minutes(now, due.hard)).toBe(15)
    expect(minutes(now, due.good)).toBeGreaterThanOrEqual(60 * 24 * 1.5)
    expect(minutes(now, due.good)).toBeLessThanOrEqual(60 * 24 * 3)
    expect(minutes(now, due.easy)).toBeGreaterThanOrEqual(60 * 24 * 6)
  })

  it('다시·어려움은 짧은 간격 상태, 보통·쉬움은 복습 상태가 된다', () => {
    const card = newCard(now)
    expect(isNewCard(card)).toBe(true)
    expect(isShortTerm(applyRating(card, 'again', now))).toBe(true)
    expect(isShortTerm(applyRating(card, 'hard', now))).toBe(true)
    expect(isShortTerm(applyRating(card, 'good', now))).toBe(false)
    expect(isShortTerm(applyRating(card, 'easy', now))).toBe(false)
  })

  it('복습 카드를 다시 틀리면 10분 뒤 재학습', () => {
    const good = applyRating(newCard(now), 'good', now)
    const later = good.due
    const again = applyRating(good, 'again', later)
    expect(isShortTerm(again)).toBe(true)
    expect(minutes(later, again.due)).toBe(10)
  })

  it('간격을 분·시간·일·개월로 표시한다', () => {
    const t = (min: number) => new Date(now.getTime() + min * 60000)
    expect(formatInterval(now, t(10))).toBe('10분')
    expect(formatInterval(now, t(180))).toBe('3시간')
    expect(formatInterval(now, t(60 * 24 * 2))).toBe('2일')
    expect(formatInterval(now, t(60 * 24 * 60))).toBe('2개월')
    expect(formatInterval(now, t(-5))).toBe('0분')
  })
})
