// Minimal racer roster shared by the physical race and post-race ceremony.
export function createRoom(){return {players:new Map(),balls:[{id:0,x:0,z:0,y:.05,vx:0,vz:0,cooldown:0}],scores:{blue:0,orange:0},ai:false,dancing:false,dance:null,performance:{bpm:128,move:3,choir:false},goal:null,revision:0};}
export function addPlayer(room,id,name,team='blue'){const p={id,name,team,x:0,z:0,yaw:0,mode:'walk',speed:0,forward:0,turn:0,spectator:false,quack:0,kick:0,resetRevision:0,kickRequested:false};room.players.set(id,p);return p;}
