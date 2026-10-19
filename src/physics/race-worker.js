import {loadBrowserRuntime} from './browser-runtime.js';
import {RaceWorld} from './race-world.js';
import {skillFrame} from './skill-presentation.js';
import {racePresentation} from './race-presentation.js';
import {Ceremony} from './ceremony.js';
let runtime,world,presentation,ceremony,result,running=false,busy=false,timer,resetPending=false,input={auto:true,assist:true},requests={};
function frame(){const value=skillFrame(world,presentation);postMessage({type:'frame',...value,running,race:result||world.snapshot(),ceremony:ceremony?.snapshot()},[value.poses.buffer,value.sites.buffer]);}
function reset(){ceremony?.dispose();ceremony=null;result=null;world.reset();requests={};resetPending=false;postMessage({type:'reset'});}
function fail(e){running=false;clearTimeout(timer);postMessage({type:'error',message:e.message||String(e)});}
async function pump(){timer=null;if(busy||!running||!world)return;busy=true;const t=performance.now();try{if(resetPending)reset();if(ceremony)await ceremony.step();else{const command={...input,...requests};requests={};await world.step(command);if(world.ended){result=world.snapshot();ceremony=new Ceremony(runtime,result);postMessage({type:'finished',race:result});}}if(resetPending)reset();frame();}catch(e){fail(e);}finally{busy=false;if(running)timer=setTimeout(pump,Math.max(0,20-(performance.now()-t)));}}
self.onmessage=({data})=>{if(data.type==='init'){(async()=>{runtime=await loadBrowserRuntime((value,message)=>postMessage({type:'progress',value,message}));world=new RaceWorld(runtime);presentation=racePresentation(world);postMessage({type:'ready',presentation});frame();})().catch(fail);return;}if(!world)return;
 if(data.type==='input'){for(const k of['boost','roll','recover'])if(data[k]&&!input[k])requests[k]=true;input=data;return;}
 if(data.type==='play'){running=!!data.value;if(!running){clearTimeout(timer);timer=null;if(!busy)frame();}else if(!busy&&!timer)pump();return;}
 if(data.type==='reset'){running=false;clearTimeout(timer);timer=null;resetPending=true;if(!busy){reset();frame();}}
};
