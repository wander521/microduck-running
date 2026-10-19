import {coastPoint} from '../coast-map.js';
import {rallyPoint,RALLY_LENGTH,RALLY_COURSE,RALLY_OBSTACLES,roadHalfWidth} from './rally-map.js';
const point=(p,h)=>[p.x,-p.z,h];
export function appendRallyGeometry(doc,world){
 const el=(tag,attrs,parent=world)=>{const node=doc.createElement(tag);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,Array.isArray(v)?v.join(' '):String(v));parent.appendChild(node);return node;};
 const geom=(attrs,parent=world)=>el('geom',{friction:'.8 .01 .001',contype:1,conaffinity:1,rgba:'.94 .84 .65 1',...attrs},parent);
 for(const side of[-1,1])for(let i=0;i<192;i++){
  if(i%24<3)continue; // Real gaps let a recovering duck rejoin the road.
  const p=rallyPoint((i+.5)*RALLY_LENGTH/192,side*(roadHalfWidth((i+.5)*RALLY_LENGTH/192)+.015));
  const a=rallyPoint(i*RALLY_LENGTH/192,side*(roadHalfWidth(i*RALLY_LENGTH/192)+.015)),b=rallyPoint((i+1)*RALLY_LENGTH/192,side*(roadHalfWidth((i+1)*RALLY_LENGTH/192)+.015));
  // Rounded low lip: still physical, but no vertical 25mm step that traps feet.
  geom({name:`rally_curb_${side}_${i}`,type:'capsule',fromto:[...point(a,-.008),...point(b,-.008)],size:.0175});
 }
 // A real coastal railing follows dry land. It is displayed from these same
 // geoms; outside the island the old infinite walkable plane is gone.
 for(let i=0;i<160;i++){
  const a=coastPoint(i*Math.PI*2/160,-.12),b=coastPoint((i+1)*Math.PI*2/160,-.12);
  const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),yaw=Math.atan2(-dz,dx);
  for(const [level,height]of[.045,.15,.255].entries())geom({name:`rally_shore_rail_${i}_${level}`,type:'capsule',fromto:[a.x,-a.z,height,b.x,-b.z,height],size:.016,rgba:'.69 .55 .37 1'});
  if(i%3===0)geom({name:`rally_shore_post_${i}`,type:'cylinder',pos:[a.x,-a.z,.17],size:[.022,.17],rgba:'.56 .44 .31 1'});
 }
 for(const o of RALLY_OBSTACLES){
  const yaw=Math.atan2(-o.tz,o.tx);
  if(o.kind==='crate')geom({name:'rally_'+o.id,type:'box',pos:point(o,o.size[2]),size:o.size,euler:[0,0,yaw],rgba:'.56 .35 .19 1'});
  if(o.kind==='barrel'){
   const body=el('body',{name:'rally_'+o.id,pos:point(o,o.height/2)});el('freejoint',{name:'rally_'+o.id+'_free'},body);
   geom({name:'rally_'+o.id+'_shape',type:'cylinder',size:[o.radius,o.height/2],mass:o.mass,condim:6,friction:'.28 .003 .0003',solref:'.01 .25',rgba:'.74 .29 .19 1'},body);
   geom({name:'rally_'+o.id+'_band',type:'cylinder',size:[o.radius+.001,.012],mass:0,contype:0,conaffinity:0,rgba:'1 .97 .91 1'},body);
  }
  if(o.kind==='turnstile'){
   // The complete light obstacle can fall over. No anchored post or hinge
   // remains under a duck after the first real impact.
   const body=el('body',{name:'rally_'+o.id,pos:point(o,.018),euler:[0,0,yaw]});
   el('freejoint',{name:'rally_'+o.id+'_free'},body);
   geom({name:'rally_'+o.id+'_base',type:'cylinder',size:[.035,.018],mass:.012,friction:'.25 .002 .0002',rgba:'.25 .36 .37 1'},body);
   geom({name:'rally_'+o.id+'_post',type:'capsule',fromto:[0,0,0,0,0,.085],size:.012,mass:.006,rgba:'.25 .36 .37 1'},body);
   geom({name:'rally_'+o.id+'_arm',type:'capsule',fromto:[-o.length/2,0,.085,o.length/2,0,.085],size:o.radius,mass:.008,rgba:'.94 .64 .23 1'},body);

  }
 }
 // Landmark bases are physical too; foliage stays decorative.
 for(const [i,x,z,r,h]of[[0,-1.45,0,.045,.6],[1,.95,.25,.05,.65],[2,1.65,-.1,.04,.5],[3,-.9,-.35,.04,.45]])geom({name:`rally_tree_${i}`,type:'cylinder',pos:[x,-z,h/2],size:[r,h/2],rgba:'.56 .44 .31 1'});
 geom({name:'rally_lighthouse',type:'cylinder',pos:[-.25,0,.4],size:[.115,.4],rgba:'1 .97 .91 1'});
}
export function isRallyDisplayGeom(mj,model,id){
 const name=mj.mj_id2name(model,mj.mjtObj.mjOBJ_GEOM.value,id)||'';
 return name.startsWith('rally_')&&!name.startsWith('rally_curb_')&&!name.startsWith('rally_tree_')&&name!=='rally_lighthouse';
}
