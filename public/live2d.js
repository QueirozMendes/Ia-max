// Optional Cubism 4 runtime. All assets are served locally.
export async function mountLive2D(stage, fallback, status) {
  let app, model, observer;
  const load = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
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
    if (!available?.live2d) return null;
    await load('/live2d/vendor/live2dcubismcore.min.js');
    await load('/live2d/vendor/pixi.min.js');
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
    let frame = { mouth: 0, gazeX: 0, gazeY: 0, tilt: 0, still: false, state: 'idle' };
    const parameters = () => {
      const core = model.internalModel.coreModel;
      const set = (id, value) => core.setParameterValueById(id, value);
      set('ParamMouthOpenY', frame.mouth);
      set('ParamAngleX', frame.still ? 0 : frame.gazeX * 20);
      set('ParamAngleY', frame.still ? 0 : -frame.gazeY * 15);
      set('ParamAngleZ', frame.still ? 0 : frame.tilt * 180 / Math.PI);
      set('ParamEyeBallX', frame.still ? 0 : frame.gazeX);
      set('ParamEyeBallY', frame.still ? 0 : -frame.gazeY);
    };
    model.internalModel.on('beforeModelUpdate', parameters);
    fallback.hidden = true;
    status.textContent = 'Avatar Live2D ativo';
    return {
      update(next) { frame = next; },
      destroy: release,
    };
  } catch {
    release();
    status.textContent = 'Avatar clássico · Live2D indisponível';
    return null;
  }
}
