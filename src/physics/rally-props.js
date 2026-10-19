// A real impact removes the intact box collider. Splinters are visual-only;
// they never enter the MuJoCo model, contacts, actor observations or solver.
export class RallyProps {
  constructor(world){
    this.world=world;this.crates=[];this.geomCrate=new Map();this.broken=0;this.lastBreak=-Infinity;
    const m=world.model,mj=world.runtime.mj;
    this.knocked=new Set();this.hurdles=new Map();this.lastKnock=-Infinity;
    this.events=[];this.launches=[];this.pending=[];this.applied=[];this.barrels=new Map();this.beforeVelocity=new Map();
    for(let c=0;c<4;c++){
      const geom=mj.mj_name2id(m,mj.mjtObj.mjOBJ_GEOM.value,`rally_crate-${c}`);
      if(geom<0)throw new Error('Missing breakable crate geometry');
      this.geomCrate.set(geom,c);this.crates.push({geom,broken:false});
    }
    this.hitters=new Set();
    for(let i=0;i<m.ngeom;i++){
      const n=mj.mj_id2name(m,mj.mjtObj.mjOBJ_GEOM.value,i)||'';
      const match=n.match(/^rally_turnstile-(\d+)_/);if(match){const id=Number(match[1]);if(!this.hurdles.has(id))this.hurdles.set(id,[]);this.hurdles.get(id).push(i);}
      if(n.startsWith('duck')||n.startsWith('rally_barrel'))this.hitters.add(i);
      if(/^rally_barrel-\d+_shape$/.test(n)){
        const body=m.geom_bodyid[i],joint=m.body_jntadr[body];
        this.barrels.set(i,{body,dof:m.jnt_dofadr[joint],mass:m.body_mass[body],last:-Infinity});
      }
    }
  }
  knock(id,time){if(this.knocked.has(id))return;this.knocked.add(id);this.lastKnock=time;for(const geom of this.hurdles.get(id)){this.world.model.geom_contype[geom]=8;this.world.model.geom_conaffinity[geom]=16;}}
  releaseNear(player,time){for(const[id,geoms]of this.hurdles){const body=this.world.model.geom_bodyid[geoms[0]],p=this.world.data.xpos;if(Math.hypot(p[body*3]-player.x,p[body*3+1]+player.z)<.4)this.knock(id,time);}}
  sample(time){
    const {data:d,model:m}=this.world,contacts=d.contact,breaks=new Set();
    try{for(let i=0;i<d.ncon;i++){
      const contact=contacts.get(i);
      try{
        const [a,b]=[contact.geom1,contact.geom2];
        for(const[id,geoms]of this.hurdles)if((geoms.includes(a)&&this.hitters.has(b))||(geoms.includes(b)&&this.hitters.has(a)))this.knock(id,time);
        for(const [piece,other]of[[a,b],[b,a]]){
          const barrel=this.barrels.get(piece);
          if(barrel&&time-barrel.last>1.2){
            const root=m.body_rootid[m.geom_bodyid[other]],name=this.world.runtime.mj.mj_id2name(m,this.world.runtime.mj.mjtObj.mjOBJ_BODY.value,root)||'';
            if(name.startsWith('duck')){
              const rootDof=m.jnt_dofadr[m.body_jntadr[root]],dx=d.xpos[barrel.body*3]-d.xpos[root*3],dy=d.xpos[barrel.body*3+1]-d.xpos[root*3+1],length=Math.hypot(dx,dy)||1;
              const rv=this.beforeVelocity.get(root),bv=this.beforeVelocity.get(barrel.body);
              const nx=dx/length,ny=dy/length,closing=rv&&bv?(rv[0]-bv[0])*nx+(rv[1]-bv[1])*ny:0;
              if(closing>.3){
                const speed=Math.min(2.8,1+closing),up=1.75;
                const delta=[nx*speed-d.qvel[barrel.dof],ny*speed-d.qvel[barrel.dof+1],Math.max(0,up-d.qvel[barrel.dof+2])];
                const energy=.5*barrel.mass*delta.reduce((s,v)=>s+v*v,0),budget=.16*.5*m.body_subtreemass[root]*closing*closing;
                const scale=Math.min(1,Math.sqrt(budget/Math.max(energy,1e-9)));
                const impulse=delta.map(v=>v*barrel.mass*scale);
                this.pending.push({body:barrel.body,root,impulse});barrel.last=time;this.launches.push({time,body:barrel.body,impulse,energyBudget:budget});
              }
            }
          }
          const id=this.geomCrate.get(piece);
          if(id===undefined||this.crates[id].broken||!this.hitters.has(other))continue;
          const body=m.geom_bodyid[other],speed=Math.hypot(...d.cvel.slice(body*6+3,body*6+6));
          if(speed>.22&&contact.dist<.002)breaks.add(id);
        }
      }finally{contact.delete();}
    }}finally{contacts.delete();}
    for(const id of breaks){
      const crate=this.crates[id];crate.broken=true;crate.brokenAt=time;this.broken++;this.lastBreak=time;
      m.geom_contype[crate.geom]=0;m.geom_conaffinity[crate.geom]=0;
      this.events.push({id,x:d.geom_xpos[crate.geom*3],z:-d.geom_xpos[crate.geom*3+1],time});
    }
  }
  clearImpulses(){
    for(const {body}of this.applied)this.world.data.xfrc_applied.fill(0,body*6,body*6+6);
    this.applied=[];
  }
  applyImpulses(){
    const force=this.world.data.xfrc_applied,dt=this.world.model.opt.timestep;
    for(const hit of this.pending){
      const f=hit.impulse.map(v=>v/dt);
      for(let a=0;a<3;a++){force[hit.body*6+a]+=f[a];force[hit.root*6+a]-=f[a];}
      this.applied.push({body:hit.body,force:f},{body:hit.root,force:f.map(v=>-v)});
    }
    this.pending=[];
    for(const slot of this.world.slots.values())this.beforeVelocity.set(slot.bodyId,[...this.world.data.qvel.slice(slot.baseV,slot.baseV+3)]);
    for(const b of this.barrels.values())this.beforeVelocity.set(b.body,[...this.world.data.qvel.slice(b.dof,b.dof+3)]);
  }
}
