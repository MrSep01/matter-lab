(() => {
  const PROGRESS_API=document.querySelector('meta[name="progress-api"]')?.content||'/api/progress';
  const CODE_KEY='matter-lab:progress-code', DRAFT_PREFIX='matter-lab:draft:';
  const el=id=>document.getElementById(id), clone=value=>JSON.parse(JSON.stringify(value));
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const validCode=code=>/^[A-Za-z0-9_-]{43}$/.test(code);
  const randomCode=()=>btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  let storageOK=true;
  function read(key){try{return localStorage.getItem(key);}catch{storageOK=false;return null;}}
  function write(key,value){try{localStorage.setItem(key,value);return true;}catch{storageOK=false;return false;}}
  let code=read(CODE_KEY); if(!validCode(code)){code=randomCode();write(CODE_KEY,code);}
  el('progress-code').value=code;
  let pending={},outgoing=null,ready=false,busy=false,timer=null,retryTimer=null,lastSaved=0;
  let baseline=window.lessonState.capture();
  const defaults=clone(baseline);
  function status(text,state='saving'){el('save-status').textContent=text;document.querySelector('.save-bar').dataset.state=state;}
  function cache(){write(DRAFT_PREFIX+code,JSON.stringify({state:window.lessonState.capture(),pending,outgoing}));}
  function adopt(state){
    const current=window.lessonState.capture(),merged={...defaults,...state,...pending},delta={};
    for(const [key,value]of Object.entries(merged))if(!equal(value,current[key]))delta[key]=value;
    if(Object.keys(delta).length)window.lessonState.restore(delta);
    baseline=window.lessonState.capture();cache();
  }
  try {
    const saved=JSON.parse(read(DRAFT_PREFIX+code)||'null');
    if(saved && saved.state && typeof saved.state==='object'){
      pending=saved.pending && typeof saved.pending==='object'?saved.pending:{};
      outgoing=saved.outgoing?.mutationId && saved.outgoing?.patch?saved.outgoing:null;
      adopt(saved.state);
    }
  } catch {status('Your online save will load shortly.');}
  function captureChanges(){
    if(window.lessonState.restoring)return;
    const current=window.lessonState.capture();let changed=false;
    for(const [key,value]of Object.entries(current))if(!equal(value,baseline[key])){pending[key]=value;changed=true;}
    baseline=current;
    if(changed){cache();status(navigator.onLine===false?'Offline · work kept on this device. We’ll save it when you reconnect.':'Saving your work…',navigator.onLine===false?'error':'saving');clearTimeout(timer);timer=setTimeout(flush,650);}
  }
  async function request(method,body,requestCode=code,keepalive=false){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const encoded=body?JSON.stringify(body):undefined;
      const response=await fetch(PROGRESS_API,{method,headers:{Authorization:'Bearer '+requestCode,...(body?{'Content-Type':'application/json'}:{})},body:encoded,credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal,keepalive:keepalive&&(!encoded||encoded.length<60000)});
      const data=await response.json();if(!response.ok){const error=new Error(data.error||'Unable to save.');error.status=response.status;throw error;}return data;
    }finally{clearTimeout(timeout);}
  }
  function savedStatus(){status(storageOK?'Saved · you can leave and return to your work.':'Saved online · keep your progress code to return.','saved');}
  function failed(error){
    cache();status(storageOK?'Not saved online yet · your work is kept on this device. Retrying…':'Saving is unavailable · keep this page open and copy your progress code.','error');
    clearTimeout(retryTimer);if(!error.status||error.status>=500)retryTimer=setTimeout(flush,15000);
  }
  async function hydrate(){
    try{
      const record=await request('GET');captureChanges();adopt(record.state);lastSaved=record.updatedAt;ready=true;
    }catch(error){
      if(error.status!==404)throw error;
      // A new anonymous code is created only after confirming no record exists.
      pending={...window.lessonState.capture(),...pending};ready=true;cache();
    }
  }
  async function flush(keepalive=false){
    clearTimeout(timer);clearTimeout(retryTimer);captureChanges();
    if(busy)return false;
    busy=true;
    try{
      if(!ready)await hydrate();
      if(!outgoing && Object.keys(pending).length)outgoing={mutationId:randomCode(),patch:clone(pending)};
      if(outgoing){
        cache();status('Saving your work…');const sent=outgoing;
        const result=await request('PATCH',sent,code,keepalive);
        captureChanges();
        for(const [key,value]of Object.entries(sent.patch))if(equal(pending[key],value))delete pending[key];
        outgoing=null;lastSaved=result.updatedAt;adopt(result.state);
      }
      if(Object.keys(pending).length){timer=setTimeout(flush,150);status('Saving your latest changes…');}
      else savedStatus();
      return Object.keys(pending).length===0;
    }catch(error){failed(error);return false;}finally{busy=false;}
  }
  async function refresh(){
    captureChanges();if(busy)return;
    if(!ready || outgoing || Object.keys(pending).length){await flush();return;}
    busy=true;
    try{const record=await request('GET');captureChanges();adopt(record.state);lastSaved=record.updatedAt;Object.keys(pending).length?timer=setTimeout(flush,100):savedStatus();}
    catch(error){failed(error);}finally{busy=false;}
  }
  // Capture synchronously after app handlers so quick refreshes retain even the last keystroke.
  for(const event of ['input','change','click','submit'])document.addEventListener(event,e=>{if(!e.target.closest('.save-bar'))captureChanges();});
  window.addEventListener('pagehide',()=>{captureChanges();cache();void flush(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){captureChanges();cache();void flush(true);}else void refresh();});
  window.addEventListener('online',()=>void refresh());
  window.addEventListener('offline',()=>status('Offline · work kept on this device. We’ll save it when you reconnect.','error'));
  // Store curve position without writing each animation frame.
  setInterval(()=>{if(!document.hidden)captureChanges();},2500);
  el('retry-save').addEventListener('click',()=>void flush());
  el('copy-progress-code').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(code);el('progress-message').textContent='Code copied. Keep it in your notes to continue on another device.';}
    catch{el('progress-code').focus();el('progress-code').select();el('progress-message').textContent='Your code is selected. Choose Copy, or press Command + C on a Mac.';}
  });
  el('open-progress-form').addEventListener('submit',async event=>{
    event.preventDefault();const nextCode=el('resume-code').value.trim();
    if(!validCode(nextCode)){el('progress-message').textContent='Paste the full progress code, then try again.';return;}
    if(nextCode===code){el('progress-message').textContent='You already have this work open.';return;}
    const button=event.currentTarget.querySelector('button');button.disabled=true;
    try{
      const result=await request('GET',null,nextCode);
      if(!await flush()){el('progress-message').textContent='Your current work is still saving. Wait for Saved, then open your code again.';return;}
      // Keep the old device draft as a recovery copy; only switch after saving succeeds.
      cache();code=nextCode;write(CODE_KEY,code);pending={};outgoing=null;ready=true;el('progress-code').value=code;
      adopt(result.state);lastSaved=result.updatedAt;el('resume-code').value='';savedStatus();el('progress-message').textContent='Your saved work is open. Continue where you left off.';
    }catch(error){el('progress-message').textContent=error.status===404?'That code was not found. Check the code and make sure the other device has finished saving.':'Could not open your saved work. Your current work is unchanged. Try again.';}
    finally{button.disabled=false;}
  });
  // Expose a small lifecycle hook for integration checks, not student data access.
  window.progressSaving={flush,refresh,get ready(){return ready;},get busy(){return busy;}};
  void flush();
})();
