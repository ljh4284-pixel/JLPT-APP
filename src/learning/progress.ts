/**
 * 학습 상태 저장소 (3단계: 메모리에만 둔다. 앱을 새로 고치면 사라진다)
 * 5단계에서 Dexie(IndexedDB) 모듈로 바꾼다. 화면 코드는 이 파일의 함수만 쓴다.
 */
import type { Card } from 'ts-fsrs'
import type { QuestionType, Rating, ReviewLogEntry, Word, WordProgress } from '../types'
import { applyRating, newCard } from './scheduler'

const store = new Map<number, WordProgress>()

export function getProgress(wordId: number): WordProgress | undefined {
  return store.get(wordId)
}

export function allProgress(): WordProgress[] {
  return Array.from(store.values())
}

/** 현재 카드. 기록이 없으면 빈 카드 */
export function currentCard(wordId: number, now: Date): Card {
  return store.get(wordId)?.fsrs_card ?? newCard(now)
}

/** 평가 한 번을 기록하고 다음 복습 시각을 계산한다 */
export function recordReview(
  word: Word,
  questionType: QuestionType,
  rating: Rating,
  result: ReviewLogEntry['result'],
  now: Date,
): WordProgress {
  const prev = store.get(word.id)
  const card = applyRating(prev?.fsrs_card ?? newCard(now), rating, now)
  const entry: ReviewLogEntry = {
    date: now.toISOString(),
    question_type: questionType,
    result,
    rating,
  }
  const next: WordProgress = {
    word_id: word.id,
    level: word.level,
    fsrs_card: card,
    review_log: [...(prev?.review_log ?? []), entry],
  }
  store.set(word.id, next)
  return next
}
