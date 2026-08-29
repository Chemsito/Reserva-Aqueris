window.AQ_LOGO="./assets/logo-aqueris.png?v=6";

(function loadPrimaryAquerisLogo(){
  fetch('./assets/logo-aqueris-new.txt?v=20260829-1',{cache:'no-store'})
    .then(function(response){
      if(!response.ok) throw new Error('Logo no disponible');
      return response.text();
    })
    .then(function(source){
      source=(source||'').trim();
      if(!source.startsWith('data:image/')) throw new Error('Formato de logo inválido');
      window.AQ_LOGO=source;
      document.querySelectorAll('[data-brand-logo]').forEach(function(image){image.src=source;});
      var favicon=document.getElementById('site-favicon');
      if(favicon) favicon.href=source;
      window.dispatchEvent(new CustomEvent('aqueris-logo-ready',{detail:{src:source}}));
    })
    .catch(function(error){console.warn('Se mantiene el logo de respaldo:',error.message);});
})();
