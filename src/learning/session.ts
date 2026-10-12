/**
 * 세션 구성 (PROJECT.md 6장 세션 구성 규칙)
 *  - 오늘 기한이 된 복습 카드 전부 + 신규 카드 N개
 *  - 복습과 신규를 섞어서 출제
 *  - 세션 내 오답(짧은 간격 상태가 된 카드)은 기한이 지나면 다시 출제
 * 모두 순수 함수. 날짜는 항상 바깥에서 now 로 받는다.
 */
import { State } from 'ts-fsrs'
import type { QuestionType, Rating, SessionCard, Word, WordProgress } from '../types'
import { isShortTerm } from './scheduler'
import { canMakeQuestion } from '../logic/distractors'
import { NEW_PER_SESSION } from '../config'
import { typeCycle, type TypeWeights } from './settings'

export interface Session {
  pool: Word[]                                      // 이 세션의 단어장 (읽기 고르기의 다른 단어 읽기 오답 후보)
  queue: SessionCard[]                              // 아직 안 낸 카드
  relearn: { card: SessionCard; due: Date }[]       // 세션 내 재출제 대기 (due 오름차순)
  answered: number
  correct: number                                   // '다시' 가 아닌 평가 수
}

export type NextStep =
  | { kind: 'card'; card: SessionCard }
  | { kind: 'wait'; due: Date; count: number }
  | { kind: 'done' }

/** 그날 23:59:59.999 */
export function endOfDay(d: Date): Date {
  const e = new Date(d)
  e.setHours(23, 59, 59, 999)
  return e
}

/** 오늘 복습해야 하는 카드인지 */
export function isDueToday(p: WordProgress, now: Date): boolean {
  const card = p.fsrs_card
  // 짧은 간격 상태(다시/어려움 직후)는 그 시각이 실제로 지나야 낸다
  if (isShortTerm(card)) return card.due.getTime() <= now.getTime()
  // 보통 복습 카드는 오늘 안에 기한이면 낸다
  return card.state === State.Review && card.due.getTime() <= endOfDay(now).getTime()
}

/** 같은 날인지 (기기 시간 기준) */
export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** 오늘 처음 학습을 시작한 단어 수 (이 단어장 안에서). 하루 신규 한도에서 뺀다 (검토 반영 2026-10-13) */
export function startedToday(words: Word[], progress: WordProgress[], now: Date): number {
  const ids = new Set(words.map((w) => w.id))
  return progress.filter(
    (p) => ids.has(p.word_id) && !p.suspended && p.review_log.length > 0 && sameDay(new Date(p.review_log[0].date), now),
  ).length
}

/** 오늘 복습 대상 단어 (기한 빠른 순). 제외한 단어는 빠진다 */
export function dueWords(words: Word[], progress: WordProgress[], now: Date): Word[] {
  const byId = new Map(words.map((w) => [w.id, w]))
  return progress
    .filter((p) => !p.suspended && isDueToday(p, now))
    .sort((a, b) => a.fsrs_card.due.getTime() - b.fsrs_card.due.getTime())
    .map((p) => byId.get(p.word_id))
    .filter((w): w is Word => w !== undefined)
}

/**
 * 신규로 낼 순서 (검토 반영 2026-10-13). 파일 순서·id 는 바꾸지 않고 여기서만 계산한다.
 *  - 핵심(tier core) 먼저, 확장(ext)은 뒤에
 *  - 같은 묶음 안에서는 첫 태그(분야)를 돌아가며 하나씩 꺼내 분야·품사를 섞는다
 */
export function newWordOrder(words: Word[]): Word[] {
  const out: Word[] = []
  for (const tier of ['core', 'ext']) {
    const byField = new Map<string, Word[]>()
    for (const w of words) {
      if ((w.tier ?? 'core') !== tier) continue
      const key = w.tags[0] ?? ''
      const q = byField.get(key)
      if (q) q.push(w)
      else byField.set(key, [w])
    }
    const queues = Array.from(byField.values())
    let remaining = queues.reduce((n, q) => n + q.length, 0)
    while (remaining > 0) {
      for (const q of queues) {
        const w = q.shift()
        if (w) {
          out.push(w)
          remaining--
        }
      }
    }
  }
  return out
}

function kanjiOf(s: string): string[] {
  return Array.from(s).filter((ch) => {
    const c = ch.codePointAt(0) ?? 0
    return c >= 0x4e00 && c <= 0x9fff
  })
}

/**
 * 아직 한 번도 안 본 단어 중 limit 개 (newWordOrder 순서).
 *  - now 를 주면 오늘 이미 시작한 신규 수를 한도에서 뺀다 (세션을 다시 시작해도 하루 한도를 넘지 않음)
 *  - 제외한 단어는 기록이 있으므로 신규에서 빠진다
 *  - 같은 한자를 공유하는 단어(以上·以下·以内·以外)는 같은 날 함께 내지 않고 뒤로 미룬다. 모자라면 미룬 것으로 채운다
 */
export function newWords(words: Word[], progress: WordProgress[], limit = NEW_PER_SESSION, now?: Date): Word[] {
  const seen = new Set(progress.map((p) => p.word_id))
  const quota = now ? Math.max(0, limit - startedToday(words, progress, now)) : limit
  const unseen = newWordOrder(words).filter((w) => !seen.has(w.id))
  const picked: Word[] = []
  const deferred: Word[] = []
  const usedKanji = new Set<string>()
  for (const w of unseen) {
    if (picked.length >= quota) break
    const ks = kanjiOf(w.word)
    if (ks.some((k) => usedKanji.has(k))) {
      deferred.push(w)
      continue
    }
    picked.push(w)
    for (const k of ks) usedKanji.add(k)
  }
  for (const w of deferred) {
    if (picked.length >= quota) break
    picked.push(w)
  }
  return picked
}

/** 내일까지 기한인 카드 수 (오늘 기한은 제외) */
export function dueTomorrowCount(progress: WordProgress[], now: Date): number {
  const today = endOfDay(now).getTime()
  const tomorrow = today + 24 * 60 * 60 * 1000
  return progress.filter((p) => {
    const t = p.fsrs_card.due.getTime()
    return t > today && t <= tomorrow
  }).length
}

/** 신규(b)를 복습(a) 사이에 고르게 끼워 넣는다 */
export function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = []
  let ai = 0
  let bi = 0
  while (ai < a.length || bi < b.length) {
    if (ai >= a.length) out.push(b[bi++])
    else if (bi >= b.length) out.push(a[ai++])
    else if (bi * a.length < ai * b.length) out.push(b[bi++])   // 신규가 뒤처지면 신규
    else out.push(a[ai++])
  }
  return out
}

/** 뜻 회상(A) 또는 읽기 입력(C)에서 한 번이라도 맞힌 적이 있는지 */
export function answeredCorrectlyBefore(p: WordProgress | undefined): boolean {
  if (!p) return false
  return p.review_log.some(
    (e) => (e.question_type === 'A' && e.rating !== 'again') || (e.question_type === 'C' && e.result === 'correct'),
  )
}

/**
 * 읽기 고르기(B)를 낼 수 있는 단어인지 (PROJECT.md 3장 B 적용 조건)
 *  - A 또는 C 에서 최소 1회 맞힌 후부터. 신규 첫 노출에는 쓰지 않음
 *  - 유효한 오답 3개 이상 (N4 이상은 같은 급수 단어장 pool 에서 다른 단어 읽기도 오답으로 쓴다)
 */
export function canAskB(word: Word, p: WordProgress | undefined, pool: Word[] = []): boolean {
  return answeredCorrectlyBefore(p) && canMakeQuestion(word, pool)
}

export interface SessionOptions {
  newPerDay: number       // 신규 단어 수
  weights: TypeWeights    // 문제 유형 비중 (설정 화면)
}

/**
 * 카드에 낼 문제 유형. 비중에서 만든 순환 순서(typeCycle)를 카드 순서대로 돈다.
 *  - 신규 카드는 읽기 고르기를 내지 않는다 (첫 노출 금지) → 순환에서 B 를 뺀 순서를 쓴다
 *  - 복습 카드에서 읽기 고르기 차례인데 그 단어가 조건 미달이면 뜻 회상
 */
export function typeFor(cycle: QuestionType[], position: number, isNew: boolean, bAllowed: boolean): QuestionType {
  if (isNew) {
    const noB = cycle.filter((t) => t !== 'B')
    return noB.length > 0 ? noB[position % noB.length] : 'A'
  }
  const t = cycle[position % cycle.length]
  return t === 'B' && !bAllowed ? 'A' : t
}

/** 오늘의 세션을 만든다 */
export function buildSession(words: Word[], progress: WordProgress[], now: Date, options: SessionOptions): Session {
  const byId = new Map(progress.map((p) => [p.word_id, p]))
  const cycle = typeCycle(options.weights)
  const reviews = dueWords(words, progress, now).map((word) => ({ word, isNew: false }))
  const fresh = newWords(words, progress, options.newPerDay, now).map((word) => ({ word, isNew: true }))
  const mixed = interleave(reviews, fresh)
  let reviewPos = 0
  let newPos = 0
  const queue: SessionCard[] = mixed.map((c) => ({
    ...c,
    questionType: typeFor(cycle, c.isNew ? newPos++ : reviewPos++, c.isNew, canAskB(c.word, byId.get(c.word.id), words)),
  }))
  return { pool: words, queue, relearn: [], answered: 0, correct: 0 }
}

/** 다음에 할 일. force=true 면 재출제 카드를 기한 전이라도 꺼낸다 */
export function peekNext(s: Session, now: Date, force = false): NextStep {
  const first = s.relearn[0]
  if (first && (force || first.due.getTime() <= now.getTime())) return { kind: 'card', card: first.card }
  if (s.queue.length > 0) return { kind: 'card', card: s.queue[0] }
  if (first) return { kind: 'wait', due: first.due, count: s.relearn.length }
  return { kind: 'done' }
}

/** peekNext 가 고른 카드를 대기열에서 뺀 세션 */
export function takeNext(s: Session, now: Date, force = false): [NextStep, Session] {
  const step = peekNext(s, now, force)
  if (step.kind !== 'card') return [step, s]
  if (s.relearn[0]?.card === step.card) return [step, { ...s, relearn: s.relearn.slice(1) }]
  return [step, { ...s, queue: s.queue.slice(1) }]
}

/**
 * 평가 후 세션 갱신. 짧은 간격 상태가 되면 재출제 대기에 넣는다.
 * 재출제 카드는 이미 한 번 본 뒤이므로, 읽기 고르기를 낼 수 있으면 그것을,
 * 아니면 읽기 입력(비중이 0 이면 뜻 회상)을 낸다.
 */
export function afterRating(s: Session, card: SessionCard, rating: Rating, progress: WordProgress, weights?: TypeWeights): Session {
  const next: Session = {
    ...s,
    answered: s.answered + 1,
    correct: s.correct + (rating === 'again' ? 0 : 1),
  }
  if (isShortTerm(progress.fsrs_card)) {
    const questionType: QuestionType = canAskB(card.word, progress, s.pool) ? 'B' : weights && weights.C === 0 ? 'A' : 'C'
    const item = { card: { ...card, isNew: false, questionType }, due: progress.fsrs_card.due }
    next.relearn = [...s.relearn, item].sort((x, y) => x.due.getTime() - y.due.getTime())
  }
  return next
}
