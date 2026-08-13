(() => {
 const grid=document.querySelector('.mol-dot-universe__grid');
 if(grid){
   // One dot per card, not one dot per percentage point. The field used to be
   // 100 dots under a "279 cards analysed" label, so a reader who counted got a
   // different number from the one the panel claimed. Counts come from the
   // markup now, which is also where the caption that states them lives.
   const total=Number(grid.dataset.dots)||0, hot=Number(grid.dataset.exceeded)||0;
   for(let i=0;i<total;i++){const d=document.createElement('i'); d.setAttribute('aria-hidden','true'); grid.appendChild(d);}
   const dots=[...grid.children];
   const reveal=()=>dots.forEach((d,i)=>{setTimeout(()=>{d.style.opacity='1'; if(i<hot)d.classList.add('is-hot')}, Math.min(i*8,650));});
   if('IntersectionObserver'in window){
     const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){reveal();io.disconnect()}}),{threshold:.25});io.observe(grid);
   }else reveal();
 }
 // Keep live previews visually scaled to their container.
 document.querySelectorAll('.mol-project-context-v22 iframe').forEach(f=>{
   const resize=()=>{const p=f.parentElement,w=p.clientWidth,base=1280;f.style.transform=`scale(${Math.min(1,w/base)})`;f.style.height=`${Math.max(900,p.clientHeight/(w/base||1))}px`;};
   resize(); window.addEventListener('resize',resize,{passive:true});
 });
})();