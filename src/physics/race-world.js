import { PhysicsWorld } from './world-core.js';
import { createRoom, addPlayer } from '../simulation.js';
import { RaceJudge, raceGuide, coursePoint, RACE_COURSE, RACE_GATES } from './race-course.js';
import { CONTROL_DT, projectedGravity } from './constants.js';
import { beginRaceRoll, clearRaceActor } from './race-actor.js';
import { RALLY_OBSTACLES } from './rally-map.js';

export const RACE_FIELD = Object.freeze({ activity:'race',rally:true, halfLength:6.4, halfWidth:4.1,
  goalHalfWidth:.4, goalDepth:0, goalHeight:.3, runoff:.1, ballRadius:.05 });
export class RaceWorld {
  constructor(runtime) { this.runtime=runtime;this.mj=runtime.mj;this.reset(); }
  reset() {
    this.physics?.dispose();
    this.room=createRoom();this.room.ai=false;this.room.balls=[];
    this.racers=[['you','海蓝 · 你',0],['orange','珊瑚',-.36],['salt','薄荷',.36]].map(([id,name,lane])=>{
      const player=addPlayer(this.room,id,name,id==='orange'?'orange':'blue');
      const start=coursePoint(-.32,lane);Object.assign(player,{x:start.x,z:start.z,yaw:Math.atan2(-start.tz,start.tx)});
      return {player,lane,judge:new RaceJudge(player),boost:0,cooldown:0,rollCooldown:0,speedCommand:0,stuckFor:0,escape:0,escapeSide:id==='orange'?-1:1,anchor:{x:player.x,z:player.z}};
    });
    this.physics=new PhysicsWorld(this.runtime,this.room,RACE_FIELD);
    this.physics.syncState();
    this.navigationProps=RALLY_OBSTACLES.map(o=>({...o,body:(o.kind==='barrel'||o.kind==='turnstile')?this.mj.mj_name2id(this.model,this.mj.mjtObj.mjOBJ_BODY.value,'rally_'+o.id):-1}));
    this.time=0;this.stage='countdown';this.countdown=RACE_COURSE.countdown;this.failure=null;
    this.finishGrace=null;this.raceStarted=false;this.task={controlDt:CONTROL_DT};
    this.boostHeld=false;this.recoverHeld=false;this.rollHeld=false;
  }
  get model(){return this.physics.model;}
  get data(){return this.physics.data;}
  state(){const p=this.racers[0].player;return {position:[p.x,-p.z,p.height??.125]};}
  get ended(){return ['complete','ended'].includes(this.stage);}
  async step(input={}) {
    if(this.ended)return;
    const starting=this.stage==='countdown';
    const obstacles=this.navigationProps.filter(o=>(o.kind!=='crate'||!this.physics.rallyProps.crates[Number(o.id.split('-')[1])].broken)&&(o.kind!=='turnstile'||!this.physics.rallyProps.knocked.has(Number(o.id.split('-')[1])))).map(o=>o.body<0?o:{...o,x:this.data.xpos[o.body*3],z:-this.data.xpos[o.body*3+1]});
    for(const [i,racer]of this.racers.entries()) {
      const p=racer.player;
      racer.boost=Math.max(0,racer.boost-CONTROL_DT);racer.cooldown=Math.max(0,racer.cooldown-CONTROL_DT);p.lookTime=Math.max(0,(p.lookTime||0)-CONTROL_DT);
      racer.rollCooldown=Math.max(0,racer.rollCooldown-CONTROL_DT);
      const slot=this.physics.slots.get(p.id);
      p.runningPolicy=!!this.runtime.policies.running;
      p.raceAssist=i>0||input.assist!==false;
      const moving=!starting&&racer.judge.status==='racing';
      p.raceHold=!moving;
      racer.escape=Math.max(0,racer.escape-CONTROL_DT);
      if(moving&&!p.recovery&&!p.rolling){
        racer.stuckFor+=CONTROL_DT;
        if(Math.hypot(p.x-racer.anchor.x,p.z-racer.anchor.z)>.3){racer.stuckFor=0;racer.anchor={x:p.x,z:p.z};}
        if(racer.stuckFor>2.5){racer.escape=1.4;racer.escapeSide*=-1;racer.stuckFor=0;racer.anchor={x:p.x,z:p.z};}
      }else{racer.stuckFor=0;racer.anchor={x:p.x,z:p.z};}
      const guide=raceGuide(p,racer.judge.nextGate,racer.lane,{escape:racer.escape>0?racer.escapeSide:0,obstacles});
      p.raceLateral=guide.lateral;p.raceNormal=guide.normal;
      const command=!moving?{forward:0,turn:0}:i===0&&!input.auto?
        {forward:input.forward<0?.35:input.forward>0?1:guide.forward,turn:Math.max(-1,Math.min(1,Number(input.turn)||0))}:guide;
      if(i===0&&moving&&!input.auto&&input.assist!==false&&Math.abs(command.turn)<.05)command.turn=guide.turn;
      if(moving&&!p.recovery&&!racer.judge.fallen){
        const request=i===0?input.boost&&!this.boostHeld:Math.abs(guide.turn)<.2&&racer.judge.elapsed>4+i*2;
        if(request&&racer.cooldown===0){racer.boost=.85;racer.cooldown=7;}
      }else racer.boost=0;
      if(i===0&&moving&&input.recover&&!this.recoverHeld){
        this.physics.rallyProps.releaseNear(p,this.time);
        slot.roll=null;p.rolling=false;p.rollResult=null;clearRaceActor(slot);
        slot.recovery='stand';slot.recoveryTime=0;slot.fallenFor=0;p.recovery='stand';
        racer.boost=0;
      }
      if(i===0&&moving&&input.roll&&!this.rollHeld&&racer.rollCooldown===0&&!p.recovery&&!slot.roll&&!racer.judge.fallen&&this.runtime.policies.roulade){
        beginRaceRoll(slot);p.rolling=true;p.rollResult=null;racer.rollCooldown=8;racer.boost=0;
      }
      const desired=!moving||slot.roll?0:input.brake&&i===0?.3:command.forward*(p.runningPolicy?(racer.boost>0?1.5:1.0):(racer.boost>0?.8:.3));
      racer.speedCommand+=Math.max(-CONTROL_DT*1.5,Math.min(CONTROL_DT*1.5,desired-racer.speedCommand));
      Object.assign(p,command,{raceCommand:[racer.speedCommand,0,command.turn*2]});
    }
    this.boostHeld=!!input.boost;this.recoverHeld=!!input.recover;this.rollHeld=!!input.roll;
    await this.physics.step();this.time=this.physics.elapsed;
    if(starting){
      this.countdown=Math.max(0,RACE_COURSE.countdown-this.time);
      if(this.countdown<1e-8){
        this.stage='racing';this.raceStarted=true;
        for(const r of this.racers)r.judge.reset(r.player);
      }
      return;
    }
    for(const r of this.racers){
      const p=r.player;
      r.judge.sample({x:p.x,z:p.z,height:p.height,upright:-projectedGravity(p.quat)[2]},CONTROL_DT);
    }
    const result=this.racers[0].judge;
    if(this.racers.some(r=>r.judge.status==='finished')&&this.finishGrace===null)this.finishGrace=this.time+RACE_COURSE.finishGrace;
    if(this.finishGrace!==null&&this.time>=this.finishGrace-1e-8)this.stage='complete';
    else if(result.status!=='racing'&&result.status!=='finished'){this.stage='ended';this.failure=result.status;}
    if(this.ended)for(const r of this.racers)Object.assign(r.player,{forward:0,turn:0});

  }
  snapshot(){
    const leader=[...this.racers].sort((a,b)=>{
      if(a.judge.finish!==null||b.judge.finish!==null)return (a.judge.finish??Infinity)-(b.judge.finish??Infinity);
      if(a.judge.status!=='racing'||b.judge.status!=='racing')return Number(a.judge.status!=='racing')-Number(b.judge.status!=='racing');
      if(a.judge.passed!==b.judge.passed)return b.judge.passed-a.judge.passed;
      const gate=RACE_GATES[a.judge.nextGate],along=r=>(r.player.x-gate.x)*gate.tx+(r.player.z-gate.z)*gate.tz;
      const difference=along(b)-along(a);return Math.abs(difference)<1e-7?0:difference;
    });
    const own=this.racers[0].judge;
    return {stage:this.stage,countdown:this.countdown,time:own.elapsed,limit:RACE_COURSE.timeLimit,
      laps:own.laps,targetLaps:RACE_COURSE.laps,passed:own.passed,nextGate:own.nextGate,gates:RACE_GATES.length,
      standings:leader.map((r,i)=>({id:r.player.id,name:r.player.name,rank:i+1,finish:r.judge.finish,passed:r.judge.passed,status:r.judge.status})),
      waiting:this.finishGrace!==null&&!this.ended,finishGrace:this.finishGrace===null?null:Math.max(0,this.finishGrace-this.time),
      rank:leader.findIndex(r=>r===this.racers[0])+1,finish:own.finish,failure:this.failure,
      falls:own.falls,recoveries:own.recoveries,recovering:own.fallen||!!this.racers[0].player.recovery,offTrack:own.offTrackFor>0,
      boost:this.racers[0].boost,boostCooldown:this.racers[0].cooldown,
      knockedHurdles:this.physics.rallyProps.knocked.size,justKnockedHurdle:this.time-this.physics.rallyProps.lastKnock<1.8,
      brokenCrates:this.physics.rallyProps.broken,justBrokeCrate:this.time-this.physics.rallyProps.lastBreak<1.8,
      hiddenGeoms:this.physics.rallyProps.crates.filter(c=>c.broken).map(c=>c.geom),crateBursts:this.physics.rallyProps.events,worldTime:this.time,
      rolling:!!this.racers[0].player.rolling,rollCooldown:this.racers[0].rollCooldown,rollResult:this.racers[0].player.rollResult,fast:!!this.racers[0].player.runningPolicy,
      racers:this.racers.map(r=>({id:r.player.id,name:r.player.name,x:r.player.x,z:r.player.z,
        height:r.player.height,quat:r.player.quat,joints:r.player.joints,extraJoints:r.player.extraJoints,
        passed:r.judge.passed,status:r.judge.status,finish:r.judge.finish,falls:r.judge.falls,recoveries:r.judge.recoveries,recovery:r.player.recovery}))};
  }
  dispose(){this.physics.dispose();}
}
