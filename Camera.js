// Matrizes 4x4 em column-major, compatíveis com WGSL/WebGPU.
export function mat4Identidade() {
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}
export function mat4Translacao(x,y,z) {
  const m=mat4Identidade(); m[12]=x; m[13]=y; m[14]=z; return m;
}
export function mat4Escala(x,y,z) {
  return new Float32Array([x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]);
}
export function mat4Multiplicar(a,b) {
  const o=new Float32Array(16);
  for(let c=0;c<4;c++) for(let r=0;r<4;r++) {
    o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
  } return o;
}
export function mat4LookAt(eye,center,up) {
  let zx=eye[0]-center[0], zy=eye[1]-center[1], zz=eye[2]-center[2];
  let n=Math.hypot(zx,zy,zz)||1; zx/=n; zy/=n; zz/=n;
  let xx=up[1]*zz-up[2]*zy, xy=up[2]*zx-up[0]*zz, xz=up[0]*zy-up[1]*zx;
  n=Math.hypot(xx,xy,xz)||1; xx/=n; xy/=n; xz/=n;
  const yx=zy*xz-zz*xy, yy=zz*xx-zx*xz, yz=zx*xy-zy*xx;
  return new Float32Array([xx,yx,zx,0, xy,yy,zy,0, xz,yz,zz,0, -(xx*eye[0]+xy*eye[1]+xz*eye[2]), -(yx*eye[0]+yy*eye[1]+yz*eye[2]), -(zx*eye[0]+zy*eye[1]+zz*eye[2]),1]);
}
export function mat4Perspective(fovy,aspect,near,far) {
  const f=1/Math.tan(fovy/2), nf=1/(near-far);
  return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,(2*far*near)*nf,0]);
}
export function mat4NormalDoModelo(m) {
  // Matriz inversa-transposta 3x3 embutida em 4x4.
  const a=m[0],b=m[1],c=m[2],d=m[4],e=m[5],f=m[6],g=m[8],h=m[9],i=m[10];
  const A=e*i-f*h, B=f*g-d*i, C=d*h-e*g;
  const det=a*A+b*B+c*C; if(Math.abs(det)<1e-12) return mat4Identidade();
  const k=1/det;
  // cofatores transpostos, em column-major
  return new Float32Array([(A)*k,(h*c-b*i)*k,(b*f-e*c)*k,0, (f*g-d*i)*k,(a*i-c*g)*k,(c*d-a*f)*k,0, (d*h-e*g)*k,(b*g-a*h)*k,(a*e-b*d)*k,0, 0,0,0,1]);
}
export class Camera {
  constructor(canvas) { this.distance=4.8; this.target=[0,1.7,0]; canvas.addEventListener('wheel',e=>{this.distance=Math.max(2.2,Math.min(12,this.distance+e.deltaY*0.005));e.preventDefault();},{passive:false}); }
  getEye(){ return [this.target[0],this.target[1]+this.distance*0.35,this.target[2]+this.distance]; }
  getViewMatrix(){ return mat4LookAt(this.getEye(),this.target,[0,1,0]); }
  getProjectionMatrix(aspect){ return mat4Perspective(Math.PI/4,aspect,0.1,100); }
}
