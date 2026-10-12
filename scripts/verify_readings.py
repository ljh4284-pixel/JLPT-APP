# -*- coding: utf-8 -*-
"""
단어장(src/data/words_n*.json)의 표기+읽기 조합을 JMdict 사전과 대조하는 스크립트.

- 사전: scripts/data/jmdict-eng-3*.json (jmdict-simplified 영어판 전체)가 있으면 그것을 쓰고,
        없으면 jmdict-eng-common-*.json(자주 쓰는 단어만 추린 판)을 쓴다.
  2026-10-13 검토 반영: common 전용 대조를 전체 사전 대조로 바꿨다. common 여부는 참고 정보로만 적는다.
- 판정 3단계 (PROJECT.md 7장 단어장 품질 기준)
    통과: 표기+읽기 조합이 사전에 그대로 있음
    검토: 사전에서 바로 확인되지 않지만 틀렸다고 단정할 수 없음 → 사람이 확인
          (접두 お·ご 형태의 기본형이 사전에 있음 / 두 부분으로 나누면 각 부분이 사전에 있는 복합어)
    보류: 표기는 있는데 읽기가 사전과 다름(잘못된 단어일 가능성), 또는 어떤 형태로도 찾지 못함 → 출시 대상에서 보류
- 자동으로 고치지 않는다. 보고서(scripts/verify_report.txt)만 만든다.
- 추가 검사(형식): id 형식·중복, 표기 중복(급수 간 포함), 예문 읽기가 가나로만 되어 있는지, 예문 끝 구두점

실행:  python scripts/verify_readings.py                 단어장 전부 (보고서 저장)
       python scripts/verify_readings.py 초안.json ...   초안 파일만 대조 (합치기 전 확인용, 화면 출력만)
"""
import glob
import json
import os
import re
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORDS_GLOB = os.path.join(ROOT, "src", "data", "words_n*.json")
DICT_FULL_GLOB = os.path.join(ROOT, "scripts", "data", "jmdict-eng-3*.json")
DICT_COMMON_GLOB = os.path.join(ROOT, "scripts", "data", "jmdict-eng-common-*.json")
REPORT_PATH = os.path.join(ROOT, "scripts", "verify_report.txt")

# 읽기 태그 중 "정상 읽기"로 치지 않는 것 (ok=옛 표기, ik=불규칙, rk=드문, sk=검색용)
ODD_READING_TAGS = {"ok", "ik", "rk", "sk"}


def is_kana(ch: str) -> bool:
    """히라가나·가타카나·장음 기호(ー)면 True"""
    code = ord(ch)
    return (0x3041 <= code <= 0x309F) or (0x30A0 <= code <= 0x30FF)


def kata_to_hira(s: str) -> str:
    """가타카나 → 히라가나 (ー 는 그대로 둠)"""
    out = []
    for ch in s:
        code = ord(ch)
        if 0x30A1 <= code <= 0x30F6:
            out.append(chr(code - 0x60))
        else:
            out.append(ch)
    return "".join(out)


def load_dict():
    """전체 사전을 우선, 없으면 common 판. (경로, 데이터, 전체 여부) 를 돌려준다"""
    full = sorted(glob.glob(DICT_FULL_GLOB))
    full = [p for p in full if "common" not in os.path.basename(p)]
    common = sorted(glob.glob(DICT_COMMON_GLOB))
    if full:
        path, is_full = full[-1], True
    elif common:
        path, is_full = common[-1], False
    else:
        sys.exit(f"사전 파일이 없습니다: {DICT_FULL_GLOB} 또는 {DICT_COMMON_GLOB}")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return path, data, is_full


def build_indexes(entries):
    """표기(한자) → 항목들, 가나 → 항목들 두 개의 색인을 만든다"""
    by_kanji = {}
    by_kana = {}
    for e in entries:
        for k in e["kanji"]:
            by_kanji.setdefault(k["text"], []).append(e)
        for r in e["kana"]:
            by_kana.setdefault(r["text"], []).append(e)
            hira = kata_to_hira(r["text"])
            if hira != r["text"]:
                by_kana.setdefault(hira, []).append(e)
    return by_kanji, by_kana


def readings_for_kanji(entry, kanji_text):
    """항목 안에서 해당 한자 표기에 적용되는 읽기 목록 [(text, tags), ...]"""
    out = []
    for r in entry["kana"]:
        applies = r.get("appliesToKanji", ["*"])
        if "*" in applies or kanji_text in applies:
            out.append((r["text"], r.get("tags", [])))
    return out


def kanji_is_common(entry, kanji_text):
    for k in entry["kanji"]:
        if k["text"] == kanji_text:
            return bool(k.get("common"))
    return False


def fmt_reading(text, tags):
    return text + (f"({','.join(tags)})" if tags else "")


def alt_readings_for(word, reading, by_kanji):
    """같은 표기의 다른 유효 읽기(히라가나). 읽기 고르기 오답 제외용. 가나 단어는 빈 목록"""
    if all(is_kana(ch) for ch in word):
        return []
    out = []
    for e in by_kanji.get(word, []):
        for text, tags in readings_for_kanji(e, word):
            if ODD_READING_TAGS & set(tags):
                continue
            h = kata_to_hira(text)
            if h != reading and h not in out:
                out.append(h)
    return sorted(out)


# ---------------------------------------------------------------------------
# 한 단어 판정
# ---------------------------------------------------------------------------
def classify(w, by_kanji, by_kana):
    """(상태, 사유, 참고) 를 돌려준다. 상태는 '통과' | '검토' | '보류'"""
    word, reading = w["word"], w["reading"]
    kana_only = all(is_kana(ch) for ch in word)

    if kana_only:
        hits = by_kana.get(reading, [])
        if hits:
            ids = ",".join(dict.fromkeys(str(e["id"]) for e in hits))
            common = any(r.get("common") for e in hits for r in e["kana"] if kata_to_hira(r["text"]) == reading)
            return "통과", "", f"[JMdict {ids}]" + ("" if common else "  (common 아님)")
        # 가나 단어는 접두 お·ご 를 떼어 찾지 않는다 (じさん=持参 처럼 엉뚱한 단어와 맞을 수 있음) → 사람이 판단
        return "보류", "가나 표기가 사전에 없음", ""

    hits = by_kanji.get(word, [])
    if hits:
        cands = []
        for e in hits:
            for text, tags in readings_for_kanji(e, word):
                if kata_to_hira(text) == reading:
                    note = f"[JMdict {e['id']}]"
                    if tags:
                        note += f"  주의: 읽기 태그 {tags}"
                    if not kanji_is_common(e, word):
                        note += "  (common 아님)"
                    return "통과", "", note
                s = fmt_reading(text, tags)
                if s not in cands:
                    cands.append(s)
        return "보류", "표기는 있으나 읽기가 사전과 다름 (잘못된 단어일 가능성)", "사전 읽기: " + " / ".join(cands)

    # 표기가 통째로는 없음 → 접두 형태·복합어인지 확인 (검토 대상)
    if word[:1] in ("お", "ご") and len(word) > 1 and reading[:1] == word[:1]:
        base, base_r = word[1:], reading[1:]
        if any(kata_to_hira(t) == base_r for e in by_kanji.get(base, []) for t, _ in readings_for_kanji(e, base)):
            return "검토", f"접두 {word[0]} 형태. 기본형 {base}({base_r}) 은 사전에 있음", ""
    for i in range(1, len(word)):
        a, b = word[:i], word[i:]
        ra = {kata_to_hira(t) for e in by_kanji.get(a, []) for t, _ in readings_for_kanji(e, a)}
        if all(is_kana(ch) for ch in a):
            ra = {a} if by_kana.get(a) else set()
        if not ra:
            continue
        rb = {kata_to_hira(t) for e in by_kanji.get(b, []) for t, _ in readings_for_kanji(e, b)}
        if all(is_kana(ch) for ch in b):
            rb = {b} if by_kana.get(b) else set()
        for x in ra:
            if reading.startswith(x) and reading[len(x):] in rb:
                return "검토", f"복합어로 보임: {a}({x}) + {b}({reading[len(x):]}) 둘 다 사전에 있음", ""
    return "보류", "사전에 없음 (접두 형태·복합어로도 확인 안 됨)", ""


def format_checks(words):
    issues = []
    seen_ids, seen_words = set(), set()
    for w in words:
        if not re.fullmatch(r"n[1-5]-\d{4}", str(w["id"])):
            issues.append(f"{w['id']}: id 형식이 n5-0001 꼴이 아님")
        if w["id"] in seen_ids:
            issues.append(f"{w['id']}: id 중복")
        seen_ids.add(w["id"])
        if w["word"] in seen_words:
            issues.append(f"{w['id']} {w['word']}: 표기 중복")
        seen_words.add(w["word"])
        bad = [ch for ch in w["example_reading"] if not (is_kana(ch) or ch in "、。！？ 　ー")]
        if bad:
            issues.append(f"{w['id']} {w['word']}: 예문 읽기에 가나가 아닌 글자 {''.join(bad)}")
        if not w["example_ja"].endswith("。") and not w["example_ja"].endswith("？"):
            issues.append(f"{w['id']} {w['word']}: 예문이 。로 끝나지 않음")
    return issues


def main():
    dict_path, data, is_full = load_dict()
    entries = data["words"]
    by_kanji, by_kana = build_indexes(entries)

    draft_mode = len(sys.argv) > 1
    if draft_mode:
        word_files = sys.argv[1:]
    else:
        word_files = sorted(glob.glob(WORDS_GLOB), reverse=True)   # n5, n4, ... 순
    words = []
    for wf in word_files:
        with open(wf, encoding="utf-8") as f:
            words.extend(json.load(f))

    format_issues = format_checks(words)
    passed, review, hold = [], [], []
    for w in words:
        state, reason, note = classify(w, by_kanji, by_kana)
        {"통과": passed, "검토": review, "보류": hold}[state].append((w, reason, note))

    lines = []
    lines.append("읽기 검증 보고서 (단어장 vs JMdict)")
    lines.append(f"생성 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"사전: {os.path.basename(dict_path)}  (JMdict 날짜 {data.get('dictDate')}, 항목 {len(entries)}개, "
                 + ("전체" if is_full else "common 전용 — 전체 사전을 내려받으면 검토·보류가 줄어듦") + ")")
    lines.append("대상: " + ", ".join(os.path.basename(wf) for wf in word_files) + f"  (합계 {len(words)}개)")
    lines.append("")
    lines.append(f"요약: 통과 {len(passed)} / 검토 {len(review)} / 보류 {len(hold)} / 형식 문제 {len(format_issues)}")
    lines.append("")
    if format_issues:
        lines.append(f"== 형식 문제 ({len(format_issues)}) ==")
        lines.extend("  " + x for x in format_issues)
        lines.append("")
    lines.append(f"== 보류 ({len(hold)}) ==  출시 대상에서 보류. 읽기가 틀렸거나 사전 어디에도 없음")
    for w, reason, note in hold:
        lines.append(f"  {w['id']}  {w['word']}  {w['reading']}  — {reason}  {note}")
    lines.append("  (없음)" if not hold else "")
    lines.append("")
    lines.append(f"== 검토 ({len(review)}) ==  틀렸다고 볼 수 없음. 사람이 확인한 뒤 통과 처리")
    for w, reason, note in review:
        lines.append(f"  {w['id']}  {w['word']}  {w['reading']}  — {reason}")
    lines.append("  (없음)" if not review else "")
    lines.append("")
    notes = [(w, note) for w, _, note in passed if "주의" in note or "common 아님" in note]
    lines.append(f"== 통과 중 참고 ({len(notes)}) ==  읽기 태그가 붙었거나 common 표기가 아닌 것")
    for w, note in notes:
        lines.append(f"  {w['id']}  {w['word']}  {w['reading']}  {note}")
    lines.append("  (없음)" if not notes else "")
    lines.append("")
    lines.append("태그 설명: sK/sk=검색용 표기(비표준), rK/rk=드문 표기, iK/ik=불규칙 표기, oK/ok=옛 표기")

    text = chr(10).join(lines) + chr(10)
    if draft_mode:
        print(text)
    else:
        with open(REPORT_PATH, "w", encoding="utf-8") as f:
            f.write(text)
        print(chr(10).join(lines[:6]))
        print(f"보고서: {REPORT_PATH}")


if __name__ == "__main__":
    main()
