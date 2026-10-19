import * as THREE from 'three';
export const PODIUM_PLACES=Object.freeze([{x:0,height:.42},{x:-.59,height:.27},{x:.59,height:.17}]);
export function createPodium(scene){
 const group=new THREE.Group();group.visible=false;scene.add(group);
 const texture=(text,colour)=>{const c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');x.fillStyle=colour;x.fillRect(0,0,256,256);x.fillStyle='#203746';x.font='bold 155px Bungee,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,128,145);return new THREE.CanvasTexture(c);};
 const textures=[];PODIUM_PLACES.forEach((p,i)=>{const mat=new THREE.MeshStandardMaterial({color:['#edc368','#d5e1df','#e5ab85'][i],roughness:.65});const base=new THREE.Mesh(new THREE.BoxGeometry(.56,p.height,.58),mat);base.position.set(p.x,p.height/2,0);base.castShadow=base.receiveShadow=true;group.add(base);const t=texture(String(i+1),['#edc368','#d5e1df','#e5ab85'][i]);textures.push(t);const number=new THREE.Mesh(new THREE.PlaneGeometry(.24,.24),new THREE.MeshBasicMaterial({map:t}));number.position.set(p.x,Math.max(.125,p.height*.5),.292);group.add(number);});
 const sand=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.65,.1,64),new THREE.MeshStandardMaterial({color:'#f0d6a1',roughness:1}));sand.position.y=-.055;group.add(sand);
 const confetti=[];for(let i=0;i<54;i++){const piece=new THREE.Mesh(new THREE.PlaneGeometry(.025,.055),new THREE.MeshBasicMaterial({color:['#55b6dc','#ef9679','#87cbb1','#edc368'][i%4],side:THREE.DoubleSide}));group.add(piece);confetti.push(piece);}
 return{setVisible(v){group.visible=v;},update(time){confetti.forEach((p,i)=>{const a=i*2.399;p.position.set(Math.cos(a)*(.3+(i%7)*.13),1.85-((time*.22+i*.037)%1.85),Math.sin(a)*.8);p.rotation.set(time+i,time*.7+i,Math.sin(time+i));});},dispose(){textures.forEach(t=>t.dispose());group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});scene.remove(group);}};
}
