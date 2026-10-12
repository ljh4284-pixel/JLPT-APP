# -*- coding: utf-8 -*-
"""
단어 초안(scripts/drafts/*.json)을 단어장(src/data/words_<급수>.json)에 합친다.
- level, audio(null), confusion(읽기에서 자동 계산), tier(기본 core), alt_readings(JMdict 에서 계산)를 채운다
- id 중복·표기 중복은 거부한다
- 합치기 전에 사전 대조(verify_readings.py 초안 모드)를 먼저 돌려 보류 단어를 없애 두는 것이 좋다
실행: python scripts/merge_draft.py scripts/drafts/n5_051-150.json
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import verify_readings as vr

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ROWS = {
    "a": "あかさたなはまやらわがざだばぱ", "i": "いきしちにひみりぎじぢびぴ",
    "u": "うくすつぬふむゆるぐずづぶぷ", "e": "えけせてねへめれげぜでべぺ", "o": "おこそとのほもよろをごぞどぼぽ",
}
YOON_VOWEL = {"ゃ": "a", "ゅ": "u", "ょ": "o"}
LENGTHENER = {"a": "あ", "i": "い", "u": "う", "e": "いえ", "o": "うお"}
DAKUTEN = "がぎぐげござじずぜぞだぢづでどばびぶべぼ"
HANDAKUTEN = "ぱぴぷぺぽ"

def vowel(ch):
    if ch in YOON_VOWEL: return YOON_VOWEL[ch]
    for v, kana in ROWS.items():
        if ch in kana: return v
    return None

def confusion_of(reading):
    tags = []
    if any(c in "ゃゅょ" for c in reading): tags.append("yoon")
    if "っ" in reading: tags.append("sokuon")
    long = "ー" in reading
    prev_v = None
    for ch in reading:
        v = vowel(ch)
        if prev_v and ch in LENGTHENER.get(prev_v, "") and ch in "あいうえお":
            long = True
        prev_v = v if v else prev_v
    if long: tags.append("long")
    if any(c in DAKUTEN for c in reading): tags.append("dakuten")
    if any(c in HANDAKUTEN for c in reading): tags.append("handakuten")
    return tags

def write_words(words_path, words):
    words.sort(key=lambda w: w["id"])
    with open(words_path, "w", encoding="utf-8") as f:
        lines = ["  " + json.dumps(w, ensure_ascii=False) for w in words]
        f.write("[" + chr(10) + ("," + chr(10)).join(lines) + chr(10) + "]" + chr(10))

def main(draft_path):
    draft = json.load(open(draft_path, encoding="utf-8"))
    level = draft[0]["id"].split("-")[0]
    words_path = os.path.join(ROOT, "src", "data", f"words_{level}.json")
    words = json.load(open(words_path, encoding="utf-8"))
    ids = {w["id"] for w in words}
    forms = {w["word"] for w in words}
    _, data, _ = vr.load_dict()
    by_kanji, _ = vr.build_indexes(data["words"])
    added = 0
    for d in draft:
        if d["id"] in ids:
            print("건너뜀 (id 있음):", d["id"]); continue
        if d["word"] in forms:
            print("건너뜀 (표기 있음):", d["id"], d["word"]); continue
        entry = {
            "id": d["id"], "level": level.upper(), "word": d["word"], "reading": d["reading"],
            "meaning_ko": d["meaning_ko"], "example_ja": d["example_ja"], "example_reading": d["example_reading"],
            "example_ko": d["example_ko"], "pos": d["pos"], "tags": d["tags"],
            "confusion": confusion_of(d["reading"]), "hanja_ko": d.get("hanja_ko"), "audio": None,
            "tier": d.get("tier", "core"),
            "alt_readings": vr.alt_readings_for(d["word"], d["reading"], by_kanji),
        }
        words.append(entry); ids.add(d["id"]); forms.add(d["word"]); added += 1
    write_words(words_path, words)
    print(f"추가 {added}개 → 총 {len(words)}개 ({words_path})")

if __name__ == "__main__":
    main(sys.argv[1])
