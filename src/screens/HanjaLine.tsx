import { hanjaOf } from '../logic/hanja'

interface Props {
  word: string
}

/**
 * 한자 훈음 한 줄 (PROJECT.md 4장). 단어 제시·정답 화면에서 단어의 한자를 글자별로 보여준다.
 * 예: 気(氣) 기운 기 · 持 가질 지. 한자가 없는 단어면 아무것도 그리지 않는다
 */
export function HanjaLine({ word }: Props) {
  const entries = hanjaOf(word)
  if (entries.length === 0) return null
  return (
    <p className="hanja" lang="ko" aria-label="한자 훈음">
      {entries.map((e) => (
        <span key={e.ch} className={e.kokuji ? 'hanja-item kokuji' : 'hanja-item'}>
          <b lang="ja">{e.ch}</b>
          {e.ko && <span className="hanja-ko">({e.ko})</span>} {e.hunum}
        </span>
      ))}
    </p>
  )
}
