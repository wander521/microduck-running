import {writeFile,mkdir} from 'node:fs/promises';
import {loadPhysicsRuntime} from '../src/physics/world.mjs';
import {RaceWorld} from '../src/physics/race-world.js';
import {skillPresentation,skillFrame} from '../src/physics/skill-presentation.js';
import {racePresentation} from '../src/physics/race-presentation.js';
import {isRallyDisplayGeom} from '../src/physics/rally-geometry.js';
const runtime=await loadPhysicsRuntime(),world=new RaceWorld(runtime);
try{
 const measure=fn=>{const samples=[];let value;for(let i=0;i<12;i++){const start=performance.now();value=fn();samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);return {value,medianMs:+samples[6].toFixed(3)};};
 const before=measure(()=>{const p=skillPresentation(world);p.geoms=p.geoms.filter(g=>isRallyDisplayGeom(runtime.mj,world.model,g.id));return p;}),after=measure(()=>racePresentation(world));
 const report={note:'Same native MuJoCo model, twelve read-only extraction samples. Not a browser FPS benchmark.',before:{geoms:before.value.geoms.length,presentationMedianMs:before.medianMs,poseBytes:skillFrame(world,before.value).poses.byteLength},after:{dynamicGeoms:after.value.geoms.length,staticGeoms:after.value.staticGeoms.length,presentationMedianMs:after.medianMs,poseBytes:skillFrame(world,after.value).poses.byteLength}};
 await mkdir('evidence',{recursive:true});await writeFile('evidence/presentation-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{world.dispose();}
