import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import * as wanakana from 'wanakana'
import type { InputMode, JudgeResult, Word } from '../types'
import { judgeReading, normalizeReading } from '../logic/reading'
import { blankExample, posLabel } from '../logic/example'
import { finalizeRomaji, ROMAJI_BIND_OPTIONS } from '../logic/romaji'

interface Props {
  word: Word
  inputMode: InputMode
  onInputModeChange: (mode: InputMode) => void
  onSubmit: (result: JudgeResult) => void
}

/**
 * 문제(유형 C, 화면 이름 "읽기 입력"): 한국어 뜻 + 품사 + 예문 빈칸 제시 → 읽기 입력 → 판정
 * 뜻만으로는 답이 하나로 정해지지 않는 단어가 있어 예문(단어를 가린 것)으로 문맥을 준다 (검토 반영 2026-10-13)
 */
export function QuestionC({ word, inputMode, onInputModeChange, onSubmit }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [hintUsed, setHintUsed] = useState(false)

  // 로마자 모드: wanakana 가 입력칸 안에서 로마자를 실시간으로 히라가나로 바꾼다 (규칙은 logic/romaji.ts)
  useEffect(() => {
    const el = inputRef.current
    if (!el || inputMode !== 'romaji') return
    wanakana.bind(el, ROMAJI_BIND_OPTIONS)
    return () => wanakana.unbind(el)
  }, [inputMode])

  useEffect(() => {
    inputRef.current?.focus()
  }, [inputMode])

  function submit(e: FormEvent) {
    e.preventDefault()
    const raw = inputRef.current?.value ?? ''
    // 로마자 모드에서 끝에 남은 n·nn 같은 미변환 글자를 마저 변환
    const finalized = inputMode === 'romaji' ? finalizeRomaji(raw) : raw
    const answer = normalizeReading(finalized)
    onSubmit({ correct: judgeReading(answer, word.reading), answer, hintUsed })
  }

  const hint = Array.from(word.reading)[0]
  const blank = blankExample(word)

  return (
    <form className="screen" onSubmit={submit}>
      <main className="content center">
        <p className="label">읽기를 입력하세요</p>
        <p className="meaning big">
          {word.meaning_ko} <span className="pos">{posLabel(word.pos)}</span>
        </p>
        {blank.found && (
          <div className="example blank">
            <p lang="ja">{blank.text}</p>
            <p className="muted">{word.example_ko}</p>
          </div>
        )}

        <div className="seg" role="group" aria-label="입력 방식">
          <button
            type="button"
            className={inputMode === 'romaji' ? 'on' : ''}
            onClick={() => onInputModeChange('romaji')}
          >
            로마자
          </button>
          <button
            type="button"
            className={inputMode === 'kana' ? 'on' : ''}
            onClick={() => onInputModeChange('kana')}
          >
            일본어 자판
          </button>
        </div>

        <input
          key={inputMode}
          ref={inputRef}
          className="input"
          lang="ja"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={inputMode === 'romaji' ? '예: gakkou' : '예: がっこう'}
          aria-label="읽기 입력"
        />

        <p className="hint" lang="ja">
          {hintUsed ? `힌트: ${hint}…` : ' '}
        </p>
        <button
          type="button"
          className="btn secondary small"
          disabled={hintUsed}
          onClick={() => setHintUsed(true)}
        >
          힌트 (첫 글자)
        </button>
        {hintUsed && <p className="muted small">힌트를 쓰면 맞혀도 '다시'로 기록됩니다</p>}
      </main>
      <footer className="actions">
        <button type="submit" className="btn primary">확인</button>
      </footer>
    </form>
  )
}
