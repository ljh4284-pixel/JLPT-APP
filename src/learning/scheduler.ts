/**
 * 간격 반복 스케줄러 (ts-fsrs 감싸기)
 * 화면 코드는 ts-fsrs 를 직접 부르지 않고 이 파일의 함수만 쓴다.
 *
 * 설정: 학습 단계를 10분 하나로 둔다 (RELEARN_STEP).
 *  - 신규 카드: 다시 → 10분 뒤, 어려움 → 15분 뒤, 보통 → 약 2일, 쉬움 → 약 8일
 *  - 복습 카드: 다시 → 10분 뒤(재학습), 나머지는 며칠~몇 주
 */
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating as FsrsRating,
  State,
  type Card,
  type Grade,
} from 'ts-fsrs'
import type { Rating } from '../types'
import { RELEARN_STEP } from '../config'

const params = generatorParameters({
  learning_steps: [RELEARN_STEP],
  relearning_steps: [RELEARN_STEP],
})
const scheduler = fsrs(params)

const GRADE: Record<Rating, Grade> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
}

/** 한 번도 안 본 단어의 빈 카드 */
export function newCard(now: Date): Card {
  return createEmptyCard(now)
}

/** 자기평가를 적용해 다음 복습 시각이 계산된 새 카드를 돌려준다 */
export function applyRating(card: Card, rating: Rating, now: Date): Card {
  return scheduler.next(card, now, GRADE[rating]).card
}

/** 각 평가 버튼을 눌렀을 때의 다음 복습 시각 (버튼 아래 표시용) */
export function previewDue(card: Card, now: Date): Record<Rating, Date> {
  const p = scheduler.repeat(card, now)
  return {
    again: p[FsrsRating.Again].card.due,
    hard: p[FsrsRating.Hard].card.due,
    good: p[FsrsRating.Good].card.due,
    easy: p[FsrsRating.Easy].card.due,
  }
}

/** 아직 한 번도 평가하지 않은 카드인지 */
export function isNewCard(card: Card): boolean {
  return card.state === State.New
}

/** 학습 단계(짧은 간격) 상태인지 = 세션 안에서 곧 다시 볼 카드 */
export function isShortTerm(card: Card): boolean {
  return card.state === State.Learning || card.state === State.Relearning
}

/** 두 시각의 차이를 "10분", "3시간", "2일" 처럼 표시 */
export function formatInterval(from: Date, to: Date): string {
  const min = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000))
  if (min < 60) return `${min}분`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}시간`
  const d = Math.round(min / 1440)
  if (d < 30) return `${d}일`
  return `${Math.round(d / 30)}개월`
}
