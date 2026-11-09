(() => {
 'use strict';
 const preview=Boolean(window.DELFINES_EDITOR_PREVIEW)||new URLSearchParams(location.search).has('editor-preview');
 const siteOrigin=new URL(document.baseURI).origin;
 const page=window.DELFINES_PREVIEW_PAGE||location.pathname.split('/').pop()||'index.html';
 let transformDrag=null;
 let config=window.DELFINES_SITE_SETTINGS||{version:1,revision:0,pages:{}};
 const tracked=new Map();
 const componentNodes=new Map();
 // Texto mixto: cada fragmento tiene su propia pieza sin alterar nth-of-type de los spans existentes.
 document.querySelectorAll('a,button,div,li,label').forEach(parent=>{
  if(parent.closest('script,style,[data-editor-ui]')||!parent.children.length)return;
  [...parent.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim()).forEach(node=>{
   const piece=document.createElement('delfines-text');piece.textContent=node.textContent;node.replaceWith(piece);
  });
 });
 function syncComponents(records){
  for(const [selector,node] of componentNodes)if(!records[selector]?.component){node.remove();componentNodes.delete(selector);}
  for(const [selector,record] of Object.entries(records)){
   if(!record.component||componentNodes.has(selector))continue;
   if(!/^#editor-component-[a-z0-9-]+$/.test(selector)||!['p','h2','img','a','div','section'].includes(record.component.tag))continue;
   let parent;try{parent=document.querySelector(record.component.parent);}catch{}
   if(!parent||parent.closest('script,style')||parent.matches('img,input,button,a'))parent=document.querySelector('main')||document.body;
   const node=document.createElement(record.component.tag);node.id=selector.slice(1);node.dataset.editorLabel=record.label||'Componente';
   node.className='editor-created-component';if(node.tagName==='IMG')node.alt='Imagen';parent.append(node);componentNodes.set(selector,node);
  }
 }

 let selected=null,mode='edit',isolated=false,selectedModule=null,scheduled=false;
 const textOf=element=>{const clone=element.cloneNode(true);clone.querySelectorAll('svg,[aria-hidden="true"]').forEach(n=>n.remove());clone.querySelectorAll('br').forEach(n=>n.replaceWith('\n'));return clone.textContent.trim();};
 function putText(element,text){
  const decorations=[...element.children].filter(e=>e.matches('svg,[aria-hidden="true"]')).map(e=>e.cloneNode(true));
  const nodes=[];String(text).split('\n').forEach((line,index)=>{if(index)nodes.push(document.createElement('br'));if(element.matches('a,button')){const piece=document.createElement('delfines-text');piece.textContent=line;nodes.push(piece);}else nodes.push(document.createTextNode(line));});
  if(decorations.length)nodes.push(document.createTextNode(' '));element.replaceChildren(...nodes,...decorations);
 }
 function apply(){
  scheduled=false;const desired=new Map();
  const records={...(config.pages?.['*']||{}),...(config.pages?.[page]||{})};
  syncComponents(records);window.DelfinesCarousels?.sync(records);if(preview)requestAnimationFrame(refreshModuleList);
  const mobile=matchMedia('(max-width: 680px)').matches;
  for(const [selector,record] of Object.entries(records)){
   try{document.querySelectorAll(selector).forEach(element=>desired.set(element,record));}catch{}
  }
  for(const element of new Set([...tracked.keys(),...desired.keys()])){
   if(!element.isConnected){tracked.delete(element);continue;}
   let record=desired.get(element)||{};if(record.editorLocked)element.dataset.editorLocked='true';else delete element.dataset.editorLocked;if(preview&&typeof transformDrag!=='undefined'&&transformDrag&&element===selected&&transformDrag.liveStyles)record={...record,styles:{...record.styles,...transformDrag.liveStyles}};
   if(record.animationTrigger){element.dataset.editorAnimationTrigger=record.animationTrigger;if(record.animationTrigger==='hover'&&!element.matches(':hover')||record.animationTrigger==='click'&&!element.classList.contains('editor-animation-active'))record={...record,styles:{...record.styles,'animation-name':'none'}};}else delete element.dataset.editorAnimationTrigger;
   if(mobile&&record.styles){const styles={...record.styles};if(styles.zoom)styles.zoom=String(Math.min(1,Number(styles.zoom)||1));if(styles.width?.endsWith('px'))styles.width='min('+styles.width+', 100%)';if(styles.width)styles['max-width']='100%';if(styles.height&&element.matches('img'))styles.height='auto';if(styles.translate)styles.translate='0px 0px';if(styles['font-size']?.endsWith('px'))styles['font-size']='min('+styles['font-size']+', '+(element.matches('h1,h2,.footer-title')?'12vw':'6vw')+')';if(styles['grid-template-columns'])styles['grid-template-columns']='repeat(auto-fit, minmax(min(100%, 220px), 1fr))';record={...record,styles};}

   let state=tracked.get(element);if(!state){state={styles:new Map(),attrs:new Map()};tracked.set(element,state);}
   for(const key of new Set([...state.styles.keys(),...Object.keys(record.styles||{})])){
    const next=record.styles?.[key],current=element.style.getPropertyValue(key);let prior=state.styles.get(key);
    if(!prior){prior={base:current,priority:element.style.getPropertyPriority(key),last:current};state.styles.set(key,prior);}else if(current!==prior.last)prior.base=current;
    if(next===undefined){if(current===prior.last){if(prior.base)element.style.setProperty(key,prior.base,prior.priority||'');else element.style.removeProperty(key);}state.styles.delete(key);}
    else{if(current!==prior.last||prior.input!==next)element.style.setProperty(key,next,'important');prior.last=element.style.getPropertyValue(key);prior.input=next;}
   }
   for(const key of ['src','alt','href']){
    const next=record[key],current=element.getAttribute(key);let prior=state.attrs.get(key);
    if(next===undefined&&!prior)continue;
    if(!prior){prior={base:current,last:current};state.attrs.set(key,prior);}else if(current!==prior.last)prior.base=current;
    if(next===undefined){if(current===prior.last){if(prior.base===null)element.removeAttribute(key);else element.setAttribute(key,prior.base);}state.attrs.delete(key);}
    else{if(current!==next)element.setAttribute(key,next);prior.last=next;}
   }
   if(record.text!==undefined||state.text){
    const current=textOf(element);let prior=state.text;
    if(!prior){prior={base:[...element.childNodes].map(n=>n.cloneNode(true)),last:current};state.text=prior;}
    else if(current!==prior.last)prior.base=[...element.childNodes].map(n=>n.cloneNode(true));
    if(record.text===undefined){if(current===prior.last)element.replaceChildren(...prior.base.map(n=>n.cloneNode(true)));delete state.text;}
    else{if(current!==record.text.trim())putText(element,record.text);prior.last=textOf(element);}
   }
  }
 }
 function refreshModuleList(){const nodes=[...document.querySelectorAll('body>header,main>section,.site-admin-entry,body>footer,.floating-contact,.reservation-floating,body>dialog:not(.site-admin-shell)')];let changed=false;for(let i=modules.length-1;i>=0;i--)if(!modules[i].node.isConnected){modules.splice(i,1);changed=true;}for(const node of nodes)if(!modules.some(m=>m.node===node)){modules.push({node,selector:node.id?'#'+CSS.escape(node.id):selectorFor(node,false),label:node.getAttribute('aria-label')||node.querySelector('h1,h2')?.textContent||'Sección'});changed=true;}if(changed)announce({type:'delfines-preview-ready',page,modules:modules.map(({selector,label})=>({selector,label}))});}
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(apply);}}
 document.addEventListener('pointerover',event=>{if(event.target.closest('[data-editor-animation-trigger=hover]'))schedule();});document.addEventListener('pointerout',event=>{if(event.target.closest('[data-editor-animation-trigger=hover]'))schedule();});
 document.addEventListener('click',event=>{const target=event.target.closest('[data-editor-animation-trigger=click]');if(target){target.classList.remove('editor-animation-active');schedule();requestAnimationFrame(()=>{target.classList.add('editor-animation-active');schedule();});}},true);
 matchMedia('(max-width: 680px)').addEventListener('change',schedule);
 apply();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','src','href','data-active-plan','data-photo-index','data-gallery-index','data-active-scene']});
 {
  const entry=document.createElement('section');entry.id='administracion';entry.className='site-admin-entry';
  const inner=document.createElement('div');inner.className='wrap';
  const copy=document.createElement('div');const title=document.createElement('h2');title.textContent='Administración del sitio';const detail=document.createElement('p');detail.textContent='Edita el contenido y el diseño con vista previa.';copy.append(title,detail);
  const link=document.createElement('a');link.className='site-admin-link';link.href='admin.html';link.textContent='Abrir administración';
  const dialog=document.createElement('dialog');dialog.className='site-admin-shell';dialog.setAttribute('aria-label','Administración de Delfines');
  const close=document.createElement('button');close.className='site-admin-shell-close';close.type='button';close.textContent='Cerrar administración ×';close.addEventListener('click',async()=>{try{if(frame.contentWindow.DelfinesAdminCanClose?.()===false)return;}catch{}dialog.close();try{const response=await fetch('data/site-settings.json',{cache:'no-store'});if(response.ok){config=await response.json();apply();}}catch{}});
  const frame=document.createElement('iframe');frame.title='Editor visual de Delfines';dialog.append(close,frame);document.body.append(dialog);
  link.addEventListener('click',event=>{if(preview){event.preventDefault();return;}if(event.ctrlKey||event.metaKey)return;event.preventDefault();frame.src='admin.html?embedded=1&page='+encodeURIComponent(page);dialog.showModal();});
  inner.append(copy,link);entry.append(inner);const footer=document.querySelector('body>footer');if(footer)footer.before(entry);else document.body.append(entry);
  addEventListener('message',event=>{if(event.origin===siteOrigin&&event.source===frame.contentWindow&&event.data?.type==='delfines-close-admin'){dialog.close();location.reload();}});
  if(!preview)return;
 }
 document.documentElement.classList.add('delfines-preview');document.documentElement.dataset.editorPage=page;
 const announce=data=>parent.postMessage(data,siteOrigin);
 const moduleNodes=[...document.querySelectorAll('body>header,main>section,.site-admin-entry,body>footer,.floating-contact,.reservation-floating,body>dialog:not(.site-admin-shell)')];
 const modules=moduleNodes.map((node,index)=>({node,selector:node.id?'#'+CSS.escape(node.id):selectorFor(node,false),label:node.matches('header')?'Menú principal':node.matches('footer')?'Pie de página':node.matches('.floating-contact')?'Botón flotante':node.matches('.reservation-floating')?'Botón de reservas':node.matches('dialog')?({'gallery-dialog':'Modal · Galería','booking-dialog':'Modal · Consulta','plan-dialog':'Modal · Plan de habitación','contact-dialog':'Modal · Contacto'}[node.id]||'Modal'):node.getAttribute('aria-label')||node.querySelector('h1,h2')?.innerText.replace(/\s+/g,' ')||'Sección '+(index+1)}));
 function selectorFor(element,context=true){
  if(context&&['lightbox-image','lightbox-caption'].includes(element.id)){const gallery=element.closest('#gallery-dialog');if(gallery?.dataset.galleryIndex)return '#gallery-dialog[data-gallery-index="'+CSS.escape(gallery.dataset.galleryIndex)+'"] #'+CSS.escape(element.id);}
  if(context&&element.id==='hero-feature-photo')return '#inicio[data-active-scene="'+CSS.escape(document.querySelector('#inicio')?.dataset.activeScene||'0')+'"] #hero-feature-photo';
  const modal=context?element.closest('#plan-dialog'):null;
  if(modal&&element!==modal&&modal.dataset.activePlan){
   const prefix='#plan-dialog[data-active-plan="'+CSS.escape(modal.dataset.activePlan)+'"]'+(element.id==='plan-modal-image'?'[data-photo-index="'+CSS.escape(modal.dataset.photoIndex||'0')+'"]':'');
   if(element.id)return prefix+' #'+CSS.escape(element.id);
   return prefix+' '+pathTo(element,modal);
  }
  if(element.matches('.footer-title'))return '.footer-title';
  if(element.matches('.footer-signature'))return '.footer-signature';
  if(element.matches('.floating-contact'))return '.floating-contact';
  if(element.id)return '#'+CSS.escape(element.id);
  return pathTo(element,document.body);
 }
 function pathTo(element,stop){
  const path=[];for(let node=element;node&&node!==stop&&node!==document.documentElement;node=node.parentElement){
   if(node.id){path.unshift('#'+CSS.escape(node.id));break;}
   let part=node.tagName.toLowerCase();const siblings=[...node.parentElement?.children||[]].filter(e=>e.tagName===node.tagName);if(siblings.length>1)part+=':nth-of-type('+(siblings.indexOf(node)+1)+')';path.unshift(part);
  }return (stop===document.body&&!path[0]?.startsWith('#')?'body > ':'')+path.join(' > ');
 }
 function kindOf(element){
  if(element.matches('img,picture,video'))return 'image';
  if(element.matches('a,button'))return 'button';
  if(element.matches('svg'))return 'icon';
  const direct=[...element.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
  const structural=[...element.children].some(e=>!e.matches('br,svg,[aria-hidden="true"]'));
  return direct&&!structural?'text':'container';
 }
 function selectable(element){return element instanceof Element&&!element.closest('[data-editor-ui]')&&!element.matches('script,style,link,meta,base,br,source,option')&&!element.closest('svg *');}
 function structureFor(module){return module?[module.node,...module.node.querySelectorAll('*')].filter(selectable).map(node=>({selector:selectorFor(node),tag:node.tagName.toLowerCase(),kind:kindOf(node),label:(node.getAttribute('data-editor-label')||node.getAttribute('alt')||node.getAttribute('aria-label')||(['text','button'].includes(kindOf(node))?textOf(node):node.getAttribute('class'))||node.tagName).slice(0,65),depth:(()=>{let d=0;for(let p=node;p&&p!==module.node;p=p.parentElement)d++;return d;})()})):[];}
 function nativeHoverEffects(element){
  const effects=[];const ancestors=[];for(let node=element;node&&node!==document.body;node=node.parentElement)ancestors.push(node);
  function scan(rules){for(const rule of rules){if(!rule.selectorText&&rule.cssRules){if(!rule.conditionText||rule.type!==4||matchMedia(rule.conditionText).matches)scan(rule.cssRules);continue;}if(!rule.selectorText?.includes(':hover'))continue;const selector=rule.selectorText.replaceAll(':hover','');for(const node of ancestors){try{if(!node.matches(selector))continue;const properties=['transform','scale','rotate','opacity','filter','box-shadow'].filter(key=>rule.style.getPropertyValue(key));if(properties.length){const entry={selector:selectorFor(node),label:node===element?'Este elemento':'Contenedor '+(node.classList[0]||node.tagName.toLowerCase()),properties:properties.map(key=>key+': '+rule.style.getPropertyValue(key)).join('; ')};if(!effects.some(e=>e.selector===entry.selector&&e.properties===entry.properties))effects.push(entry);}break;}catch{}}}}
  for(const sheet of document.styleSheets){try{scan(sheet.cssRules);}catch{}}return effects;
 }
 function describe(element){
  const style=getComputedStyle(element),module=modules.find(m=>m.node===element||m.node.contains(element));
  return {parentSelector:element.parentElement&&element.parentElement!==document.body?selectorFor(element.parentElement):null,path:(()=>{const list=[];for(let n=element;n&&n!==document.body;n=n.parentElement)list.unshift({selector:selectorFor(n),label:n.getAttribute('data-editor-label')||n.id||n.tagName.toLowerCase()});return list.slice(-5);})(),editorLocked:element.dataset.editorLocked==='true',transformLocked:Boolean(element.closest('[data-editor-locked="true"]')),nativeHover:nativeHoverEffects(element),kind:kindOf(element),structure:structureFor(module),type:'delfines-select',selector:selectorFor(element),tag:element.tagName.toLowerCase(),label:(element.getAttribute('data-editor-label')||element.getAttribute('alt')||textOf(element)||element.getAttribute('aria-label')||element.tagName).slice(0,90),text:textOf(element),src:element.getAttribute('src'),alt:element.getAttribute('alt'),href:element.getAttribute('href'),moduleSelector:module?.selector,carouselSelector:element.closest('.custom-carousel')?'#'+element.closest('.custom-carousel').id:null,
   computed:Object.fromEntries(['font-size','font-family','font-weight','line-height','letter-spacing','text-align','color','background-color','background-image','border-radius','border-width','border-color','padding','margin-top','margin-bottom','width','height','object-fit','object-position','translate','rotate','display','gap','flex-direction','flex-wrap','justify-content','align-items','grid-template-columns','order','animation-name','animation-duration','animation-delay','animation-iteration-count','animation-timing-function','zoom'].map(key=>[key,style.getPropertyValue(key)]))};
 }
 let guideRectKey='';function followSelection(){if(selected?.isConnected){const r=selected.getBoundingClientRect(),key=[r.x,r.y,r.width,r.height].map(v=>v.toFixed(2)).join(',');if(key!==guideRectKey){guideRectKey=key;renderGuides();}}requestAnimationFrame(followSelection);}requestAnimationFrame(followSelection);
 function select(element){if(selected)selected.classList.remove('delfines-editor-selected');selected=element;selectedModule=modules.find(m=>m.node===element||m.node.contains(element))?.selector||selectedModule;element.classList.add('delfines-editor-selected');announce(describe(element));requestAnimationFrame(renderGuides);}
 function editable(target){if(!(target instanceof Element))return null;const icon=target.closest('svg');if(icon)return icon;return selectable(target)?target:target.parentElement;}
 document.addEventListener('click',event=>{if(suppressTransformClick){suppressTransformClick=false;event.preventDefault();event.stopImmediatePropagation();return;}if(event.target.closest('[data-editor-ui]'))return;if(mode==='interact'){const link=event.target.closest('a');if(link&&link.target!=='_blank'){const url=new URL(link.href,location.href);if(url.origin===siteOrigin&&url.pathname.endsWith('.html')){if(url.pathname.split('/').pop()!==page){event.preventDefault();announce({type:'delfines-navigate',page:url.pathname.split('/').pop()});}else if(url.hash){event.preventDefault();try{document.querySelector(url.hash)?.scrollIntoView({block:'start',behavior:'smooth'});}catch{}}}}return;}const element=editable(event.target);if(!element)return;event.preventDefault();event.stopImmediatePropagation();select(element);},true);
 let suppressTransformClick=false;
 let drag=null,aspectLock=false,scaleContent=false;
 document.addEventListener('pointerdown',event=>{if(event.target.closest('[data-editor-ui]'))return;if(mode!=='move')return;const element=editable(event.target);if(!element||element.closest('[data-editor-locked="true"]'))return;event.preventDefault();select(element);const values=getComputedStyle(element).translate.split(' ').map(parseFloat);drag={x:event.clientX,y:event.clientY,zoom:parseFloat(getComputedStyle(element).zoom)||1,baseX:values[0]||0,baseY:values[1]||0,selector:selectorFor(element)};announce({type:'delfines-drag-start'});},true);
 function writeGestureStyles(element,styles){
  let state=tracked.get(element);if(!state){state={styles:new Map(),attrs:new Map()};tracked.set(element,state);}
  for(const [key,value] of Object.entries(styles)){let prior=state.styles.get(key);if(!prior){const current=element.style.getPropertyValue(key);prior={base:current,priority:element.style.getPropertyPriority(key),last:current};state.styles.set(key,prior);}element.style.setProperty(key,value,'important');prior.last=element.style.getPropertyValue(key);prior.input=value;}
 }
 function anchorGesture(d,element){
  const current=getComputedStyle(element).translate.split(' ').map(parseFloat),tx=current[0]||0,ty=current[1]||0;
  const before=element.getBoundingClientRect();const desired=window.DelfinesResizeBox.anchor(d,before);
  // Medir la conversión real de coordenadas: contempla zoom, rotación y padres transformados.
  element.style.setProperty('translate',(tx+1)+'px '+ty+'px','important');const px=element.getBoundingClientRect();
  element.style.setProperty('translate',tx+'px '+(ty+1)+'px','important');const py=element.getBoundingClientRect();
  const a=px.left-before.left,b=px.top-before.top,c=py.left-before.left,e=py.top-before.top,det=a*e-b*c;
  let x=tx,y=ty;if(Math.abs(det)>.00001){const dx=desired.x-before.left,dy=desired.y-before.top;x+=(e*dx-c*dy)/det;y+=(-b*dx+a*dy)/det;}
  const styles={translate:x+'px '+y+'px'};writeGestureStyles(element,styles);return styles;
 }
 document.addEventListener('pointermove',event=>{
  if(transformDrag){event.preventDefault();const d=transformDrag,dx=event.clientX-d.x,dy=event.clientY-d.y;let styles=d.inline?{display:'inline-block'}:{};
   if(d.action==='rotate'){let angle=d.angle+(Math.atan2(event.clientY-d.cy,event.clientX-d.cx)-d.startAngle)*180/Math.PI;if(event.shiftKey)angle=Math.round(angle/15)*15;styles.rotate=Math.round(angle)+'deg';}
   else if(d.action==='move')styles.translate=Math.round(d.tx+dx/d.zoom)+'px '+Math.round(d.ty+dy/d.zoom)+'px';
   else{const grouped=scaleContent&&d.container;const size=window.DelfinesResizeBox(d,dx,dy,grouped||aspectLock||event.shiftKey);if(grouped){const zoom=Math.max(.1,Math.min(5,d.zoom*window.DelfinesResizeBox.factor(d,dx,dy)));styles={...styles,width:d.cssWidth+'px',height:d.cssHeight+'px','box-sizing':'border-box','max-width':'none','min-width':'0px','min-height':'0px','flex-shrink':'0',zoom:String(Math.round(zoom*1000)/1000),translate:Math.round(d.tx+(size.x-d.tx)/zoom)+'px '+Math.round(d.ty+(size.y-d.ty)/zoom)+'px'};}else styles={...styles,width:Math.round(size.width/d.zoom)+'px',height:Math.round(size.height/d.zoom)+'px','min-width':'0px','min-height':'0px','max-width':'none','max-height':'none','box-sizing':'border-box','flex-shrink':'0',translate:Math.round(size.x)+'px '+Math.round(size.y)+'px'};}
   writeGestureStyles(selected,styles);
   if(d.action.startsWith('resize'))Object.assign(styles,anchorGesture(d,selected));
   d.liveStyles=styles;announce({type:'delfines-transform',selector:d.selector,styles});requestAnimationFrame(renderGuides);return;
  }
  if(!drag)return;event.preventDefault();announce({type:'delfines-drag',selector:drag.selector,x:Math.round(drag.baseX+(event.clientX-drag.x)/drag.zoom),y:Math.round(drag.baseY+(event.clientY-drag.y)/drag.zoom)});},true);
 document.addEventListener('pointerup',()=>{if(transformDrag){document.documentElement.classList.remove('editor-transforming');transformDrag=null;suppressTransformClick=true;announce({type:'delfines-drag-end'});if(selected)announce(describe(selected));requestAnimationFrame(renderGuides);}if(drag){drag=null;announce({type:'delfines-drag-end'});}},true);
 function focusModule(selector,only){
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  const module=modules.find(m=>m.selector===selector);if(!module)return;
  selectedModule=selector;isolated=only;
  if(module.node.matches('dialog')){
   if(module.node.id==='plan-dialog'&&typeof window.openRoomPlan==='function')window.openRoomPlan(0);
   else if(module.node.id==='gallery-dialog'){if(typeof window.showPhoto==='function')window.showPhoto(0);module.node.showModal();}
   else module.node.showModal();
  }
  modules.forEach(item=>item.node.classList.toggle('delfines-hidden-module',Boolean(only&&item!==module&&!item.node.matches('dialog'))));
  document.body.classList.toggle('delfines-isolated',only);module.node.classList.add('delfines-module-focus');
  if(!module.node.matches('dialog'))module.node.scrollIntoView({block:'start',behavior:'instant'});
  select(module.node);
 }
 document.addEventListener('keydown',event=>{if(mode==='interact'||event.target.closest('input,textarea,select,[contenteditable]'))return;if((event.ctrlKey||event.metaKey)&&['z','y','d'].includes(event.key.toLowerCase())||['Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(event.key)){event.preventDefault();announce({type:'delfines-shortcut',key:event.key,ctrl:event.ctrlKey||event.metaKey,shift:event.shiftKey});}},true);
 window.DelfinesEditorBridge={
  page,
  autoAlign(action){
   if(!selected?.parentElement)return [];const parent=selected.parentElement;const nodes=[...parent.children].filter(node=>selectable(node)&&node.getBoundingClientRect().width&&node.getBoundingClientRect().height);const box=node=>node.getBoundingClientRect();
   const changes=[];const add=(node,dx,dy)=>{const style=getComputedStyle(node),zoom=parseFloat(style.zoom)||1,position=style.translate.split(' ').map(parseFloat);changes.push({selector:selectorFor(node),label:textOf(node).slice(0,90)||node.tagName,translate:((position[0]||0)+dx/zoom)+'px '+((position[1]||0)+dy/zoom)+'px'});};
   if(action==='center-parent'){const p=box(parent),r=box(selected);add(selected,p.left+p.width/2-r.left-r.width/2,p.top+p.height/2-r.top-r.height/2);return changes;}
   if(nodes.length<2)return [];const horizontal=action==='space-x';
   if(action==='row'||action==='column'){const centers=nodes.map(node=>{const r=box(node);return action==='row'?r.top+r.height/2:r.left+r.width/2;});const center=centers.reduce((a,b)=>a+b,0)/centers.length;nodes.forEach((node,index)=>add(node,action==='column'?center-centers[index]:0,action==='row'?center-centers[index]:0));}
   else{nodes.sort((a,b)=>horizontal?box(a).left-box(b).left:box(a).top-box(b).top);const first=box(nodes[0]),last=box(nodes.at(-1));const start=horizontal?first.left:first.top,end=horizontal?last.right:last.bottom;const total=nodes.reduce((sum,node)=>sum+(horizontal?box(node).width:box(node).height),0);const gap=(end-start-total)/(nodes.length-1);if(gap<0)return [];let cursor=start;for(const node of nodes){const r=box(node);add(node,horizontal?cursor-r.left:0,horizontal?0:cursor-r.top);cursor+=(horizontal?r.width:r.height)+gap;}}
   return changes;
  },
  alignResize(){const d=transformDrag;if(!d||!d.action.startsWith('resize')||!selected)return null;const rect=selected.getBoundingClientRect(),zoom=parseFloat(getComputedStyle(selected).zoom)||1;const current=getComputedStyle(selected).translate.split(' ').map(parseFloat);const value=window.DelfinesResizeBox.align(d,rect,zoom,current);const translate=value.x+'px '+value.y+'px';selected.style.setProperty('translate',translate,'important');return translate;},
  setScaleContent(value){scaleContent=Boolean(value);},
  setAspectLock(value){aspectLock=Boolean(value);},
  replayAnimation(){if(selected){selected.classList.add('editor-animation-active');const original=config.pages?.[page]?.[selectorFor(selected)]||config.pages?.['*']?.[selectorFor(selected)];if(original?.styles?.['animation-name'])selected.style.setProperty('animation-name',original.styles['animation-name'],'important');}if(selected)selected.getAnimations().forEach(animation=>{animation.currentTime=0;animation.play();});},
  selectSelector(value){try{const element=document.querySelector(value);if(element&&selectable(element)){select(element);element.scrollIntoView({block:'nearest'});}}catch{}},
  apply(value){config=value;apply();requestAnimationFrame(renderGuides);},
  modules(){return modules.map(({selector,label})=>({selector,label}));},
  focusModule,
  setMode(value){mode=value;document.body.dataset.editorMode=value;requestAnimationFrame(renderGuides);},
  refreshSelection(){if(selected?.isConnected)announce(describe(selected));},
  isolate(value){if(selectedModule)focusModule(selectedModule,value);},
  clearSelection(){selected?.classList.remove('delfines-editor-selected');selected=null;guideLayer.replaceChildren();}
 };
 const guideLayer=document.createElement('div');guideLayer.dataset.editorUi='guides';guideLayer.setAttribute('aria-hidden','true');guideLayer.className='editor-guides';document.body.append(guideLayer);
 function renderGuides(){
  guideLayer.replaceChildren();if(!selected?.isConnected||mode==='interact')return;
  const box=selected.getBoundingClientRect();if(!box.width||!box.height||selected.closest('[data-editor-locked="true"]'))return;
  const handleSize=Math.max(12,Math.min(28,Math.round(Math.min(box.width,box.height)*.42)));
  const compact=box.width<90||box.height<48,spacing=handleSize+5;
  const toolbarWidth=spacing*2,centerX=Math.max(toolbarWidth/2+handleSize/2,Math.min(innerWidth-toolbarWidth/2-handleSize/2,box.left+box.width/2));
  const toolbarY=box.top>handleSize+12?box.top-handleSize/2-7:box.bottom+handleSize/2+7;
  const handles=compact?[['move',centerX-spacing,toolbarY,'Mover'],['rotate',centerX,toolbarY,'Rotar'],['resize-se',centerX+spacing,toolbarY,'Cambiar tamaño']]:[['move',box.left+box.width/2,box.top+handleSize+10,'Mover'],['rotate',box.left+box.width/2,Math.max(14,box.top-24),'Rotar'],['resize-nw',box.left,box.top,'Tamaño desde arriba izquierda'],['resize-n',box.left+box.width/2,box.top,'Tamaño desde arriba'],['resize-ne',box.right,box.top,'Tamaño desde arriba derecha'],['resize-e',box.right,box.top+box.height/2,'Tamaño desde la derecha'],['resize-se',box.right,box.bottom,'Cambiar tamaño'],['resize-s',box.left+box.width/2,box.bottom,'Tamaño desde abajo'],['resize-sw',box.left,box.bottom,'Tamaño desde abajo izquierda'],['resize-w',box.left,box.top+box.height/2,'Tamaño desde la izquierda']];
  for(const [action,x,y,label] of handles){
   const handle=document.createElement('button');handle.type='button';handle.className='editor-transform-handle '+action;handle.title=label;handle.setAttribute('aria-label',label);handle.textContent={move:'✥',rotate:'↻'}[action]||(compact?'↘':'');const controlSize=action.startsWith('resize')&&!compact?Math.min(16,handleSize):handleSize;Object.assign(handle.style,{left:x+'px',top:y+'px',width:controlSize+'px',height:controlSize+'px',fontSize:Math.max(10,Math.round(handleSize*.7))+'px'});
   handle.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();const box=selected.getBoundingClientRect();const computed=getComputedStyle(selected);const translate=computed.translate.split(' ').map(parseFloat);document.documentElement.classList.add('editor-transforming');transformDrag={boxWidth:box.width,boxHeight:box.height,left:box.left,top:box.top,right:box.right,bottom:box.bottom,action,x:event.clientX,y:event.clientY,cx:box.left+box.width/2,cy:box.top+box.height/2,startAngle:Math.atan2(event.clientY-(box.top+box.height/2),event.clientX-(box.left+box.width/2)),cssWidth:parseFloat(computed.width)||selected.offsetWidth,cssHeight:parseFloat(computed.height)||selected.offsetHeight,container:kindOf(selected)==='container',zoom:parseFloat(computed.zoom)||1,inline:computed.display==='inline',angle:parseFloat(computed.rotate)||0,width:(parseFloat(computed.width)||selected.offsetWidth)*(parseFloat(computed.zoom)||1),height:(parseFloat(computed.height)||selected.offsetHeight)*(parseFloat(computed.zoom)||1),tx:translate[0]||0,ty:translate[1]||0,selector:selectorFor(selected)};document.documentElement.setPointerCapture(event.pointerId);announce({type:'delfines-drag-start'});});guideLayer.append(handle);
  }
  const siblings=[...selected.parentElement.children].filter(e=>e!==selected&&selectable(e)).map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.height);
  const line=(x,y,w,h,label='')=>{const el=document.createElement('div');el.className='editor-guide-line';Object.assign(el.style,{left:x+'px',top:y+'px',width:Math.max(w,1)+'px',height:Math.max(h,1)+'px'});if(label){const tag=document.createElement('span');tag.textContent=label;el.append(tag);}guideLayer.append(el);};
  let count=0;
  for(const r of siblings){
   for(const [a,b] of [[box.left,r.left],[(box.left+box.right)/2,(r.left+r.right)/2],[box.right,r.right]])if(Math.abs(a-b)<=3&&count++<8)line(a,Math.min(box.top,r.top),1,Math.max(box.bottom,r.bottom)-Math.min(box.top,r.top));
   for(const [a,b] of [[box.top,r.top],[(box.top+box.bottom)/2,(r.top+r.bottom)/2],[box.bottom,r.bottom]])if(Math.abs(a-b)<=3&&count++<8)line(Math.min(box.left,r.left),a,Math.max(box.right,r.right)-Math.min(box.left,r.left),1);
  }
  const row=[box,...siblings.filter(r=>Math.abs((r.top+r.bottom-box.top-box.bottom)/2)<Math.min(box.height,r.height)/2)].sort((a,b)=>a.left-b.left);
  const column=[box,...siblings.filter(r=>Math.abs((r.left+r.right-box.left-box.right)/2)<Math.min(box.width,r.width)/2)].sort((a,b)=>a.top-b.top);
  const horizontal=row.length>1,items=horizontal?row:column;
  const gaps=items.slice(1).map((r,i)=>horizontal?r.left-items[i].right:r.top-items[i].bottom);
  const positive=gaps.filter(g=>g>=0),equal=positive.length>1&&Math.max(...positive)-Math.min(...positive)<=1;
  gaps.forEach((gap,i)=>{if(gap<=0||gap>250)return;const a=items[i],b=items[i+1];if(horizontal)line(a.right,Math.max(a.top,b.top)+Math.min(a.height,b.height)/2,gap,1,(equal?'Igual · ':'')+Math.round(gap)+' px');else line(Math.max(a.left,b.left)+Math.min(a.width,b.width)/2,a.bottom,1,gap,(equal?'Igual · ':'')+Math.round(gap)+' px');});
 }
 addEventListener('scroll',()=>requestAnimationFrame(renderGuides),true);addEventListener('resize',()=>requestAnimationFrame(renderGuides));
 document.body.dataset.editorMode='edit';
 announce({type:'delfines-preview-ready',page,modules:modules.map(({selector,label})=>({selector,label}))});
})();
