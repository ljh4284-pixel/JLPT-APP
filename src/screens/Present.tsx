import { useEffect } from 'react'
import type { Word } from '../types'
import { playExample, playWord } from '../platform/audio'

interface Props {
  word: Word
  onNext: () => void
}

/** 단어 제시 후 자동 재생까지의 시간 */
const AUTOPLAY_DELAY_MS = 1000

/** 단어 제시(신규): 표기, 읽기, 뜻, 예문, 발음 재생(1초 뒤 자동), 예문 재생, [다음] */
export function Present({ word, onNext }: Props) {
  // 화면이 뜨고 1초 뒤 발음을 자동 재생한다. 그 전에 다음 카드로 넘어가면 취소된다.
  useEffect(() => {
    const id = setTimeout(() => playWord(word), AUTOPLAY_DELAY_MS)
    return () => clearTimeout(id)
  }, [word])

  return (
    <>
      <main className="content">
        <p className="label">새 단어</p>
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
      </main>
      <footer className="actions">
        <button className="btn primary" onClick={onNext}>다음</button>
      </footer>
    </>
  )
}
