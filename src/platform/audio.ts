/**
 * 음성 재생 모듈 (화면 코드는 playWord / playExample 만 호출한다)
 *
 * 1) public/audio/<level>/<voice>/ 에 mp3 가 있으면 그 파일을 재생
 *      단어: <id>.mp3   예문: <id>_ex.mp3
 * 2) 없거나 재생에 실패하면 브라우저 Web Speech API 일본어 음성으로 읽는다
 */
import type { Word } from '../types'

/** gen_audio.py 의 VOICE_NAME 과 같아야 한다 */
const VOICE_NAME = 'ja-JP-Chirp3-HD-Charon'
/** gen_audio.py 의 EXAMPLE_SUFFIX 와 같아야 한다 */
const EXAMPLE_SUFFIX = '_ex'

let current: HTMLAudioElement | null = null

function audioUrl(word: Word, suffix = ''): string | null {
  if (!word.audio || !VOICE_NAME) return null
  const level = word.level.toLowerCase()
  return `${import.meta.env.BASE_URL}audio/${level}/${VOICE_NAME}/${word.audio}${suffix}.mp3`
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

function speakFallback(text: string) {
  if (!('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  const ja = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('ja'))
  if (ja) u.voice = ja
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

/** 단어 발음 재생 */
export function playWord(word: Word): void {
  play(audioUrl(word), word.reading)
}

/** 예문 전체 발음 재생 */
export function playExample(word: Word): void {
  play(audioUrl(word, EXAMPLE_SUFFIX), word.example_ja)
}
