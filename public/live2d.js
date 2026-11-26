import { resolveParameters } from './live2d-parameters.js';
// Optional Cubism 4 runtime. All assets are served locally.
export async function mountLive2D(stage, fallback, status) {
  let app, model, observer;
  const load = src => new Promise((resolve, reject) => {
    if (document.querySelector('script[data-loaded="'+src+'"]')) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => { script.dataset.loaded=src; resolve(); };
    script.onerror = () => { script.remove(); reject(new Error('Runtime ausente')); };
    document.head.append(script);
  });
  const release = () => {
    observer?.disconnect();
    if (app) app.destroy(true, { children: true, texture: true, baseTexture: true });
    fallback.hidden = false;
  };
  try {
    const available = await fetch('/api/avatar-status').then(r => r.ok ? r.json() : null);
    if (!available?.live2d) { status.textContent = 'Avatar clássico · Epsilon aguardando instalação'; return null; }
    await load('/live2d/vendor/live2dcubismcore.min.js');
    await load('/live2d/vendor/pixi.min.js');
    await load('/live2d/vendor/unsafe-eval.min.js');
    await load('/live2d/vendor/cubism4.min.js');
    const PIXI = window.PIXI;
    const Live2DModel = PIXI.live2d.Live2DModel;
    Live2DModel.registerTicker(PIXI.Ticker);
    app = new PIXI.Application({ backgroundAlpha: 0, antialias: true, resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true });
    app.view.className = 'max-live2d';
    app.view.setAttribute('role', 'img');
    app.view.setAttribute('aria-label', 'Max, avatar Live2D');
    model = await Live2DModel.from('/live2d/model/max.model3.json', { autoInteract: false });
    app.stage.addChild(model);
    model.anchor.set(.5, .5);
    stage.append(app.view);
    const resize = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      app.renderer.resize(w, h);
      model.scale.set(1);
      const scale = Math.min(w / Math.max(1, model.width), h / Math.max(1, model.height));
      model.scale.set(scale * .96);
      model.position.set(w / 2, h / 2);
    };
    observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();
    const ids=resolveParameters(model.internalModel.coreModel);
    let gestureAt=0;
    let frame = { mouth: 0, gazeX: 0, gazeY: 0, tilt: 0, still: false, state: 'idle' };
    let pose = { x: 0, y: 0, z: 0, smile: 0, body: 0 };
    let last = performance.now();
    const parameters = () => {
      const core = model.internalModel.coreModel;
      const set = (id, value) => {
        const actual=ids[id];
        if(actual)core.setParameterValueById(actual,value);
      };
      const now = performance.now();
      const dt = Math.min(50, Math.max(0, now - last));
      last = now;
      const ease = 1 - Math.exp(-dt / 180);
      const listening = frame.state === 'listening';
      const thinking = frame.state === 'thinking';
      const speaking = frame.state === 'speaking';
      const targets = {
        x: frame.still ? 0 : frame.gazeX * 18 + (speaking?Math.sin(now/510)*3.5:0),
        y: frame.still ? 0 : -frame.gazeY * 12 + (thinking ? 4 : speaking ? Math.sin(now/310)*2.5 : 0),
        z: frame.still ? 0 : frame.tilt * 180 / Math.PI + (listening ? -4 : speaking?Math.sin(now/850)*2:0),
        smile: speaking ? .35 : listening ? .15 : 0,
        body: frame.still ? 0 : frame.gazeX * 5 + Math.sin(now / 1800) * 1.5,
      };
      for (const key of Object.keys(pose)) pose[key] += (targets[key] - pose[key]) * ease;
      set('ParamMouthOpenY', Math.min(1,Math.max(0,frame.mouth)*1.25));
      set('ParamBreath',frame.still?0.5:(Math.sin(now/1400)+1)/2);

      set('ParamAngleX', pose.x);
      set('ParamAngleY', pose.y);
      set('ParamAngleZ', pose.z);
      set('ParamBodyAngleX', pose.body);
      // Expressions own mouth shape; lip-sync only owns mouth opening.
      set('ParamEyeBallX', frame.still ? 0 : frame.gazeX);
      set('ParamEyeBallY', frame.still ? 0 : -frame.gazeY);
    };
    model.internalModel.on('beforeModelUpdate', parameters);
    fallback.hidden = true;
    status.textContent = 'Max · Live2D Epsilon';
    const settings=await fetch('/live2d/model/max.model3.json').then(r=>r.json());
    return {
      expressions:(settings.FileReferences.Expressions||[]).map(e=>e.Name),
      expression(name){return model.expression(name);},
      motion(group='Tap',index=0){return model.motion(group,index,3);},
      update(next) { frame = next; },
      destroy: release,
    };
  } catch (error) { console.error('Live2D initialization failed',error);
    release();
    status.textContent = 'Avatar clássico · Live2D indisponível';
    return null;
  }
}
