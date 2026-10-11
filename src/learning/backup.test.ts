import { describe, expect, it } from 'vitest'
import type { WordProgress } from '../types'
import { backupFilename, parseBackup, serializeBackup } from './backup'
import { applyRating, newCard } from './scheduler'

const now = new Date('2026-10-12T09:00:00')

describe('백업 파일', () => {
  const progress: WordProgress[] = [{
    word_id: 'n5-0001',
    level: 'N5',
    fsrs_card: applyRating(newCard(now), 'good', now),
    review_log: [{ date: now.toISOString(), question_type: 'A', result: null, rating: 'good', duration_ms: 4200 }],
  }]

  it('내보낸 것을 다시 읽으면 날짜가 Date 로 돌아온다', () => {
    const text = serializeBackup(progress, { inputMode: 'kana' }, now)
    const back = parseBackup(text)
    expect(back.progress).toHaveLength(1)
    expect(back.progress[0].fsrs_card.due).toBeInstanceOf(Date)
    expect(back.progress[0].fsrs_card.due.getTime()).toBe(progress[0].fsrs_card.due.getTime())
    expect(back.progress[0].fsrs_card.last_review).toBeInstanceOf(Date)
    expect(back.progress[0].review_log[0].duration_ms).toBe(4200)
    expect(back.settings).toEqual({ inputMode: 'kana' })
  })

  it('파일 이름에 날짜가 들어간다', () => {
    expect(backupFilename(now)).toBe('jlpt-backup-20261012.json')
  })

  it('잘못된 파일은 이유와 함께 거부한다', () => {
    expect(() => parseBackup('not json')).toThrow('JSON 파일이 아닙니다')
    expect(() => parseBackup('{"app":"other"}')).toThrow('이 앱의 백업 파일이 아닙니다')
    expect(() => parseBackup('{"app":"jlpt-app","schema":99,"progress":[]}')).toThrow('더 새로운 버전')
    expect(() => parseBackup('{"app":"jlpt-app","schema":1,"progress":[{"word_id":1}]}')).toThrow('1번째 기록')
    expect(() => parseBackup('{"app":"jlpt-app","schema":1,"progress":[{"word_id":"x","fsrs_card":{"due":"???"}}]}')).toThrow('복습 날짜')
  })
})
