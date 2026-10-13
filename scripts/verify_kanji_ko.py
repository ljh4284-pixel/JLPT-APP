# -*- coding: utf-8 -*-
"""
한자 훈음 표(src/data/kanji_ko.json)를 검사하는 개발용 스크립트.

 1. 단어장(src/data/words_n*.json)에 쓰인 모든 한자에 항목이 있는지
 2. 항목 형식: "훈 음" / "정자|훈 음" / "국자: 설명". 음은 한글 한 글자. 여러 음은 쉼표로
 3. 음이 Unihan(kHangul, scripts/data/unihan/Unihan_Readings.txt)의 한국 한자음에 있는지 (정자가 있으면 정자로 대조)
 4. 정자(|앞 글자)가 Unihan 에 한국 한자음이 있는 글자인지
자동으로 고치지 않고 보고서(scripts/kanji_report.txt)만 만든다.
실행: python scripts/verify_kanji_ko.py            (src/data/kanji_ko.json 검사)
      python scripts/verify_kanji_ko.py 초안.json  (초안 파일만 검사)
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
READINGS = os.path.join(ROOT, "scripts", "data", "unihan", "Unihan_Readings.txt")
TABLE = os.path.join(ROOT, "src", "data", "kanji_ko.json")
REPORT = os.path.join(ROOT, "scripts", "kanji_report.txt")


def load_khangul():
    """글자 → 한국 한자음 집합. kHangul 값은 '기:0N 기:1E' 꼴"""
    out = {}
    with open(READINGS, encoding="utf-8") as f:
        for line in f:
            if line.startswith("#") or "\tkHangul\t" not in line:
                continue
            cp, _, val = line.rstrip(chr(10)).split("\t")
            ch = chr(int(cp[2:], 16))
            out[ch] = {v.split(":")[0] for v in val.split()}
    return out


def parse(value):
    """(정자 or None, [(훈, 음)...], 국자 여부)"""
    if value.startswith("국자"):
        return None, [], True
    ko = None
    if "|" in value:
        ko, value = value.split("|", 1)
    pairs = []
    for part in value.split(","):
        part = part.strip()
        part = re.sub(r"\s*\(.*\)$", "", part)   # "일할 동 (일본에서 만든 글자)" 의 괄호 설명은 뺀다
        m = re.fullmatch(r"(.+)\s([가-힣])", part)
        if not m:
            return ko, None, False
        pairs.append((m.group(1), m.group(2)))
    return ko, pairs, False


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else TABLE
    table = json.load(open(path, encoding="utf-8"))
    khangul = load_khangul()

    used = []
    for wf in sorted(glob.glob(os.path.join(ROOT, "src", "data", "words_n*.json"))):
        for w in json.load(open(wf, encoding="utf-8")):
            for ch in w["word"]:
                if 0x4E00 <= ord(ch) <= 0x9FFF and ch not in used:
                    used.append(ch)

    missing = [ch for ch in used if ch not in table]
    bad_format, bad_eum, bad_ko, no_khangul = [], [], [], []
    for ch, val in table.items():
        ko, pairs, kokuji = parse(val)
        if kokuji:
            continue
        if pairs is None:
            bad_format.append(f"{ch}: {val}")
            continue
        target = ko or ch
        if ko and ko not in khangul:
            bad_ko.append(f"{ch}: 정자 {ko} 에 한국 한자음 없음")
        if target not in khangul:
            no_khangul.append(f"{ch}: {val} — Unihan 에 한국 한자음 없음 (대조 불가)")
            continue
        for hun, eum in pairs:
            if eum not in khangul[target]:
                bad_eum.append(f"{ch}: {val} — Unihan 음 {' '.join(sorted(khangul[target]))}")

    lines = [f"한자 훈음 검사  표 {len(table)}자, 단어장 사용 {len(used)}자, 대상 {os.path.basename(path)}", ""]
    lines.append(f"요약: 누락 {len(missing)} / 형식 오류 {len(bad_format)} / 음 불일치 {len(bad_eum)} / 정자 오류 {len(bad_ko)} / 대조 불가 {len(no_khangul)}")
    lines.append("")
    lines.append(f"== 누락 ({len(missing)}) ==  {''.join(missing)}")
    lines.append(f"== 형식 오류 ({len(bad_format)}) ==")
    lines.extend("  " + x for x in bad_format)
    lines.append(f"== 음 불일치 ({len(bad_eum)}) ==  표의 음이 Unihan 한국 한자음에 없음 → 확인")
    lines.extend("  " + x for x in bad_eum)
    lines.append(f"== 정자 오류 ({len(bad_ko)}) ==")
    lines.extend("  " + x for x in bad_ko)
    lines.append(f"== 대조 불가 ({len(no_khangul)}) ==  신자체 등 Unihan 에 한국 음이 없는 글자. 정자를 적어야 대조됨")
    lines.extend("  " + x for x in no_khangul)
    text = chr(10).join(lines) + chr(10)
    if len(sys.argv) > 1:
        print(text)
    else:
        open(REPORT, "w", encoding="utf-8").write(text)
        print(chr(10).join(lines[:3]))
        print("보고서:", REPORT)


if __name__ == "__main__":
    main()
