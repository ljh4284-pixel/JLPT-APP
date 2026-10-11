import type { Word } from '../types'

interface Props {
  word: Word
  onReveal: () => void
}

/** 문제(유형 A): 표기 + 읽기만 보여주고 뜻을 떠올리게 한다. [정답 보기] */
export function QuestionA({ word, onReveal }: Props) {
  return (
    <>
      <main className="content center">
        <p className="label">뜻을 떠올려 보세요</p>
        <p className="word" lang="ja">{word.word}</p>
        <p className="reading" lang="ja">{word.reading}</p>
      </main>
      <footer className="actions">
        <button className="btn primary" onClick={onReveal}>정답 보기</button>
      </footer>
    </>
  )
}
