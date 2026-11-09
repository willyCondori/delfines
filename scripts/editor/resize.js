/* Geometría compartida, independiente del DOM para probar todos los bordes. */
(function(root){
 function resizeBox(d,dx,dy,locked){
  const direction=d.action.split('-')[1]||'se';
  const west=direction.includes('w'),north=direction.includes('n');
  const horizontal=/[ew]/.test(direction),vertical=/[ns]/.test(direction);
  let width=Math.max(20,d.width+(horizontal?(west?-dx:dx):0));
  let height=Math.max(20,d.height+(vertical?(north?-dy:dy):0));
  if(locked){if(horizontal)height=width*d.height/d.width;else width=height*d.width/d.height;}
  return {width,height,x:west?d.tx+d.width-width:d.tx,y:north?d.ty+d.height-height:d.ty};
 }
 resizeBox.anchor=function(d,rect){
  const direction=d.action.split('-')[1]||'se';
  const x=direction.includes('w')?d.right-rect.width:direction==='n'||direction==='s'?(d.left+d.right-rect.width)/2:d.left;
  const y=direction.includes('n')?d.bottom-rect.height:direction==='e'||direction==='w'?(d.top+d.bottom-rect.height)/2:d.top;
  return {x,y};
 };
 resizeBox.align=function(d,rect,zoom,current){
  const {x,y}=resizeBox.anchor(d,rect);
  return {x:(current[0]||0)+(x-rect.left)/zoom,y:(current[1]||0)+(y-rect.top)/zoom};
 };
 resizeBox.factor=function(d,dx,dy){
  const direction=d.action.split('-')[1]||'se';
  const horizontal=/[ew]/.test(direction),vertical=/[ns]/.test(direction);
  const x=(direction.includes('w')?-dx:dx)/(d.boxWidth||d.width);
  const y=(direction.includes('n')?-dy:dy)/(d.boxHeight||d.height);
  return 1+(horizontal&&vertical?(Math.abs(x)>Math.abs(y)?x:y):horizontal?x:y);
 };
 if(typeof module!=='undefined')module.exports=resizeBox;
 else root.DelfinesResizeBox=resizeBox;
})(typeof window!=='undefined'?window:globalThis);
