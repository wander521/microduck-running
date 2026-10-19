import * as THREE from 'three';
import { buildRig,cloneRig,setJoint } from './duck-rig.js';
import { assetUrl } from './assets.js';
import { JOINT_NAMES } from './physics/constants.js';

let prototypePromise;
export function loadRacePrototype(){
  return prototypePromise??=(async()=>{
    const response=await fetch(assetUrl('assets/robot/kinematics.json'));
    if(!response.ok)throw new Error('机器鸭外壳资源没有准备好，请重新加载。');
    const k=await response.json();
    return buildRig({...k,mesh_dir:assetUrl('assets/robot/meshes')},{materialForMesh:(name,body,rgba)=>{
      if(name==='lens.stl')return {color:[.01,.012,.02],roughness:.05};
      if(/noenoeil|soft_mouth_top|jaw_soft/.test(name))return {color:[1,.413,.007],roughness:.4};
      if(/bottom_head_shell|^jaw\.stl|foot_|ankle_/.test(name))return {color:[1,.144,.008],roughness:.45};
      if(/sole_/.test(name))return {color:[1,.608,.021],roughness:.4};
      if(/top_head_shell|left_shell|right_shell|trunk_base|upper_leg_.*\.stl/.test(name))return {color:[.888,.86,.798],roughness:.35};
      if(/m12_lens_holder|xl330|yaw2roll|battery|speaker|noen/.test(name))return {color:[.012,.012,.014],roughness:.55,metalness:.3};
      if(/neck|leg\.stl|support|bearing/.test(name))return {color:[.256,.256,.279],roughness:.5,metalness:.35};
      return {color:rgba.slice(0,3),roughness:.7};
    }});
  })();
}
export function createRaceDucks(scene,prototype){
  const colours=['#55b6dc','#ef9679','#87cbb1'];
  const rigs=Array.from({length:3},(_,i)=>{
    const rig=cloneRig(prototype);
    // These are measured physical angles, including soft joint-limit motion;
    // the display must not clamp them or invent a second control trajectory.
    for(const joint of rig.joints.values())joint.range=null;
    rig.placer.traverse(object=>{if(object.isMesh){
      object.material=object.material.clone();
      if(/top_head_shell|left_shell|right_shell|trunk_base|upper_leg_.*\.stl/.test(object.userData.meshName||''))object.material.color.set(colours[i]);
      object.castShadow=true;object.receiveShadow=true;
    }});
    scene.add(rig.placer);return rig;
  });
  const fromQuat=new THREE.Quaternion(),toQuat=new THREE.Quaternion(),mix=THREE.MathUtils.lerp;
  return {
    update(state,previous=state,blend=1){state.racers.forEach((r,i)=>{
      const before=previous.racers[i];
      const rig=rigs[i],trunk=rig.bodies.get('trunk_base');
      rig.placer.position.set(mix(before.x,r.x,blend),0,mix(before.z,r.z,blend));trunk.position.set(0,0,mix(before.height,r.height,blend));
      fromQuat.set(before.quat[1],before.quat[2],before.quat[3],before.quat[0]);toQuat.set(r.quat[1],r.quat[2],r.quat[3],r.quat[0]);trunk.quaternion.slerpQuaternions(fromQuat,toQuat,blend);
      JOINT_NAMES.forEach((name,j)=>setJoint(rig,name,mix(before.joints[j],r.joints[j],blend)));
      for(const [name,value]of Object.entries(r.extraJoints||{}))setJoint(rig,name,mix(before.extraJoints?.[name]??value,value,blend));
    });},
    dispose(){rigs.forEach(rig=>{rig.placer.traverse(o=>{if(o.isMesh)o.material.dispose();});scene.remove(rig.placer);});},
  };
}
