"""Master the finished films' audio for social platforms: -14 LUFS, peaks <= -1 dBTP.

Runs two-pass EBU R128 loudnorm on the soundtrack and copies the video stream untouched.

    python scripts/master.py out/gistspot-pitch-9x16.mp4 out/gistspot-pitch-16x9.mp4
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = 'I=-14:TP=-1:LRA=11'


def ffmpeg(*args):
    return subprocess.run(['npx', 'remotion', 'ffmpeg', *map(str, args)], cwd=ROOT, shell=(sys.platform == 'win32'), capture_output=True, text=True)


def master(path: Path):
    p1 = ffmpeg('-hide_banner', '-y', '-i', path, '-vn', '-af', f'loudnorm={TARGET}:print_format=json', '-f', 'null', '-')
    s = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', p1.stderr).group(0))
    af = (
        f"loudnorm={TARGET}:measured_I={s['input_i']}:measured_TP={s['input_tp']}:measured_LRA={s['input_lra']}"
        f":measured_thresh={s['input_thresh']}:offset={s['target_offset']}:linear=true"
    )
    tmp = path.with_name(path.stem + '.mastering.mp4')
    p2 = ffmpeg('-hide_banner', '-y', '-i', path, '-c:v', 'copy', '-af', af, '-ar', '48000', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', tmp)
    if p2.returncode != 0:
        raise RuntimeError(p2.stderr[-1200:])
    tmp.replace(path)
    p3 = ffmpeg('-hide_banner', '-i', path, '-vn', '-af', f'loudnorm={TARGET}:print_format=json', '-f', 'null', '-')
    o = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', p3.stderr).group(0))
    print(f"{path.name}: {s['input_i']} LUFS -> {o['input_i']} LUFS, true peak {o['input_tp']} dBTP")


if __name__ == '__main__':
    for f in sys.argv[1:]:
        master(ROOT / f)
