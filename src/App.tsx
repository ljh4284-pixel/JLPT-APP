import { useEffect, useState } from 'react'
import type { InputMode, JudgeResult, QuestionType, Rating, SessionCard } from './types'
import { wordsN5 } from './data/words'
import { allProgress, currentCard, recordReview } from './learning/progress'
import { formatInterval, previewDue } from './learning/scheduler'
import {
  afterRating,
  buildSession,
  dueTomorrowCount,
  dueWords,
  newWords,
  peekNext,
  takeNext,
  type Session,
} from './learning/session'
import { Home } from './screens/Home'
import { Present } from './screens/Present'
import { QuestionA } from './screens/QuestionA'
import { QuestionB } from './screens/QuestionB'
import { QuestionC } from './screens/QuestionC'
import { Feedback } from './screens/Feedback'
import { Waiting } from './screens/Waiting'
import { Done } from './screens/Done'

/** 화면 단계: 홈 → (신규면 단어 제시) → 문제 → 피드백 → 다음 카드 … → (재출제 대기) → 종료 */
type Phase = 'home' | 'present' | 'question' | 'feedback' | 'wait' | 'done'

const LEVEL = 'N5'

/** 화면에 보여줄 유형 이름 (A/C 같은 기호는 사용자에게 보이지 않게) */
const TYPE_LABEL: Record<QuestionType, string> = { A: '뜻 회상', B: '읽기 고르기', C: '발음 입력' }

const EMPTY_SESSION: Session = { queue: [], relearn: [], answered: 0, correct: 0 }

function App() {
  const [phase, setPhase] = useState<Phase>('home')
  const [inputMode, setInputMode] = useState<InputMode>('romaji')
  const [session, setSession] = useState<Session>(EMPTY_SESSION)
  const [current, setCurrent] = useState<SessionCard | null>(null)
  const [result, setResult] = useState<JudgeResult | undefined>(undefined)
  const [now, setNow] = useState(() => new Date())   // 화면 표시용 현재 시각 (1초마다 갱신)

  const words = wordsN5

  /** 세션에서 다음 할 일을 꺼내 화면을 정한다 */
  function advance(s: Session, force = false) {
    const [step, next] = takeNext(s, new Date(), force)
    setSession(next)
    setResult(undefined)
    if (step.kind === 'card') {
      setCurrent(step.card)
      setPhase(step.card.isNew ? 'present' : 'question')
    } else if (step.kind === 'wait') {
      setCurrent(null)
      setPhase('wait')
    } else {
      setCurrent(null)
      setPhase('done')
    }
  }

  // 1초마다 현재 시각을 갱신한다. 홈의 복습 개수, 대기 화면의 남은 시간이 여기에 따라 바뀐다.
  // 대기 화면에서 재출제 기한이 지나면 자동으로 그 카드를 낸다.
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date()
      setNow(n)
      if (phase === 'wait' && peekNext(session, n).kind === 'card') advance(session)
    }, 1000)
    return () => clearInterval(id)
  })

  function start() {
    // 문제 유형은 항상 뜻 회상과 발음 입력을 번갈아 낸다 (유형 비중 설정은 6단계)
    advance(buildSession(words, allProgress(), new Date(), 'mix'))
  }

  /** 읽기 고르기(B)·발음 입력(C)의 자동 판정 결과를 받아 피드백으로 간다 */
  function submitJudged(r: JudgeResult) {
    setResult(r)
    setPhase('feedback')
  }

  function rate(rating: Rating) {
    if (!current) return
    const at = new Date()
    const judged = result ? (result.correct ? 'correct' : 'wrong') : null
    const progress = recordReview(current.word, current.questionType, rating, judged, at)
    const detail = result ? ` 판정=${result.correct ? '정답' : '오답'} 입력="${result.answer}" 힌트=${result.hintUsed}` : ''
    console.log(
      `[자기평가] ${TYPE_LABEL[current.questionType]} id=${current.word.id} ${current.word.word} (${current.word.reading}) → ${rating}${detail}` +
        ` | 다음 복습 ${formatInterval(at, progress.fsrs_card.due)} 뒤 (${progress.fsrs_card.due.toLocaleString()})`,
    )
    advance(afterRating(session, current, rating, progress))
  }

  // ---- 화면별 표시값 ----
  const progressList = allProgress()
  const dueCount = dueWords(words, progressList, now).length
  const newCount = newWords(words, progressList).length

  const intervals = current
    ? (() => {
        const due = previewDue(currentCard(current.word.id, now), now)
        return {
          again: formatInterval(now, due.again),
          hard: formatInterval(now, due.hard),
          good: formatInterval(now, due.good),
          easy: formatInterval(now, due.easy),
        }
      })()
    : { again: '', hard: '', good: '', easy: '' }

  const waitStep = phase === 'wait' ? peekNext(session, now) : null
  const remaining = session.queue.length + session.relearn.length + (current ? 1 : 0)
  const total = session.answered + remaining

  return (
    <div className="app">
      {current && phase !== 'home' && phase !== 'done' && phase !== 'wait' && (
        <header className="topbar">
          <span>
            {LEVEL} · {TYPE_LABEL[current.questionType]}
            {current.isNew ? ' · 신규' : ' · 복습'}
          </span>
          <span>{session.answered + 1} / {total}</span>
        </header>
      )}

      {phase === 'home' && (
        <Home
          level={LEVEL}
          dueCount={dueCount}
          newCount={newCount}
          onStart={start}
        />
      )}
      {phase === 'present' && current && <Present word={current.word} onNext={() => setPhase('question')} />}
      {phase === 'question' && current && current.questionType === 'A' && (
        <QuestionA word={current.word} onReveal={() => setPhase('feedback')} />
      )}
      {phase === 'question' && current && current.questionType === 'B' && (
        <QuestionB key={`${current.word.id}-${session.answered}`} word={current.word} onSubmit={submitJudged} />
      )}
      {phase === 'question' && current && current.questionType === 'C' && (
        <QuestionC
          key={`${current.word.id}-${session.answered}`}
          word={current.word}
          inputMode={inputMode}
          onInputModeChange={setInputMode}
          onSubmit={submitJudged}
        />
      )}
      {phase === 'feedback' && current && (
        <Feedback
          word={current.word}
          questionType={current.questionType}
          result={result}
          intervals={intervals}
          onRate={rate}
        />
      )}
      {phase === 'wait' && waitStep?.kind === 'wait' && (
        <Waiting
          due={waitStep.due}
          now={now}
          count={waitStep.count}
          onNow={() => advance(session, true)}
          onEnd={() => setPhase('done')}
        />
      )}
      {phase === 'done' && (
        <Done
          answered={session.answered}
          correct={session.correct}
          tomorrowCount={dueTomorrowCount(progressList, now)}
          pendingCount={session.relearn.length}
          onHome={() => {
            setSession(EMPTY_SESSION)
            setPhase('home')
          }}
        />
      )}
    </div>
  )
}

export default App
