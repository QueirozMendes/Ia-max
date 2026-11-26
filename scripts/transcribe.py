"""Receives WAV on stdin; never opens a microphone or sends audio over network."""
import io
import json
import sys
from pathlib import Path
from faster_whisper import WhisperModel

root = Path(__file__).resolve().parents[1]
model = WhisperModel(str(root / '.runtime' / 'whisper-base'), device='cpu', compute_type='int8', cpu_threads=4, local_files_only=True)
audio = sys.stdin.buffer.read(2100001)
if len(audio) > 2100000:
    raise ValueError('Audio too large')
segments, _ = model.transcribe(io.BytesIO(audio), language='pt', beam_size=1, vad_filter=True, condition_on_previous_text=False)
print(json.dumps({'text': ' '.join(s.text.strip() for s in segments)}, ensure_ascii=True))
