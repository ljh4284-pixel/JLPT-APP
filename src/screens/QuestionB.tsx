import { useMemo } from 'react'
import type { JudgeResult, Word } from '../types'
import { makeDistractors } from '../logic/distractors'

interface Props {
  word: Word
  pool: Word[]                          // 같은 급수 단어장. N4 이상은 다른 단어의 읽기를 오답으로 쓴다
  onSubmit: (result: JudgeResult) => void
}

interface Option {
  text: string
  correct: boolean
  wrongPoint?: string
}

/** 가나만으로 쓰는 단어인지 (표기가 곧 읽기라 대신 뜻을 보여준다) */
function isKanaOnly(word: Word): boolean {
  return Array.from(word.word).every((ch) => {
    const c = ch.codePointAt(0) ?? 0
    return (c >= 0x3041 && c <= 0x309f) || (c >= 0x30a0 && c <= 0x30ff)
  })
}

/** 선택지 순서를 섞는다 (화면에 보일 때만 무작위. 오답 자체는 규칙으로 고정) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 문제(유형 B, 화면 이름 "읽기 고르기"): 한자 표기 제시 → 읽기 4지선다. 음성은 들려주지 않는다.
 * JLPT 문자·어휘 もんだい1(漢字読み) 형식. 가나만 쓰는 단어는 뜻을 제시한다.
 */
export function QuestionB({ word, pool, onSubmit }: Props) {
  const kanaOnly = isKanaOnly(word)

  const options = useMemo<Option[]>(() => {
    const wrong = makeDistractors(word, 3, pool).map((d) => ({ text: d.text, correct: false, wrongPoint: d.hint }))
    return shuffle([{ text: word.reading, correct: true }, ...wrong])
  }, [word, pool])

  function choose(o: Option) {
    onSubmit({ correct: o.correct, answer: o.text, hintUsed: false, wrongPoint: o.wrongPoint })
  }

  return (
    <>
      <main className="content center">
        <p className="label">{kanaOnly ? '뜻을 보고 읽기를 고르세요' : '읽기를 고르세요'}</p>
        {kanaOnly ? (
          <p className="meaning big">{word.meaning_ko}</p>
        ) : (
          <p className="word" lang="ja">{word.word}</p>
        )}
      </main>
      <footer className="actions grid2x2">
        {options.map((o) => (
          <button key={o.text} className="btn option" lang="ja" onClick={() => choose(o)}>
            {o.text}
          </button>
        ))}
      </footer>
    </>
  )
}
