(() => {
 document.querySelectorAll('.js-ill-gallery').forEach(g=>{
   if('IntersectionObserver' in window){
     const io=new IntersectionObserver(entries=>entries.forEach(e=>{
       if(e.isIntersecting){g.classList.add('is-visible');io.disconnect();}
     }),{threshold:.12});
     io.observe(g);
   } else g.classList.add('is-visible');
 });
})();