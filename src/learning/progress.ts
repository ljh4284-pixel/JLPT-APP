/**
 * 학습 상태 (메모리 캐시 + 저장소)
 * 앱이 켜질 때 저장소에서 전부 읽어 두고, 평가할 때마다 바뀐 단어만 저장소에 다시 쓴다.
 * 화면 코드는 이 파일의 함수만 쓴다. 저장소 구현은 platform/storage.ts 에 있다.
 */
import type { Card } from 'ts-fsrs'
import type { QuestionType, Rating, ReviewLogEntry, Word, WordProgress } from '../types'
import { applyRating, newCard } from './scheduler'
import {
  clearAllProgress,
  deleteProgress,
  loadAllProgress,
  replaceAllProgress,
  requestPersistentStorage,
  saveProgress,
} from '../platform/storage'

const store = new Map<string, WordProgress>()
let loaded = false

/** 앱 시작 시 한 번. 저장소의 기록을 메모리로 읽는다 */
export async function initProgress(): Promise<void> {
  if (loaded) return
  const list = await loadAllProgress()
  store.clear()
  for (const p of list) store.set(p.word_id, p)
  loaded = true
  void requestPersistentStorage()
}

export function getProgress(wordId: string): WordProgress | undefined {
  return store.get(wordId)
}

export function allProgress(): WordProgress[] {
  return Array.from(store.values())
}

/** 현재 카드. 기록이 없으면 빈 카드 */
export function currentCard(wordId: string, now: Date): Card {
  return store.get(wordId)?.fsrs_card ?? newCard(now)
}

/** 평가 한 번을 기록하고 다음 복습 시각을 계산한다. 저장은 뒤에서 이어진다 */
export function recordReview(
  word: Word,
  questionType: QuestionType,
  rating: Rating,
  result: ReviewLogEntry['result'],
  now: Date,
  durationMs?: number,
): WordProgress {
  const prev = store.get(word.id)
  const card = applyRating(prev?.fsrs_card ?? newCard(now), rating, now)
  const entry: ReviewLogEntry = {
    date: now.toISOString(),
    question_type: questionType,
    result,
    rating,
    ...(durationMs !== undefined ? { duration_ms: Math.round(durationMs) } : {}),
  }
  const next: WordProgress = {
    word_id: word.id,
    level: word.level,
    fsrs_card: card,
    review_log: [...(prev?.review_log ?? []), entry],
  }
  store.set(word.id, next)
  void saveProgress(next).catch((e) => console.error('학습 기록 저장 실패', e))
  return next
}

/** 직전 평가 취소: 그 단어의 기록을 평가 전 상태로 되돌린다. prev 가 없으면(첫 평가였으면) 기록을 지운다 */
export async function restoreProgress(wordId: string, prev: WordProgress | undefined): Promise<void> {
  if (prev) {
    store.set(wordId, prev)
    await saveProgress(prev)
  } else {
    store.delete(wordId)
    await deleteProgress(wordId)
  }
}

/** 단어 일시 제외. 기록이 없으면 빈 카드로 기록을 만든다 (신규에서도 빠지도록) */
export function suspendWord(word: Word, now: Date): WordProgress {
  const prev = store.get(word.id)
  const next: WordProgress = {
    word_id: word.id,
    level: word.level,
    fsrs_card: prev?.fsrs_card ?? newCard(now),
    review_log: prev?.review_log ?? [],
    ...(prev?.known_by_test ? { known_by_test: true } : {}),
    suspended: true,
  }
  store.set(word.id, next)
  void saveProgress(next).catch((e) => console.error('학습 기록 저장 실패', e))
  return next
}

/** 제외 해제. 평가 기록이 하나도 없던 단어면 기록을 지워 다시 신규로 돌아간다 */
export function unsuspendWord(wordId: string): void {
  const prev = store.get(wordId)
  if (!prev) return
  if (prev.review_log.length === 0) {
    store.delete(wordId)
    void deleteProgress(wordId).catch((e) => console.error('학습 기록 저장 실패', e))
    return
  }
  const next: WordProgress = { ...prev, suspended: false }
  store.set(wordId, next)
  void saveProgress(next).catch((e) => console.error('학습 기록 저장 실패', e))
}

/** 기록 전체를 바꾼다 (백업 불러오기) */
export async function replaceProgress(list: WordProgress[]): Promise<void> {
  await replaceAllProgress(list)
  store.clear()
  for (const p of list) store.set(p.word_id, p)
}

/** 기록 전체 삭제 */
export async function resetProgress(): Promise<void> {
  await clearAllProgress()
  store.clear()
}
