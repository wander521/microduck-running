// Learned race actions run on the SAME three-duck MuJoCo world. These helpers
// change policy/controller memory only; they never write a root pose/velocity.
import { projectedGravity, PHYSICS_DT } from './constants.js';
import { updateSkillServos } from './skill-servos.js';

export async function raceActor(world, p, slot, key, command) {
  const task=world.runtime.raceTasks[key],session=world.runtime.policies[key];
  if(!task||!session)throw new Error(`Missing race policy: ${key}`);
  const {qpos:q,qvel:v}=world.data,obs=new Float32Array(61);
  const gravity=projectedGravity(q.slice(slot.baseQ+3,slot.baseQ+7));
  obs.set(v.slice(slot.baseV+3,slot.baseV+6));obs.set(gravity,3);
  if(slot.raceActorKey!==key){
    slot.raceActorKey=key;slot.racePreviousVelocity=Float32Array.from(slot.dof.map(a=>v[a]));
    slot.raceHistory=Array.from({length:5},()=>slot.targets.slice());slot.raceHistoryIndex=0;
  }
  for(let j=0;j<14;j++){
    obs[6+j]=q[slot.qpos[j]]-task.defaultPose[j];obs[20+j]=slot.racePreviousVelocity[j];
    slot.racePreviousVelocity[j]=v[slot.dof[j]];
  }
  obs.set(slot.lastAction,34);obs.set(command,48);
  if(key==='running'&&p.lookTime>0){obs[53]=.25*Math.sin(p.lookTime*10);obs[54]=.08*Math.sin(p.lookTime*5);}
  const out=await session.run({[session.inputNames[0]]:new world.runtime.ort.Tensor('float32',obs,[1,61])});
  const action=out[session.outputNames[0]].data;
  if(action.length!==14||!action.every(Number.isFinite))throw new Error('Invalid race skill action');
  slot.lastAction.set(action);
  for(let j=0;j<14;j++)slot.targets[j]=task.defaultPose[j]+action[j]*task.actionScale;
}

export function clearRaceActor(slot){
  slot.raceActorKey=null;slot.motorTargets=undefined;slot.raceHistory=null;
}

export function raceActorServos(world){
  for(const slot of world.slots.values())if(slot.raceActorKey){
    slot.raceHistory[slot.raceHistoryIndex].set(slot.targets);
    slot.raceHistoryIndex=(slot.raceHistoryIndex+1)%5;
    slot.motorTargets=slot.raceHistory[slot.raceHistoryIndex];
    updateSkillServos({model:world.model,data:world.data,mj:world.runtime.mj,slot},world.runtime.raceTasks[slot.raceActorKey].nominal);
  }
}

export function raceSteeringForces(world){
  // Arcade steering is a bounded REAL yaw torque, not root pose/velocity
  // correction. Learned gait still drives translation; contacts can trip it.
  const limit=world.runtime.raceAssistTorqueLimit??.025;
  for(const p of world.room.players.values()){
    const slot=world.slots.get(p.id),d=world.data;
    d.xfrc_applied.fill(0,slot.bodyId*6,slot.bodyId*6+6);
    const up=-projectedGravity(d.qpos.slice(slot.baseQ+3,slot.baseQ+7))[2];
    if(!p.raceAssist||p.raceHold||slot.recovery||slot.roll||up<.7)continue;
    const target=p.raceCommand?.[2]||0,actual=d.qvel[slot.baseV+5];
    d.xfrc_applied[slot.bodyId*6+5]=Math.max(-limit,Math.min(limit,(target-actual)*.018));
    // Limited lateral road assistance, with no forward drive or upward lift.
    // A fast duck can still overshoot a tight bend and trip across the rim.
    if(p.raceNormal){
      const [nx,ny]=p.raceNormal,normalSpeed=d.qvel[slot.baseV]*nx+d.qvel[slot.baseV+1]*ny;
      const wanted=Math.max(-1,Math.min(1,-p.raceLateral*1.5));
      const force=Math.max(-.65,Math.min(.65,(wanted-normalSpeed)*.7));
      d.xfrc_applied[slot.bodyId*6]=nx*force;d.xfrc_applied[slot.bodyId*6+1]=ny*force;
    }
  }
}

export function beginRaceRoll(slot){
  slot.roll={elapsed:0,rotation:0,frontier:0,stable:0,ready:false};
}

export function sampleRaceRolls(world){
  for(const slot of world.slots.values())if(slot.roll){
    const roll=slot.roll,d=world.data,r=d.xmat.subarray(slot.bodyId*9,slot.bodyId*9+9);
    roll.elapsed+=PHYSICS_DT;
    if(roll.elapsed<.6)continue; // Learned stand wind-up before learned roll.
    // A complete forward revolution must precede a sustained upright landing.
    roll.rotation+=d.qvel[slot.baseV+4]*PHYSICS_DT;
    roll.frontier=Math.max(roll.frontier,roll.rotation);
    const upright=r[8]>.90&&d.qpos[slot.baseQ+2]>.08&&Math.hypot(...d.qvel.slice(slot.baseV+3,slot.baseV+6))<3;
    roll.stable=upright&&roll.frontier>5.24?roll.stable+PHYSICS_DT:0;
    roll.ready=roll.stable>=.12;
  }
}
