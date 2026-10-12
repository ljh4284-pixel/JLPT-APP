import { useEffect, useState } from 'react'
import type { JudgeResult, QuestionType, Rating, Word } from '../types'
import { playExample, playWord } from '../platform/audio'

interface Props {
  word: Word
  questionType: QuestionType
  result?: JudgeResult                 // 유형 B, C 일 때만 있음
  intervals: Record<Rating, string>    // 각 버튼을 눌렀을 때의 다음 복습까지 간격 ("10분", "2일")
  onRate: (rating: Rating) => void
  onSuspend: () => void                // 이 단어를 학습에서 일시 제외 (문제가 있는 단어 신고)
}

/** 화면이 뜬 직후 잠깐은 평가 버튼을 막는다 (앞 화면에서 누른 손가락이 그대로 눌리는 것 방지) */
const GUARD_MS = 300

const LABEL: Record<Rating, string> = {
  again: '다시',
  hard: '어려움',
  good: '보통',
  easy: '쉬움',
}

/** 읽기 고르기(B)는 문제에서 음성을 안 들려주므로 정답 화면에서 자동 재생한다 */
const AUTOPLAY_DELAY_MS = 400

/**
 * 피드백: 정답/오답, 표기+읽기+뜻+예문, 자기평가 (각 버튼에 다음 복습 간격 표시)
 * 판정-자기평가 규칙 (PROJECT.md 3장 B, C):
 *  - 오답 → '다시'로 고정 (버튼 없음)
 *  - 정답 + 힌트 사용 → '다시'로 고정 (2026-10-13까지는 '어려움')
 *  - 정답 → 어려움/보통/쉬움 중 선택
 *  - 유형 A 는 자동 판정이 없으므로 4버튼 모두
 */
export function Feedback({ word, questionType, result, intervals, onRate, onSuspend }: Props) {
  const [ready, setReady] = useState(false)
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setReady(true), GUARD_MS)
    return () => clearTimeout(id)
  }, [word])
  useEffect(() => {
    if (questionType !== 'B') return
    const id = setTimeout(() => playWord(word), AUTOPLAY_DELAY_MS)
    return () => clearTimeout(id)
  }, [questionType, word])

  let fixed: Rating | null = null
  let choices: Rating[] = ['again', 'hard', 'good', 'easy']
  let header = '정답'
  let headerClass = ''

  const judged = questionType !== 'A' && result ? result : undefined
  if (judged) {
    if (!judged.correct) {
      fixed = 'again'
      header = '오답'
      headerClass = 'ng'
    } else if (judged.hintUsed) {
      fixed = 'again'            // 첫 글자 힌트는 답의 일부 → 기억해 낸 것이 아니므로 '다시' (검토 반영 2026-10-13)
      header = '정답 (힌트 사용)'
      headerClass = 'ok'
    } else {
      choices = ['hard', 'good', 'easy']
      header = '정답!'
      headerClass = 'ok'
    }
  }

  return (
    <>
      <main className="content">
        <p className={`label result ${headerClass}`}>{header}</p>
        {judged && !judged.correct && (
          <p className="my-answer" lang="ja">
            내 답: {judged.answer || '(비움)'}
            {judged.wrongPoint && <span className="wrong-point"> · 틀린 지점: {judged.wrongPoint}</span>}
          </p>
        )}
        <p className="word" lang="ja">{word.word}</p>
        <p className="reading" lang="ja">{word.reading}</p>
        <button className="btn play" onClick={() => playWord(word)} aria-label="발음 재생">
          🔊 발음
        </button>
        <p className="meaning">{word.meaning_ko}</p>
        <div className="example">
          <p lang="ja">{word.example_ja}</p>
          <p className="example-reading" lang="ja">{word.example_reading}</p>
          <p className="muted">{word.example_ko}</p>
          <button className="btn play example-play" onClick={() => playExample(word)} aria-label="예문 발음 재생">
            🔊 예문 듣기
          </button>
        </div>
        <div className="suspend-row">
          {confirmSuspend ? (
            <>
              <span className="muted small">이 단어를 학습에서 빼고 다음으로 넘어갑니다. 설정에서 복구할 수 있습니다</span>
              <button type="button" className="link danger" onClick={onSuspend}>제외</button>
              <button type="button" className="link" onClick={() => setConfirmSuspend(false)}>취소</button>
            </>
          ) : (
            <button type="button" className="link quiet" onClick={() => setConfirmSuspend(true)}>
              이 단어에 문제가 있어요 (일시 제외)
            </button>
          )}
        </div>
      </main>

      {fixed ? (
        <footer className="actions">
          <p className="note">
            '{LABEL[fixed]}'(으)로 기록됩니다 · 다음 복습 {intervals[fixed]} 뒤
          </p>
          <button className={`btn rate ${fixed}`} disabled={!ready} onClick={() => onRate(fixed)}>
            다음
          </button>
        </footer>
      ) : (
        <footer className={`actions grid${choices.length}`}>
          {choices.map((r) => (
            <button key={r} className={`btn rate ${r}`} disabled={!ready} onClick={() => onRate(r)}>
              {LABEL[r]}
              <span className="sub">{intervals[r]}</span>
            </button>
          ))}
        </footer>
      )}
    </>
  )
}
