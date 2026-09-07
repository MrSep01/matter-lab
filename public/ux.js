// Navigation and feedback keep the student's place and writing intact.
$('.brand').addEventListener('click',e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey){e.preventDefault();navigateLesson('lesson')}});
$$('[data-jump]').forEach(b=>b.onclick=()=>{const target=document.getElementById(b.dataset.jump);if(!target)return;const page=target.closest('.page');if(page?.hidden)navigateLesson(page.id,{focus:false});target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'})});
function followLessonHash(focus){const key=location.hash.slice(1);if($$('.page').some(p=>p.id===key))navigateLesson(key,{historyEntry:false,focus});}
window.addEventListener('hashchange',()=>followLessonHash(true));
navigateLesson('lesson',{historyEntry:false,focus:false});followLessonHash(false);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){running=false;update()}});
// A revised response must be checked again; previous self-marks no longer apply.
$$('#exam-items textarea').forEach((input,i)=>input.addEventListener('input',()=>{$$('.self-mark[data-question="'+i+'"]').forEach(box=>box.checked=false);$('#exam-score-'+i).textContent='0 / '+examQuestions[i].marks+' self-assessed marks · check your revised answer.'}));
function syncWordToggle(){const allOpen=$$('#vocab > details').every(c=>c.open);definitionsOpen=allOpen;$('#words-toggle').textContent=allOpen?'Hide definitions':'Show definitions';$('#words-toggle').setAttribute('aria-expanded',String(allOpen));}
$$('#vocab > details').forEach(c=>c.addEventListener('toggle',syncWordToggle));syncWordToggle();
$('#quest-next').addEventListener('click',()=>{const question=$('#quest-question');question.tabIndex=-1;question.focus({preventScroll:true});question.scrollIntoView({behavior:reduced?'auto':'smooth',block:'center'})});
$('#temperature-next').addEventListener('click',()=>{const question=$('#temperature-question');question.tabIndex=-1;question.focus({preventScroll:true})});
