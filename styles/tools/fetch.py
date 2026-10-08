"""Download reference videos (YouTube, Shorts, Instagram, TikTok, X …) into a style's references folder.

Usage (from repo root):
  .venv-audio/Scripts/python styles/tools/fetch.py <url> [<url> ...] [--style style-1]

Each video lands in styles/<style>/references/<id>/ as video.mp4 + info.json (title, uploader, duration, and the
platform's own music credit when it has one: track / artist / album). Media stays git-ignored.
"""
import argparse, json
from pathlib import Path

from yt_dlp import YoutubeDL

KEEP = ["id", "title", "uploader", "channel", "webpage_url", "duration", "fps", "width", "height",
        "upload_date", "view_count", "like_count", "track", "artist", "album", "description", "tags"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("urls", nargs="+")
    ap.add_argument("--style", default="style-1")
    a = ap.parse_args()
    root = Path(__file__).resolve().parents[1] / a.style / "references"
    opts = {
        "format": "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b",
        "merge_output_format": "mp4",
        "outtmpl": str(root / "%(extractor)s-%(id)s" / "video.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "noprogress": True,
        "no_warnings": True,
    }
    with YoutubeDL(opts) as ydl:
        for url in a.urls:
            info = ydl.extract_info(url, download=True)
            d = Path(ydl.prepare_filename(info)).parent
            meta = {k: info.get(k) for k in KEEP if info.get(k) is not None}
            (d / "info.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
            music = " - ".join(x for x in (meta.get("artist"), meta.get("track")) if x)
            print(f"{d.name}: {meta.get('title', '')[:60]} | {meta.get('duration')}s"
                  + (f" | music: {music}" if music else ""))


if __name__ == "__main__":
    main()
