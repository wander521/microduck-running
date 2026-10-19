import {DOMParser} from '@xmldom/xmldom';
export async function createPhysicsRuntime({mj,ort,readText,readBinary,createPolicy,onProgress=()=>{}}){
 const parse=xml=>{const doc=new DOMParser().parseFromString(xml,'text/xml');for(const g of [...doc.getElementsByTagName('geom')])if(g.getAttribute('class')==='visual')g.parentNode.removeChild(g);return doc;};
 const [walk,dance,info]=await Promise.all([readText('robot/robot_allcollisions.xml'),readText('robot/robot_dance.xml'),readText('policies/duckemw_dance.json')]);
 const templates={walk:parse(walk),dance:parse(dance)};const used=new Set(Object.values(templates).flatMap(doc=>[...doc.getElementsByTagName('geom')].map(g=>g.getAttribute('mesh')).filter(Boolean)));const vfs=new mj.MjVFS();
 for(const name of used)vfs.addBuffer(`assets/${name}.stl`,new Uint8Array(await readBinary(`robot/meshes/${name}.stl`)));
 const files={stand:'policies/BEST_alpha_stand.onnx',running:'skills/race-running/policy.onnx',roulade:'skills/roulade/policy.onnx',recover:'skills/stand/policy.onnx',dance:'policies/duckemw_dance.onnx'},policies={},raceTasks={};
 for(const [i,[key,file]]of Object.entries(files).entries()){policies[key]=await createPolicy(file);onProgress(.5+(i+1)*.09,'loadingPolicies');}
 for(const [key,path]of Object.entries({running:'skills/race-running/task.json',roulade:'skills/roulade/task.json',recover:'skills/stand/task-prone.json'}))raceTasks[key]=JSON.parse(await readText(path));
 return{mj,ort,vfs,templates,used,policies,raceTasks,danceInfo:JSON.parse(info),engineVersion:mj.mj_versionString()};
}
