/**
 * 음성 재생 모듈 (화면 코드는 playWord / playExample 만 호출한다)
 *
 * 1) public/audio/<level>/<voice>/ 에 mp3 가 있으면 그 파일을 재생
 *      단어: <id>.mp3   예문: <id>_ex.mp3
 * 2) 없거나 재생에 실패하면 브라우저 Web Speech API 의 기기 내 일본어 음성으로 읽는다 (원격 음성은 쓰지 않음)
 */
import type { Word } from '../types'

/** 기본 목소리. gen_audio.py 의 VOICE_NAME 과 같아야 한다. 설정 화면에서 setVoice 로 바꾼다 */
const DEFAULT_VOICE = 'ja-JP-Chirp3-HD-Charon'
let VOICE_NAME = DEFAULT_VOICE

/** 재생에 쓸 목소리 폴더 이름을 바꾼다 (설정 화면) */
export function setVoice(name: string): void {
  VOICE_NAME = name || DEFAULT_VOICE
}
/** gen_audio.py 의 EXAMPLE_SUFFIX 와 같아야 한다 */
const EXAMPLE_SUFFIX = '_ex'

let current: HTMLAudioElement | null = null

function audioUrl(word: Word, suffix = '', voice = VOICE_NAME): string | null {
  if (!word.audio || !voice) return null
  const level = word.level.toLowerCase()
  return `${import.meta.env.BASE_URL}audio/${level}/${voice}/${word.audio}${suffix}.mp3`
}

function stopAll() {
  if (current) {
    current.pause()
    current = null
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

/**
 * 폴백: 브라우저 음성 합성. 기기 안에서 처리되는(localService) 일본어 음성만 쓴다.
 * 원격 서버로 보내는 음성은 쓰지 않는다 (런타임 외부 호출 금지 원칙, 검토 반영 2026-10-13). 없으면 재생하지 않는다
 */
function speakFallback(text: string) {
  if (!('speechSynthesis' in window)) return
  const ja = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('ja') && v.localService)
  if (!ja) {
    console.info('기기 내 일본어 음성이 없어 폴백 재생을 건너뜁니다')
    return
  }
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.voice = ja
  window.speechSynthesis.speak(u)
}

/** mp3 재생, 실패하면 폴백 텍스트를 읽는다 */
function play(url: string | null, fallbackText: string) {
  stopAll()
  if (!url) {
    speakFallback(fallbackText)
    return
  }
  const el = new Audio(url)
  current = el
  el.onerror = () => {
    if (current === el) current = null
    speakFallback(fallbackText)
  }
  el.play().catch(() => {
    if (current === el) current = null
    speakFallback(fallbackText)
  })
}

/** 단어 발음 재생. voice 를 주면 그 목소리로 (목소리 고르기 화면용) */
export function playWord(word: Word, voice?: string): void {
  play(audioUrl(word, '', voice ?? VOICE_NAME), word.reading)
}

/** 예문 전체 발음 재생 */
export function playExample(word: Word, voice?: string): void {
  play(audioUrl(word, EXAMPLE_SUFFIX, voice ?? VOICE_NAME), word.example_ja)
}
