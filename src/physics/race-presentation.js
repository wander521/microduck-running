import {isRallyDisplayGeom} from './rally-geometry.js';

// The race draws the robot GLB separately. Extract only the primitive scenery
// actually displayed, and send fixed shore transforms just once.
export function racePresentation(world) {
  const {model:m,mj,data}=world,names=['sphere','capsule','cylinder','box'];
  const types=names.map(n=>mj.mjtGeom['mjGEOM_'+n.toUpperCase()].value);
  const geoms=[],staticGeoms=[];
  for(let id=0;id<m.ngeom;id++){
    if(!isRallyDisplayGeom(mj,m,id))continue;
    const type=names[types.indexOf(m.geom_type[id])];
    if(!type)throw new Error(`Unsupported racing prop: ${id}`);
    const material=m.geom_matid[id];
    const rgba=material>=0?m.mat_rgba.slice(material*4,material*4+4):m.geom_rgba.slice(id*4,id*4+4);
    const geom={id,type,mesh:null,texture:null,size:[...m.geom_size.slice(id*3,id*3+3)],rgba:[...rgba]};
    const name=mj.mj_id2name(m,mj.mjtObj.mjOBJ_GEOM.value,id)||'';
    if(name.startsWith('rally_shore_'))staticGeoms.push({...geom,pose:[...data.geom_xpos.slice(id*3,id*3+3),...data.geom_xmat.slice(id*9,id*9+9)]});
    else geoms.push(geom);
  }
  return {geoms,staticGeoms,meshes:[],textures:[],ropeSites:[]};
}
