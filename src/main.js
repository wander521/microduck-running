import './style.css';
import {createPerformanceProbe} from './performance.js';
import {batchStaticMeshes} from './static-batch.js';
import { t, racerName, applyTranslations, getLanguage, setLanguage } from './i18n.js';
applyTranslations();
import * as THREE from 'three';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createRaceStage} from './race-stage.js';import {loadRacePrototype,createRaceDucks} from './race-ducks.js';import {createPodium} from './podium.js';
const elements=new Map(),$=s=>{if(!elements.has(s))elements.set(s,document.querySelector(s));return elements.get(s);},canvas=$('#world'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
const probe=createPerformanceProbe(canvas);
const scene=new THREE.Scene();scene.background=new THREE.Color('#2e8caa');const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.04,160),controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.minDistance=.6;controls.maxDistance=55;controls.maxPolarAngle=Math.PI*.48;
scene.add(new THREE.HemisphereLight(0xf2f8ff,0x697b65,2.4));const sun=new THREE.DirectionalLight(0xfff3da,3);sun.position.set(2,5,3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.0001;scene.add(sun,sun.target);
const stage=createRaceStage(scene),podium=createPodium(scene),physical=new THREE.Group();physical.rotation.x=-Math.PI/2;scene.add(physical);
let ready=false,running=false,result=false,overview=false,followAnchorPending=true,ducks,props=[],lastRoot,previousRoot,latest,lastFrame,ceremonyTime=0;
let renderDirty=true,visualFrom=null,visualAt=0,visualInterval=20;
controls.addEventListener('change',()=>{renderDirty=true;});
const followRoot=new THREE.Vector3(),followDelta=new THREE.Vector3();
const held=new Set(),mat=new THREE.Matrix4();const colours={you:'blue',orange:'coral',salt:'mint'};
const prototypeReady=loadRacePrototype().then(prototype=>({prototype}),error=>({error}));
const worker=new Worker(new URL('./physics/race-worker.js',import.meta.url),{type:'module'});
function view(){renderDirty=true;followAnchorPending=!lastRoot;camera.clearViewOffset();document.body.classList.toggle('is-follow',!overview&&!result);previousRoot=null;
 if(result){camera.position.set(1.5,1.3,2.7);controls.target.set(0,.42,0);camera.setViewOffset(innerWidth,innerHeight,-80,0,innerWidth,innerHeight);}
 else if(overview){const w=innerWidth,h=innerHeight,left=230,right=w-264,top=102,bottom=h-124,aw=Math.max(300,right-left),ah=Math.max(240,bottom-top),tan=Math.tan(20*Math.PI/180);const distance=Math.max(16.7/(2*tan*camera.aspect*aw/w),11.5/(2*tan*ah/h));camera.position.set(.01,distance*.91,distance*.42);controls.target.set(0,0,0);camera.setViewOffset(w,h,w/2-(left+right)/2,h/2-(top+bottom)/2,w,h);}
 else{const p=lastRoot||[0,0,.125],center=new THREE.Vector3(p[0],.15,-p[1]);controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(-1.15,.92,1.35));}
 camera.updateProjectionMatrix();controls.update();text('#camera',t(overview?'follow':'overview'));$('#camera').setAttribute('aria-pressed',overview);}
function geometry(g){const s=g.size;if(g.type==='box')return new THREE.BoxGeometry(s[0]*2,s[1]*2,s[2]*2);if(g.type==='cylinder'){const v=new THREE.CylinderGeometry(s[0],s[0],s[1]*2,20);v.rotateX(Math.PI/2);return v;}if(g.type==='capsule'){const v=new THREE.CapsuleGeometry(s[0],s[1]*2,6,12);v.rotateX(Math.PI/2);return v;}return new THREE.SphereGeometry(s[0],16,12);}
function applyPose(mesh,a,o=0){mat.set(a[o+3],a[o+4],a[o+5],0,a[o+6],a[o+7],a[o+8],0,a[o+9],a[o+10],a[o+11],0,0,0,0,1);mesh.position.set(a[o],a[o+1],a[o+2]);mesh.quaternion.setFromRotationMatrix(mat);}
function setup(presentation){
 const fixed=new THREE.Group();physical.add(fixed);
 for(const g of [...presentation.staticGeoms,...presentation.geoms]){
  const mesh=new THREE.Mesh(geometry(g),new THREE.MeshStandardMaterial({color:new THREE.Color(...g.rgba.slice(0,3)),roughness:.8}));mesh.castShadow=mesh.receiveShadow=true;
  if(g.pose){applyPose(mesh,g.pose);fixed.add(mesh);}else{physical.add(mesh);props.push({mesh,id:g.id});}
 }
 batchStaticMeshes(fixed);
}
const text=(selector,value)=>{const el=$(selector),next=String(value);if(el.textContent!==next)el.textContent=next;};
const html=(selector,value)=>{const el=$(selector);if(el.innerHTML!==value)el.innerHTML=value;};
let lastHUDTick=-1,lastHUDRunning,standingsOrder='';
const standingNodes=new Map(['you','orange','salt'].map(id=>{const li=$(`[data-racer="${id}"]`);return [id,{li,place:li.querySelector('.place'),detail:li.querySelector('.racer-detail')}];}));
const setNodeText=(el,value)=>{const next=String(value);if(el.textContent!==next)el.textContent=next;};
function time(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(1).padStart(4,'0')}`;}
function input(){worker.postMessage({type:'input',forward:Number(held.has('forward'))-Number(held.has('back')),turn:Number(held.has('left'))-Number(held.has('right')),auto:$('#auto').checked,assist:$('#assist').checked,boost:held.has('boost'),roll:held.has('roll'),recover:held.has('recover'),brake:held.has('brake')});document.querySelectorAll('[data-drive]').forEach(b=>b.classList.toggle('is-held',held.has(b.dataset.drive)));}
function clear(){held.clear();input();}
function renderResults(race){
 text('#result-title',t(race.finish===null||race.failure?'podiumTitle':race.rank===1?'winnerTitle':'finishedTitle'));
 text('#result-caption',t('winnerCaption',{name:racerName(race.standings[0].id)}));
 $('#result-list').replaceChildren(...race.standings.map(r=>{
  const li=document.createElement('li'),rank=document.createElement('span'),dot=document.createElement('i'),name=document.createElement('span'),detail=document.createElement('span');
  rank.className='place';rank.textContent=r.rank;dot.className='dot '+colours[r.id];name.textContent=racerName(r.id);detail.className='racer-detail';detail.textContent=r.finish===null?t('dnf'):time(r.finish);li.append(rank,dot,name,detail);return li;
 }));
}
function showResult(race){result=true;held.clear();document.body.classList.add('is-podium');$('#result').hidden=false;renderResults(race);stage.setVisible(false);physical.visible=false;podium.setVisible(true);text('#play',t('pauseParty'));view();}
function draw(data,forceHUD=false){
 if(data!==lastFrame){const now=performance.now();visualInterval=Math.min(100,Math.max(8,now-visualAt));visualAt=now;visualFrom=lastFrame&&!!lastFrame.ceremony===!!data.ceremony&&data.running?lastFrame:data;lastFrame=data;}renderDirty=true;renderer.shadowMap.needsUpdate=true;latest=data.race;lastRoot=data.root;running=data.running;
 if(!overview&&followAnchorPending&&!data.ceremony)view();
 if(!data.ceremony){props.forEach(({mesh,id},i)=>{applyPose(mesh,data.poses,i*12);mesh.visible=!data.race.hiddenGeoms.includes(id);});stage.update(data.race);
 }else{ceremonyTime=data.ceremony.time;podium.update(ceremonyTime);}
 const hudTick=Math.floor(performance.now()/100);if(!forceHUD&&hudTick===lastHUDTick&&running===lastHUDRunning)return;lastHUDTick=hudTick;lastHUDRunning=running;
 const r=data.race;
 html('#lap',`${Math.min(r.laps+1,2)} <small>/ 2</small>`);html('#rank',`${r.rank} <small>/ 3</small>`);text('#time',time(r.time));
 text('#status',t(result?'ceremony':!running?(r.time>0?'paused':'ready'):r.waiting?'finalStatus':r.stage==='countdown'?'starting':'racing'));
 text('#play',t(result?(running?'pauseParty':'resumeParty'):(running?'pause':r.time>0?'resume':'start')));
 $('#progress').value=r.passed;text('#progress-label',Math.floor(r.passed/48*100)+'%');text('#gate',r.waiting?t('finalPush'):t('gate',{gate:r.nextGate===0?24:r.nextGate}));
 text('#events',t('events',{falls:r.falls,recoveries:r.recoveries,crates:r.brokenCrates}));
 text('#situation',r.waiting?t('firstFinished',{seconds:Math.ceil(r.finishGrace||0)}):t(r.justKnockedHurdle?'hurdleDown':r.justBrokeCrate?'crateBroken':r.rolling?'rollNote':r.recovering?'recoverNote':r.offTrack?'offTrack':'situation'));
 text('#boost span',r.boost>0?t('sprinting'):r.boostCooldown>0?`${Math.ceil(r.boostCooldown)}s`:t('sprint'));text('#roll span',r.rolling?t('rolling'):r.rollCooldown>0?`${Math.ceil(r.rollCooldown)}s`:t('roll'));
 const order=r.standings.map(s=>s.id).join(',');
 for(const standing of r.standings){const {li,place,detail}=standingNodes.get(standing.id);li.style.order=standing.rank;setNodeText(place,standing.rank);setNodeText(detail,standing.finish!==null?time(standing.finish):r.stage==='countdown'?t('ready'):`${Math.floor(standing.passed/48*100)}%`);if(order!==standingsOrder)$('#racer-list').append(li);}standingsOrder=order;
 const finalCountdown=r.finishGrace!==null&&!result;$('#countdown').classList.toggle('finish-countdown',finalCountdown);$('#countdown').hidden=finalCountdown?false:!running||r.stage!=='countdown';text('#countdown',finalCountdown?t('finalSeconds',{seconds:Math.max(0,Math.ceil(r.finishGrace))}):Math.max(1,Math.ceil(r.countdown)));
}
function error(message){$('#loading').hidden=true;$('#error').hidden=false;text('#error-message',message);text('#status',t('loadFailed'));$('#play').disabled=true;}
worker.onmessage=async({data})=>{if(data.type==='progress'){probe.progress(data.message);$('#load-progress').value=data.value;$('#load-message').dataset.i18n=data.message;text('#load-message',t(data.message));}if(data.type==='ready'){try{const loaded=await prototypeReady;if(loaded.error)throw loaded.error;ducks=createRaceDucks(scene,loaded.prototype);setup(data.presentation);if(lastFrame)draw(lastFrame,true);ready=true;probe.ready();$('#loading').hidden=true;$('#game').setAttribute('aria-busy','false');$('#play').disabled=false;$('#restart').disabled=false;input();}catch(e){error(t('resourceError'));}}if(data.type==='frame')draw(data);if(data.type==='finished')showResult(data.race);if(data.type==='reset'){result=false;lastFrame=null;visualFrom=null;previousRoot=null;lastRoot=null;ceremonyTime=0;$('#result').hidden=true;document.body.classList.remove('is-podium');stage.setVisible(true);physical.visible=true;podium.setVisible(false);overview=false;view();}if(data.type==='error')error(t('resourceError'));};worker.onerror=()=>error(t('resourceError'));
function play(){if(!ready)return;running=!running;worker.postMessage({type:'play',value:running});$('#options').open=false;canvas.focus({preventScroll:true});if(!running)clear();}
function reset(){if(!ready)return;running=false;clear();worker.postMessage({type:'reset'});}
$('#play').addEventListener('click',play);$('#restart').addEventListener('click',reset);$('#camera').addEventListener('click',()=>{overview=!overview;view();});$('#retry').addEventListener('click',()=>location.reload());$('#auto').addEventListener('change',clear);$('#assist').addEventListener('change',input);
$('#language').addEventListener('click',()=>{setLanguage(getLanguage()==='en'?'zh':'en');stage.setLanguage();if(lastFrame)draw(lastFrame,true);if(result&&latest)renderResults(latest);text('#camera',t(overview?'follow':'overview'));if(!$('#error').hidden)error(t('resourceError'));});
const keys={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',ShiftLeft:'boost',ShiftRight:'boost',KeyE:'brake',KeyF:'roll',KeyM:'recover'};
window.addEventListener('keydown',e=>{if(e.target.closest('input,summary,button,a'))return;if(keys[e.code]&&!result){e.preventDefault();held.add(keys[e.code]);if(['forward','back','left','right'].includes(keys[e.code]))$('#auto').checked=false;input();}if(e.repeat)return;if(e.code==='Space'){e.preventDefault();play();}if(e.code==='KeyR')reset();if(e.code==='KeyC'){overview=false;view();}});window.addEventListener('keyup',e=>{if(keys[e.code]){held.delete(keys[e.code]);input();}});window.addEventListener('blur',clear);
for(const b of document.querySelectorAll('[data-drive]')){b.addEventListener('pointerdown',e=>{if(!ready||result)return;e.preventDefault();b.setPointerCapture(e.pointerId);held.add(b.dataset.drive);input();});for(const type of['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>{held.delete(b.dataset.drive);input();});}
document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();worker.postMessage({type:'play',value:false});}});window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;view();});function present(){
 if(!lastFrame)return;
 const from=visualFrom||lastFrame,blend=running?Math.min(1,(performance.now()-visualAt)/visualInterval):1;
 ducks?.update(lastFrame.ceremony||lastFrame.race,from.ceremony||from.race,blend);
 if(!overview&&!result){
  followRoot.set(THREE.MathUtils.lerp(from.root[0],lastFrame.root[0],blend),0,-THREE.MathUtils.lerp(from.root[1],lastFrame.root[1],blend));
  if(previousRoot){followDelta.copy(followRoot).sub(previousRoot);camera.position.add(followDelta);controls.target.add(followDelta);}else previousRoot=new THREE.Vector3();previousRoot.copy(followRoot);
 }
}
view();renderer.setAnimationLoop(()=>{
 if(renderDirty||running)present();controls.update();
 if(!renderDirty&&!running)return;
 if(running)renderer.shadowMap.needsUpdate=true;
 const renderStart=performance.now();renderer.render(scene,camera);renderDirty=false;
 probe.frame(renderer,`${ready?'ready':'loading'}-${running?'running':'idle'}-${overview?'overview':'follow'}`,performance.now()-renderStart);
});worker.postMessage({type:'init'});
