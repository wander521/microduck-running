import {PhysicsWorld} from './world-core.js';
import {createRoom,addPlayer} from '../simulation.js';
import {DEFAULT_POSE} from './constants.js';
// Post-race staging is separate from competitive physics. Winner joint angles
// come from the existing trained dance policy and actual MuJoCo integration.
export class Ceremony {
 constructor(runtime,result){this.result=result;const room=createRoom();this.player=addPlayer(room,'champion','冠军');this.player.x=0;this.player.z=0;room.dancing=true;room.performance={bpm:128,move:3};this.world=new PhysicsWorld(runtime,room,{halfLength:3,halfWidth:3,goalHalfWidth:.4,goalDepth:.2,goalHeight:.3,runoff:0,ballRadius:.05});}
 async step(){await this.world.step();}
 snapshot(){const p=this.player;return {time:this.world.danceTime||0,racers:this.result.racers.map(r=>{const rank=this.result.standings.find(s=>s.id===r.id).rank,place=[{x:0,h:.42},{x:-.59,h:.27},{x:.59,h:.17}][rank-1];return {...r,x:place.x+(rank===1?p.x:0),z:rank===1?p.z+.12:0,height:place.h+(rank===1?(p.height||.125):.125),quat:rank===1?(p.quat||[Math.SQRT1_2,0,0,-Math.SQRT1_2]):[Math.SQRT1_2,0,0,-Math.SQRT1_2],joints:rank===1?(p.joints||DEFAULT_POSE):DEFAULT_POSE,extraJoints:rank===1?p.extraJoints:{}};})};}
 dispose(){this.world.dispose();}
}
