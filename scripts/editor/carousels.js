/* Carruseles creados desde el editor: DOM seguro, desplazamiento táctil y limpieza. */
(() => {
 const mounted=new Map();
 window.DelfinesCarousels={sync(records){
  const active=new Set();
  for(const [selector,record] of Object.entries(records)){
   if(!record.carousel||!/^#editor-carousel-[a-z0-9-]+$/.test(selector))continue;
   active.add(selector);const data=record.carousel,signature=JSON.stringify(data);
   if(mounted.get(selector)?.signature===signature)continue;
   const previous=mounted.get(selector);previous?.cleanup();
   let target=null;try{if(data.target)target=document.querySelector(data.target);}catch{}
   const original=previous?.original||((target?.matches('img'))?target.cloneNode(true):null);
   if(original)original.classList.remove('delfines-editor-selected');
   const old=document.querySelector(selector),section=document.createElement(data.target?'div':'section');section.id=selector.slice(1);section.className=data.target?'custom-carousel custom-carousel-inline':'custom-carousel wrap';if(target?.matches('img')&&!old){const style=getComputedStyle(target);section.style.aspectRatio=target.offsetWidth+' / '+target.offsetHeight;section.style.borderRadius=style.borderRadius;}section.setAttribute('aria-label',data.title||'Carrusel');
   const heading=document.createElement('h2');heading.textContent=data.title||'Momentos en Delfines';if(!data.target)section.append(heading);
   const track=document.createElement('div');track.className='custom-carousel-track';track.tabIndex=0;
   data.slides.forEach((slide,index)=>{const figure=document.createElement('figure');figure.id=section.id+'-slide-'+index;const img=document.createElement('img');img.src=slide.src;img.alt=slide.caption||'Imagen '+(index+1);img.loading='lazy';const caption=document.createElement('figcaption');caption.textContent=slide.caption||'';figure.append(img,caption);track.append(figure);});section.append(track);
   const controls=document.createElement('div');controls.className='custom-carousel-controls';let index=0;
   const counter=document.createElement('span');counter.setAttribute('aria-live','polite');counter.textContent='1 / '+data.slides.length;
   track.addEventListener('scroll',()=>{const stride=track.children[1]?.offsetLeft-track.children[0]?.offsetLeft;if(stride>0){index=Math.max(0,Math.min(data.slides.length-1,Math.round(track.scrollLeft/stride)));const text=(index+1)+' / '+data.slides.length;if(counter.textContent!==text)counter.textContent=text;}},{passive:true});
   const go=direction=>{index=(index+direction+data.slides.length)%data.slides.length;track.scrollTo({left:track.children[index].offsetLeft-track.children[0].offsetLeft,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});counter.textContent=(index+1)+' / '+data.slides.length;};
   for(const [name,direction] of [['Anterior',-1],['Siguiente',1]]){const button=document.createElement('button');button.type='button';button.textContent=name;button.addEventListener('click',()=>go(direction));controls.append(button);}controls.append(counter);section.append(controls);
   if(old){section.style.cssText=old.style.cssText;old.replaceWith(section);}else if(data.target&&target?.matches('img'))target.replaceWith(section);else{let after;try{after=document.querySelector(data.after);}catch{}if(after?.parentElement?.matches('main'))after.after(section);else document.querySelector('main')?.append(section);}
   let timer=null;const preview=Boolean(window.DELFINES_EDITOR_PREVIEW)||new URLSearchParams(location.search).has('editor-preview');
   if(data.autoplay&&!preview&&!matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setInterval(()=>{if(!document.hidden&&!section.matches(':hover')&&!section.contains(document.activeElement))go(1);},data.interval*1000);
   mounted.set(selector,{signature,node:section,original,cleanup(){if(timer)clearInterval(timer);}});
  }
  for(const [selector,entry] of mounted)if(!active.has(selector)){entry.cleanup();if(entry.original)entry.node.replaceWith(entry.original.cloneNode(true));else entry.node.remove();mounted.delete(selector);}
 }};
})();
