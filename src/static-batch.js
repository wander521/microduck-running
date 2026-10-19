import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Bake only immutable, untextured scenery. Moving props, flags and ducks keep
// their own transforms; this never touches the MuJoCo collision model.
export function batchStaticMeshes(root,include=()=>true) {
  root.updateMatrixWorld(true);
  const inverse=root.matrixWorld.clone().invert(),batches=new Map(),sources=[];
  root.traverse(mesh=>{
    if(!mesh.isMesh||!include(mesh)||Array.isArray(mesh.material)||mesh.material.map)return;
    const m=mesh.material;
    const key=[m.type,m.color.getHex(),m.roughness,m.metalness,m.side,m.opacity,m.transparent,mesh.castShadow,mesh.receiveShadow].join('/');
    if(!batches.has(key))batches.set(key,{material:m,castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow,geometries:[]});
    let geometry=mesh.geometry.clone();
    if(geometry.index){const expanded=geometry.toNonIndexed();geometry.dispose();geometry=expanded;}
    for(const name of Object.keys(geometry.attributes))if(name!=='position'&&name!=='normal')geometry.deleteAttribute(name);
    geometry.clearGroups();geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));
    batches.get(key).geometries.push(geometry);sources.push(mesh);
  });
  for(const mesh of sources)mesh.removeFromParent();
  const keptMaterials=new Set();
  for(const batch of batches.values()){
    const geometry=mergeGeometries(batch.geometries,false);
    if(!geometry)throw new Error('Static scenery geometry could not be batched');
    const mesh=new THREE.Mesh(geometry,batch.material);mesh.name='static-scenery-batch';mesh.castShadow=batch.castShadow;mesh.receiveShadow=batch.receiveShadow;root.add(mesh);keptMaterials.add(batch.material);
    batch.geometries.forEach(g=>g.dispose());
  }
  new Set(sources.map(m=>m.geometry)).forEach(g=>g.dispose());
  new Set(sources.map(m=>m.material)).forEach(m=>{if(!keptMaterials.has(m))m.dispose();});
  return {before:sources.length,after:batches.size};
}
