// Shared physical and visual circuit description; every turn is filleted.
// A club-racing circuit: long start straight, fast right bend, coastal S,
// tight left hairpin and a top chicane. Exact circular corner fillets keep
// tangents continuous and avoid the folding offsets of sharp splines.
export const CIRCUIT_VERTICES=Object.freeze([
 [-3.4,2.6],[3.7,2.6],[5.2,1.3],[4.3,0],[5,-1.5],[3.8,-2.7],
 [2,-2.7],[.8,-1.35],[-1.2,-1.35],[-2.5,-2.7],[-4.8,-2.7],
 [-5.3,-1.3],[-4.1,.2],[-4.9,1.4],
].map(Object.freeze));
const norm=(x,z)=>{const n=Math.hypot(x,z);return{x:x/n,z:z/n};};
const corners=CIRCUIT_VERTICES.map((v,i,all)=>{const prev=all[(i+all.length-1)%all.length],next=all[(i+1)%all.length],u=norm(v[0]-prev[0],v[1]-prev[1]),w=norm(next[0]-v[0],next[1]-v[1]),angle=Math.atan2(u.x*w.z-u.z*w.x,u.x*w.x+u.z*w.z),radius=.78,tangent=radius*Math.tan(Math.abs(angle)/2);return{v,u,w,angle,radius,tangent};});
// Reserve straight road between neighbouring fillets; scale only the local
// corner if necessary instead of permitting two curves to overlap.
for(let pass=0;pass<3;pass++)for(let i=0;i<corners.length;i++){const a=corners[i],b=corners[(i+1)%corners.length],available=Math.hypot(b.v[0]-a.v[0],b.v[1]-a.v[1])*.92,sum=a.tangent+b.tangent;if(sum>available){const k=available/sum;a.tangent*=k;a.radius*=k;b.tangent*=k;b.radius*=k;}}
const parts=[];
for(let i=0;i<corners.length;i++){
 const c=corners[i],next=corners[(i+1)%corners.length],sign=Math.sign(c.angle),a={x:c.v[0]-c.u.x*c.tangent,z:c.v[1]-c.u.z*c.tangent},b={x:c.v[0]+c.w.x*c.tangent,z:c.v[1]+c.w.z*c.tangent},center={x:a.x-c.u.z*c.radius*sign,z:a.z+c.u.x*c.radius*sign};
 const startAngle=Math.atan2(a.z-center.z,a.x-center.x);
 parts.push({kind:'arc',length:Math.abs(c.angle)*c.radius,radius:c.radius,center,startAngle,angle:c.angle});
 const end={x:next.v[0]-next.u.x*next.tangent,z:next.v[1]-next.u.z*next.tangent};
 parts.push({kind:'line',length:Math.hypot(end.x-b.x,end.z-b.z),a:b,b:end});
}
let total=0;for(const p of parts){p.start=total;total+=p.length;}
export const RALLY_LENGTH=total;
export const MIN_CORNER_RADIUS=Math.min(...corners.map(c=>c.radius));
// The first arc is followed by the pit straight. Put the start on that straight.
const origin=parts[0].length+2.4;
export const RALLY_COURSE=Object.freeze({halfWidth:.52,startHalfWidth:.76,gates:24,laps:2,countdown:3,timeLimit:720,finishGrace:10,shoreX:7.6,shoreZ:5});
export function roadHalfWidth(distance){const d=((distance%total)+total)%total,fromStart=Math.min(d,total-d),u=Math.max(0,Math.min(1,(fromStart-.3)/.9));return .76-.24*u*u*(3-2*u);}
export function rallyPoint(distance,lane=0){const s=(((distance+origin)%total)+total)%total,p=parts.find(p=>s<p.start+p.length)||parts.at(-1),u=(s-p.start)/p.length;let x,z,tx,tz;
 if(p.kind==='line'){x=p.a.x+(p.b.x-p.a.x)*u;z=p.a.z+(p.b.z-p.a.z)*u;tx=(p.b.x-p.a.x)/p.length;tz=(p.b.z-p.a.z)/p.length;}
 else{const a=p.startAngle+p.angle*u,sign=Math.sign(p.angle);x=p.center.x+p.radius*Math.cos(a);z=p.center.z+p.radius*Math.sin(a);tx=-Math.sin(a)*sign;tz=Math.cos(a)*sign;}
 return{x:x-tz*lane,z:z+tx*lane,tx,tz};}
const length=total;
export const RALLY_POLYLINE=Object.freeze(Array.from({length:513},(_,i)=>Object.freeze({...rallyPoint(length*i/512),distance:length*i/512})));
export const RALLY_WAYPOINTS=Object.freeze(Array.from({length:24},(_,i)=>{const p=rallyPoint(length*i/24);return Object.freeze([p.x,p.z]);}));
export function nearestRallyPoint(p){let best=null;for(let i=0;i<512;i++){const a=RALLY_POLYLINE[i],b=RALLY_POLYLINE[i+1],dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz))),x=a.x+dx*u,z=a.z+dz*u,d=Math.hypot(p.x-x,p.z-z);if(!best||d<best.distance){const n=Math.hypot(dx,dz),tx=dx/n,tz=dz/n;best={x,z,tx,tz,distance:d,lateral:-(p.x-x)*tz+(p.z-z)*tx,station:a.distance+u*(b.distance-a.distance)};}}return best;}
const at=(fraction,lane)=>rallyPoint(length*fraction,lane);
export const RALLY_OBSTACLES=Object.freeze([
 ...[.13,.16,.31,.34,.55,.76].map((f,i)=>({id:`barrel-${i}`,kind:'barrel',...at(f,i%2?.18:-.18),radius:.05,height:.13,mass:.018})),
 ...[.22,.43,.64,.84].map((f,i)=>({id:`crate-${i}`,kind:'crate',...at(f,i%2?-.15:.15),size:[.09,.09,.095]})),
 ...[.39,.70].map((f,i)=>({id:`turnstile-${i}`,kind:'turnstile',...at(f),radius:.013,length:.36,height:.11})),
]);
export const RALLY_ZONES=Object.freeze([{label:'zoneStraight',fraction:.05},{label:'zoneS',fraction:.25},{label:'zoneLighthouse',fraction:.47},{label:'zoneHairpin',fraction:.69},{label:'zoneFinish',fraction:.90}]);
