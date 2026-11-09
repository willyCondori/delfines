(() => {
 'use strict';
 sessionStorage.removeItem('delfines-admin-token'); // Retira sesiones persistidas por versiones anteriores.
 const $=selector=>document.querySelector(selector),clone=value=>JSON.parse(JSON.stringify(value));
 const frame=$('#site-preview'),pageSelect=$('#page-select');
 let token='',saved={version:1,revision:0,pages:{}},draft=clone(saved),selected=null,modules=[],undo=[],redo=[],dirty=false,mode='edit',page='index.html',previewLoadId=0,toastTimer,frameTimer,historyField='',dragging=false;
 const initialPage=new URLSearchParams(location.search).get('page');if([...pageSelect.options].some(o=>o.value===initialPage))page=initialPage;pageSelect.value=page;
 function status(message,error=false){const box=$('#editor-status');box.textContent=message;box.classList.toggle('error-status',error);box.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.classList.remove('visible'),4500);}
 async function api(path,options={}){
  const headers={'Content-Type':'application/json','X-Delfines-Admin':'1'};
  const response=await fetch(path,{credentials:'same-origin',...options,headers:{...headers,...options.headers}});
  if(!response.ok){let message='No se pudo completar la operación.';try{message=(await response.json()).error||message;}catch{}if(response.status===401&&path!=='/api/admin/login'&&path!=='/api/admin/password'){token='';sessionStorage.removeItem('delfines-admin-token');showLogin();}throw new Error(message);}
  return response;
 }
 function showLogin(){ $('#login-view').hidden=false;$('#editor-view').hidden=true; }
 function updateState(){
  if(document.activeElement!==$('#page-height'))$('#page-height').value=parseFloat(draft.pages[page]?.main?.styles?.['min-height'])||'';
  dirty=JSON.stringify(draft.pages)!==JSON.stringify(saved.pages);
  $('#save-state').textContent=dirty?'Cambios sin publicar':'Guardado · revisión '+(saved.revision||0);
  $('#publish').disabled=!dirty;$('#undo').disabled=!undo.length;$('#redo').disabled=!redo.length;
 }
 function checkpoint(){undo.push(clone(draft));if(undo.length>35)undo.shift();redo=[];updateState();}
 function refreshPreview(){try{frame.contentWindow.DelfinesEditorBridge?.apply(draft);}catch{}updateState();}
 function ensureRecord(selector=selected?.selector,label=selected?.label){
  draft.pages[page]??={};draft.pages[page][selector]??=clone(draft.pages['*']?.[selector]||{label:label||selector,styles:{}});draft.pages[page][selector].styles??={};return draft.pages[page][selector];
 }
 function mutate(fn,key='',useHistory=true){if(!selected)return;if(useHistory&&(!key||historyField!==key)){checkpoint();historyField=key;}fn(ensureRecord());refreshPreview();}
 function style(key,value,historyKey=''){mutate(record=>{if(value===''||value==null)delete record.styles[key];else record.styles[key]=String(value);},historyKey);}
 function bridge(){try{return frame.contentWindow.DelfinesEditorBridge;}catch{return null;}}
 function setModules(list){frame.style.visibility='visible';$('#preview-stage').setAttribute('aria-busy','false');modules=list;$('#module-count').textContent=list.length;const root=$('#module-list');root.replaceChildren();list.forEach((module,index)=>{const button=document.createElement('button');button.type='button';const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');const label=document.createElement('span');label.textContent=module.label;button.append(number,label);button.dataset.module=module.selector;button.addEventListener('click',()=>{root.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===button));bridge()?.focusModule(module.selector,$('#isolate-module').checked);});root.append(button);});}
 async function loadPage(next){
  if(![...pageSelect.options].some(option=>option.value===next))return;
  page=next;pageSelect.value=page;$('#page-height').value=parseFloat(draft.pages[page]?.main?.styles?.['min-height'])||'';selected=null;$('#module-list').replaceChildren();$('#module-count').textContent='…';frame.style.visibility='hidden';$('#preview-stage').setAttribute('aria-busy','true');historyField='';$('#inspector-form').hidden=true;$('#inspector-empty').hidden=false;$('#selected-label').textContent='Elige un elemento';$('#selected-type').textContent='';
  $('#preview-page-label').textContent=pageSelect.selectedOptions[0].textContent;$('#page-reference').textContent='Enlace: '+(page==='index.html'?page:'pages/'+page);
  clearTimeout(frameTimer);const loadId=++previewLoadId;requestAnimationFrame(sizePreview);
  try{
   const pagePath=next==='index.html'?next:'pages/'+next;
   const response=await fetch(pagePath+'?editor-source='+Date.now(),{cache:'no-store'});
   if(!response.ok)throw new Error('No se pudo cargar esta página.');
   let source=await response.text();if(loadId!==previewLoadId)return;
   const base=new URL('./',location.href).href;
   const bootstrap='<base href="'+base+'"><script src="scripts/editor/preview.js"></script>';
   source=source.replace('<html ', '<html data-editor-preview="true" data-preview-page="'+next+'" ');
   source=source.replace(/<base\b[^>]*>/gi,'').replace(/<head([^>]*)>/i,'<head$1>'+bootstrap);
   frame.srcdoc=source;
  }catch(error){status('No se pudo cargar la vista previa. '+error.message,true);}
 }
 function sizePreview(){
  const dimensions=window.DelfinesViewport({device:$('#device-select').value,windowWidth:innerWidth,windowHeight:innerHeight,customWidth:$('#viewport-width').value,customHeight:$('#viewport-height').value,available:$('#preview-scroll').clientWidth-42,zoom:$('#preview-zoom').value});
  const {width,height,scale}=dimensions;
  if(document.activeElement!==$('#viewport-width'))$('#viewport-width').value=width;
  if(document.activeElement!==$('#viewport-height'))$('#viewport-height').value=height;
  frame.style.width=width+'px';frame.style.height=height+'px';frame.style.transform='scale('+scale+')';
  $('#preview-stage').style.width=Math.ceil(width*scale)+'px';$('#preview-stage').style.height=Math.ceil(height*scale)+'px';$('#preview-size').textContent=width+' × '+height+' px · '+Math.round(scale*100)+' %';
 }
 for(const id of ['viewport-width','viewport-height'])$('#'+id).addEventListener('change',()=>{$('#device-select').value='custom';sizePreview();});
 $('#preview-zoom').addEventListener('change',sizePreview);
 addEventListener('resize',sizePreview);
 function hex(value,fallback='#221958'){const match=String(value||'').match(/\d+/g);if(!match||match.length<3||value==='rgba(0, 0, 0, 0)')return fallback;return '#'+match.slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join('');}
 $('#scale-content').addEventListener('change',event=>bridge()?.setScaleContent(event.target.checked));
 $('#lock-aspect').addEventListener('change',event=>bridge()?.setAspectLock(event.target.checked));
 $('#element-tree').addEventListener('change',event=>bridge()?.selectSelector(event.target.value));
 function filterLayers(){const query=$('#layer-search').value.trim().toLocaleLowerCase(),kind=$('#layer-filter').value;for(const option of $('#element-tree').options)option.hidden=!option.selected&&((query&&!option.textContent.toLocaleLowerCase().includes(query))||(kind&&option.dataset.kind!==kind));}
 $('#layer-search').addEventListener('input',filterLayers);$('#layer-filter').addEventListener('change',filterLayers);
 $('#select-parent').addEventListener('click',()=>{if(selected?.parentSelector)bridge()?.selectSelector(selected.parentSelector);});
 $('#lock-component').addEventListener('change',()=>{mutate(record=>{record.editorLocked=$('#lock-component').checked;});bridge()?.refreshSelection();});
 $('#duplicate-component').addEventListener('click',()=>{
  if(!selected||!['text','image','button'].includes(selected.kind)||(selected.kind==='image'&&selected.tag!=='img'))return;
  const original=clone(selected),id='#editor-component-'+crypto.randomUUID(),tag=original.kind==='image'?'img':original.kind==='button'?'a':'p';
  const current=draft.pages[page]?.[original.selector]||draft.pages['*']?.[original.selector]||{};
  checkpoint();const record={label:'Copia de '+original.label,component:{tag,parent:original.parentSelector||'main'},styles:{'max-width':'100%','box-sizing':'border-box',display:tag==='a'?'inline-block':'block','margin-top':'12px','margin-bottom':'12px'},text:original.text};
  for(const key of ['font-family','font-size','font-weight','line-height','color','background-color','border-radius','padding','width','object-fit'])if(original.computed[key]&&original.computed[key]!=='auto')record.styles[key]=original.computed[key];
  Object.assign(record.styles,current.styles||{});delete record.styles.display;record.styles.display=tag==='a'?'inline-block':'block';delete record.styles.translate;delete record.styles.rotate;delete record.styles.zoom;
  if(tag==='img'){delete record.text;record.src=original.src;record.alt=original.alt||'';record.styles.height=original.computed.height;}
  if(tag==='a')record.href=original.href||'#contacto';
  draft.pages[page]??={};draft.pages[page][id]=record;refreshPreview();setTimeout(()=>bridge()?.selectSelector(id),100);status('Pieza duplicada en el borrador.');
 });
 function shortcut(data){
  if(data.ctrl&&data.key.toLowerCase()==='z'){$(data.shift?'#redo':'#undo').click();return;}
  if(data.ctrl&&data.key.toLowerCase()==='y'){$('#redo').click();return;}
  if(data.ctrl&&data.key.toLowerCase()==='d'){$('#duplicate-component').click();return;}
  if(data.key==='Delete'){$('#delete-component').click();return;}
  if(data.key==='Escape'){bridge()?.setMode('edit');return;}
  if(!selected||selected.transformLocked||!data.key.startsWith('Arrow'))return;
  const position=(selected.computed.translate||'0 0').split(' ').map(parseFloat),step=data.shift?10:1;
  const x=(position[0]||0)+(data.key==='ArrowRight'?step:data.key==='ArrowLeft'?-step:0),y=(position[1]||0)+(data.key==='ArrowDown'?step:data.key==='ArrowUp'?-step:0);
  style('translate',x+'px '+y+'px','keyboard-move');bridge()?.refreshSelection();
 }
 document.addEventListener('keydown',event=>{if(event.target.closest('input,textarea,select,[contenteditable]')||document.querySelector('dialog[open]'))return;if((event.ctrlKey||event.metaKey)&&['z','y','d'].includes(event.key.toLowerCase())||['Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();shortcut({key:event.key,ctrl:event.ctrlKey||event.metaKey,shift:event.shiftKey});}});
 function fillInspector(info){
  selected=info;historyField='';$('#inspector-empty').hidden=true;$('#inspector-form').hidden=false;
  $('#edit-carousel').hidden=!info.carouselSelector;
  $('#selected-label').textContent=info.label;$('#selected-type').textContent=({image:'Imagen',text:'Texto',button:'Botón o enlace',container:'Contenedor / tarjeta',icon:'Icono'}[info.kind]||info.tag)+' · '+info.tag;
  const tree=$('#element-tree');tree.replaceChildren();for(const node of info.structure||[]){const option=document.createElement('option');option.value=node.selector;option.textContent='  '.repeat(node.depth)+node.tag+' · '+node.label;option.selected=node.selector===info.selector;option.dataset.kind=node.kind;tree.append(option);}
  $('#lock-component').checked=Boolean(info.editorLocked);for(const id of ['element-width','element-height','position-x','position-y','element-rotate','scale-content','lock-aspect'])$('#'+id).disabled=Boolean(info.transformLocked);$('#select-parent').disabled=!info.parentSelector;$('#duplicate-component').disabled=!['text','image','button'].includes(info.kind)||info.tag==='svg'||(info.kind==='image'&&info.tag!=='img');const crumbs=$('#selection-path');crumbs.replaceChildren();for(const item of info.path||[]){const button=document.createElement('button');button.type='button';button.textContent=item.label;button.title=item.selector;button.addEventListener('click',()=>bridge()?.selectSelector(item.selector));crumbs.append(button);}filterLayers();
  const values=info.computed,record=draft.pages[page]?.[info.selector]||draft.pages['*']?.[info.selector]||{},styles=record.styles||{},image=info.tag==='img';
  $('#layout-settings').hidden=info.kind!=='container';$('#scale-content-label').hidden=info.kind!=='container';$('#image-settings').hidden=!image;$('#text-settings').hidden=!['text','button'].includes(info.kind);$('#link-settings').hidden=info.tag!=='a';
  const textEditable=['text','button'].includes(info.kind);
  $('#appearance-settings').querySelector('summary').textContent=info.kind==='text'?'Color y alineación del texto':image?'Forma y borde de la imagen':'Fondo, forma y borde';
  const visibility=(selector,show)=>{const node=$(selector);node.hidden=!show;const label=document.querySelector('label[for="'+node.id+'"]');if(label)label.hidden=!show;};
  visibility('#text-color',textEditable||info.kind==='icon');visibility('#alignment',textEditable);
  visibility('#background-color',!image);visibility('#remove-background',!image);$('#background-status').hidden=image;visibility('#gradient-enabled',!image);
  $('#gradient-enabled').closest('label').hidden=image;
  $('#appearance-settings').hidden=info.kind==='text';
  if(info.kind==='text'){$('#appearance-settings').hidden=false;for(const node of $('#appearance-settings').querySelectorAll('.range-row,.shape-presets,#border-width,#border-color,label[for="border-radius"],label[for="border-width"]'))node.hidden=true;}else{for(const node of $('#appearance-settings').querySelectorAll('.range-row,.shape-presets,#border-width,#border-color,label[for="border-radius"],label[for="border-width"]'))node.hidden=false;}
  $('#content-text').hidden=!textEditable;document.querySelector('label[for="content-text"]').hidden=!textEditable;
  $('#content-text').value=record.text??info.text;
  $('#animation-trigger').value=record.animationTrigger||'load';$('#native-hover-info').replaceChildren();for(const effect of info.nativeHover||[]){const note=document.createElement('p');note.textContent=effect.label+' · efecto original al pasar el ratón: '+effect.properties;$('#native-hover-info').append(note);}if(!info.nativeHover?.length)$('#native-hover-info').textContent='No se detectó un efecto hover original en este elemento ni en sus contenedores.';
  const textGradient=styles['background-clip']==='text'&&Boolean(styles['background-image']?.includes('gradient'));
  $('#text-gradient-enabled').checked=textGradient;$('#text-gradient-controls').hidden=!textGradient;
  if(textGradient){const colors=styles['background-image'].match(/#[0-9a-f]{6}/gi)||[];$('#text-gradient-start').value=colors[0]||'#fab802';$('#text-gradient-end').value=colors[1]||'#ffffff';$('#text-gradient-angle').value=parseFloat(styles['background-image'].match(/([\d.]+)deg/)?.[1])||0;}

  $('#image-src').value=record.src??info.src??'';$('#image-alt').value=record.alt??info.alt??'';if(record.src||info.src)$('#inspector-image').src=record.src??info.src;else $('#inspector-image').removeAttribute('src');
  $('#link-href').value=record.href??info.href??'';
  for(const input of document.querySelectorAll('[data-style]')){
   const key=input.dataset.style,value=styles[key]??values[key]??'';
   if(input.type==='color')input.value=hex(value);
   else if(input.type==='number'){
    let number=parseFloat(value);
    if(key==='line-height'&&!styles[key])number=parseFloat(values['line-height'])/parseFloat(values['font-size']);
    input.value=Number.isFinite(number)?Math.round(number*100)/100:'';
   }else if(key==='font-family'){
    input.value=styles[key]||'';
   }else input.value=value;
  }
  $('#background-status').textContent=styles['background-color']==='transparent'?'Fondo transparente':'';
  $('#background-color').value=hex(styles['background-color']||values['background-color'],'#ffffff');
  $('#gradient-enabled').checked=!textGradient&&Boolean(styles['background-image']?.includes('gradient'));$('#gradient-controls').hidden=image||!$('#gradient-enabled').checked;
  $('#alignment').value=styles['text-align']||values['text-align']||'left';
  $('#radius-range').value=Math.min(100,parseFloat(styles['border-radius']||values['border-radius'])||0);
  const groupedSize=info.kind==='container'&&$('#scale-content').checked;const currentZoom=parseFloat(values.zoom)||1;const width=groupedSize?(parseFloat(values.width)*currentZoom)+'px':styles.width||values.width;$('#element-width').value=parseFloat(width)||'';$('#width-unit').value=width==='auto'?'auto':width?.includes('%')?'%':'px';
  $('#element-height').value=groupedSize?Math.round(parseFloat(values.height)*currentZoom):styles.height?parseFloat(styles.height)||'':'';
  const translate=(styles.translate||values.translate||'0 0').split(' ').map(parseFloat);$('#position-x').value=translate[0]||0;$('#position-y').value=translate[1]||0;
  document.querySelectorAll('[data-module]').forEach(button=>button.classList.toggle('selected',button.dataset.module===info.moduleSelector));
 }
 async function refreshPages(){const response=await api('/api/admin/pages');const pages=await response.json();pageSelect.replaceChildren();for(const item of pages){const option=document.createElement('option');option.value=item.file;option.textContent=item.title;pageSelect.append(option);}if(pages.some(p=>p.file===page))pageSelect.value=page;return pages;}
 async function enter(){
  await refreshPages();const requested=new URLSearchParams(location.search).get('page');if(requested&&[...pageSelect.options].some(o=>o.value===requested))page=requested;

  const response=await api('/api/admin/config');saved=await response.json();draft=clone(saved);undo=[];redo=[];
  $('#login-view').hidden=true;$('#editor-view').hidden=false;updateState();loadPage(page);requestAnimationFrame(sizePreview);
 }
 $('#login-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;$('#login-error').textContent='';try{const response=await api('/api/admin/login',{method:'POST',body:JSON.stringify({password:$('#admin-password').value})});await response.json();$('#admin-password').value='';await enter();}catch(error){$('#login-error').textContent=error.message;}finally{button.disabled=false;}});
 frame.addEventListener('load',()=>{const client=bridge();if(client)clearTimeout(frameTimer);if(!client||client.page!==page)return;client.apply(draft);client.setMode(mode);client.setAspectLock($('#lock-aspect').checked);client.setScaleContent($('#scale-content').checked);setModules(client.modules());sizePreview();});
 addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
  const data=event.data;if(!data?.type)return;
  if(data.type==='delfines-shortcut'){shortcut(data);return;}
  if(data.type==='delfines-select')fillInspector(data);
  else if(data.type==='delfines-preview-ready'&&data.page===page){setModules(data.modules);bridge()?.apply(draft);bridge()?.setMode(mode);}
  else if(data.type==='delfines-navigate')loadPage(data.page);
  else if(data.type==='delfines-drag-start'){checkpoint();dragging=true;}
  else if(data.type==='delfines-drag'&&dragging){if(!selected)return;const record=ensureRecord(data.selector,selected.label);if(selected.computed.display==='inline')record.styles.display='inline-block';record.styles.translate=data.x+'px '+data.y+'px';$('#position-x').value=data.x;$('#position-y').value=data.y;refreshPreview();}
  else if(data.type==='delfines-transform'&&dragging){if(!selected)return;const record=ensureRecord(data.selector,selected.label);Object.assign(record.styles,data.styles);refreshPreview();}
  else if(data.type==='delfines-drag-end'){dragging=false;historyField='';}
 });
 pageSelect.addEventListener('change',()=>loadPage(pageSelect.value));
 $('#device-select').addEventListener('change',sizePreview);new ResizeObserver(sizePreview).observe($('#preview-scroll'));
 $('#refresh-preview').addEventListener('click',()=>loadPage(page));
 $('#isolate-module').addEventListener('change',event=>bridge()?.isolate(event.target.checked));
 document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>{const active=b===button;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});bridge()?.setMode(mode);$('#preview-tip').textContent=mode==='interact'?'Prueba enlaces, galerías y modales. Cambia a Editar para seleccionar elementos.':mode==='move'?'Arrastra el elemento dentro de la vista previa. También puedes ajustar su posición con números.':'Los cambios se muestran aquí antes de publicarse.';}));
 $('#inspector-form').addEventListener('submit',event=>event.preventDefault());
 $('#inspector-form').addEventListener('focusin',()=>{historyField='';});
 $('#content-text').addEventListener('input',event=>mutate(record=>{record.text=event.target.value;},'text'));
 document.querySelectorAll('[data-style]').forEach(input=>input.addEventListener('input',()=>{
  let value=input.value;if(input.dataset.unit&&value!=='')value+=input.dataset.unit;
  const key=input.dataset.style;
  mutate(record=>{if(value==='')delete record.styles[key];else record.styles[key]=value;if(key==='animation-name'&&value!=='none'){if(selected.computed.display==='inline')record.styles.display='inline-block';record.styles['animation-duration']||='1s';record.styles['animation-timing-function']||='ease-in-out';record.styles['animation-iteration-count']||='1';record.styles['animation-fill-mode']='backwards';}if(key==='border-width'&&parseFloat(value)>0)record.styles['border-style']='solid';},input.id);
  if(key==='border-radius')$('#radius-range').value=Math.min(100,parseFloat(value)||0);
 }));
 document.querySelectorAll('[data-auto-align]').forEach(button=>button.addEventListener('click',()=>{const updates=bridge()?.autoAlign(button.dataset.autoAlign)||[];if(!updates.length){status('Selecciona un elemento con vecinos visibles para alinear.',true);return;}checkpoint();for(const item of updates)ensureRecord(item.selector,item.label).styles.translate=item.translate;refreshPreview();bridge()?.refreshSelection();status('Alineación aplicada al borrador.');}));
 $('#create-page').addEventListener('click',()=>{$('#page-form').reset();$('#page-error').textContent='';$('#page-dialog').showModal();});$('#page-cancel').addEventListener('click',()=>$('#page-dialog').close());
 $('#new-page-title').addEventListener('input',event=>{$('#new-page-slug').value=event.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,61);});
 $('#page-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.target.querySelector('[type=submit]');button.disabled=true;try{const response=await api('/api/admin/pages',{method:'POST',body:JSON.stringify({title:$('#new-page-title').value,slug:$('#new-page-slug').value,addToMenu:$('#new-page-menu').checked})});const result=await response.json();await refreshPages();$('#page-dialog').close();loadPage(result.file);status('Página creada. Enlace para botones: '+result.href);}catch(error){$('#page-error').textContent=error.message;}finally{button.disabled=false;}});
 let libraryAppend=false;
 async function addGalleryImages(sources){if(!selected||selected.tag!=='img')return;const target=clone(selected),selector=target.carouselSelector||'#editor-carousel-'+crypto.randomUUID();const existing=draft.pages[page]?.[selector]||draft.pages['*']?.[selector];const slides=existing?.carousel?.slides?clone(existing.carousel.slides):[{src:target.src,caption:target.alt||''}];for(const src of sources)slides.push({src,caption:''});if(slides.length>20){status('El carrusel admite hasta 20 imágenes.',true);return;}checkpoint();draft.pages[page]??={};draft.pages[page][selector]={...(existing||{}),label:existing?.label||'Carrusel de imágenes',styles:existing?.styles||{},carousel:{...(existing?.carousel||{}),title:existing?.carousel?.title||target.alt||'Carrusel de imágenes',target:existing?.carousel?.target||target.selector,after:'',slides,autoplay:existing?.carousel?.autoplay||false,interval:existing?.carousel?.interval||5}};loadPage(page);updateState();status('Imágenes agregadas al carrusel. Usa Interactuar para recorrerlas.');}
 async function openLibrary(append=false){libraryAppend=append;$('#media-hint').textContent=append?'Elige una imagen para agregarla al carrusel de la foto seleccionada.':'Elige una imagen para reemplazar la foto seleccionada.';$('#media-grid').replaceChildren();$('#media-error').textContent='';$('#media-dialog').showModal();try{const response=await api('/api/admin/media');for(const item of await response.json()){const button=document.createElement('button');button.type='button';const image=document.createElement('img');image.src=item.src;image.alt=item.name;image.loading='lazy';const label=document.createElement('span');label.textContent=item.name;button.append(image,label);button.addEventListener('click',()=>{$('#media-dialog').close();if(libraryAppend)addGalleryImages([item.src]);else{mutate(record=>{record.src=item.src;},'library-image');$('#image-src').value=item.src;$('#inspector-image').src=item.src;}});$('#media-grid').append(button);}}catch(error){$('#media-error').textContent=error.message;}}
 $('#media-library').addEventListener('click',()=>openLibrary(false));$('#media-cancel').addEventListener('click',()=>$('#media-dialog').close());
 $('#gallery-upload').addEventListener('change',async event=>{const files=[...event.target.files];if(!files.length||!selected)return;try{const sources=[];for(const file of files){if(file.size>8000000)throw new Error('Cada imagen debe pesar menos de 8 MB.');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});const response=await api('/api/admin/upload',{method:'POST',body:JSON.stringify({data})});sources.push((await response.json()).src);}await addGalleryImages(sources);}catch(error){status(error.message,true);}finally{event.target.value='';}});
 $('#apply-all-pages').addEventListener('click',()=>{if(!selected)return;const existing=draft.pages[page]?.[selected.selector]||draft.pages['*']?.[selected.selector];if(!existing){status('Primero modifica este elemento para tener cambios que aplicar.',true);return;}checkpoint();draft.pages['*']??={};draft.pages['*'][selected.selector]=clone(existing);for(const records of Object.values(draft.pages))if(records!==draft.pages['*'])delete records[selected.selector];refreshPreview();status('Ajustes aplicados a todas las páginas que tengan este elemento. Guarda para publicarlos.');});
 const carouselDialog=$('#carousel-dialog');let carouselEditing=null,carouselAfter='',carouselTarget='';
 function openCarousel(selector=null){carouselEditing=selector;const data=selector?(draft.pages[page]?.[selector]||draft.pages['*']?.[selector])?.carousel:null;carouselTarget=data?.target||'';carouselAfter=data?.after||selected?.moduleSelector||'';$('#carousel-form').reset();$('#carousel-name').value=data?.title||'Momentos en Delfines';$('#carousel-slides').value=data?data.slides.map(s=>s.src+' | '+s.caption).join('\n'):'assets/hero.webp | Una cálida bienvenida\nassets/habitacion.webp | Tu descanso';$('#carousel-auto').checked=Boolean(data?.autoplay);$('#carousel-interval').value=data?.interval||5;$('#carousel-title').textContent=data?'Editar carrusel':'Crear carrusel';$('#carousel-delete').hidden=!data;$('#carousel-error').textContent='';carouselDialog.showModal();}
 $('#create-carousel').addEventListener('click',()=>openLibrary(true));$('#edit-carousel').addEventListener('click',()=>openCarousel(selected?.carouselSelector));$('#carousel-cancel').addEventListener('click',()=>carouselDialog.close());
 $('#carousel-form').addEventListener('submit',event=>{event.preventDefault();const slides=$('#carousel-slides').value.split('\n').filter(line=>line.trim()).map(line=>{const [src,...caption]=line.split('|');return{src:src.trim(),caption:caption.join('|').trim()};});if(slides.length<2||slides.length>20){$('#carousel-error').textContent='Incluye de 2 a 20 imágenes.';return;}for(const slide of slides){try{const url=new URL(slide.src,location.href);if(!['http:','https:'].includes(url.protocol)||slide.src.startsWith('//')||/[\\\x00-\x1f]/.test(slide.src))throw 0;}catch{$('#carousel-error').textContent='Revisa las rutas de las imágenes.';return;}}checkpoint();const selector=carouselEditing||'#editor-carousel-'+crypto.randomUUID();draft.pages[page]??={};draft.pages[page][selector]={...(draft.pages[page][selector]||{}),label:$('#carousel-name').value,styles:draft.pages[page]?.[selector]?.styles||{},carousel:{title:$('#carousel-name').value,after:carouselAfter,target:carouselTarget,slides,autoplay:$('#carousel-auto').checked,interval:Number($('#carousel-interval').value)}};carouselDialog.close();loadPage(page);updateState();status('Carrusel listo en el borrador. Usa Interactuar para recorrerlo.');});
 $('#carousel-delete').addEventListener('click',()=>{if(!carouselEditing)return;checkpoint();delete draft.pages[page]?.[carouselEditing];delete draft.pages['*']?.[carouselEditing];carouselDialog.close();loadPage(page);updateState();});
 $('#animation-trigger').addEventListener('change',event=>mutate(record=>{record.animationTrigger=event.target.value;},'animation-trigger'));
 $('#replay-animation').addEventListener('click',()=>bridge()?.replayAnimation());
 $('#element-animation').addEventListener('change',()=>{bridge()?.refreshSelection();});
 $('#radius-range').addEventListener('input',event=>{$('#border-radius').value=event.target.value;style('border-radius',event.target.value+'px','radius');});
 document.querySelectorAll('[data-radius]').forEach(button=>button.addEventListener('click',()=>{style('border-radius',button.dataset.radius);$('#border-radius').value=parseFloat(button.dataset.radius);$('#radius-range').value=Math.min(100,parseFloat(button.dataset.radius));}));
 function textGradient(){
  mutate(record=>{
   if($('#text-gradient-enabled').checked){record.styles['background-image']='linear-gradient('+($('#text-gradient-angle').value||90)+'deg, '+$('#text-gradient-start').value+', '+$('#text-gradient-end').value+')';record.styles['background-clip']='text';record.styles['-webkit-background-clip']='text';record.styles['-webkit-text-fill-color']='transparent';}
   else{delete record.styles['background-clip'];delete record.styles['-webkit-background-clip'];delete record.styles['-webkit-text-fill-color'];delete record.styles['background-image'];}
  },'text-gradient');$('#text-gradient-controls').hidden=!$('#text-gradient-enabled').checked;
 }
 $('#text-gradient-enabled').addEventListener('change',textGradient);
 for(const id of ['text-gradient-start','text-gradient-end','text-gradient-angle'])$('#'+id).addEventListener('input',textGradient);
 $('#remove-background').addEventListener('click',()=>{mutate(record=>{record.styles['background-color']='transparent';record.styles['background-image']='none';delete record.styles['background-clip'];delete record.styles['-webkit-background-clip'];delete record.styles['-webkit-text-fill-color'];});$('#gradient-enabled').checked=false;$('#gradient-controls').hidden=true;$('#background-status').textContent='Fondo transparente';});
 function background(){ $('#background-status').textContent='';$('#text-gradient-enabled').checked=false;$('#text-gradient-controls').hidden=true;mutate(record=>{delete record.styles['background-clip'];delete record.styles['-webkit-background-clip'];delete record.styles['-webkit-text-fill-color'];record.styles['background-color']=$('#background-color').value;record.styles['background-image']=$('#gradient-enabled').checked?'linear-gradient(110deg, '+$('#background-color').value+', '+$('#gradient-end').value+')':'none';},'background');}
 $('#background-color').addEventListener('input',background);$('#gradient-end').addEventListener('input',background);$('#gradient-enabled').addEventListener('change',()=>{$('#gradient-controls').hidden=!$('#gradient-enabled').checked;background();});
 $('#alignment').addEventListener('change',event=>{if(selected?.tag==='img')mutate(record=>{const align=event.target.value;record.styles['margin-left']=align==='left'?'0':'auto';record.styles['margin-right']=align==='right'?'0':'auto';});else style('text-align',event.target.value);});
 function translate(){style('translate',($('#position-x').value||0)+'px '+($('#position-y').value||0)+'px','position');}
 $('#position-x').addEventListener('input',translate);$('#position-y').addEventListener('input',translate);
 function groupSize(axis,value){const computed=selected.computed;const base=parseFloat(computed[axis]);if(!(base>0))return;mutate(record=>{Object.assign(record.styles,{width:computed.width,height:computed.height,'box-sizing':'border-box','max-width':'none','min-width':'0px','min-height':'0px','flex-shrink':'0',zoom:String(Math.max(.1,Math.min(5,value/base)))});},'group-size');}
 function width(){if(selected?.kind==='container'&&$('#scale-content').checked&&$('#width-unit').value==='px'&&Number($('#element-width').value)>0){groupSize('width',Number($('#element-width').value));return;}style('width',$('#width-unit').value==='auto'?'auto':$('#element-width').value?$('#element-width').value+$('#width-unit').value:'','width');}
 $('#element-width').addEventListener('input',width);$('#width-unit').addEventListener('change',width);
 $('#element-height').addEventListener('input',()=>{if(selected?.kind==='container'&&$('#scale-content').checked&&Number($('#element-height').value)>0){groupSize('height',Number($('#element-height').value));return;}style('height',$('#element-height').value?$('#element-height').value+'px':'','height');});
 $('#image-src').addEventListener('change',event=>mutate(record=>{record.src=event.target.value;},'image'));
 $('#image-alt').addEventListener('input',event=>mutate(record=>{record.alt=event.target.value;},'alt'));
 $('#link-href').addEventListener('change',event=>mutate(record=>{record.href=event.target.value;},'href'));
 $('#image-upload').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file||!selected)return;if(file.size>8_000_000){status('La imagen debe pesar menos de 8 MB.',true);return;}
  const target=clone(selected);status('Subiendo imagen…');
  try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});const response=await api('/api/admin/upload',{method:'POST',body:JSON.stringify({data})});const result=await response.json();checkpoint();ensureRecord(target.selector,target.label).src=result.src;refreshPreview();if(selected?.selector===target.selector){$('#image-src').value=result.src;$('#inspector-image').src=result.src;}status('Imagen lista en la vista previa. Guarda para publicarla.');}catch(error){status(error.message,true);}finally{event.target.value='';}
 });
 $('#add-component').addEventListener('click',()=>{
  const tag=$('#component-kind').value,id='#editor-component-'+crypto.randomUUID();
  checkpoint();draft.pages[page]??={};
  const parent=tag==='section'?'main':selected?.moduleSelector||'main';
  const record={label:({p:'Texto nuevo',h2:'Título nuevo',img:'Imagen nueva',a:'Botón nuevo',div:'Tarjeta nueva',section:'Sección nueva'})[tag],component:{tag,parent},styles:{'box-sizing':'border-box','max-width':'100%','margin-top':'20px','margin-bottom':'20px'}};
  if(tag==='img'){record.src='assets/habitacion.webp';record.alt='Nueva imagen';Object.assign(record.styles,{width:'320px',height:'220px','object-fit':'cover'});}
  else{record.text=tag==='a'?'Nuevo botón':tag==='div'?'Tarjeta nueva':tag==='section'?'Nueva sección':'Escribe tu texto';record.styles.color='inherit';}
  if(tag==='a'){record.styles.color='#221958';record.href='#contacto';Object.assign(record.styles,{display:'inline-block',padding:'16px','background-color':'#fab802','border-radius':'12px'});}
  if(tag==='div'||tag==='section')Object.assign(record.styles,{'min-height':'180px',padding:'24px',color:'#221958','background-color':'#f4f3ff'});
  draft.pages[page][id]=record;refreshPreview();setTimeout(()=>bridge()?.selectSelector(id),100);status('Componente agregado al borrador. Puedes deshacer o publicar.');
 });
 $('#delete-component').addEventListener('click',()=>{if(!selected)return;if(['html','body','main'].includes(selected.tag)){status('Selecciona una pieza de la página.',true);return;}style('display','none');bridge()?.refreshSelection();status('Componente ocultado. Deshacer permite recuperarlo antes de publicar.');});
 $('#apply-page-height').addEventListener('click',()=>{const height=Number($('#page-height').value);if(!Number.isFinite(height)||height<0||height>50000){status('El alto debe estar entre 0 y 50000 px.',true);return;}checkpoint();draft.pages[page]??={};draft.pages[page]['main']??={label:'Alto de la página',styles:{}};if(height)draft.pages[page]['main'].styles['min-height']=height+'px';else delete draft.pages[page]['main'].styles['min-height'];refreshPreview();status('Alto mínimo actualizado.');});
 $('#restore-element').addEventListener('click',()=>{if(!selected)return;checkpoint();delete draft.pages[page]?.[selected.selector];refreshPreview();bridge()?.refreshSelection();status('Elemento restaurado al diseño original.');});
 $('#undo').addEventListener('click',()=>{if(!undo.length)return;redo.push(clone(draft));draft=undo.pop();historyField='';refreshPreview();bridge()?.refreshSelection();});
 $('#redo').addEventListener('click',()=>{if(!redo.length)return;undo.push(clone(draft));draft=redo.pop();historyField='';refreshPreview();bridge()?.refreshSelection();});
 async function publishAll(){const button=$('#publish');button.disabled=true;button.textContent='Guardando…';try{const response=await api('/api/admin/config',{method:'POST',body:JSON.stringify({revision:saved.revision||0,config:draft})});saved=await response.json();draft=clone(saved);refreshPreview();status('Cambios guardados y publicados en el sitio.');return true;}catch(error){status(error.message,true);$('#pending-error').textContent=error.message;return false;}finally{button.textContent='Guardar y publicar';updateState();}}
 $('#publish').addEventListener('click',publishAll);
 $('#download-site').addEventListener('click',async()=>{if(dirty){status('Guarda los cambios antes de descargar el sitio.',true);return;}try{status('Preparando el sitio…');const response=await api('/api/admin/export');const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download='delfines-editado.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Descarga preparada.');}catch(error){status(error.message,true);}});
 $('#logout').addEventListener('click',async()=>{if(dirty&&!confirm('Tienes cambios sin publicar. ¿Salir y descartarlos?'))return;try{await api('/api/admin/logout',{method:'POST',body:'{}'});}catch{}token='';sessionStorage.removeItem('delfines-admin-token');frame.removeAttribute('srcdoc');frame.src='about:blank';dirty=false;showLogin();});
 addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 window.DelfinesAdminCanClose=()=>!dirty||confirm('Tienes cambios sin publicar. ¿Cerrar y descartarlos?');
 const passwordDialog=$('#password-dialog'),passwordForm=$('#password-form');
 function openPassword(){passwordForm.reset();$('#password-error').textContent='';passwordDialog.showModal();$('#current-password').focus();}
 const pendingDialog=$('#pending-dialog');
 function pendingChanges(){
  const names={text:'Texto',src:'Imagen',alt:'Descripción',href:'Enlace','font-size':'Tamaño de letra','font-family':'Tipografía','background-color':'Color de fondo','background-image':'Fondo / degradado',translate:'Posición',width:'Ancho',height:'Alto',color:'Color del texto'};
  const changes=[];
  for(const file of new Set([...Object.keys(saved.pages),...Object.keys(draft.pages)])){
   const before=saved.pages[file]||{},after=draft.pages[file]||{};
   for(const selector of new Set([...Object.keys(before),...Object.keys(after)])){
    const a=before[selector]||{},b=after[selector]||{};
    const fields=[];if(a.animationTrigger!==b.animationTrigger)fields.push('Activación de animación');if(JSON.stringify(a.carousel)!==JSON.stringify(b.carousel))fields.push('Carrusel e imágenes');
    for(const key of ['text','src','alt','href'])if(a[key]!==b[key])fields.push(names[key]);
    for(const key of new Set([...Object.keys(a.styles||{}),...Object.keys(b.styles||{})]))if(a.styles?.[key]!==b.styles?.[key])fields.push(names[key]||key);
    if(fields.length)changes.push({page:[...pageSelect.options].find(o=>o.value===file)?.textContent||(file==='*'?'Todas las páginas':file),label:b.label||a.label||selector,fields});
   }
  }return changes;
 }
 $('#open-password').addEventListener('click',()=>{
  if(!dirty){openPassword();return;}
  $('#pending-error').textContent='';$('#pending-list').replaceChildren();
  for(const change of pendingChanges()){const item=document.createElement('li');const title=document.createElement('strong');title.textContent=change.page+' · '+change.label;const fields=document.createElement('span');fields.textContent=change.fields.join(', ');item.append(title,fields);$('#pending-list').append(item);}
  pendingDialog.showModal();
 });
 $('#pending-cancel').addEventListener('click',()=>pendingDialog.close());
 $('#pending-discard').addEventListener('click',()=>{undo.push(clone(draft));redo=[];draft=clone(saved);historyField='';refreshPreview();bridge()?.refreshSelection();pendingDialog.close();openPassword();});
 $('#pending-save').addEventListener('click',async()=>{const controls=[...pendingDialog.querySelectorAll('button')];controls.forEach(b=>b.disabled=true);try{if(await publishAll()){pendingDialog.close();openPassword();}}finally{controls.forEach(b=>b.disabled=false);}});

 $('#cancel-password').addEventListener('click',()=>passwordDialog.close());
 passwordDialog.addEventListener('close',()=>{passwordForm.reset();$('#password-error').textContent='';});
 passwordForm.addEventListener('submit',async event=>{event.preventDefault();const button=passwordForm.querySelector('[type="submit"]');$('#password-error').textContent='';if($('#new-password').value!==$('#confirm-password').value){$('#password-error').textContent='La confirmación no coincide.';return;}button.disabled=true;try{await api('/api/admin/password',{method:'POST',body:JSON.stringify({currentPassword:$('#current-password').value,newPassword:$('#new-password').value,confirmPassword:$('#confirm-password').value})});passwordDialog.close();token='';frame.removeAttribute('srcdoc');frame.src='about:blank';showLogin();$('#login-error').textContent='Contraseña actualizada. Ingresa con la nueva contraseña.';$('#admin-password').focus();}catch(error){$('#password-error').textContent=error.message;}finally{button.disabled=false;}});
 enter().catch(error=>{$('#login-error').textContent=error.message;showLogin();});
})();
