# -*- coding: utf-8 -*-
"""
Google Cloud Text-to-Speech 로 단어 발음 mp3 를 만드는 개발용 스크립트.
(앱에 포함되지 않음. 런타임에는 TTS 를 호출하지 않음)

인증: 프로젝트 루트 .env 의 GOOGLE_APPLICATION_CREDENTIALS 경로만 사용한다.
      키 파일 내용은 읽지도 출력하지도 않는다. (google 라이브러리가 경로를 직접 읽음)

사용법:
  python scripts/gen_audio.py --list-voices   ja-JP 음성 목록 출력
  python scripts/gen_audio.py --samples       목소리 선정용 샘플 4개 → scripts/samples/
  python scripts/gen_audio.py --generate      모든 급수 × 모든 목소리. 단어 mp3 → public/audio/<급수>/<목소리>/<id>.mp3
      [--level n5] [--voice 이름]            특정 급수·목소리만
                                              예문 mp3 → public/audio/n5/<VOICE_NAME>/<id>_ex.mp3 (example_ja 를 읽음)
                                              이미 있는 파일은 건너뜀. 끝나면 words_n5.json 의 audio 필드 채움
"""
import argparse
import json
import os
import sys

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# 생성 설정 (재생성 시 같은 결과가 나오도록 여기서만 바꾼다)
# ---------------------------------------------------------------------------
VOICE_NAMES = ["ja-JP-Chirp3-HD-Charon", "ja-JP-Neural2-B"]   # 앱에서 고를 수 있는 목소리. 앱의 VOICES 목록과 같아야 함
LANGUAGE_CODE = "ja-JP"
SPEAKING_RATE = 1.0      # 기본 속도
AUDIO_FORMAT = "MP3"
LEVELS = ["n5"]          # 단어장 파일(src/data/words_<급수>.json)이 있는 급수
EXAMPLE_SUFFIX = "_ex"   # 예문 파일명: <id>_ex.mp3 (앱의 src/platform/audio.ts 와 같아야 함)

SAMPLE_SENTENCE = "病院は美容院の隣です。"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(ROOT, ".env")
SAMPLES_DIR = os.path.join(ROOT, "scripts", "samples")
AUDIO_ROOT = os.path.join(ROOT, "public", "audio")


def setup_auth():
    """.env 를 읽어 인증 키 경로가 존재하는지만 확인한다"""
    load_dotenv(ENV_PATH)
    key_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    if not key_path:
        sys.exit(".env 에 GOOGLE_APPLICATION_CREDENTIALS 가 없습니다.")
    if not os.path.isfile(key_path):
        sys.exit("인증 키 파일을 찾을 수 없습니다. .env 의 경로를 확인하세요.")
    print("인증 키 파일 확인됨 (내용은 읽지 않음)")


def make_client():
    from google.cloud import texttospeech
    return texttospeech, texttospeech.TextToSpeechClient()


def list_ja_voices(tts, client):
    resp = client.list_voices(language_code=LANGUAGE_CODE)
    voices = []
    for v in resp.voices:
        gender = tts.SsmlVoiceGender(v.ssml_gender).name
        voices.append((v.name, gender))
    voices.sort()
    return voices


def pick_sample_voices(voices):
    """Neural2 / Chirp3-HD 계열에서 여성 2, 남성 2 를 고른다.
    가능하면 계열별로 하나씩 섞는다 (Neural2 여1 + Chirp3 여1, Neural2 남1 + Chirp3 남1)."""
    def family(name):
        if "Neural2" in name:
            return "Neural2"
        if "Chirp3-HD" in name:
            return "Chirp3-HD"
        return None

    # 같은 계열 안에서는 이 이름을 우선 고른다 (없으면 이름순)
    preferred = ["ja-JP-Neural2-B", "ja-JP-Chirp3-HD-Kore",
                 "ja-JP-Neural2-C", "ja-JP-Chirp3-HD-Charon"]
    rank = {n: i for i, n in enumerate(preferred)}
    pool = sorted(((n, g) for n, g in voices if family(n)),
                  key=lambda x: (rank.get(x[0], len(preferred)), x[0]))
    picks = []
    for gender in ("FEMALE", "MALE"):
        got = []
        for fam in ("Neural2", "Chirp3-HD"):
            for n, g in pool:
                if g == gender and family(n) == fam and n not in got:
                    got.append(n)
                    break
        # 한 계열에 해당 성별이 없으면 다른 계열에서 채움
        for n, g in pool:
            if len(got) >= 2:
                break
            if g == gender and n not in got:
                got.append(n)
        picks.extend((n, gender) for n in got[:2])
    return picks


def synthesize(tts, client, text, voice_name, out_path):
    synthesis_input = tts.SynthesisInput(text=text)
    voice = tts.VoiceSelectionParams(language_code=LANGUAGE_CODE, name=voice_name)
    audio_config = tts.AudioConfig(
        audio_encoding=getattr(tts.AudioEncoding, AUDIO_FORMAT),
        speaking_rate=SPEAKING_RATE,
    )
    resp = client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(resp.audio_content)


def cmd_list_voices():
    tts, client = make_client()
    for name, gender in list_ja_voices(tts, client):
        print(f"{name:<32} {gender}")


def cmd_samples():
    tts, client = make_client()
    voices = list_ja_voices(tts, client)
    picks = pick_sample_voices(voices)
    if not picks:
        sys.exit("Neural2 / Chirp3-HD 계열 ja-JP 음성을 찾지 못했습니다.")
    os.makedirs(SAMPLES_DIR, exist_ok=True)
    print(f"샘플 문장: {SAMPLE_SENTENCE}")
    for name, gender in picks:
        out = os.path.join(SAMPLES_DIR, f"{name}.mp3")
        if os.path.exists(out):
            print(f"  건너뜀 (이미 있음): {name} ({gender})")
            continue
        synthesize(tts, client, SAMPLE_SENTENCE, name, out)
        print(f"  생성: {name} ({gender}) → {os.path.relpath(out, ROOT)}")


def generate_level_voice(tts, client, level, voice):
    """한 급수의 단어·예문을 한 목소리로 생성한다. 있는 파일은 건너뛴다"""
    words_path = os.path.join(ROOT, "src", "data", f"words_{level}.json")
    with open(words_path, encoding="utf-8") as f:
        words = json.load(f)
    out_dir = os.path.join(AUDIO_ROOT, level, voice)
    os.makedirs(out_dir, exist_ok=True)
    made, skipped = 0, 0
    for w in words:
        # 단어: 읽기(히라가나)를 읽는다 → <id>.mp3
        out = os.path.join(out_dir, f"{w['id']}.mp3")
        if os.path.exists(out) and os.path.getsize(out) > 0:
            skipped += 1
        else:
            synthesize(tts, client, w["reading"], voice, out)
            made += 1
            print(f"  생성: {w['id']} {w['word']} ({w['reading']})")
        w["audio"] = str(w["id"])

        # 예문: 한자 문장(example_ja)을 읽는다 → <id>_ex.mp3
        # 한자를 주면 억양이 자연스럽다. 대신 두 가지로 읽히는 한자(明日, 家 등)는 들어서 확인한다.
        out_ex = os.path.join(out_dir, f"{w['id']}{EXAMPLE_SUFFIX}.mp3")
        if os.path.exists(out_ex) and os.path.getsize(out_ex) > 0:
            skipped += 1
        else:
            synthesize(tts, client, w["example_ja"], voice, out_ex)
            made += 1
            print(f"  생성: {w['id']}{EXAMPLE_SUFFIX} {w['example_ja']}")

    # words_<급수>.json 저장: 한 항목당 한 줄 형식 유지 (audio 필드 채움)
    with open(words_path, "w", encoding="utf-8") as f:
        lines = ["  " + json.dumps(w, ensure_ascii=False) for w in words]
        f.write("[" + chr(10) + ("," + chr(10)).join(lines) + chr(10) + "]" + chr(10))
    print(f"[{level} / {voice}] 새로 생성 {made}개, 건너뜀 {skipped}개 (단어+예문 파일 수)")


def cmd_generate(level=None, voice=None):
    levels = [level] if level else LEVELS
    voices = [voice] if voice else VOICE_NAMES
    tts, client = make_client()
    for lv in levels:
        for vc in voices:
            generate_level_voice(tts, client, lv, vc)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--list-voices", action="store_true")
    g.add_argument("--samples", action="store_true")
    g.add_argument("--generate", action="store_true")
    p.add_argument("--level", help="예: n5")
    p.add_argument("--voice", help="예: ja-JP-Neural2-B")
    args = p.parse_args()

    setup_auth()
    if args.list_voices:
        cmd_list_voices()
    elif args.samples:
        cmd_samples()
    elif args.generate:
        cmd_generate(args.level, args.voice)


if __name__ == "__main__":
    main()
