const canvas = document.getElementById('max-avatar');
const stage = canvas.parentElement;
const ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const portrait = new Image();
portrait.src = '/max-anime.png';
const turnaround = new Image();
const sprites = document.createElement('canvas');
turnaround.onload = () => {
  sprites.width = turnaround.naturalWidth;
  sprites.height = turnaround.naturalHeight;
  const source = sprites.getContext('2d');
  source.drawImage(turnaround, 0, 0);
  const pixels = source.getImageData(0, 0, sprites.width, sprites.height);
  // Discard the translucent backdrop baked into the sprite sheet while keeping soft character edges.
  for (let i = 3; i < pixels.data.length; i += 4) {
    pixels.data[i] = (pixels.data[i] - 156) * 255 / 99;
  }
  source.putImageData(pixels, 0, 0);
  sprites.dataset.ready = 'true';
};
turnaround.src = '/max-turnaround.png';
const view = document.getElementById('avatar-view');
const angle = document.getElementById('avatar-angle');
const angleLabel = document.getElementById('avatar-angle-label');
const frontFace = { eyes: [{ x: 190, y: 104 }, { x: 232, y: 103 }], mouth: [213, 134] };
const quarterFace = { eyes: [{ x: 582, y: 106 }, { x: 614, y: 109 }], mouth: [599, 135] };
const poses = {
  front: { start: 0, end: 380, center: 209, face: frontFace },
  quarter: { start: 380, end: 750, center: 564, face: quarterFace },
  quarterLeft: { start: 380, end: 750, center: 564, face: quarterFace, mirror: true },
  side: { start: 750, end: 1110, center: 924 },
  sideLeft: { start: 750, end: 1110, center: 924, mirror: true },
  back: { start: 1110, end: 1536, center: 1326 },
};
const idlePoses = ['front', 'quarter', 'side', 'quarter', 'front', 'quarterLeft', 'sideLeft', 'quarterLeft'];
let currentPose = 'front';
let previousPose = 'front';
let poseChangedAt = 0;
let stateStartedAt = performance.now();
let framing = 0;
let previousFrame = stateStartedAt;
view.onchange = () => {
  angleLabel.hidden = view.value === 'portrait';
};
angle.onchange = () => {
  if (angle.value !== 'auto') changePose(angle.value, performance.now());
};

function changePose(next, time) {
  if (next === currentPose) return;
  previousPose = currentPose;
  currentPose = next;
  poseChangedAt = time;
}

const gaze = { x: 0, y: 0 };
const target = { x: 0, y: 0 };
const eyes = [
  { x: 523, y: 391 },
  { x: 725, y: 381 },
];
let state = 'idle';
let mouthUntil = 0;
let voiceLevel = null;
let mouthShape = 0;
let smoothTilt = 0;
export function setVoiceLevel(value) {
  voiceLevel = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null;
}
let nextBlink = performance.now() + 2200;

export function setAvatarState(next) {
  if (state !== next) stateStartedAt = performance.now();
  state = next;
  stage.dataset.state = next;
  if (next === 'speaking') moveMouth();
  else { voiceLevel = null; mouthUntil = 0; }
}

export function moveMouth() {
  mouthUntil = performance.now() + 210;
}

window.addEventListener('pointermove', event => {
  const box = stage.getBoundingClientRect();
  if (!box.width) return;
  target.x = Math.max(-1, Math.min(1, (event.clientX - box.left - box.width / 2) / (box.width / 2)));
  target.y = Math.max(-1, Math.min(1, (event.clientY - box.top - box.height / 2) / (box.height / 2)));
});
document.addEventListener('pointerleave', () => { target.x = target.y = 0; });

function drawEye({ x, y }, blink, image = portrait, scale = 1) {
  const halfWidth = 58 * scale;
  const halfHeight = 25 * scale;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, halfWidth, halfHeight + 2 * scale, -.1, 0, Math.PI * 2);
  ctx.clip();
  const padding = halfHeight + 2 * scale;
  const step = Math.max(1, 2 * scale);
  for (let row = -padding; row < padding; row += step) {
    const weight = Math.max(0, 1 - Math.abs(row) / padding);
    const sourceY = y + row - (blink * 24 + gaze.y * 3) * weight * scale;
    const sourceX = x - halfWidth - gaze.x * 6 * weight * scale;
    ctx.drawImage(image, sourceX, sourceY, halfWidth * 2, step + .2,
      x - halfWidth, y + row, halfWidth * 2, step + .2);
  }
  ctx.restore();
}

function drawMouth(amount, x = 637, y = 540, scale = 1) {
  if (amount < .15) return;
  const jaw = 16 * amount;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(-.045);
  ctx.beginPath();
  ctx.moveTo(-35, -1);
  ctx.bezierCurveTo(-14, 2, 14, 2, 35, -2);
  ctx.bezierCurveTo(22, jaw + 3, -20, jaw + 6, -35, -1);
  ctx.closePath();
  const shade = ctx.createLinearGradient(0, 0, 0, jaw + 5);
  shade.addColorStop(0, '#612d3a');
  shade.addColorStop(1, '#ae626d');
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(3, jaw + 3, 17, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ce7d88';
  ctx.fill();
  ctx.restore();
}

function drawBody(pose, time, breath, blink, mouth, opacity, still, gesture) {
  if (opacity <= 0) return;
  const { start, end, center, face, mirror } = pose;
  const width = end - start;
  const stride = 18;
  const sway = still ? 0 : Math.sin(time / 760) * 30 + gaze.x * 15 + gesture * 28;
  const motion = y => {
    const upper = Math.max(0, 1 - y / 1005);
    const shoulders = Math.sin(Math.PI * upper);
    return {
      x: sway * upper * upper + Math.sin(time / 930 - y / 180) * shoulders * (still ? 0 : 12),
      y: (breath * 11 - gesture * 18) * upper,
    };
  };
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.scale(canvas.width / 1024, canvas.height / 1024);
  ctx.translate(512, 0);
  ctx.scale(mirror ? -1 : 1, 1);
  ctx.translate(-center, 0);

  // Anchor the boots while the shoulders and head shift with each breath.
  for (let row = 0; row < 1024; row += stride) {
    const height = Math.min(stride, 1024 - row);
    const from = motion(row);
    const to = motion(row + height);
    ctx.drawImage(sprites, start, row, width, height,
      start + from.x, row + from.y, width, height + to.y - from.y + (row + height < 1024 ? .65 : 0));
  }

  if (face) {
    const offset = motion(face.eyes[0].y);
    ctx.translate(offset.x, offset.y);
    if (blink > .01 || Math.abs(gaze.x) + Math.abs(gaze.y) > .05) {
      for (const eye of face.eyes) drawEye(eye, blink, sprites, .23);
    }
    drawMouth(mouth, ...face.mouth, .23);
  }
  ctx.restore();
}

function draw(time) {
  requestAnimationFrame(draw);
  if (!canvas.getClientRects().length) return;
  const still = reduced.matches;
  const phase = Math.max(0, time - stateStartedAt);
  const dt = Math.max(0, Math.min(50, time - previousFrame));
  previousFrame = time;
  const ambientLook = state === 'idle' ? Math.sin(phase / 1300) * .55 : 0;
  gaze.x += ((still ? 0 : target.x * .75 + ambientLook) - gaze.x) * .095;
  gaze.y += ((still ? 0 : target.y) - gaze.y) * .095;
  if (time > nextBlink + 170) nextBlink = time + 2600 + Math.random() * 3100;
  const blink = !still && time >= nextBlink ? Math.sin((time - nextBlink) / 170 * Math.PI) : 0;
  const breath = still ? 0 : Math.sin(time / 880);
  const tilt = state === 'listening' ? -.026 : state === 'thinking' ? .021 : 0;
  smoothTilt += (tilt - smoothTilt) * (1 - Math.exp(-dt / 220));
  const targetMouth = state === 'speaking'
    ? (voiceLevel !== null ? voiceLevel : time < mouthUntil ? .3 + .7 * Math.abs(Math.sin(time / 65)) : .35 * Math.max(0, Math.sin(time / 90)))
    : 0;
  mouthShape += (targetMouth - mouthShape) * (1 - Math.exp(-dt / (targetMouth > mouthShape ? 35 : 90)));
  const mouth = mouthShape;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const automaticCloseUp = angle.value === 'auto' &&
    (state === 'listening' || state === 'thinking' || (state === 'speaking' && phase > 1150));
  const closeUp = view.value === 'portrait' || (view.value === 'auto' && automaticCloseUp);
  const desiredFrame = !sprites.dataset.ready || (portrait.naturalWidth && closeUp) ? 1 : 0;
  framing += (desiredFrame - framing) * (still ? 1 : 1 - Math.exp(-dt / 130));
  stage.dataset.view = closeUp ? 'portrait' : 'body';
  const gesture = !still && state === 'speaking' && phase < 1350 ? Math.sin(Math.PI * phase / 1350) : 0;

  if (sprites.dataset.ready && framing < .995) {
    const idleIndex = Math.floor(phase / 3000) % idlePoses.length;
    const automaticPose = state === 'idle' && !still ? idlePoses[idleIndex] : gesture > .25 && voiceLevel === null ? 'quarter' : 'front';
    changePose(angle.value === 'auto' ? automaticPose : angle.value, time);
    const progress = still ? 1 : Math.min(1, (time - poseChangedAt) / 220);
    drawBody(poses[previousPose], time, breath, blink, mouth, (1 - progress) * (1 - framing), still, gesture);
    drawBody(poses[currentPose], time, breath, blink, mouth, progress * (1 - framing), still, gesture);
  }
  if (!portrait.naturalWidth || framing < .005) return;
  ctx.save();
  ctx.globalAlpha = framing;
  ctx.scale(canvas.width / 1254, canvas.height / 1254);
  ctx.translate(627 + gaze.x * 17, 750 + breath * 9);
  ctx.rotate(still ? 0 : smoothTilt + gaze.x * .028 + breath * .011);
  ctx.translate(-627, -750);
  ctx.drawImage(portrait, 0, 10, 1254, 1254);
  ctx.translate(0, 10);
  if (blink > .01 || Math.abs(gaze.x) + Math.abs(gaze.y) > .05) {
    for (const eye of eyes) drawEye(eye, blink);
  }
  drawMouth(mouth);
  ctx.restore();
}

requestAnimationFrame(draw);
