// Stable lesson keys deliberately do not include the app release number.
(() => {
  const controls = () => [...document.querySelectorAll('main input[id],main textarea[id],main select[id]')].filter(n => !n.closest('.save-bar') && !['heater-control','timeline','temperature-scenario','flash-group','flash-direction','vocab-quiz-group'].includes(n.id));
  const feedback = () => [...document.querySelectorAll('main [id]')].filter(n => !n.closest('.save-bar,#vocab-quiz') && /(?:feedback|result)(?:-\d+)?$/.test(n.id));
  const rewardPoints = Object.fromEntries([...Object.entries(training).flatMap(([key,qs])=>qs.map((_,i)=>[key+'-'+i,50])),...mysteries.map((_,i)=>['map-'+i,50]),...exit.map((_,i)=>['final-'+i,100])]);
  // Generated checkboxes need stable identities for per-answer saves.
  document.querySelectorAll('.self-mark').forEach((n,i)=>n.id='exam-self-mark-'+i);
  function capture() {
    const state = {};
    controls().forEach(n => state['field:'+n.id] = n.type === 'checkbox' ? n.checked : n.value);
    document.querySelectorAll('input[type=radio][name]').forEach(n => {
      const selected = [...document.getElementsByName(n.name)].find(r => r.checked);
      state['quiz:'+n.name] = selected?.value ?? null;
    });
    Object.keys(rewardPoints).forEach(key => state['game:'+key] = earned.has(key));
    state['arrows:state'] = {discovered:[...discoveredChanges],selected:selectedChange};
    state['mystery:state'] = {index:mysteryIndex,solved:[...solved]};
    state['thermal:state'] = {direction,progress,power:heaterPower,motion:window.matterMotionPlaying()};
    state['temperature:state'] = {index:temperatureIndex,answer:temperatureAnswer,scenario:$('#temperature-scenario').value};
    state['energy:state'] = {set:energySet,answer:$('[data-energy-answer][aria-pressed=true]')?.dataset.energyAnswer || null};
    state['vocabulary:practice'] = window.vocabularyProgress.capture();
    state['view:page'] = $$('.page').find(p=>!p.hidden)?.id || 'lesson';
    state['view:written-guide'] = !$('#written-guide').hidden;
    feedback().forEach(n => state['feedback:'+n.id] = {text:n.textContent,hidden:n.hidden,wrong:n.classList.contains('wrong')});
    return state;
  }
  function restore(state) {
    if (!state || typeof state !== 'object') return;
    const active = document.activeElement, selection = active?.selectionStart;
    window.lessonState.restoring = true;
    try {
      const e = state['energy:state'];
      if(e){energySet=e.set==='same'?'same':'warmer';renderEnergy();}
      const t = state['temperature:state'];
      if(t){$('#temperature-scenario').value=t.scenario==='unknown'?'unknown':'water';temperatureIndex=Math.max(0,Math.min(4,Math.trunc(Number(t.index)||0)));showTemperatureQuestion();if(['solid','liquid','gas','boundary'].includes(t.answer))$('[data-state-answer="'+t.answer+'"]').click();}
      controls().forEach(n => {
        const key='field:'+n.id; if(!Object.prototype.hasOwnProperty.call(state,key))return;
        const value=state[key];
        if(n.type==='checkbox')n.checked=value===true;
        else if(typeof value==='string' && (n.tagName!=='SELECT' || [...n.options].some(o=>o.value===value)))n.value=value;
      });
      document.querySelectorAll('input[type=radio][name]').forEach(n=>{if(Object.prototype.hasOwnProperty.call(state,'quiz:'+n.name))n.checked=state['quiz:'+n.name]===n.value});
      for(const [key,points] of Object.entries(rewardPoints)){if(state['game:'+key]===true)earned.set(key,points);else if(state['game:'+key]===false)earned.delete(key);}
      refreshGame();$('#mission-success').hidden=!exit.every((_,i)=>earned.has('final-'+i));
      if(Object.prototype.hasOwnProperty.call(state,'view:written-guide'))$('#written-guide').hidden=state['view:written-guide']!==true;
      const a=state['arrows:state'];
      if(a){discoveredChanges.clear();if(Array.isArray(a.discovered))a.discovered.filter(k=>Object.prototype.hasOwnProperty.call(changes,k)).forEach(k=>discoveredChanges.add(k));selectedChange=Object.prototype.hasOwnProperty.call(changes,a.selected)?a.selected:null;updateArrowBoxes();}
      const m=state['mystery:state'];
      if(m){mysteryIndex=Math.max(0,Math.min(mysteries.length-1,Math.trunc(Number(m.index)||0)));solved.clear();if(Array.isArray(m.solved))m.solved.filter(i=>Number.isInteger(i)&&i>=0&&i<mysteries.length).forEach(i=>solved.add(i));renderMystery();}
      const lab=state['thermal:state'];
      if(lab && (lab.direction!==direction || lab.progress!==progress || lab.power!==heaterPower || lab.motion!==window.matterMotionPlaying())){setDirection(lab.direction==='cooling'?'cooling':'heating');progress=Math.max(0,Math.min(100,Number(lab.progress)||0));heaterPower=lab.power===2?2:1;running=false;if(typeof lab.motion==='boolean' && lab.motion!==window.matterMotionPlaying())$('#particle-motion').click();}
      ['matter-angle','emphasise-motion','motion-trails'].forEach(id=>document.getElementById(id).dispatchEvent(new Event(id==='matter-angle'?'input':'change')));
      if(e && ['hotter','same'].includes(e.answer))$('[data-energy-answer="'+e.answer+'"]').click();
      window.vocabularyProgress.restore(state['vocabulary:practice']);
      feedback().forEach(n=>{const f=state['feedback:'+n.id];if(f && typeof f.text==='string'){n.textContent=f.text;n.hidden=f.hidden===true;n.classList.toggle('wrong',f.wrong===true);}});
      $('#cloze-reveal').textContent=blanks.some((_,i)=>!$('#blank-feedback-'+i).hidden&&$('#blank-feedback-'+i).textContent.startsWith('Answer:'))?'Hide answers':'Show answers';
      examQuestions.forEach((q,i)=>{$('#exam-score-'+i).textContent=$$('.self-mark[data-question="'+i+'"]:checked').length+' / '+q.marks+' self-assessed marks';});
      filterWords();syncWordToggle();
      if(['lesson','explore','map','compare','words','practice','exam'].includes(state['view:page'])){navigateLesson(state['view:page'],{historyEntry:false,focus:false});history.replaceState(null,'','#'+state['view:page']);}
      update();
      if(active && active.isConnected && active!==document.body){active.focus({preventScroll:true});if(typeof selection==='number' && typeof active.setSelectionRange==='function'){try{active.setSelectionRange(selection,selection);}catch{}}}
    } finally { window.lessonState.restoring=false; }
  }
  window.lessonState = {capture,restore,restoring:false};
})();
