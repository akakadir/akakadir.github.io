const fnt=new FontFace('New Rocker','url(assets/fonts/newrocker-regular.ttf)');
fnt.load().then(loadedFont=>{
document.fonts.add(loadedFont);
initLogo();
});
function initLogo(){
const c=document.querySelector('.a');
const x=document.createElement('canvas');
c.appendChild(x);
c.style.cssText='width:200px;height:50px;display:inline-block;position:relative;margin:0;padding:0;line-height:0;vertical-align:middle;overflow:hidden';
x.style.cssText='width:100%;height:100%;display:block';
const s=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(35,3,0.1,1000);
const r=new THREE.WebGLRenderer({canvas:x,antialias:true,alpha:true,precision:'lowp',powerPreference:'low-power'});
r.setSize(240,80,false);
r.setPixelRatio(Math.min(window.devicePixelRatio,2));
r.setClearColor(0,0);
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
const ctx=tcan.getContext('2d',{willReadFrequently:false});
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
const pg=new THREE.PlaneGeometry(24,8);
const pm=new THREE.MeshStandardMaterial({
map:tex,
transparent:true,
metalness:0.5,
roughness:0,
emissive:0x53a245,
emissiveIntensity:0.15
});
for(let i=0;i<16;i++){
const m=new THREE.Mesh(pg,pm);
m.position.z=i*0.05;
m.renderOrder=i;
g.add(m);
}
g.position.z=-0.4;
let tx=0.3,ty=0,cx=10,cy=0;
const maxRot=0.02;
const speed=0.4;
const verticalFactor=0.4;
document.addEventListener('mousemove',e=>{
const rect=x.getBoundingClientRect();
const mx=(e.clientX-rect.left)/rect.width-0.5;
const my=(e.clientY-rect.top)/rect.height-0.5;
ty=mx*maxRot*2;
tx=-my*maxRot*2*verticalFactor;
dl.position.x=4+mx*4;
dl.position.y=5+my*4*verticalFactor;
gl.position.x=2+mx*3;
gl.position.y=2+my*3*verticalFactor;
fl.position.x=-3-mx*3;
fl.position.y=-2-my*3*verticalFactor;
},{passive:true});
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
