import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../public/progress-save.js',import.meta.url),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));

test('Pages saves to the configured service and preserves a device draft across refreshes',async()=>{
  const endpoint='https://sep-matter-lab.sep-apchem.chatgpt.site/api/progress';
  const code='A'.repeat(43), storage=new Map([['matter-lab:progress-code',code]]);
  let online=true, remote={'field:written-exit':'Original saved answer'}, revision=1;
  const calls=[];
  function open(config=endpoint){
    let state={'field:written-exit':''};
    const elements=new Map(),timers=new Set();
    const element=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',dataset:{},addEventListener(){}});return elements.get(id);};
    const window={lessonState:{capture:()=>copy(state),restore:patch=>Object.assign(state,patch),restoring:false},addEventListener(){}};
    const context={window,document:{hidden:false,getElementById:element,querySelector:selector=>selector.startsWith('meta')?(config?{content:config}:null):element('save-bar'),addEventListener(){}},
      localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},navigator:{onLine:true},crypto,btoa,AbortController,
      setTimeout:(fn,ms)=>{const timer=setTimeout(fn,ms);timer.unref();timers.add(timer);return timer;},clearTimeout,setInterval(){},
      fetch:async(url,options)=>{
        calls.push({url,options});
        if(!online)throw new TypeError('Network unavailable');
        assert.equal(options.headers.Authorization,'Bearer '+code);
        if(options.method==='PATCH'){Object.assign(remote,JSON.parse(options.body).patch);revision++;}
        return new Response(JSON.stringify({state:copy(remote),revision,updatedAt:Date.now()}),{headers:{'Content-Type':'application/json'}});
      },
    };
    vm.runInNewContext(source,context);
    return {window,elements,get state(){return state;},close(){for(const timer of timers)clearTimeout(timer);}};
  }
  async function settled(app){for(let i=0;i<20&&app.window.progressSaving.busy;i++)await new Promise(resolve=>setTimeout(resolve,1));assert.equal(app.window.progressSaving.busy,false);}
  const first=open();await settled(first);
  assert.equal(first.state['field:written-exit'],'Original saved answer');
  first.state['field:written-exit']='Answer from GitHub';
  assert.equal(await first.window.progressSaving.flush(),true);
  assert.equal(remote['field:written-exit'],'Answer from GitHub');
  assert(calls.every(({url,options})=>url===endpoint&&options.credentials==='omit'&&options.redirect==='error'));
  online=false;first.state['field:written-exit']='Work typed while disconnected';
  assert.equal(await first.window.progressSaving.flush(),false);first.close();
  const reopened=open();await settled(reopened);
  assert.equal(reopened.state['field:written-exit'],'Work typed while disconnected');
  online=true;assert.equal(await reopened.window.progressSaving.flush(),true);
  assert.equal(remote['field:written-exit'],'Work typed while disconnected');reopened.close();
  const originalSite=open(null);await settled(originalSite);
  assert.equal(calls.at(-1).url,'/api/progress');originalSite.close();
});
