import {coastPoint} from '../coast-map.js';
export const TERRAIN=Object.freeze({stripWidth:.25,depth:1.2});
export function terrainHeight(x,z){const a=Math.atan2(z,x),edge=coastPoint(a,.08),d=Math.hypot(edge.x,edge.z)-Math.hypot(x,z);return d>=0?0:-TERRAIN.depth;}
// Finite flat land tiles preserve the flat-ground contact used by the learned
// roll. Their outside edges follow the coast; nothing at sea height supports
// a duck offshore. Adjacent strips meet exactly, without overlapping tops.
const outline=Array.from({length:513},(_,i)=>coastPoint(i*Math.PI*2/512,.08));
export const ISLAND_SLABS=[];
for(let z=-6;z<6;z+=TERRAIN.stripWidth){const mid=z+TERRAIN.stripWidth/2,xs=[];for(let i=0;i<512;i++){const a=outline[i],b=outline[i+1];if((a.z<=mid&&b.z>mid)||(b.z<=mid&&a.z>mid))xs.push(a.x+(b.x-a.x)*(mid-a.z)/(b.z-a.z));}xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)ISLAND_SLABS.push({x:(xs[i]+xs[i+1])/2,z:mid,halfX:(xs[i+1]-xs[i])/2,halfZ:TERRAIN.stripWidth/2});}
