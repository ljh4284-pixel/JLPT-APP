import { useEffect, useState } from 'react'
import type { JudgeResult, Rating, SessionCard, Word } from './types'
import { availableLevels, loadWords } from './data/words'
import {
  allProgress,
  currentCard,
  initProgress,
  recordReview,
  replaceProgress,
  resetProgress,
} from './learning/progress'
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
import {
  normalizeSettings,
  SETTINGS_KEY,
  TYPE_LABEL,
  weightsFor,
  type Settings as SettingsValue,
} from './learning/settings'
import { accuracyStats, levelStats, type LevelStats } from './learning/stats'
import { backupFilename, parseBackup, serializeBackup } from './learning/backup'
import { setVoice } from './platform/audio'
import { downloadText, pickTextFile } from './platform/file'
import { getSetting, loadAllSettings, replaceAllSettings, setSetting } from './platform/storage'
import { Home } from './screens/Home'
import { Onboarding } from './screens/Onboarding'
import { Present } from './screens/Present'
import { QuestionA } from './screens/QuestionA'
import { QuestionB } from './screens/QuestionB'
import { QuestionC } from './screens/QuestionC'
import { Feedback } from './screens/Feedback'
import { Waiting } from './screens/Waiting'
import { Done } from './screens/Done'
import { Progress } from './screens/Progress'
import { Settings } from './screens/Settings'

/** 화면 단계: (최초 실행) → 홈 → (신규면 단어 제시) → 문제 → 피드백 → 다음 카드 … → (재출제 대기) → 종료. 홈에서 진도·설정으로 */
type Phase = 'loading' | 'onboarding' | 'home' | 'present' | 'question' | 'feedback' | 'wait' | 'done' | 'progress' | 'settings'

const EMPTY_SESSION: Session = { queue: [], relearn: [], answered: 0, correct: 0 }

/** 쓸 수 있는 목소리. 이름은 gen_audio.py 의 VOICE_NAMES 와 같다 */
const VOICES = [
  { name: 'ja-JP-Chirp3-HD-Charon', label: 'Charon (남성)' },
  { name: 'ja-JP-Neural2-B', label: 'Neural2-B (여성)' },
]

/** 목소리 들어보기에 쓸 단어 id (病院は美容院の隣です。) */
const SAMPLE_WORD_ID = 'n5-0013'

function App() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [settings, setSettingsState] = useState<SettingsValue>(() => normalizeSettings(undefined))
  const [words, setWords] = useState<Word[]>([])          // 현재 급수의 단어장
  const [session, setSession] = useState<Session>(EMPTY_SESSION)
  const [current, setCurrent] = useState<SessionCard | null>(null)
  const [result, setResult] = useState<JudgeResult | undefined>(undefined)
  const [cardShownAt, setCardShownAt] = useState(0)   // 카드가 보인 시각 (소요 시간 측정)
  const [message, setMessage] = useState<string | null>(null)
  const [progressLevels, setProgressLevels] = useState<LevelStats[]>([])
  const [now, setNow] = useState(() => new Date())   // 화면 표시용 현재 시각 (1초마다 갱신)

  const level = settings.level

  // 앱 시작: 저장소에서 학습 기록과 설정을 읽는다. 설정이 없으면 최초 실행 안내로
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let s = normalizeSettings(undefined)
      try {
        await initProgress()
        let raw = await getSetting<unknown>(SETTINGS_KEY)
        if (raw === undefined) {
          // 5단계에서 따로 저장하던 입력 방식 값이 있으면 가져온다
          const oldInputMode = await getSetting<string>('inputMode')
          if (oldInputMode) raw = { inputMode: oldInputMode }
        }
        s = normalizeSettings(raw)
      } catch (e) {
        console.error('저장소 읽기 실패', e)
        if (!cancelled) setMessage('저장된 기록을 읽지 못했습니다. 이번에는 기록이 저장되지 않을 수 있습니다.')
      }
      if (cancelled) return
      setSettingsState(s)
      setVoice(s.voice)
      setPhase(s.onboarded ? 'home' : 'onboarding')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 급수가 바뀌면 그 급수의 단어장만 불러온다 (급수별 분리 로딩)
  useEffect(() => {
    let cancelled = false
    loadWords(level).then((list) => {
      if (!cancelled) setWords(list)
    })
    return () => {
      cancelled = true
    }
  }, [level])

  /** 세션에서 다음 할 일을 꺼내 화면을 정한다 */
  function advance(s: Session, force = false) {
    const [step, next] = takeNext(s, new Date(), force)
    setSession(next)
    setResult(undefined)
    if (step.kind === 'card') {
      setCurrent(step.card)
      setCardShownAt(Date.now())
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

  const weights = weightsFor(settings, level)

  function updateSettings(next: SettingsValue) {
    setSettingsState(next)
    setVoice(next.voice)
    void setSetting(SETTINGS_KEY, next)
  }

  function start() {
    setMessage(null)
    advance(buildSession(words, allProgress(), new Date(), { newPerDay: settings.newPerDay, weights }))
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
    const progress = recordReview(current.word, current.questionType, rating, judged, at, Date.now() - cardShownAt)
    const detail = result ? ` 판정=${result.correct ? '정답' : '오답'} 입력="${result.answer}" 힌트=${result.hintUsed}` : ''
    console.log(
      `[자기평가] ${TYPE_LABEL[current.questionType]} id=${current.word.id} ${current.word.word} (${current.word.reading}) → ${rating}${detail}` +
        ` | 다음 복습 ${formatInterval(at, progress.fsrs_card.due)} 뒤 (${progress.fsrs_card.due.toLocaleString()})`,
    )
    advance(afterRating(session, current, rating, progress, weights))
  }

  /** 진도 화면: 준비된 모든 급수의 단어장을 읽어 급수별 통계를 만든다 */
  async function openProgress() {
    const list = allProgress()
    const stats: LevelStats[] = []
    for (const l of availableLevels()) stats.push(levelStats(await loadWords(l), list, l))
    setProgressLevels(stats)
    setPhase('progress')
  }

  // ---- 기록 내보내기 / 불러오기 / 초기화 ----
  async function exportBackup() {
    const all = await loadAllSettings()
    const at = new Date()
    downloadText(backupFilename(at), serializeBackup(allProgress(), all, at))
    setMessage('백업 파일을 내려받았습니다')
  }

  async function importBackup() {
    const text = await pickTextFile()
    if (text === null) return
    try {
      const { progress, settings: restored } = parseBackup(text)
      await replaceProgress(progress)
      await replaceAllSettings(restored)
      const s = normalizeSettings(restored[SETTINGS_KEY])
      setSettingsState({ ...s, onboarded: true })
      setVoice(s.voice)
      setMessage(`기록 ${progress.length}개를 불러왔습니다`)
    } catch (e) {
      setMessage(`불러오기 실패: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  async function resetAll() {
    await resetProgress()
    setMessage('기록을 모두 지웠습니다')
  }

  // ---- 화면별 표시값 ----
  const progressList = allProgress()
  const dueCount = dueWords(words, progressList, now).length
  const newCount = newWords(words, progressList, settings.newPerDay).length
  const learnedCount = progressList.filter((p) => p.level === level).length
  const sampleWord = words.find((w) => w.id === SAMPLE_WORD_ID) ?? words[0] ?? null

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
      {current && (phase === 'present' || phase === 'question' || phase === 'feedback') && (
        <header className="topbar">
          <span>
            {level} · {TYPE_LABEL[current.questionType]}
            {current.isNew ? ' · 신규' : ' · 복습'}
          </span>
          <span>{session.answered + 1} / {total}</span>
        </header>
      )}

      {phase === 'loading' && (
        <main className="content center">
          <p className="muted">불러오는 중…</p>
        </main>
      )}
      {phase === 'onboarding' && (
        <Onboarding
          voices={VOICES}
          sample={sampleWord}
          value={settings.voice}
          onChange={(voice) => updateSettings({ ...settings, voice })}
          onDone={() => {
            updateSettings({ ...settings, onboarded: true })
            setPhase('home')
          }}
        />
      )}
      {phase === 'home' && (
        <Home
          level={level}
          availableLevels={availableLevels()}
          dueCount={dueCount}
          newCount={newCount}
          learnedCount={learnedCount}
          message={message}
          onLevelChange={(l) => updateSettings({ ...settings, level: l })}
          onStart={start}
          onProgress={() => void openProgress()}
          onSettings={() => { setMessage(null); setPhase('settings') }}
        />
      )}
      {phase === 'progress' && (
        <Progress
          levels={progressLevels}
          accuracy={accuracyStats(progressList, now)}
          onClose={() => setPhase('home')}
        />
      )}
      {phase === 'settings' && (
        <Settings
          level={level}
          settings={settings}
          voices={VOICES}
          message={message}
          onChange={updateSettings}
          onExport={() => void exportBackup()}
          onImport={() => void importBackup()}
          onReset={() => void resetAll()}
          onClose={() => { setMessage(null); setPhase('home') }}
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
          inputMode={settings.inputMode}
          onInputModeChange={(m) => updateSettings({ ...settings, inputMode: m })}
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
