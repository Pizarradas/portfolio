(() => {
  const scaleFrame = (viewport, iframe) => {
    if (!viewport || !iframe) return;
    const sourceWidth = 1440;
    const scale = Math.min(1, viewport.clientWidth / sourceWidth);
    iframe.style.transform = `scale(${scale})`;
    iframe.style.width = `${sourceWidth}px`;
    // ensure enough source height to fill the scaled viewport
    iframe.style.height = `${Math.max(1000, viewport.clientHeight / Math.max(scale,.01))}px`;
  };

  const frames = [...document.querySelectorAll('.mol-live-preview__stage iframe, .mol-browser-preview__viewport iframe')];
  frames.forEach(frame => {
    const viewport = frame.parentElement;
    scaleFrame(viewport, frame);
    frame.addEventListener('load', () => {
      viewport.classList.add('is-loaded');
      scaleFrame(viewport, frame);
    }, { once:true });
  });

  let raf;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => frames.forEach(f => scaleFrame(f.parentElement, f)));
  });
})();

;(() => {
  const frames=[...document.querySelectorAll('.mol-register-preview__viewport iframe')];
  const scale=frame=>{
    const vp=frame.parentElement;
    if(!vp) return;
    const base=1440;
    const s=Math.min(1,vp.clientWidth/base);
    frame.style.transform=`scale(${s})`;
    frame.style.width=`${base}px`;
    frame.style.height=`${Math.max(1100,vp.clientHeight/Math.max(s,.01))}px`;
  };
  frames.forEach(scale);
  let raf;
  window.addEventListener('resize',()=>{
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>frames.forEach(scale));
  },{passive:true});
})();

;(() => {
  const cropFrames=[...document.querySelectorAll('.mol-register-preview__viewport--cropped iframe')];
  const crop=frame=>{
    const vp=frame.parentElement;
    if(!vp)return;
    const s=Math.min(1,vp.clientWidth/1440);
    frame.style.transform=`scale(${s})`;
    frame.style.width='1440px';
    frame.style.height='835px';
  };
  cropFrames.forEach(crop);
  let r;
  window.addEventListener('resize',()=>{cancelAnimationFrame(r);r=requestAnimationFrame(()=>cropFrames.forEach(crop));},{passive:true});
})();

;(() => {
  const frames=[...document.querySelectorAll('.mol-project-hero-v27__viewport iframe')];
  const fit=frame=>{
    const vp=frame.parentElement;
    if(!vp)return;
    const sourceW=1440, sourceH=900;
    const scale=Math.max(vp.clientWidth/sourceW, vp.clientHeight/sourceH);
    frame.style.width=`${sourceW}px`;
    frame.style.height=`${sourceH}px`;
    frame.style.transform=`scale(${scale})`;
  };
  frames.forEach(fit);
  let raf;
  window.addEventListener('resize',()=>{
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>frames.forEach(fit));
  },{passive:true});
})();
