import type { Word } from '../types'
import { playExample } from '../platform/audio'

interface Props {
  voices: { name: string; label: string }[]
  sample: Word | null        // 들어보기에 쓸 단어 (예문을 재생)
  value: string
  onChange: (voice: string) => void
  onDone: () => void
}

/** 최초 실행: 목소리 고르기 (PROJECT.md 5장 결정 2026-10-11). 설정에서 언제든 바꿀 수 있다 */
export function Onboarding({ voices, sample, value, onChange, onDone }: Props) {
  return (
    <>
      <main className="content center">
        <p className="label">처음 오셨군요</p>
        <h1 className="level small-title">목소리를 골라 주세요</h1>
        <p className="muted small">단어와 예문을 읽어 줄 목소리입니다. 설정에서 언제든 바꿀 수 있습니다.</p>
        <div className="voice-list">
          {voices.map((v) => (
            <div key={v.name} className={`voice-card ${value === v.name ? 'on' : ''}`}>
              <button type="button" className="voice-pick" onClick={() => onChange(v.name)} aria-pressed={value === v.name}>
                {value === v.name ? '✓ ' : ''}{v.label}
              </button>
              <button
                type="button"
                className="btn play"
                disabled={!sample}
                onClick={() => sample && playExample(sample, v.name)}
                aria-label={`${v.label} 들어보기`}
              >
                🔊 들어보기
              </button>
            </div>
          ))}
        </div>
        {sample && (
          <p className="muted small" lang="ja">{sample.example_ja}</p>
        )}
      </main>
      <footer className="actions">
        <button className="btn primary" onClick={onDone}>이 목소리로 시작</button>
      </footer>
    </>
  )
}
