(() => {
 const canvas=document.getElementById('matter-canvas'),ctx=canvas.getContext('2d');
 let temp=-20,time=0,last=0,angle=28*Math.PI/180,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,emphasise=true,trailOn=true,w=0,h=0;
 let seed=913;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
 const unit=()=>{let a=[rand()-.5,rand()-.5,rand()-.5],l=Math.hypot(...a);return a.map(v=>v/l)};
 const particles=Array.from({length:64},(_,i)=>{const anchor=[(i%4-1.5)*.46,-1.48+Math.floor(i/16)*.46,(Math.floor(i/4)%4-1.5)*.46];return {i,rank:((i*29%64)+.5)/64,anchor,p:anchor.slice(),v:unit(),phase:rand()*6.28,oscillation:0,motionScale:.65+rand()*.7,kind:'solid',trail:[]}});
 // A common temperature factor is used across phases: no speed jump at a plateau.
 function motionFactor(T){const ratio=(T+273.15)/273.15;return emphasise?Math.pow(ratio,3):Math.sqrt(ratio)}
 window.setMatterThermal=(from,to,f,T)=>{temp=T;particles.forEach(p=>{let k=from;if(from!==to){if(from==='solid'||to==='solid'){const solidFraction=to==='solid'?f:1-f;k=p.rank<solidFraction?'solid':'liquid'}else{const gasFraction=to==='gas'?f:1-f;k=p.rank<gasFraction?'gas':'liquid'}}if(k!==p.kind){p.kind=k;p.trail=[];if(k==='solid')p.p=p.anchor.slice()}})};
 window.resetMatter=(kind)=>{particles.forEach(p=>{p.kind=kind;p.p=kind==='solid'?p.anchor.slice():kind==='gas'?[(rand()-.5)*3.9,(rand()-.5)*3.9,(rand()-.5)*3.9]:[p.anchor[0],p.anchor[1],p.anchor[2]];p.v=unit();p.trail=[]})};
 window.matterMotionPlaying=()=>playing;
 window.pauseMatter=()=>{playing=!playing;return playing};
 document.getElementById('emphasise-motion').onchange=e=>emphasise=e.target.checked;
 document.getElementById('motion-trails').onchange=e=>{trailOn=e.target.checked;particles.forEach(p=>p.trail=[])};
 document.getElementById('matter-angle').oninput=e=>angle=+e.target.value*Math.PI/180;
 let drag=null;canvas.onpointerdown=e=>{if(!e.isPrimary||e.button!==0)return;drag=e.clientX;canvas.setPointerCapture(e.pointerId)};canvas.onpointermove=e=>{if(drag!==null){angle+=(e.clientX-drag)*.008;drag=e.clientX;document.getElementById('matter-angle').value=((angle*180/Math.PI+540)%360)-180}};canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>drag=null;
 function solidMotion(T){const kelvin=Math.max(1,T+273.15),ratio=kelvin/253.15;return {frequency:emphasise?7*Math.pow(ratio,8):10,amplitude:Math.min(.045,.03*Math.sqrt(ratio))}}
 function move(dt){time+=dt;const factor=motionFactor(temp),vibration=solidMotion(temp);for(const p of particles){if(p.kind==='solid'){p.oscillation+=dt*vibration.frequency*p.motionScale;for(let k=0;k<3;k++){p.p[k]=p.anchor[k]+vibration.amplitude*Math.sin(p.oscillation+p.phase+k*2.1)}}else{const speed=1.25*factor*p.motionScale;for(let k=0;k<3;k++){p.p[k]+=p.v[k]*speed*dt;const low=p.kind==='liquid'?(k===1?-1.57:-.88):-2.04,high=p.kind==='liquid'?(k===1?.05:.88):2.04;if(p.p[k]<low){p.p[k]+=(low-p.p[k])*Math.min(1,dt*4);p.v[k]=Math.abs(p.v[k])}if(p.p[k]>high){p.p[k]+=(high-p.p[k])*Math.min(1,dt*4);p.v[k]=-Math.abs(p.v[k])}}}
 if(trailOn&&p.kind!=='solid'){p.trail.push(p.p.slice());if(p.trail.length>10)p.trail.shift()}}
 // Excluded volume and direction changes; the model is schematic, not molecular dynamics.
 for(let i=0;i<64;i++)for(let j=i+1;j<64;j++){const a=particles[i],b=particles[j];if(a.kind==='solid'&&b.kind==='solid')continue;const d=b.p.map((v,k)=>v-a.p[k]),len=Math.hypot(...d);if(len>0&&len<.39){const n=d.map(v=>v/len),over=(.39-len)*.5;for(let k=0;k<3;k++){if(a.kind!=='solid')a.p[k]-=n[k]*over;if(b.kind!=='solid')b.p[k]+=n[k]*over}const dot=a.v.reduce((s,v,k)=>s+(v-b.v[k])*n[k],0);if(dot>0){for(let k=0;k<3;k++){a.v[k]-=dot*n[k];b.v[k]+=dot*n[k]}for(const p of [a,b]){const l=Math.hypot(...p.v)||1;p.v=p.v.map(v=>v/l)}}}}
 }
 function resize(){w=canvas.clientWidth;h=canvas.clientHeight;const d=Math.min(devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0)}new ResizeObserver(resize).observe(canvas);
 function project(p){let x=p[0]*Math.cos(angle)+p[2]*Math.sin(angle),z=-p[0]*Math.sin(angle)+p[2]*Math.cos(angle),y=p[1]*.94-z*.342;z=p[1]*.342+z*.94;const scale=Math.min(w/6.8,h/6.2)*8/(8+z);return {x:w/2+x*scale,y:h/2-y*scale,z,scale}}
 const corners=[[-2.3,-2.3,-2.3],[2.3,-2.3,-2.3],[2.3,-2.3,2.3],[-2.3,-2.3,2.3],[-2.3,2.3,-2.3],[2.3,2.3,-2.3],[2.3,2.3,2.3],[-2.3,2.3,2.3]],edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
 function draw(){ctx.clearRect(0,0,w,h);
 for(const face of [[0,1,5,4],[0,3,7,4],[0,1,2,3]]){ctx.fillStyle='rgba(169,218,231,.10)';ctx.beginPath();face.forEach((n,i)=>{const q=project(corners[n]);if(i===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y)});ctx.closePath();ctx.fill()}
 ctx.strokeStyle='#7daebd';ctx.lineWidth=1;for(const[a,b]of edges){const p=project(corners[a]),q=project(corners[b]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}
 // Stationary reference crosses show lattice sites, not bonds.
 ctx.strokeStyle='rgba(44,111,138,.38)';ctx.lineWidth=1;for(const p of particles){if(p.kind!=='solid')continue;const q=project(p.anchor),r=.25*q.scale;ctx.beginPath();ctx.moveTo(q.x-r,q.y);ctx.lineTo(q.x+r,q.y);ctx.moveTo(q.x,q.y-r);ctx.lineTo(q.x,q.y+r);ctx.stroke()}
 const items=particles.map(p=>({...project(p.p),p})).sort((a,b)=>b.z-a.z);for(const item of items){if(trailOn&&item.p.trail.length>1){ctx.strokeStyle='#50bbcf';ctx.lineWidth=2;ctx.globalAlpha=.32;ctx.beginPath();item.p.trail.forEach((p,i)=>{const q=project(p);if(i===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y)});ctx.stroke();ctx.globalAlpha=1}
 const r=.195*item.scale,g=ctx.createRadialGradient(item.x-r*.35,item.y-r*.4,r*.08,item.x,item.y,r);g.addColorStop(0,'#edffff');g.addColorStop(.24,'#75e7ee');g.addColorStop(.65,'#20b8d0');g.addColorStop(1,'#008ca9');ctx.fillStyle=g;ctx.beginPath();ctx.arc(item.x,item.y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#007e9e';ctx.lineWidth=.7;ctx.stroke()}}
 function frame(now){const dt=Math.min(.035,(now-last)/1000||0);last=now;if(!document.hidden&&!document.getElementById('explore').hidden&&w>0&&h>0){if(playing)move(dt);draw()}requestAnimationFrame(frame)}requestAnimationFrame(frame);
})();
