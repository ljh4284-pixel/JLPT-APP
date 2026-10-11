# -*- coding: utf-8 -*-
"""
words_n5.json 의 word(표기) + reading(읽기) 조합이 JMdict 사전에 있는지 확인하는 스크립트.

- 사전: scripts/data/jmdict-eng-common-*.json (jmdict-simplified, 영어판 common)
- 결과: scripts/verify_report.txt  (일치 / 불일치 / 사전에 없음)
- 자동으로 고치지 않는다. 보고서만 만든다.

실행:  python scripts/verify_readings.py
"""
import glob
import json
import os
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORDS_PATH = os.path.join(ROOT, "src", "data", "words_n5.json")
DICT_GLOB = os.path.join(ROOT, "scripts", "data", "jmdict-eng-common-*.json")
REPORT_PATH = os.path.join(ROOT, "scripts", "verify_report.txt")


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
    files = sorted(glob.glob(DICT_GLOB))
    if not files:
        sys.exit(f"사전 파일이 없습니다: {DICT_GLOB}")
    path = files[-1]
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return path, data


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


def fmt_reading(text, tags):
    return text + (f"({','.join(tags)})" if tags else "")


def main():
    dict_path, data = load_dict()
    entries = data["words"]
    by_kanji, by_kana = build_indexes(entries)

    with open(WORDS_PATH, encoding="utf-8") as f:
        words = json.load(f)

    matched, mismatched, missing = [], [], []

    # ---- 형식 검사: id 형식·중복, 표기 중복, 예문 읽기가 가나로만 되어 있는지 ----
    format_issues = []
    seen_ids, seen_words = set(), set()
    import re as _re
    for w in words:
        if not _re.fullmatch(r"n[1-5]-\d{4}", str(w["id"])):
            format_issues.append(f"{w['id']}: id 형식이 n5-0001 꼴이 아님")
        if w["id"] in seen_ids:
            format_issues.append(f"{w['id']}: id 중복")
        seen_ids.add(w["id"])
        if w["word"] in seen_words:
            format_issues.append(f"{w['id']} {w['word']}: 표기 중복")
        seen_words.add(w["word"])
        bad = [ch for ch in w["example_reading"] if not (is_kana(ch) or ch in "、。！？ 　ー")]
        if bad:
            format_issues.append(f"{w['id']} {w['word']}: 예문 읽기에 가나가 아닌 글자 {''.join(bad)}")
        if not w["example_ja"].endswith("。") and not w["example_ja"].endswith("？"):
            format_issues.append(f"{w['id']} {w['word']}: 예문이 。로 끝나지 않음")

    for w in words:
        word, reading = w["word"], w["reading"]
        kana_only = all(is_kana(ch) for ch in word)

        if kana_only:
            # 가나만 쓰는 단어: reading 이 kana 색인에 있으면 일치
            hits = by_kana.get(reading, [])
            if hits:
                ids = ",".join(dict.fromkeys(e["id"] for e in hits))
                matched.append((w, f"kana 항목 있음 [JMdict {ids}]"))
            else:
                # word 는 있는데 reading 이 다르게 적힌 경우
                hits_word = by_kana.get(word, [])
                if hits_word:
                    cands = sorted({r["text"] for e in hits_word for r in e["kana"]})
                    mismatched.append((w, cands, "가나 단어인데 reading 이 표기와 다름"))
                else:
                    missing.append((w, "가나 표기가 사전(common)에 없음"))
            continue

        # 한자 포함 단어: word 가 kanji 색인에 있어야 함
        hits = by_kanji.get(word, [])
        if not hits:
            missing.append((w, "한자 표기가 사전(common)에 없음"))
            continue

        all_cands = []   # [(reading, tags, entry_id)]
        ok_entry = None
        ok_tags = None
        for e in hits:
            for text, tags in readings_for_kanji(e, word):
                all_cands.append((text, tags, e["id"]))
                if kata_to_hira(text) == reading and ok_entry is None:
                    ok_entry, ok_tags = e["id"], tags

        if ok_entry is not None:
            note = f"[JMdict {ok_entry}]"
            if ok_tags:
                note += f"  주의: 읽기 태그 {ok_tags}"
            matched.append((w, note))
        else:
            cands = []
            for text, tags, eid in all_cands:
                s = fmt_reading(text, tags)
                if s not in cands:
                    cands.append(s)
            mismatched.append((w, cands, "표기는 있으나 reading 이 사전 읽기와 다름"))

    # ---- 보고서 작성 ----
    lines = []
    lines.append("읽기 검증 보고서 (words_n5.json vs JMdict)")
    lines.append(f"생성 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"사전: {os.path.basename(dict_path)}  (JMdict 날짜 {data.get('dictDate')}, 항목 {len(entries)}개, common only)")
    lines.append(f"대상: {os.path.relpath(WORDS_PATH, ROOT)}  ({len(words)}개)")
    lines.append("")
    lines.append(f"요약: 일치 {len(matched)} / 불일치 {len(mismatched)} / 사전에 없음 {len(missing)} / 형식 문제 {len(format_issues)}")
    lines.append("")
    if format_issues:
        lines.append(f"== 형식 문제 ({len(format_issues)}) ==")
        for f_ in format_issues:
            lines.append("  " + f_)
        lines.append("")

    lines.append(f"== 일치 ({len(matched)}) ==")
    for w, note in matched:
        lines.append(f"  {w['id']:>3}  {w['word']}  {w['reading']}  {note}")
    lines.append("")

    lines.append(f"== 불일치 ({len(mismatched)}) ==")
    if not mismatched:
        lines.append("  (없음)")
    for w, cands, why in mismatched:
        lines.append(f"  {w['id']:>3}  {w['word']}  현재 reading: {w['reading']}")
        lines.append(f"       사유: {why}")
        lines.append(f"       JMdict 읽기 후보: {', '.join(cands) if cands else '(없음)'}")
    lines.append("")

    lines.append(f"== 사전에 없음 ({len(missing)}) ==")
    if not missing:
        lines.append("  (없음)")
    for w, why in missing:
        lines.append(f"  {w['id']:>3}  {w['word']}  {w['reading']}  — {why}")
    lines.append("")
    lines.append("태그 설명: sK/sk=검색용 표기(비표준), rK/rk=드문 표기, iK/ik=불규칙 표기, oK/ok=옛 표기")

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print("\n".join(lines))
    print(f"\n보고서 저장: {REPORT_PATH}")


if __name__ == "__main__":
    main()
