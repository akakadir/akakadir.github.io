const fnt=new FontFace('New Rocker','url(assets/fonts/newrocker-regular.ttf)');
fnt.load().then(loadedFont=>{
  document.fonts.add(loadedFont);
  initLogo();
});

function initLogo(){
  const c=document.querySelector('.a');
  const x=document.createElement('canvas');
  c.appendChild(x);
  c.style.width='200px';
  c.style.height='50px';
  c.style.display='inline-block';
  c.style.position='relative';
  c.style.margin='0';
  c.style.padding='0';
  c.style.lineHeight='0';
  c.style.verticalAlign='middle';
  c.style.overflow='hidden';
  x.style.width='100%';
  x.style.height='100%';
  x.style.display='block';

  const s=new THREE.Scene();
  const cam=new THREE.PerspectiveCamera(35,240/80,0.1,1000);
  const r=new THREE.WebGLRenderer({canvas:x,antialias:true,alpha:true});
  r.setSize(240,80,false);
  r.setPixelRatio(window.devicePixelRatio>1.5?1.5:1);
  r.setClearColor(0,0);
  r.outputEncoding=THREE.sRGBEncoding;
  cam.position.z=10;

  const al=new THREE.AmbientLight(0x53a245,0.9);
  const dl=new THREE.DirectionalLight(0xffffff,1.3);
  dl.position.set(4,5,8);
  const gl=new THREE.PointLight(0x53a245,1.5);
  gl.position.set(2,2,5);
  const fl=new THREE.PointLight(0x6bc459,0.6);
  fl.position.set(-3,-2,3);
  s.add(al,dl,gl,fl);

  const g=new THREE.Group();
  s.add(g);

  const tcan=document.createElement('canvas');
  tcan.width=4096;
  tcan.height=1024;
  const ctx=tcan.getContext('2d',{alpha:true});
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.fillStyle='#53a245';
  ctx.font='bold 750px "New Rocker"';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText('akakadir',2048,512);

  const tex=new THREE.CanvasTexture(tcan);
  tex.generateMipmaps=true;
  tex.minFilter=THREE.LinearMipMapLinearFilter;
  tex.magFilter=THREE.LinearFilter;
  tex.anisotropy=r.capabilities.getMaxAnisotropy();
  tex.encoding=THREE.sRGBEncoding;
  tex.needsUpdate=true;

  const pg=new THREE.PlaneGeometry(24,8);
  const pm=new THREE.MeshStandardMaterial({
    map:tex,
    transparent:true,
    side:THREE.FrontSide,
    metalness:0.5,
    roughness:0,
    emissive:0x53a245,
    emissiveIntensity:0.15,
    alphaTest:0.1,
    depthWrite:true,
    depthTest:true
  });

  for(let i=0;i<16;i++){
    const m=new THREE.Mesh(pg,new THREE.MeshStandardMaterial({
      map:tex,
      transparent:true,
      side:THREE.FrontSide,
      metalness:0.5,
      roughness:0,
      emissive:0x53a245,
      emissiveIntensity:0.15-i*0.004,
      alphaTest:0.1,
      depthWrite:true,
      depthTest:true
    }));
    m.position.z=i*0.05;
    m.renderOrder=i;
    g.add(m);
  }

  g.position.z=-0.4;

  let tx=0.3,ty=0,cx=10,cy=0;
  const maxRot=0.02,speed=0.4,vf=0.4;

  document.addEventListener('mousemove',e=>{
    const rect=x.getBoundingClientRect();
    const mx=(e.clientX-rect.left)/rect.width-0.5;
    const my=(e.clientY-rect.top)/rect.height-0.5;
    ty=mx*maxRot*2;
    tx=-my*maxRot*2*vf;
    dl.position.x=4+mx*4;
    dl.position.y=5+my*4*vf;
    gl.position.x=2+mx*3;
    gl.position.y=2+my*3*vf;
    fl.position.x=-3-mx*3;
    fl.position.y=-2-my*3*vf;
  });

  let t=0;
  function a(){
    requestAnimationFrame(a);
    t+=0.016;
    cx+=(tx-cx)*speed;
    cy+=(ty-cy)*speed;
    g.rotation.x=cx;
    g.rotation.y=cy;
    const b=Math.sin(t)*0.01;
    g.scale.set(1+b,1+b,1);
    gl.intensity=1.4+Math.sin(t*1.5)*0.2;
    fl.intensity=0.5+Math.sin(t*2+1)*0.1;
    r.render(s,cam);
  }
  setTimeout(a,100);
}
