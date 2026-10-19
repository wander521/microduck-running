import {DOMParser} from '@xmldom/xmldom';
export const POLICY_FILES={stand:'policies/BEST_alpha_stand.onnx',running:'skills/race-running/policy.onnx',roulade:'skills/roulade/policy.onnx',recover:'skills/stand/policy.onnx',dance:'policies/duckemw_dance.onnx'};
export const TASK_FILES={running:'skills/race-running/task.json',roulade:'skills/roulade/task.json',recover:'skills/stand/task-prone.json'};
export const TEMPLATE_FILES=['robot/robot_allcollisions.xml','robot/robot_dance.xml','policies/duckemw_dance.json'];
export async function createPhysicsRuntime({mj,ort,readText,readBinary,createPolicy,onProgress=()=>{}}){
 const parse=xml=>{const doc=new DOMParser().parseFromString(xml,'text/xml');for(const g of [...doc.getElementsByTagName('geom')])if(g.getAttribute('class')==='visual')g.parentNode.removeChild(g);return doc;};
 // Fetch independent assets together. Construct ONNX sessions serially so the
 // WASM allocator is initialized once and peak compilation memory stays bounded.
 const sceneAssets=Promise.all(TEMPLATE_FILES.map(readText)).then(async([walk,dance,info])=>{
  const templates={walk:parse(walk),dance:parse(dance)};
  const used=new Set(Object.values(templates).flatMap(doc=>[...doc.getElementsByTagName('geom')].map(g=>g.getAttribute('mesh')).filter(Boolean)));
  const buffers=await Promise.all([...used].map(async name=>[name,await readBinary(`robot/meshes/${name}.stl`)]));
  return {templates,used,buffers,info};
 });
 const [{templates,used,buffers,info},taskEntries,policyEntries]=await Promise.all([
  sceneAssets,
  Promise.all(Object.entries(TASK_FILES).map(async([key,path])=>[key,JSON.parse(await readText(path))])),
  Promise.all(Object.entries(POLICY_FILES).map(async([key,path])=>[key,path,await readBinary(path)])),
 ]);
 const vfs=new mj.MjVFS();
 for(const [name,buffer]of buffers)vfs.addBuffer(`assets/${name}.stl`,new Uint8Array(buffer));
 const policies={};
 for(const [i,[key,path,bytes]]of policyEntries.entries()){policies[key]=await createPolicy(path,bytes);onProgress(.5+(i+1)*.09,'loadingPolicies');}
 return{mj,ort,vfs,templates,used,policies,raceTasks:Object.fromEntries(taskEntries),danceInfo:JSON.parse(info),engineVersion:mj.mj_versionString()};
}
