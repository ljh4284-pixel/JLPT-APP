# -*- coding: utf-8 -*-
"""
읽기 일치 외의 콘텐츠 검수 항목을 자동으로 뽑는 스크립트 (PROJECT.md 7장 단어장 품질 기준, 2026-10-13).
자동으로 고치지 않고 목록만 만든다 → scripts/review_report.txt

검사 항목
 1. 예문에 그 단어가 들어 있는지 (한자 단어는 마지막 한자까지의 어간, 가나 단어는 그대로. い형용사는 끝 い 제외)
 2. 뜻이 완전히 같은 단어 묶음 / 첫 뜻만 같은 묶음 (읽기 입력에서 정답이 하나로 정해지지 않는 후보)
 3. 예문에 두 가지 이상으로 읽히는 한자어가 든 경우 (예문 음성 청취 검수 목록)
 4. tier·alt_readings 통계
실행: python scripts/review_content.py
"""
import glob, json, os, collections
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORT = os.path.join(ROOT, "scripts", "review_report.txt")

# 두 가지 이상으로 흔히 읽히는 표기 (예문 음성이 잘못 읽었을 수 있는 것)
AMBIGUOUS = ["明日", "今日", "昨日", "一日", "二日", "家", "何", "方", "大家", "十分", "辛い", "開く", "止める",
             "人気", "今年", "市場", "上手", "下手", "一時", "大人", "一人", "二人", "何人", "何日", "何時"]

def is_kana(ch):
    c = ord(ch)
    return 0x3041 <= c <= 0x30FF

def is_kanji(ch):
    return 0x4E00 <= ord(ch) <= 0x9FFF

def stem(w):
    word = w["word"]
    if all(is_kana(ch) for ch in word):
        if w["pos"] in ("verb", "i-adj") and len(word) >= 3:
            return word[:-1]          # 가나 동사·い형용사는 끝 글자(る·う·い 등)를 뺀 어간 (なさる→なさ, つける→つけ)
        return word                   # する·いる·ある 같은 짧은 동사는 그대로 → 목록에 남아 사람이 확인
    last = max(i for i, ch in enumerate(word) if is_kanji(ch))
    return word[: last + 1]

def main():
    words = []
    for wf in sorted(glob.glob(os.path.join(ROOT, "src", "data", "words_n*.json"))):
        words.extend(json.load(open(wf, encoding="utf-8")))
    lines = [f"콘텐츠 검수 목록  생성 {datetime.now().strftime('%Y-%m-%d %H:%M')}  대상 {len(words)}개", ""]

    missing = [w for w in words if stem(w) not in w["example_ja"]]
    lines.append(f"== 1. 예문에 단어(어간)가 없음 ({len(missing)}) ==  예문을 고치거나 읽기 입력(예문 빈칸)에서 제외")
    for w in missing:
        lines.append(f"  {w['id']}  {w['word']}  어간 {stem(w)}  예문: {w['example_ja']}")
    lines.append("")

    exact = collections.defaultdict(list)
    first = collections.defaultdict(list)
    for w in words:
        exact[w["meaning_ko"]].append(w)
        first[w["meaning_ko"].split(",")[0].split("(")[0].strip()].append(w)
    dup_exact = {m: ws for m, ws in exact.items() if len(ws) > 1}
    dup_first = {m: ws for m, ws in first.items() if len(ws) > 1 and m not in dup_exact}
    lines.append(f"== 2-1. 뜻이 완전히 같은 묶음 ({len(dup_exact)}묶음) ==  뜻에 구분 설명을 붙인다")
    for m, ws in sorted(dup_exact.items(), key=lambda x: -len(x[1])):
        lines.append(f"  {m}: " + ", ".join(f"{w['word']}({w['reading']}, {w['id']})" for w in ws))
    lines.append("")
    lines.append(f"== 2-2. 첫 뜻만 같은 묶음 ({len(dup_first)}묶음) ==  읽기 입력에서 예문 빈칸으로 구분되는지 확인")
    for m, ws in sorted(dup_first.items(), key=lambda x: -len(x[1])):
        lines.append(f"  {m}: " + ", ".join(f"{w['word']}({w['reading']}, {w['id']})" for w in ws))
    lines.append("")

    amb = []
    for w in words:
        hits = [a for a in AMBIGUOUS if a in w["example_ja"] and a != w["word"]]
        if hits:
            amb.append((w, hits))
    lines.append(f"== 3. 예문에 복수 읽기 한자어 포함 ({len(amb)}) ==  예문 음성 청취 검수 대상")
    for w, hits in amb:
        lines.append(f"  {w['id']}  {w['word']}  [{' '.join(hits)}]  {w['example_ja']}  /  {w['example_reading']}")
    lines.append("")

    tiers = collections.Counter(w.get("tier", "(없음)") for w in words)
    n_alt = sum(1 for w in words if w.get("alt_readings"))
    lines.append(f"== 4. 통계 ==  tier {dict(tiers)}, 다른 읽기(alt_readings) 있는 단어 {n_alt}개")
    for w in words:
        if w.get("alt_readings"):
            lines.append(f"  {w['id']}  {w['word']}  {w['reading']}  다른 읽기: {' '.join(w['alt_readings'])}")

    with open(REPORT, "w", encoding="utf-8") as f:
        f.write(chr(10).join(lines) + chr(10))
    print(chr(10).join(l for l in lines if l.startswith("==")))
    print("보고서:", REPORT)

if __name__ == "__main__":
    main()
