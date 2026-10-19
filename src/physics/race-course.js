import {RALLY_COURSE,RALLY_LENGTH,rallyPoint,nearestRallyPoint,RALLY_OBSTACLES,roadHalfWidth} from './rally-map.js';
export const RACE_COURSE=RALLY_COURSE;
export const COURSE_LENGTH=RALLY_LENGTH;
export const coursePoint=rallyPoint;
export const courseDistance=p=>nearestRallyPoint(p).distance;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const RACE_GATES=Object.freeze(Array.from({length:RACE_COURSE.gates},(_,i)=>({...coursePoint(i*COURSE_LENGTH/RACE_COURSE.gates),distance:i*COURSE_LENGTH/RACE_COURSE.gates})));
export function crossedGate(before,after,gate,halfWidth=RACE_COURSE.halfWidth){
 const signed=p=>(p.x-gate.x)*gate.tx+(p.z-gate.z)*gate.tz,a=signed(before),b=signed(after);
 if(a>=0||b<0||b-a<=1e-10)return false;
 const u=-a/(b-a),x=before.x+u*(after.x-before.x)-gate.x,z=before.z+u*(after.z-before.z)-gate.z;
 return Math.abs(-x*gate.tz+z*gate.tx)<=halfWidth;
}
export function raceGuide(player,nextGate,lane=0,{avoid=true,escape=0,obstacles=RALLY_OBSTACLES,roadHalfWidth}={}){
 const nearest=nearestRallyPoint(player);
 let offset=lane;
 if(avoid)for(const o of obstacles){
  const ahead=(o.x-player.x)*nearest.tx+(o.z-player.z)*nearest.tz;
  if(ahead>-.25&&ahead<1.3&&Math.hypot(o.x-player.x,o.z-player.z)<1.5){
   const side=-(o.x-nearest.x)*nearest.tz+(o.z-nearest.z)*nearest.tx;
   offset=side>=0?-.32:.32;break;
  }
 }
 // Navigation ALWAYS follows the forward tangent, including after a tumble.
 // A missed gate remains pending for a forward revisit; it must never make
 // the controller target a point behind the duck and drive a lap backwards.
 const station=nearest.station+(nearest.distance>RACE_COURSE.halfWidth?.65:1.05);
 if(nearest.distance>RACE_COURSE.halfWidth)offset=0;
 if(escape)offset=escape*.33;
 const target=coursePoint(station,offset),angle=Math.atan2(-(target.z-player.z),target.x-player.x)-player.yaw;
 const error=Math.atan2(Math.sin(angle),Math.cos(angle));
 return {forward:.95*clamp(1-Math.abs(error)*.45,.3,1),turn:clamp(error*1.7,-1,1),lateral:nearest.lateral-offset,normal:[-nearest.tz,-nearest.tx]};
}
export class RaceJudge{
 constructor(position){this.reset(position);}
 reset(position){this.previous={x:position.x,z:position.z};this.nextGate=1;this.passed=0;this.laps=0;this.elapsed=0;this.status='racing';this.finish=null;this.events=[];this.falls=0;this.recoveries=0;this.fallen=false;this.stableFor=0;this.offTrackFor=0;}
 sample(position,dt){
  if(this.status!=='racing')return;
  if(![position.x,position.z,position.height,position.upright,dt].every(Number.isFinite)||dt<=0)throw new TypeError('Invalid measured race state');
  this.elapsed+=dt;
  if(Math.hypot(position.x-this.previous.x,position.z-this.previous.z)>.15)this.status='invalid';
  const down=position.height<.07||position.upright<.5;
  if(down&&!this.fallen){this.fallen=true;this.falls++;this.stableFor=0;}
  if(this.fallen){this.stableFor=!down&&position.upright>.88&&position.height>.08?this.stableFor+dt:0;if(this.stableFor>=.4){this.fallen=false;this.recoveries++;}}
  this.offTrackFor=courseDistance(position)>RACE_COURSE.halfWidth+.06?this.offTrackFor+dt:0;
  if(this.elapsed>=RACE_COURSE.timeLimit-1e-8)this.status='timeout';
  // A physical tumble across a gate is still a valid forward crossing.
  if(this.status==='racing'&&crossedGate(this.previous,position,RACE_GATES[this.nextGate],roadHalfWidth(RACE_GATES[this.nextGate].distance)+.45)){
   this.events.push({gate:this.nextGate,time:this.elapsed,x:position.x,z:position.z});this.passed++;this.nextGate=(this.nextGate+1)%RACE_GATES.length;
   if(this.passed%RACE_GATES.length===0)this.laps++;
   if(this.laps===RACE_COURSE.laps){this.status='finished';this.finish=this.elapsed;}
  }
  this.previous={x:position.x,z:position.z};
 }
}
