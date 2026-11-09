const $ = selector => document.querySelector(selector);
const menuButton = $('.menu-toggle');
const menu = $('#menu');
let chosenRoomPlan = null;
function closeMenu(){ menu.classList.remove('open'); menuButton.setAttribute('aria-expanded','false'); menuButton.setAttribute('aria-label','Abrir menú'); }
menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';menu.classList.toggle('open',open);menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');});
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape') closeMenu();});
document.addEventListener('click',e=>{if(!e.target.closest('.header'))closeMenu();});
const sectionObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){menu.querySelectorAll('a').forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id));}});},{rootMargin:'-18% 0px -55% 0px',threshold:0});
document.querySelectorAll('main section[id]').forEach(section=>{if(menu.querySelector('a[href="#'+section.id+'"]'))sectionObserver.observe(section);});

const photos=[
 {src:'assets/hero.webp',alt:'La recepción de Delfines Apart Hotel',caption:'Una bienvenida a tu próxima estadía.'},
 {src:'assets/habitacion.webp',alt:'Habitación amueblada con cama y ropa blanca',caption:'Un espacio para desconectar y descansar.'},
 {src:'assets/piscina-delfines.jpg',alt:'Huéspedes compartiendo bebidas junto a la piscina',caption:'Momentos para compartir en Delfines.'},
 {src:'assets/galeria.webp',alt:'Cócteles de frutas',caption:'Saborea la pausa.'},
 {src:'assets/nosotros.webp',alt:'Frigobar y copas de Delfines',caption:'Detalles que acompañan tu viaje.'},
 {src:'assets/servicios.webp',alt:'Desayuno servido sobre una cama',caption:'Empieza el día con calma.'},
 {src:'assets/espacio-1.webp',alt:'Dormitorio con cama amplia',caption:'El arte de descansar.'},
 {src:'assets/espacio-3.webp',alt:'Cocina equipada del departamento',caption:'La libertad de tu propio espacio.'},
 {src:'assets/espacio-11.webp',alt:'Cocina y comedor de Delfines',caption:'Un lugar para compartir.'},
 {src:'assets/espacio-8.webp',alt:'Piscina de Delfines',caption:'Cambia de ritmo.'},
 {src:'assets/espacio-5.webp',alt:'Piscina interior iluminada',caption:'Una pausa diferente.'},
 {src:'assets/espacio-7.webp',alt:'Desayuno buffet',caption:'Empieza el día con calma.'},
 {src:'assets/espacio-4.webp',alt:'Presentación de alimentos en el buffet',caption:'Sabores y detalles.'},
 {src:'assets/espacio-12.webp',alt:'Habitación con ventana y sillón',caption:'La comodidad de llegar.'}
];
const gallery=$('#gallery-dialog');let photoIndex=0;
const thumbnailRail=$('.gallery-thumbnails');
if(thumbnailRail)photos.forEach((photo,index)=>{const button=document.createElement('button');button.type='button';button.dataset.thumb=index;button.setAttribute('aria-label','Ver foto: '+photo.alt);button.setAttribute('aria-pressed','false');const img=document.createElement('img');img.src=photo.src;img.alt='';img.width=112;img.height=76;img.loading='lazy';button.append(img);button.addEventListener('click',()=>showPhoto(index));thumbnailRail.append(button);});
function showPhoto(index){photoIndex=(index+photos.length)%photos.length;const photo=photos[photoIndex];gallery.dataset.galleryIndex=String(photoIndex);$('#lightbox-image').src=photo.src;$('#lightbox-image').alt=photo.alt;$('#lightbox-caption').textContent=photo.caption;$('.gallery-count').textContent=`${String(photoIndex+1).padStart(2,'0')} / ${String(photos.length).padStart(2,'0')}`;document.querySelectorAll('[data-thumb]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.thumb)===photoIndex)));}
document.querySelectorAll('[data-photo]').forEach(button=>button.addEventListener('click',()=>{showPhoto(Number(button.dataset.photo));gallery.showModal();}));
$('.gallery-prev').addEventListener('click',()=>showPhoto(photoIndex-1));
$('.gallery-next').addEventListener('click',()=>showPhoto(photoIndex+1));
gallery.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();showPhoto(photoIndex-1);}if(e.key==='ArrowRight'){e.preventDefault();showPhoto(photoIndex+1);}});
document.querySelectorAll('dialog').forEach(dialog=>{dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});});

const checkin=$('#checkin'),checkout=$('#checkout'),bookingError=$('#booking-error');
function isoLocal(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function nextDay(value){const date=new Date(value+'T12:00:00');date.setDate(date.getDate()+1);return isoLocal(date);}
if(checkin&&checkout&&$('#booking-form')){
checkin.min=isoLocal(new Date());checkout.min=nextDay(checkin.min);
checkin.addEventListener('change',()=>{checkout.min=nextDay(checkin.value||checkin.min);if(checkout.value&&checkout.value<=checkin.value)checkout.value='';bookingError.textContent='';checkout.setCustomValidity('');});
checkout.addEventListener('change',()=>{bookingError.textContent='';checkout.setCustomValidity('');});
const dateFormat=new Intl.DateTimeFormat('es-BO',{day:'numeric',month:'long',year:'numeric'});
$('#booking-form').addEventListener('submit',e=>{e.preventDefault();if(checkin.value<checkin.min){bookingError.textContent='Elige una fecha de llegada a partir de hoy.';checkin?.focus();return;}if(checkout.value<=checkin.value){bookingError.textContent='La salida debe ser posterior a la llegada.';checkout.focus();return;}const start=new Date(checkin.value+'T12:00:00'),end=new Date(checkout.value+'T12:00:00'),nights=Math.round((end-start)/86400000),adults=Number($('#guests').value),children=Number($('#children').value);let summary=`Llegada: ${dateFormat.format(start)}\nSalida: ${dateFormat.format(end)}\n${nights} ${nights===1?'noche':'noches'} · ${adults} ${adults===1?'adulto':'adultos'}${children?` · ${children} ${children===1?'niño':'niños'}`:' · sin niños'}`;if(chosenRoomPlan)summary+=`\nPlan: ${chosenRoomPlan.name} (desde $${chosenRoomPlan.price} por noche)`;$('#trip-plan-row').hidden=!chosenRoomPlan;$('#trip-plan').textContent=chosenRoomPlan?chosenRoomPlan.name:'';$('#booking-summary').textContent=summary;$('#trip-arrival').textContent=dateFormat.format(start);$('#trip-departure').textContent=dateFormat.format(end);$('#trip-nights').textContent=`${nights} ${nights===1?'noche':'noches'}`;$('#trip-guests').textContent=`${adults} ${adults===1?'adulto':'adultos'}${children?` y ${children} ${children===1?'niño':'niños'}`:''}`;const body=`Hola, Delfines Apart Hotel:\n\nQuisiera consultar disponibilidad y tarifas para la siguiente estadía:\n\n${summary}\n\n¿Podrían indicarme las habitaciones disponibles, servicios incluidos y condiciones de reserva?\n\nMuchas gracias.`;$('#email-booking').href=`mailto:reservas@losdelfines.com.bo?subject=${encodeURIComponent('Consulta de estadía · Delfines Apart Hotel')}&body=${encodeURIComponent(body)}`;$('#booking-dialog').showModal();});
}
$('#year').textContent=new Date().getFullYear();

// Escenas de portada: cambio manual, sin reproducción automática.
const heroScenes=[
 {src:'assets/habitacion.webp',alt:'Habitación de Delfines con ropa de cama blanca y detalle azul',caption:'El arte de descansar.'},
 {src:'assets/hero.webp',alt:'Entrada y recepción de Delfines Apart Hotel',caption:'Siéntete bienvenido.'},
 {src:'assets/galeria.webp',alt:'Cócteles de frutas en Delfines Apart Hotel',caption:'Disfruta el momento.'}
];
const featurePhoto=$('#hero-feature-photo');
if(featurePhoto){
 $('#inicio').dataset.activeScene='0';
 document.querySelectorAll('[data-scene]').forEach(button=>button.addEventListener('click',()=>{
  const scene=heroScenes[Number(button.dataset.scene)];$('#inicio').dataset.activeScene=button.dataset.scene;
  document.querySelectorAll('[data-scene]').forEach(item=>{const selected=item===button;item.classList.toggle('selected',selected);item.setAttribute('aria-pressed',String(selected));});
  featurePhoto.alt=scene.alt;featurePhoto.src=scene.src;
  $('#hero-feature-caption').textContent=scene.caption;
 }));
}
const readingProgress=$('.reading-progress');
let scrollScheduled=false;
function updateReadingProgress(){
 const range=document.documentElement.scrollHeight-innerHeight;
 if(readingProgress)readingProgress.style.transform=`scaleX(${range>0?Math.min(1,Math.max(0,scrollY/range)):0})`;
 scrollScheduled=false;
}
addEventListener('scroll',()=>{if(!scrollScheduled){scrollScheduled=true;requestAnimationFrame(updateReadingProgress);}},{passive:true});
addEventListener('resize',updateReadingProgress);
updateReadingProgress();

$('.edit-trip')?.addEventListener('click',()=>{$('#booking-dialog').close();checkin?.focus();});

// Recorrido por ambientes: las fotos pertenecen a los espacios del sitio original.
const roomScenes=[
 {src:'assets/espacio-1.webp',alt:'Dormitorio con ropa de cama blanca',caption:'Un dormitorio para descansar.',photo:6},
 {src:'assets/espacio-3.webp',alt:'Cocina equipada de un departamento de Delfines',caption:'La libertad de tu propia cocina.',photo:7},
 {src:'assets/espacio-11.webp',alt:'Cocina y comedor de Delfines',caption:'Espacio para compartir tu estadía.',photo:8}
];
document.querySelectorAll('[data-room-scene]').forEach(button=>button.addEventListener('click',()=>{
 const scene=roomScenes[Number(button.dataset.roomScene)];
 const photo=$('.tour-image>img');photo.src=scene.src;photo.alt=scene.alt;
 $('.tour-caption').textContent=scene.caption;
 $('.tour-image .image-expand').dataset.photo=scene.photo;$('.tour-image .image-expand').setAttribute('aria-label','Ampliar '+scene.alt.toLowerCase());
 document.querySelectorAll('[data-room-scene]').forEach(b=>{const selected=b===button;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
}));

// El filtro se conserva en la dirección y funciona también al abrir los HTML directamente.
const filters=[...document.querySelectorAll('[data-filter]')];
function applyPhotoFilter(category,updateUrl=true){
 if(!filters.some(button=>button.dataset.filter===category))category='todos';
 let count=0;
 document.querySelectorAll('.masonry-photo').forEach(photo=>{const visible=category==='todos'||photo.dataset.category===category;photo.hidden=!visible;if(visible)count++;});
 filters.forEach(button=>{const selected=button.dataset.filter===category;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
 if($('#gallery-results'))$('#gallery-results').textContent=`${count} ${count===1?'fotografía':'fotografías'}`;
 if(updateUrl){const url=new URL(location.href);if(category==='todos')url.searchParams.delete('categoria');else url.searchParams.set('categoria',category);if(!window.DELFINES_EDITOR_PREVIEW)history.replaceState(null,'',url);}
}
if(filters.length){applyPhotoFilter(new URLSearchParams(location.search).get('categoria')||'todos',false);filters.forEach(button=>button.addEventListener('click',()=>applyPhotoFilter(button.dataset.filter)));addEventListener('popstate',()=>applyPhotoFilter(new URLSearchParams(location.search).get('categoria')||'todos',false));}

// Vista previa local: ningún mensaje sale del navegador al completar el formulario.
$('#contact-form')?.addEventListener('submit',event=>{
 event.preventDefault();const values=new FormData(event.currentTarget);
 const fields=[['Nombre',values.get('nombre')],['Correo',values.get('correo')],['Teléfono',values.get('telefono')||'Sin indicar'],['Consulta',values.get('asunto')],['Mensaje',values.get('mensaje')]];
 const preview=$('#contact-preview');preview.replaceChildren();
 fields.forEach(([label,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;preview.append(dt,dd);});
 const body='Hola, Delfines Apart Hotel:\n\n'+fields.map(([label,value])=>`${label}: ${value}`).join('\n\n');
 $('#contact-mailto').href=`mailto:reservas@losdelfines.com.bo?subject=${encodeURIComponent(values.get('asunto')+' · Delfines Apart Hotel')}&body=${encodeURIComponent(body)}`;
 $('#contact-dialog').showModal();
});

// Los datos conservan la capacidad y las camas publicadas por el catálogo original.
const roomPlanData=typeof ROOM_PLANS==='undefined'?[]:ROOM_PLANS;
let currentPlanIndex=0;
function selectRoomPlan(index,moveToForm=true){
 const plan=roomPlanData[index];if(!plan)return;
 chosenRoomPlan=plan;
 $('.selected-plan').hidden=false;
 $('#chosen-plan-name').textContent=plan.name;
 $('#guests').value=String(plan.capacity);
 const url=new URL(location.href);url.searchParams.set('plan',plan.id);
 if(moveToForm)url.hash='reserva';if(!window.DELFINES_EDITOR_PREVIEW)history.replaceState(null,'',url);
 if($('#plan-dialog').open)$('#plan-dialog').close();
 if(moveToForm)checkin?.focus();
}
function openRoomPlan(index){
 const plan=roomPlanData[index];if(!plan)return;
 currentPlanIndex=index;
 $('#plan-dialog').dataset.activePlan=plan.id;
 $('#plan-modal-title').textContent=plan.name;
 $('#plan-modal-image').src=plan.image;
 $('#plan-modal-image').alt=plan.name+' de Delfines Apart Hotel';
 buildPlanGallery(plan);
 $('#plan-modal-price').textContent='$'+plan.price;
 $('#plan-modal-capacity').textContent=plan.capacity+' '+(plan.capacity===1?'persona':'personas');
 $('#plan-modal-beds').textContent=plan.beds;
 $('#plan-modal-description').textContent=plan.description;
 $('#plan-modal-checkin').textContent=plan.checkin;
 $('#plan-modal-checkout').textContent=plan.checkout;
 $('#plan-amenities-count').textContent=plan.amenities.length+' detalles';
 document.querySelector('.plan-amenities').open=false;
 for(const [selector,values] of [['#plan-modal-included',plan.included],['#plan-modal-amenities',plan.amenities]]){
  const list=$(selector);list.replaceChildren();values.forEach(text=>{const li=document.createElement('li');li.textContent=text;list.append(li);});
 }
 $('#plan-dialog').showModal();$('#plan-dialog').scrollTop=0;
}
document.querySelectorAll('[data-plan-details]').forEach(button=>button.addEventListener('click',()=>openRoomPlan(Number(button.dataset.planDetails))));
document.querySelectorAll('[data-plan-inquiry]').forEach(button=>button.addEventListener('click',()=>selectRoomPlan(Number(button.dataset.planInquiry))));
$('#plan-modal-inquiry')?.addEventListener('click',()=>selectRoomPlan(currentPlanIndex));
$('.clear-plan')?.addEventListener('click',()=>{chosenRoomPlan=null;$('.selected-plan').hidden=true;const url=new URL(location.href);url.searchParams.delete('plan');url.hash='planes';if(!window.DELFINES_EDITOR_PREVIEW)history.replaceState(null,'',url);$('.plans-section').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});document.querySelector('[data-plan-details]')?.focus({preventScroll:true});});
if(roomPlanData.length){const initialPlan=new URLSearchParams(location.search).get('plan');const index=roomPlanData.findIndex(plan=>plan.id===initialPlan);if(index>=0)selectRoomPlan(index,false);}

let currentPlanPhotoIndex=0;
function showPlanPhoto(index){
 const plan=roomPlanData[currentPlanIndex];if(!plan)return;
 const images=plan.gallery?.length?plan.gallery:[plan.image];
 currentPlanPhotoIndex=(index+images.length)%images.length;
 $('#plan-dialog').dataset.photoIndex=String(currentPlanPhotoIndex);
 $('#plan-modal-image').src=images[currentPlanPhotoIndex];
 $('#plan-modal-image').alt=`${plan.name}, fotografía ${currentPlanPhotoIndex+1} de ${images.length}`;
 $('.plan-photo-count').textContent=`${String(currentPlanPhotoIndex+1).padStart(2,'0')} / ${String(images.length).padStart(2,'0')}`;
 document.querySelectorAll('[data-plan-thumb]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.planThumb)===currentPlanPhotoIndex)));
}
function buildPlanGallery(plan){
 const rail=$('.plan-photo-thumbnails');rail.replaceChildren();
 const images=plan.gallery?.length?plan.gallery:[plan.image];
 images.forEach((src,index)=>{
  const button=document.createElement('button');button.type='button';button.dataset.planThumb=index;button.setAttribute('aria-label',`Ver imagen ${index+1} de ${plan.name}`);button.setAttribute('aria-pressed','false');
  const image=document.createElement('img');image.src=src;image.alt='';image.width=112;image.height=80;button.append(image);
  button.addEventListener('click',()=>showPlanPhoto(index));rail.append(button);
 });
 showPlanPhoto(0);
}
$('.plan-photo-prev')?.addEventListener('click',()=>showPlanPhoto(currentPlanPhotoIndex-1));
$('.plan-photo-next')?.addEventListener('click',()=>showPlanPhoto(currentPlanPhotoIndex+1));
$('#plan-dialog')?.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();showPlanPhoto(currentPlanPhotoIndex-1);}if(event.key==='ArrowRight'){event.preventDefault();showPlanPhoto(currentPlanPhotoIndex+1);}});
