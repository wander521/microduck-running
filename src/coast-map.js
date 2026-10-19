import {rallyPoint,RALLY_LENGTH,roadHalfWidth} from './physics/rally-map.js';
const N=192,TAU=Math.PI*2;
const edges=[-1,1].map(side=>Array.from({length:513},(_,i)=>{const s=i*RALLY_LENGTH/512;return rallyPoint(s,side*(roadHalfWidth(s)+.04));}));
const cross=(a,b)=>a.x*b.z-a.z*b.x;
const raw=Array.from({length:N},(_,i)=>{const a=i*TAU/N,d={x:Math.cos(a),z:Math.sin(a)};let r=0;for(const edge of edges)for(let j=0;j<512;j++){const p=edge[j],q=edge[j+1],e={x:q.x-p.x,z:q.z-p.z},den=cross(d,e);if(Math.abs(den)<1e-9)continue;const t=cross(p,e)/den,u=cross(p,d)/den;if(t>0&&u>=0&&u<=1)r=Math.max(r,t);}return r;});
const radii=raw.map((r,i)=>(raw[(i+N-2)%N]+2*raw[(i+N-1)%N]+3*r+2*raw[(i+1)%N]+raw[(i+2)%N])/9+.7);
export function coastPoint(angle,offset=0){const a=((angle%TAU)+TAU)%TAU,t=a*N/TAU,i=Math.floor(t),u=t-i,r=radii[i]*(1-u)+radii[(i+1)%N]*u+offset+.05*Math.sin(a*7)+.035*Math.cos(a*11);return{x:r*Math.cos(a),z:r*Math.sin(a)};}
export function coastContains(p,offset=0){const a=Math.atan2(p.z,p.x),c=coastPoint(a,offset);return Math.hypot(p.x,p.z)<=Math.hypot(c.x,c.z);}
