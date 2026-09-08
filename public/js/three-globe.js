import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const DEFAULTS={navy:'#071A3D',blue:'#0D47C9',blueGlow:'#3F7BF0',yellow:'#FFC629',white:'#FFFFFF'};

function latLonToVec3(lat,lon,r){const phi=(90-lat)*Math.PI/180,theta=(lon+180)*Math.PI/180;return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta));}

export function mountTKGlobe(container,{items=[],onSelect}={}){
  if(!container) return ()=>{};
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,.1,100);
  camera.position.set(0,0,6.2);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));
  renderer.setClearColor(0,0); container.innerHTML=''; container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Interactive TK Cam Norte globe');

  const group=new THREE.Group(); scene.add(group);
  const globe=new THREE.Mesh(new THREE.SphereGeometry(2,48,48),new THREE.MeshPhysicalMaterial({color:DEFAULTS.blue,roughness:.48,metalness:.08,clearcoat:.32,clearcoatRoughness:.5})); group.add(globe);
  const wire=new THREE.Mesh(new THREE.SphereGeometry(2.015,24,24),new THREE.MeshBasicMaterial({color:DEFAULTS.blueGlow,wireframe:true,transparent:true,opacity:.12})); group.add(wire);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(2.15,48,48),new THREE.MeshBasicMaterial({color:DEFAULTS.blueGlow,transparent:true,opacity:.08,side:THREE.BackSide})); group.add(atmosphere);

  const stars=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:DEFAULTS.white,size:.018,transparent:true,opacity:.32,sizeAttenuation:true}));
  const starPos=[]; for(let i=0;i<180;i++){const v=new THREE.Vector3().randomDirection().multiplyScalar(3.2+Math.random()*1.4);starPos.push(v.x,v.y,v.z);} stars.geometry.setAttribute('position',new THREE.Float32BufferAttribute(starPos,3)); scene.add(stars);

  const ambient=new THREE.AmbientLight(0xffffff,1.7); scene.add(ambient);
  const key=new THREE.DirectionalLight(0xffffff,2.2); key.position.set(4,3,5); scene.add(key);
  const rim=new THREE.DirectionalLight(0x3f7bf0,1.1); rim.position.set(-4,-2,1); scene.add(rim);

  const markerGroup=new THREE.Group(); group.add(markerGroup); const markerObjects=[];
  const safeItems=Array.isArray(items)?items.slice(0,24):[];
  safeItems.forEach((item,i)=>{
    const angle=(i/safeItems.length)*Math.PI*2 + .4; const lat=18*Math.sin(i*1.7); const lon=(angle*180/Math.PI)-180;
    const p=latLonToVec3(lat,lon,2.08);
    const color=item.important||item.is_pinned ? DEFAULTS.yellow : DEFAULTS.white;
    const marker=new THREE.Mesh(new THREE.SphereGeometry(item.important||item.is_pinned?.075:.055,16,16),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95}));
    marker.position.copy(p); marker.userData={item}; markerGroup.add(marker);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.10,.12,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.35,side:THREE.DoubleSide})); ring.position.copy(p.clone().multiplyScalar(1.003)); ring.lookAt(p.clone().multiplyScalar(2)); ring.userData={item,ring:true}; markerGroup.add(ring);
    markerObjects.push(marker,ring);
  });

  let targetX=0,targetY=0,rotX=.12,rotY=-.35,velX=.0018,velY=.0038,drag=false,lastX=0,lastY=0;
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function resize(){const r=container.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const ro=new ResizeObserver(resize); ro.observe(container); resize();
  function pointerPos(e){const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;}
  const down=e=>{drag=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId);};
  const move=e=>{if(!drag)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;targetY+=dx*.006;targetX+=dy*.004;velY=dx*.00028;velX=dy*.00018;lastX=e.clientX;lastY=e.clientY;};
  const up=()=>{drag=false;};
  const click=e=>{pointerPos(e);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(markerObjects,false);const hit=hits[0]?.object?.userData?.item;if(hit&&onSelect)onSelect(hit);};
  renderer.domElement.addEventListener('pointerdown',down); renderer.domElement.addEventListener('pointermove',move); renderer.domElement.addEventListener('pointerup',up); renderer.domElement.addEventListener('pointercancel',up); renderer.domElement.addEventListener('click',click);

  let raf=0,last=performance.now();
  function tick(now){const dt=Math.min(32,now-last);last=now; if(!drag){targetY+=.000055*dt; targetY+=velY*dt; targetX+=velX*dt; velY*=.94; velX*=.94;} rotY+=(targetY-rotY)*.055; rotX+=(targetX-rotX)*.055; rotX=Math.max(-.65,Math.min(.65,rotX)); group.rotation.x=rotX; group.rotation.y=rotY; wire.rotation.copy(group.rotation); stars.rotation.y+=.000015*dt; atmosphere.rotation.copy(group.rotation); markerGroup.rotation.set(0,0,0); renderer.render(scene,camera); raf=requestAnimationFrame(tick);}
  raf=requestAnimationFrame(tick);

  return ()=>{cancelAnimationFrame(raf);ro.disconnect();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);renderer.domElement.removeEventListener('click',click);renderer.dispose();};
}
