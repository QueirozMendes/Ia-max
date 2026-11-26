"""Local speech worker. Receives text, returns WAV; no network or sensor access."""
import base64
import io
import json
import sys
from pathlib import Path
import onnxruntime as ort
import soundfile as sf
from kokoro_onnx import Kokoro

sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')
root = Path(__file__).resolve().parents[1] / '.runtime' / 'kokoro'
options = ort.SessionOptions()
options.intra_op_num_threads = 4
options.inter_op_num_threads = 1
session = ort.InferenceSession(str(root / 'kokoro-v1.0.onnx'), sess_options=options, providers=['CPUExecutionProvider'])
voice = Kokoro.from_session(session, str(root / 'voices-v1.0.bin'))
for line in sys.stdin:
    request = {}
    try:
        request = json.loads(line)
        text = request.get('text', '')
        if not isinstance(text, str) or not text.strip() or len(text) > 2400:
            raise ValueError('Invalid text')
        samples, rate = voice.create(text, voice='pf_dora', speed=0.94, lang='pt-br')
        buffer = io.BytesIO()
        sf.write(buffer, samples, rate, format='WAV', subtype='PCM_16')
        answer = {'id': request['id'], 'audio': base64.b64encode(buffer.getvalue()).decode('ascii')}
    except Exception:
        answer = {'id': request.get('id'), 'error': 'Local voice generation failed'}
    print(json.dumps(answer, ensure_ascii=True), flush=True)
