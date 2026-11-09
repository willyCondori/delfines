/* Tamaño CSS del sitio separado de la escala visual del lienzo. */
(function(root){
 function viewport(options){
  const presets={desktop:[options.windowWidth,options.windowHeight],wide:[1680,950],laptop:[1280,900],tablet:[768,1024],mobile:[390,844],custom:[options.customWidth,options.customHeight]};
  const size=presets[options.device]||presets.desktop;
  const clamp=(value,min,max,fallback)=>Math.max(min,Math.min(max,Math.round(Number(value)||fallback)));
  const width=clamp(size[0],320,3840,1280),height=clamp(size[1],320,3000,900);
  const scale=options.zoom==='fit'?Math.min(1,Math.max(180,Number(options.available)||180)/width):Math.max(.25,Math.min(1,Number(options.zoom)||1));
  return {width,height,scale};
 }
 if(typeof module!=='undefined')module.exports=viewport;else root.DelfinesViewport=viewport;
})(typeof window!=='undefined'?window:globalThis);
