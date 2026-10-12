# -*- coding: utf-8 -*-
"""
기존 단어장(src/data/words_n*.json) 전체에 tier(기본 core)와 alt_readings(JMdict 계산)를 채운다.
한 번 실행하면 되고, 사전을 바꾼 뒤(예: common → 전체) 다시 실행해 alt_readings 를 갱신할 수 있다.
실행: python scripts/add_fields.py
"""
import glob, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import verify_readings as vr
from merge_draft import write_words

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def main():
    path, data, is_full = vr.load_dict()
    by_kanji, _ = vr.build_indexes(data["words"])
    print("사전:", os.path.basename(path), "(전체)" if is_full else "(common 전용)")
    for wf in sorted(glob.glob(os.path.join(ROOT, "src", "data", "words_n*.json"))):
        words = json.load(open(wf, encoding="utf-8"))
        n_alt = 0
        for w in words:
            w.setdefault("tier", "core")
            w["alt_readings"] = vr.alt_readings_for(w["word"], w["reading"], by_kanji)
            if w["alt_readings"]:
                n_alt += 1
        write_words(wf, words)
        print(f"{os.path.basename(wf)}: {len(words)}개, 다른 읽기가 있는 단어 {n_alt}개")

if __name__ == "__main__":
    main()
