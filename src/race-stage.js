import * as THREE from 'three';
import {t} from './i18n.js';
import {coastPoint} from './coast-map.js';
import {nearestRallyPoint} from './physics/rally-map.js';
import { coursePoint, COURSE_LENGTH, RACE_COURSE, RACE_GATES } from './physics/race-course.js';
import { RALLY_ZONES, roadHalfWidth } from './physics/rally-map.js';

export function createRaceStage(scene) {
  const group=new THREE.Group();scene.add(group);
  const add=(geometry,color,position=[0,0,0],yaw=0)=>{
    const object=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide}));
    object.position.set(...position);object.rotation.y=yaw;object.receiveShadow=true;group.add(object);return object;
  };
  // A miniature coastal island: an exposed sand shelf, grassy interior,
  // turquoise shallows and a recognisable lighthouse anchor the circuit.
  const contour=offset=>{
    const shape=new THREE.Shape();
    for(let i=0;i<=160;i++){
      const a=i*Math.PI*2/160;
      const p=coastPoint(a,offset);
      if(i===0)shape.moveTo(p.x,-p.z);else shape.lineTo(p.x,-p.z);
    }
    shape.closePath();return shape;
  };
  const shelf=(offset,color,y,depth)=>{
    const g=new THREE.ExtrudeGeometry(contour(offset),{depth,bevelEnabled:false,steps:1,curveSegments:64});
    g.rotateX(-Math.PI/2);return add(g,color,[0,y,0]);
  };
  // Separate the surfaces in world space. The former 4mm road/grass gap
  // quantized to the same depth at overview distance (near plane was 5mm).
  shelf(.16,'#d1ac73',-.26,.13);
  shelf(.1,'#f4d5a1',-.145,.085);
  shelf(-.30,'#89b77a',-.085,.06).name='island-grass';
  const ocean=add(new THREE.PlaneGeometry(100,100),'#2e8caa',[0,-.19,0]);ocean.rotation.x=-Math.PI/2;
  const reef=new THREE.ShapeGeometry(contour(1.1));reef.rotateX(-Math.PI/2);add(reef,'#48aeaf',[0,-.18,0]);
  const shallows=new THREE.ShapeGeometry(contour(.65));shallows.rotateX(-Math.PI/2);add(shallows,'#7dd2c4',[0,-.17,0]);
  const foam=[];
  for(let i=0;i<112;i++){
    const a=i*Math.PI*2/112,p=coastPoint(a,.44),q=coastPoint(a+.012,.44);
    const wave=add(new THREE.BoxGeometry(.10+(i%4)*.045,.003,.012),'#d4f2e6',[p.x,-.158,p.z],Math.atan2(-(q.z-p.z),q.x-p.x));foam.push(wave);
  }
  // Small offshore whitecaps and distant islets make the water a place,
  // rather than a solid backdrop around a track-shaped patch of ground.
  for(let i=0;i<65;i++){
    const a=i*2.399,p=coastPoint(a,1.5+(i%5)*.42);
    add(new THREE.BoxGeometry(.12+(i%3)*.08,.002,.014),'#97d4d6',[p.x,-.185,p.z],-.3);
  }
  const rock=(x,z,size)=>{
    const object=add(new THREE.DodecahedronGeometry(size,0),'#8b9b91',[x,-.025,z]);object.scale.set(1.3,.65,.8);object.rotation.set(.3,x,.2);object.castShadow=true;
  };
  for(let i=0;i<19;i++){const p=coursePoint(i*COURSE_LENGTH/19,.76+.05*Math.sin(i));rock(p.x,p.z,.07+(i%3)*.025);}
  const palm=(x,z,scale=1,turn=0)=>{
    const tree=new THREE.Group();tree.position.set(x,0,z);tree.scale.setScalar(scale);tree.rotation.y=turn;group.add(tree);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.025,.045,.62,7),new THREE.MeshStandardMaterial({color:'#8f704e',roughness:1}));
    trunk.position.set(.04,.3,0);trunk.rotation.z=-.12;trunk.castShadow=true;tree.add(trunk);
    for(let i=0;i<7;i++){
      const angle=i*Math.PI*2/7;
      const leaf=new THREE.Shape();leaf.moveTo(0,0);leaf.quadraticCurveTo(.18,.13,.46,-.10);leaf.quadraticCurveTo(.18,-.025,0,0);
      const g=new THREE.ShapeGeometry(leaf,6);g.rotateX(-Math.PI/2);
      const frond=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:i%2?'#456c4d':'#668653',roughness:1,side:THREE.DoubleSide}));
      frond.position.set(.08,.61,0);frond.rotation.y=angle;frond.castShadow=true;tree.add(frond);
    }
  };
  [[-1.45,0,.9,.4],[.95,.25,1.1,1.7],[1.65,-.1,.8,2.4],[-.9,-.35,.7,1]].forEach(a=>palm(...a));
  for(const [x,z,k]of[[-2.7,.5,.9],[-2.25,.8,.7],[-2.5,-.2,.75],[2.5,.7,1.05],[3.1,.6,.8],[2.7,-.2,.75],[-3.7,-1.55,.85],[3.7,-1.4,.8],[.3,1.4,.8]])if(nearestRallyPoint({x,z}).distance>.8)palm(x,z,k,x+z);
  // A beach cabana, striped parasols and loungers sit beyond the driving line.
  const beach=coastPoint(-Math.PI*.75,-.14);
  const parasol=(x,z,colour)=>{
    add(new THREE.CylinderGeometry(.009,.009,.32,8),'#d3b385',[x,.08,z]);
    for(let i=0;i<8;i++){
      const g=new THREE.ConeGeometry(.17,.08,1,1,true,i*Math.PI/4,Math.PI/4);
      add(g,i%2?'#fff7e7':colour,[x,.27,z]);
    }
    add(new THREE.BoxGeometry(.10,.018,.25),'#fff7e7',[x+.13,-.022,z+.12],-.25);
  };
  parasol(beach.x,beach.z,'#ef9679');parasol(beach.x+.46,beach.z-.17,'#55b6dc');
  const hut=coastPoint(.3,-.13);
  add(new THREE.BoxGeometry(.34,.22,.27),'#f1d49b',[hut.x,.06,hut.z]);
  const roof=add(new THREE.ConeGeometry(.29,.18,4),'#a67c4b',[hut.x,.26,hut.z],Math.PI/4);roof.scale.z=.8;
  add(new THREE.BoxGeometry(.11,.13,.01),'#498e93',[hut.x,.035,hut.z+.14]);

  rock(.5,-.28,.27);rock(.83,-.35,.16);rock(-1.75,.15,.13);
  // Cream/coral harbour lighthouse, visible from both long straights.
  const towerX=-.25,towerZ=0;
  add(new THREE.CylinderGeometry(.22,.27,.075,20),'#d4bb89',[towerX,.037,towerZ]);
  for(let i=0;i<5;i++){
    const part=add(new THREE.CylinderGeometry(.105-(i*.007),.112-(i*.007),.14,16),i%2?'#bd4930':'#fff7e7',[towerX,.14+i*.14,towerZ]);part.castShadow=true;
  }
  add(new THREE.CylinderGeometry(.14,.14,.035,16),'#263f50',[towerX,.82,towerZ]);
  add(new THREE.CylinderGeometry(.078,.078,.12,12),'#f5c96b',[towerX,.895,towerZ]);
  add(new THREE.ConeGeometry(.17,.12,16),'#bd4930',[towerX,.99,towerZ]);
  const door=add(new THREE.BoxGeometry(.06,.11,.018),'#263f50',[towerX,.11,towerZ+.113]);
  const dock=coastPoint(Math.PI/2-.23,.12);
  for(let i=0;i<15;i++)add(new THREE.BoxGeometry(.48,.025,.045),'#bd9464',[dock.x,-.065,dock.z-.25+i*.047]);
  for(const dx of[-.23,.23])for(const dz of[-.22,.39])add(new THREE.CylinderGeometry(.016,.016,.25,8),'#8f704e',[dock.x+dx,-.13,dock.z+dz]);
  // Mooring boat: pointed hull, cream deck, mast and a small canvas sail.
  const boat=new THREE.Group();boat.position.set(dock.x+.55,-.12,dock.z+.55);boat.rotation.y=-.28;group.add(boat);
  const hullShape=new THREE.Shape();hullShape.moveTo(0,-.31);hullShape.quadraticCurveTo(.18,-.12,.13,.20);hullShape.quadraticCurveTo(0,.28,-.13,.20);hullShape.quadraticCurveTo(-.18,-.12,0,-.31);
  const hullGeom=new THREE.ExtrudeGeometry(hullShape,{depth:.07,bevelEnabled:false});hullGeom.rotateX(-Math.PI/2);
  const hull=new THREE.Mesh(hullGeom,new THREE.MeshStandardMaterial({color:'#bd4930',roughness:.7}));boat.add(hull);
  const deck=new THREE.Mesh(new THREE.BoxGeometry(.18,.012,.32),new THREE.MeshStandardMaterial({color:'#fff7e7'}));deck.position.set(0,.075,.015);boat.add(deck);
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.007,.007,.55,6),new THREE.MeshStandardMaterial({color:'#8f704e'}));mast.position.y=.34;boat.add(mast);
  const sailShape=new THREE.Shape();sailShape.moveTo(.015,0);sailShape.lineTo(.015,.43);sailShape.lineTo(.27,0);sailShape.closePath();
  const sail=new THREE.Mesh(new THREE.ShapeGeometry(sailShape),new THREE.MeshStandardMaterial({color:'#fff7e7',side:THREE.DoubleSide}));sail.position.y=.12;boat.add(sail);
  for(const a of[-2.6,-.5,1.2]){const p=coastPoint(a,1.15);add(new THREE.CylinderGeometry(.045,.065,.1,12),'#fff7e7',[p.x,-.12,p.z]);add(new THREE.ConeGeometry(.052,.09,12),'#bd4930',[p.x,-.03,p.z]);}
  const sections=512;
  const edge=(i,side,extra=0)=>{const d=i*COURSE_LENGTH/sections;return coursePoint(d,side*(roadHalfWidth(d)+extra));};
  const vertices=[];
  for(let i=0;i<sections;i++)for(const p of[edge(i,-1),edge(i+1,-1),edge(i,1),edge(i,1),edge(i+1,-1),edge(i+1,1)])vertices.push(p.x,.003,p.z);
  const road=new THREE.BufferGeometry();road.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));road.computeVertexNormals();
  add(road,'#566971').name='race-road';
  for(const side of[-1,1]){
    const positions=[],geometry=new THREE.BufferGeometry();
    for(let i=0;i<sections;i++){
      const start=positions.length/3;
      for(const p of[edge(i,side),edge(i+1,side),edge(i,side,.035),edge(i,side,.035),edge(i+1,side),edge(i+1,side,.035)])positions.push(p.x,.0095,p.z);
      geometry.addGroup(start,6,Math.floor(i/3)%2);
    }
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
    const curb=new THREE.Mesh(geometry,['#bd4930','#fff7e7'].map(color=>new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide})));
    curb.name=`race-curb-${side}`;curb.receiveShadow=true;group.add(curb);
  }
  const signTextures=[],signLabels=[];
  for(const zone of typeof document==='undefined'?[]:RALLY_ZONES){
    const p=coursePoint(zone.fraction*COURSE_LENGTH,-.92);
    const canvas=document.createElement('canvas');canvas.width=384;canvas.height=112;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff7e7';ctx.fillRect(0,0,384,112);ctx.fillStyle='#203746';ctx.font='bold 34px "PingFang SC",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t(zone.label),192,56,360);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;signTextures.push(texture);signLabels.push({ctx,texture,key:zone.label});
    const sign=new THREE.Sprite(new THREE.SpriteMaterial({map:texture}));sign.position.set(p.x,.23,p.z);sign.scale.set(.38,.115,1);group.add(sign);
    add(new THREE.CylinderGeometry(.012,.014,.18,8),'#8f704e',[p.x,.09,p.z]);
  }
  for(let i=0;i<64;i++){
    const p=coursePoint(i*COURSE_LENGTH/64);
    add(new THREE.BoxGeometry(.09,.004,.012),'#fff7e7',[p.x,.007,p.z],Math.atan2(-p.tz,p.tx));
  }
  const start=RACE_GATES[0],startWidth=roadHalfWidth(0)*2;
  for(let row=0;row<3;row++)for(let col=0;col<18;col++){
    const along=(row-1)*.055,lateral=(col-8.5)*startWidth/18;
    add(new THREE.BoxGeometry(.055,.005,startWidth/18),(col+row)%2?'#fff7e7':'#203746',
      [start.x+start.tx*along-start.tz*lateral,.012,start.z+start.tz*along+start.tx*lateral],Math.atan2(-start.tz,start.tx));
  }
  const gates=RACE_GATES.map(gate=>{
    const objects=[];
    for(const side of[-1,1]){
      const x=gate.x-side*gate.tz*(roadHalfWidth(gate.distance)+.12),z=gate.z+side*gate.tx*(roadHalfWidth(gate.distance)+.12);
      const pole=add(new THREE.CylinderGeometry(.009,.015,.20,8),'#fff7e7',[x,.1,z]);pole.castShadow=true;
      const flag=add(new THREE.BoxGeometry(.065,.055,.007),'#fff7e7',[x,.19,z],Math.atan2(-gate.tz,gate.tx));objects.push(flag);
    }
    const line=add(new THREE.BoxGeometry(.018,.005,RACE_COURSE.halfWidth*2),'#fff7e7',
      [gate.x,.009,gate.z],Math.atan2(-gate.tz,gate.tx));
    return {objects,line};
  });
  const rings=['#2687b5','#e77657','#6aa58a'].map(color=>{
    const ring=add(new THREE.RingGeometry(.095,.115,32),color);ring.rotation.x=-Math.PI/2;return ring;
  });
  // Splinters are deliberately renderer-only. They cannot obstruct a duck,
  // hit another prop, alter inference or survive an explicit race reset.
  const splinters=Array.from({length:4},(_,id)=>Array.from({length:10},(_,i)=>{
    const mesh=add(new THREE.BoxGeometry(.025,.012,.085),i%2?'#8f704e':'#b58c62');
    mesh.visible=false;mesh.castShadow=true;return mesh;
  }));
  return {
    setVisible(value){group.visible=value;},
    setLanguage(){for(const {ctx,texture,key}of signLabels){ctx.fillStyle='#fff7e7';ctx.fillRect(0,0,384,112);ctx.fillStyle='#203746';ctx.font='bold 34px "PingFang SC",sans-serif';ctx.fillText(t(key),192,56,360);texture.needsUpdate=true;}},
    update(state){
      splinters.forEach((pieces,id)=>{
        const burst=state.crateBursts?.find(b=>b.id===id),age=burst?state.worldTime-burst.time:Infinity;
        pieces.forEach((piece,i)=>{
          const angle=i*Math.PI*2/10+id*.7,speed=.35+(i%3)*.16;
          const y=.095+(.7+(i%4)*.13)*age-3.8*age*age;
          piece.visible=age>=0&&age<.9&&y>.002;
          if(!piece.visible)return;
          piece.position.set(burst.x+Math.cos(angle)*speed*age,y,burst.z+Math.sin(angle)*speed*age);
          piece.rotation.set(age*(i%2?5:-6),angle+age*3,age*4);
          piece.scale.setScalar(Math.max(0,Math.min(1,(.9-age)*4)));
        });
      });
      gates.forEach((gate,i)=>{
        const active=i===state.nextGate&&state.stage!=='complete';
        gate.objects.forEach(object=>{object.material.color.set(active?'#bd4930':'#fff7e7');object.scale.setScalar(active?1.5:.7);});
        gate.line.material.color.set(active?'#bd4930':'#fff7e7');gate.line.visible=active;
      });
      state.racers.forEach((r,i)=>rings[i].position.set(r.x,.014,r.z));
    },
    dispose(){signTextures.forEach(texture=>texture.dispose());group.traverse(object=>{object.geometry?.dispose();for(const material of object.material?[object.material].flat():[])material.dispose();});scene.remove(group);},
  };
}
