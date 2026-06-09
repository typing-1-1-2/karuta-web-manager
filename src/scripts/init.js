// init.js — runs last, after core.js and page chunk are both loaded
(function(){
  function start(){
    try{
      if(_tryRestoreCSV()) _showDashboard();
    }catch(e){
      console.error('[KWM] Startup error:', e);
    }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
