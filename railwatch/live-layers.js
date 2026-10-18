/* RailWatch live layers (God's Eye style). Aircraft from OpenSky public API, shown only when the feed answers. */
(function(){
  if(window.__rwLayers)return;window.__rwLayers=true;
  var box=document.createElement('div');box.id='rw-layers';
  box.innerHTML='<button type="button" data-l="air" aria-pressed="false">Aircraft <span id="rw-air-s">off</span></button>';
  document.body.appendChild(box);
  var ents=[],timer=null,on=false,s=box.querySelector('#rw-air-s');
  function clear(){ents.forEach(function(e){try{viewer.entities.remove(e)}catch(_){}});ents=[]}
  async function poll(){
    try{
      var c=new AbortController();var t=setTimeout(function(){c.abort()},15000);
      var r=await fetch('https://opensky-network.org/api/states/all?lamin=-35&lomin=16&lamax=-22&lomax=33',{signal:c.signal});clearTimeout(t);
      if(!r.ok)throw new Error('HTTP '+r.status);
      var d=await r.json();clear();
      (d.states||[]).forEach(function(a){if(a[5]==null||a[6]==null)return;
        ents.push(viewer.entities.add({position:Cesium.Cartesian3.fromDegrees(a[5],a[6],(a[7]||0)),point:{pixelSize:6,color:Cesium.Color.fromCssColorString('#7aa7ff'),disableDepthTestDistance:Number.POSITIVE_INFINITY},label:{text:(a[1]||'').trim(),font:'10px sans-serif',pixelOffset:new Cesium.Cartesian2(0,-12),scale:.9,showBackground:true,disableDepthTestDistance:Number.POSITIVE_INFINITY}}))});
      s.textContent=ents.length+' live · '+new Date().toLocaleTimeString().slice(0,5);
    }catch(e){s.textContent='feed unavailable';clear()}
  }
  box.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;on=!on;b.setAttribute('aria-pressed',on);
    if(on){s.textContent='loading';poll();timer=setInterval(poll,60000)}else{clearInterval(timer);clear();s.textContent='off'}});
})();
