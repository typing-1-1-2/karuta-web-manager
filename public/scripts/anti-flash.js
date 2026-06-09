// Runs synchronously in <head> — hides upload screen if CSV exists
try{if(localStorage.getItem('karutaCSV'))document.documentElement.classList.add('has-csv')}catch(e){}
