import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {batchStaticMeshes} from '../src/static-batch.js';
import {loadPhysicsRuntime} from '../src/physics/world.mjs';
import {RaceWorld} from '../src/physics/race-world.js';
import {skillPresentation,skillFrame} from '../src/physics/skill-presentation.js';
import {racePresentation} from '../src/physics/race-presentation.js';
import {isRallyDisplayGeom} from '../src/physics/rally-geometry.js';

// Compare actual compiled collision geometry, not a second handwritten fixture.
test('race presentation keeps all displayed props and exact transforms while excluding static rails from frames',async()=>{
 const runtime=await loadPhysicsRuntime(),world=new RaceWorld(runtime);
 try{
  const before=skillPresentation(world);before.geoms=before.geoms.filter(g=>isRallyDisplayGeom(runtime.mj,world.model,g.id));
  const after=racePresentation(world),all=[...after.geoms,...after.staticGeoms].sort((a,b)=>a.id-b.id);
  assert.deepEqual(all.map(({pose,...g})=>g),before.geoms);
  const oldFrame=skillFrame(world,before),newFrame=skillFrame(world,after);
  for(const [i,g]of before.geoms.entries()){
   const fixed=after.staticGeoms.find(p=>p.id===g.id),j=after.geoms.findIndex(p=>p.id===g.id);
   assert.deepEqual(Float32Array.from(fixed?.pose||newFrame.poses.slice(j*12,j*12+12)),oldFrame.poses.slice(i*12,i*12+12));
  }
  assert.ok(newFrame.poses.byteLength<oldFrame.poses.byteLength*.1);
  const ids=after.geoms.map(g=>g.id);world.reset();assert.deepEqual(racePresentation(world).geoms.map(g=>g.id),ids);
 }finally{world.dispose();}
});

test('static batching preserves world vertices, colours and shadow roles across nested transforms',()=>{
 const root=new THREE.Group();root.rotation.x=-Math.PI/2;
 for(let i=0;i<12;i++){
  const parent=new THREE.Group();parent.position.set(i*.1,i*.03,.2);parent.rotation.y=i*.2;root.add(parent);
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(.1,.2,.3),new THREE.MeshStandardMaterial({color:i%2?'#bd4930':'#fff7e7',roughness:1}));mesh.castShadow=i<6;mesh.receiveShadow=true;parent.add(mesh);
 }
 const triangles=()=>{
  root.updateMatrixWorld(true);const rows=[];
  root.traverse(mesh=>{if(!mesh.isMesh)return;const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry,p=g.attributes.position;
   for(let i=0;i<p.count;i++)rows.push([mesh.material.color.getHex(),mesh.castShadow,mesh.receiveShadow,...new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).toArray().map(v=>v.toFixed(5))].join(','));
   if(g!==mesh.geometry)g.dispose();
  });return rows.sort();
 };
 const before=triangles(),counts=batchStaticMeshes(root);assert.equal(counts.before,12);assert.equal(counts.after,4);assert.deepEqual(triangles(),before);
});
