/**
 * @file        CoachingLoginBackground.jsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-27
 * @updated     2026-11-27
 *
 * @description Source component for Coachingloginbackground in the frontend module.
 */

import { memo, useEffect, useRef } from "react";
import { LOGO_D } from "./logoPath";

/**
 * CoachingLoginBackground: ambient, pointer-events:none background for a coaching-institute login.
 * Props: instituteName (shown above the logo), layout "screen" | "panel", parallax, intensity, background, className.
 * Usage: <div style={{position:"relative"}}><CoachingLoginBackground instituteName="Sunrise Academy" /><LoginCard style={{position:"relative",zIndex:1}} /></div>
 * layout="panel" needs a position:relative parent. Gradient ids (clb-sh, clb-sp) assume one instance per page.
 */
const MAX_SHIFT=15,DAMPING=0.06,LAYERS=[0.5,0.75,1];
const bucket=k=>k<0.65?0.5:k<0.85?0.75:1;
const Frac=({n,d})=><span className="clb-frac"><span>{n}</span><span>{d}</span></span>;
const ICONS={
dna:<><path d="M14 4C14 14 34 14 34 24S14 34 14 44"/><path d="M34 4C34 14 14 14 14 24S34 34 34 44"/><path d="M17 9h14M15 15h18M15 33h18M17 39h14"/></>,
atom:<><ellipse cx="24" cy="24" rx="20" ry="8"/><ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(60 24 24)"/><ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(120 24 24)"/><circle cx="24" cy="24" r="2.5"/></>,
flask:<><path d="M19 5h10M21 5v15L8 40a3 3 0 0 0 3 4h26a3 3 0 0 0 3-4L27 20V5"/><path d="M13 32h22"/><circle cx="21" cy="37" r="1.5"/></>,
compass:<><circle cx="24" cy="8" r="3"/><path d="M24 11L11 43M24 11l13 32"/><path d="M14 35c6 4 14 4 20 0"/></>,
globe:<><circle cx="24" cy="24" r="19"/><ellipse cx="24" cy="24" rx="8" ry="19"/><path d="M5 24h38M8 14h32M8 34h32"/></>,
books:<><rect x="6" y="32" width="36" height="9" rx="1"/><rect x="9" y="22" width="30" height="9" rx="1"/><rect x="12" y="12" width="24" height="9" rx="1"/></>,
nib:<><path d="M24 4l12 18-12 22L12 22z"/><circle cx="24" cy="21" r="2.5"/><path d="M24 23.5V44M17 12h14"/></>,
music:<><path d="M17 35V12l19-4v23"/><path d="M17 19l19-4"/><ellipse cx="13" cy="36" rx="5" ry="4"/><ellipse cx="32" cy="32" rx="5" ry="4"/></>,
bar:<><path d="M6 6v36h36"/><path d="M12 42V28h6v14M22 42V17h6v25M32 42V10h6v32"/></>,
line:<><path d="M6 6v36h36"/><path d="M10 34l9-10 8 6 13-18"/></>,
pie:<><circle cx="24" cy="25" r="17"/><path d="M24 25V8M24 25l14.7 8.5M24 25l-13 11"/><path d="M28 20V3a22 22 0 0 1 17 15z"/></>,
parabola:<><path d="M24 4v40M4 24h40"/><path d="M12 6C16 42 32 42 36 6"/></>,
venn:<><circle cx="18" cy="24" r="13"/><circle cx="30" cy="24" r="13"/></>,
triangle:<><path d="M8 40V10l32 30z"/><path d="M8 32h8v8"/></>,
benzene:<><path d="M24 5l16 9.5v19L24 43 8 33.5v-19z"/><circle cx="24" cy="24" r="8"/></>,
bell:<><path d="M4 40h40"/><path d="M6 40C16 40 17 8 24 8s8 32 18 32"/><path d="M24 8v32"/></>,
flow:<><rect x="15" y="3" width="18" height="9" rx="2"/><path d="M24 12v6M24 34v4"/><path d="M24 18l11 8-11 8-11-8z"/><rect x="15" y="38" width="18" height="8" rx="2"/></>,
cap:<><path d="M24 10L4 20l20 10 20-10z"/><path d="M12 25v10c0 3 6 6 12 6s12-3 12-6V25M44 20v12"/></>,
trophy:<><path d="M14 6h20v12a10 10 0 0 1-20 0z"/><path d="M14 10H6c0 8 3 11 8 12M34 10h8c0 8-3 11-8 12M24 28v8M18 36h12M16 42h16"/></>,
teacher:<><rect x="4" y="6" width="26" height="20" rx="1"/><path d="M9 12h12M9 18h8"/><circle cx="38" cy="22" r="4"/><path d="M30 44V36a8 8 0 0 1 16 0v8"/></>,
masks:<><path d="M4 8h22v13a11 11 0 0 1-22 0z"/><path d="M10 16h2M18 16h2M9 25c3 3 9 3 12 0"/><path d="M22 18h22v13a11 11 0 0 1-22 0z"/></>,
};
const Icon=({name})=><svg viewBox="0 0 48 48" className="clb-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</svg>;

const ITEMS=[
{id:"f1",x:22.1,y:84.5,k:.7,dur:32,o:.18,pulse:1,c:<>sin²α + cos²α = 1</>},
{id:"f2",x:89.8,y:11.1,k:.9,dur:27,o:.17,c:<>(a − b)² = a² − 2ab + b²</>},
{id:"f3",x:9.3,y:17.4,k:.8,dur:36,o:.18,pulse:1,c:<>x = <Frac n={<>−b ± √(b² − 4ac)</>} d="2a"/></>},
{id:"f4",x:91.5,y:90.2,k:.6,dur:29,o:.17,c:<>∫<sub>0</sub><sup>x</sup> <Frac n={<>tⁿ dt</>} d={<>eᵗ − 1</>}/></>},
{id:"f5",x:9,y:50,k:.5,dur:38,o:.16,pulse:1,c:<>ax² + bx + c = 0</>},
{id:"f6",x:92,y:48,k:.5,dur:34,o:.15,c:<>sin²α + cos²α = 1</>},
{id:"i1",x:58.2,y:86.7,k:1,dur:30,o:.19,icon:"dna"},{id:"i2",x:44.7,y:82.9,k:.8,dur:26,o:.18,icon:"atom"},
{id:"i3",x:95,y:28,k:.9,dur:35,o:.18,icon:"flask"},{id:"i4",x:44.1,y:17.1,k:.7,dur:24,o:.17,icon:"compass"},
{id:"i5",x:6,y:74,k:.9,dur:33,o:.19,icon:"globe"},{id:"i6",x:72.8,y:70.3,k:.8,dur:28,o:.18,icon:"books"},
{id:"i7",x:94,y:70,k:1,dur:31,o:.18,icon:"nib"},{id:"i8",x:57.5,y:9.2,k:.7,dur:37,o:.17,icon:"music"},
{id:"i9",x:20,y:30,k:.6,dur:40,o:.14,icon:"masks",small:1},{id:"i10",x:80,y:32,k:.6,dur:39,o:.14,icon:"atom",small:1},
{id:"i11",x:21,y:72,k:.6,dur:36,o:.14,icon:"flask",small:1},
{id:"b1",x:70.8,y:89.5,k:.7,dur:30,o:.18,board:"CBSE"},{id:"b2",x:33.6,y:7.4,k:.6,dur:25,o:.16,board:"ICSE"},
{id:"b3",x:27.8,y:39.2,k:.8,dur:33,o:.17,board:"ISC"},{id:"b4",x:8,y:36,k:.6,dur:38,o:.16,board:"NIOS"},
{id:"b5",x:91,y:59,k:.7,dur:27,o:.17,board:"UPMSP"},{id:"b6",x:10,y:62,k:.7,dur:35,o:.17,board:"HSC"},
{id:"b7",x:36,y:90,k:.6,dur:29,o:.16,board:"WBBSE"},{id:"b9",x:42,y:8,k:.6,dur:28,o:.16,board:"JEE"},
{id:"b10",x:60.7,y:18.1,k:.7,dur:34,o:.16,board:"NEET"},{id:"b11",x:32.1,y:15.4,k:.8,dur:31,o:.16,board:"UPSC"},
{id:"b8",x:22.7,y:59.7,k:.8,dur:32,o:.17,board:"STATE BOARDS"},
{id:"s1",x:73.8,y:55.2,k:.7,dur:28,o:.15,subject:"PHYSICS"},{id:"s2",x:68,y:15,k:.7,dur:33,o:.15,subject:"CHEMISTRY"},
{id:"s3",x:90,y:38,k:.7,dur:26,o:.15,subject:"MATHS"},{id:"s4",x:19,y:46,k:.7,dur:37,o:.15,subject:"BIOLOGY"},
{id:"s5",x:82,y:72,k:.7,dur:30,o:.15,subject:"ECONOMICS"},{id:"s6",x:74.5,y:42.1,k:.7,dur:35,o:.15,subject:"HISTORY"},
{id:"s7",x:22.6,y:20.8,k:.7,dur:27,o:.15,subject:"GEOGRAPHY"},{id:"s8",x:7.2,y:90,k:.7,dur:32,o:.15,subject:"ACCOUNTANCY"},
{id:"t1",x:72.3,y:30.7,k:.6,dur:31,o:.15,icon:"cap",small:1},{id:"t2",x:50.5,y:92.9,k:.6,dur:29,o:.15,icon:"trophy",small:1},
{id:"t3",x:78.5,y:85.5,k:.6,dur:34,o:.15,icon:"teacher",small:1},
{id:"n1",x:23.8,y:9.9,k:.7,dur:33,o:.17,pulse:1,board:"NEP 2020"},
{id:"t4",x:81.3,y:23.8,k:.6,dur:27,o:.15,subject:"PRINCIPAL"},{id:"t5",x:81.3,y:61.8,k:.7,dur:36,o:.15,subject:"TEACHERS"},
{id:"t6",x:13.5,y:70.9,k:.6,dur:30,o:.15,subject:"ANNUAL DAY"},
{id:"c1",x:50.2,y:7.7,k:.7,dur:31,o:.17,icon:"bar",md:1},{id:"c2",x:64.9,y:82.3,k:.7,dur:27,o:.17,icon:"pie",md:1},
{id:"c3",x:15.7,y:36.1,k:.7,dur:35,o:.17,icon:"parabola",md:1},{id:"c4",x:51.4,y:83.8,k:.7,dur:29,o:.17,icon:"venn",md:1},
{id:"c5",x:51.9,y:17.7,k:.7,dur:33,o:.17,icon:"line",md:1},{id:"c6",x:26.6,y:30.2,k:.7,dur:37,o:.17,icon:"triangle",md:1},
{id:"c7",x:64.1,y:92.8,k:.7,dur:30,o:.17,icon:"benzene",md:1},{id:"c8",x:80.5,y:50.2,k:.7,dur:34,o:.17,icon:"bell",md:1},
{id:"c9",x:27.9,y:72.4,k:.7,dur:28,o:.17,icon:"flow",md:1},
{id:"m-hi",x:94.1,y:79.6,k:.6,dur:28,o:.16,script:"शिक्षा",lang:"hi"},{id:"m-mr",x:73.4,y:81.6,k:.6,dur:34,o:.16,script:"ज्ञान",lang:"mr"},
{id:"m-gu",x:75.8,y:9,k:.6,dur:31,o:.16,script:"શિક્ષણ",lang:"gu"},{id:"m-bn",x:45.1,y:92.2,k:.6,dur:37,o:.16,script:"শিক্ষা",lang:"bn"},
{id:"m-ta",x:82.3,y:40,k:.6,dur:29,o:.16,script:"கல்வி",lang:"ta"},{id:"m-te",x:83.3,y:80.8,k:.6,dur:35,o:.16,script:"విద్య",lang:"te"},
{id:"m-kn",x:26.5,y:47.2,k:.6,dur:32,o:.16,script:"ವಿದ್ಯೆ",lang:"kn"},{id:"m-ml",x:88.6,y:30.4,k:.6,dur:38,o:.16,script:"വിദ്യ",lang:"ml"},
];
/* All 28 Indian states: random size + position, collision-checked against existing items and the login-card zone */
const byId=Object.fromEntries(ITEMS.map(i=>[i.id,i]));
const P=(id,x,y,extra={})=>({...byId[id],id:id+"-p",x,y,...extra});
/* layout="panel": split login screen, items only in the right-hand part of the left panel */
const PANEL_ITEMS=[
  P("f1",70.5,74.8),P("f3",81.9,20.5),P("n1",56.3,48),P("t4",88.3,56.5),P("s1",88.1,42.1),
  P("m-hi",52.7,32.8,{dur:28}),P("m-mr",51.8,62.6,{dur:34}),P("m-gu",71.1,36.5,{dur:31}),P("m-ta",51.8,17.3,{dur:29}),
  P("c1",92.3,83.3),P("c2",68.5,59.1),P("c3",50.3,83.8),P("c4",92.1,68.2),P("i1",75.8,48.7),P("i2",50.7,74.2),
  P("i3",91.1,33.3),P("i5",62.4,22.4),P("c9",81.7,32.4),P("t2",81.5,84.8),P("t1",59.6,84.9),P("s3",51,24.9),
];
const PANEL_STARS=[[50,8],[62,14],[75,18],[92,12],[97,22],[85,28],[66,30],[55,42],[78,44],[96,40],[64,58],[90,52],[55,56],[80,57],[96,66],[68,68],[56,82],[78,80],[96,78],[48,80],[63,92]]
  .map(([x,y],i)=>({x,y,d:3+(i%5)*1.1,delay:-(i*1.7)%9,s:2+(i%3)}));
const DROP=new Set(["f5","f6","i9","i10","i11","b4","b6","b9","b10","b11","s4","s5","s6","s7","s8","t3","b3","t1","c5","c6","c7","c8","m-te","m-kn","m-ml"]);
for(let i=ITEMS.length-1;i>=0;i--)if(DROP.has(ITEMS[i].id))ITEMS.splice(i,1); // thinner background
const STATES=["ANDHRA PRADESH","ARUNACHAL PRADESH","ASSAM","BIHAR","CHHATTISGARH","GOA","GUJARAT","HARYANA","HIMACHAL PRADESH","JHARKHAND","KARNATAKA","KERALA","MADHYA PRADESH","MAHARASHTRA","MANIPUR","MEGHALAYA","MIZORAM","NAGALAND","ODISHA","PUNJAB","RAJASTHAN","SIKKIM","TAMIL NADU","TELANGANA","TRIPURA","UTTAR PRADESH","UTTARAKHAND","WEST BENGAL"];
(function placeStates(){
  let a=20261123;const rnd=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const box=it=>it.board?{w:it.board.length*.7,h:3}:it.subject?{w:it.subject.length*.8,h:2.5}:it.c?{w:15,h:9}:it.script?{w:7,h:4}:{w:6,h:7};
  const boxes=ITEMS.map(it=>({x:it.x,y:it.y,...box(it)}));
  boxes.push({x:50,y:50,w:56,h:58}); // centre logo zone
  const names=[...STATES].sort((p,q)=>((q==="UTTAR PRADESH")-(p==="UTTAR PRADESH"))||q.length-p.length);
  names.forEach((name,n)=>{
    const isUP=name==="UTTAR PRADESH";
    const r=rnd();let sz=isUP?1.5:(r<.08?1.35:r<.4?1.0:.7)*(.9+rnd()*.2); // 3 size tiers: large / medium / small
    for(let tries=0;tries<2000;tries++){
      if(tries&&tries%300===0)sz*=.88;
      const w=name.length*.96*sz*1.2,h=2.1*sz+2;
      const x=4+w/2+rnd()*(92-w),y=5+h/2+rnd()*(90-h);
      if(x-w/2<1||x+w/2>99)continue;
      if(boxes.some(b=>Math.abs(b.x-x)<(b.w+w)/2+1.6&&Math.abs(b.y-y)<(b.h+h)/2+1.6))continue;
      boxes.push({x,y,w,h});
      ITEMS.push({id:"st-"+n,x:+x.toFixed(1),y:+y.toFixed(1),k:[.5,.7,.9][n%3],dur:24+Math.floor(rnd()*16),o:isUP?.2:.15+rnd()*.04,pulse:isUP?1:0,board:name,state:1,cyc:isUP?0:1,cd:n,sz:+sz.toFixed(2),hm:sz<.95||n%2});
      break;
    }
  });
})();
/* wider opacity range + varied tilt per item */
[ITEMS,PANEL_ITEMS].forEach(arr=>arr.forEach((it,i)=>{it.o*=[.55,1.35,.85,1.7,.65,1.05][i%6];it.a=[-24,-16,-8,4,-20,12,-12,-4][(i*3)%8];}));
const STARS=[[16,5],[33,12],[4,12],[47,4],[57,10],[68,4],[96,8],[82,20],[97,40],[3,45],[2,58],[15,80],[31,97],[46,96],[60,92],[88,78],[98,88],[4,94],[93,96],[27,20],[75,24]].map(([x,y],i)=>({x,y,d:3+(i%5)*1.1,delay:-(i*1.7)%9,s:2+(i%3)}));
const NAVY="radial-gradient(circle at 50% 50%, rgba(99,102,241,.22), transparent 60%),linear-gradient(135deg,#0a1228 0%,#12214a 55%,#1a2f63 100%)";

const Mark=({name,cy=2,...p})=>{
  const t=name.trim(),words=t.split(/\s+/);let lines=[t];
  if(t.length>16&&words.length>1){let best=1,bd=1e9;
    for(let i=1;i<words.length;i++){const a=words.slice(0,i).join(" ").length,b=words.slice(i).join(" ").length;if(Math.abs(a-b)<bd){bd=Math.abs(a-b);best=i}}
    lines=[words.slice(0,best).join(" "),words.slice(best).join(" ")];}
  const cx=typeof document!=="undefined"?(Mark.c||(Mark.c=document.createElement("canvas").getContext("2d"))):null;
  if(cx)cx.font="800 100px Inter,'Segoe UI','Noto Sans Devanagari',system-ui,sans-serif";
  const w100=Math.max(...lines.map(l=>(cx?cx.measureText(l.toUpperCase()).width:l.length*72)+3*l.length)); // measured, incl. letter-spacing
  const fs=Math.max(28,Math.min(lines.length>1?54:100,56000/w100));
  const lh=fs*1.1,y0=cy-(lines.length-1)*lh/2+fs*.35;
  return <>{lines.map((l,i)=><text key={i} x="305" y={y0+i*lh} textAnchor="middle" fontFamily="Inter,'Segoe UI','Noto Sans Devanagari',system-ui,sans-serif" fontWeight="800" fontSize={fs} letterSpacing={fs*.03} {...p}>{l.toUpperCase()}</text>)}</>;
};
function CoachingLoginBackgroundImpl({
  instituteName = "", className = "", parallax = true, layout = "screen", background, intensity,
}){
  const name = instituteName;
  const isPanel = layout === "panel";
  const items = isPanel ? PANEL_ITEMS : ITEMS;
  const stars = isPanel ? PANEL_STARS : STARS;
  const rootRef=useRef(null);
  const boltRef=useRef(null),spotRef=useRef(null),spotG=useRef(null);
  const VB=name.trim()?"0 -100 610.17 405.69":"0 0 610.17 305.69"; // extra band above the logo for the name
  const Shape=p=><>{name.trim()&&<Mark name={name} {...p}/>}<g transform="translate(305.1 152.8) scale(.56) translate(-305.1 -152.8)"><path d={LOGO_D} {...p}/></g></>; // logo drawn at 56% (70% x 0.8)
  useEffect(()=>{ // cursor spotlight on the logo outline (auto-wanders on touch devices)
    const svg=boltRef.current,g=spotRef.current,box=spotG.current;
    if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const coarse=matchMedia("(pointer: coarse)").matches;
    let tx=305,ty=150,cx=305,cy=150,raf=0,idle=0,stop=0;
    const loop=t=>{
      if(coarse){tx=305+270*Math.sin(t*.0004);ty=150+85*Math.sin(t*.0007+1);}
      cx+=(tx-cx)*.12;cy+=(ty-cy)*.12;
      g.setAttribute("cx",cx.toFixed(1));g.setAttribute("cy",cy.toFixed(1));
      raf=requestAnimationFrame(loop);};
    const hide=()=>{box.style.opacity=0;clearTimeout(stop);stop=setTimeout(()=>{cancelAnimationFrame(raf);raf=0},800)};
    const mv=e=>{const r=svg.getBoundingClientRect();
      const vb=svg.viewBox.baseVal;tx=vb.x+(e.clientX-r.left)/r.width*vb.width;ty=vb.y+(e.clientY-r.top)/r.height*vb.height;
      box.style.opacity=1;clearTimeout(idle);clearTimeout(stop);idle=setTimeout(hide,2500);
      if(!raf)raf=requestAnimationFrame(loop);};
    if(coarse){box.style.opacity=.8;raf=requestAnimationFrame(loop);}
    else{addEventListener("mousemove",mv,{passive:true});document.addEventListener("mouseleave",hide);}
    return()=>{removeEventListener("mousemove",mv);document.removeEventListener("mouseleave",hide);
      cancelAnimationFrame(raf);clearTimeout(idle);clearTimeout(stop)};
  },[]);
  useEffect(()=>{
    if(!parallax)return;
    const root=rootRef.current;
    if(matchMedia("(prefers-reduced-motion: reduce)").matches||matchMedia("(pointer: coarse)").matches)return;
    const layers=[...root.querySelectorAll("[data-k]")];
    let tx=0,ty=0,cx=0,cy=0,raf=0;
    const tick=()=>{cx+=(tx-cx)*DAMPING;cy+=(ty-cy)*DAMPING;
      for(const el of layers){const k=+el.dataset.k;el.style.transform=`translate3d(${(cx*k).toFixed(2)}px,${(cy*k).toFixed(2)}px,0)`}
      raf=Math.abs(tx-cx)+Math.abs(ty-cy)>0.05?requestAnimationFrame(tick):0};
    const mv=e=>{tx=-((e.clientX/innerWidth)*2-1)*MAX_SHIFT;ty=-((e.clientY/innerHeight)*2-1)*MAX_SHIFT;if(!raf)raf=requestAnimationFrame(tick)};
    addEventListener("mousemove",mv,{passive:true});
    return()=>{removeEventListener("mousemove",mv);cancelAnimationFrame(raf)};
  },[parallax]);
  return(
  <div ref={rootRef} className={`clb-root ${isPanel?"clb-panel":""} ${className}`} style={{background:background??(isPanel?"transparent":NAVY),"--i":intensity??(isPanel?1.9:1.5),"--lw":isPanel?"min(30vw, 560px)":undefined}} aria-hidden="true">
    <style>{CSS}</style>
    <div className="clb-layer" data-k="0.3"><div className="clb-pos" style={{left:isPanel?"72%":"50%",top:isPanel?"52%":"50%"}}><div className="clb-logo-float">
      <svg className="clb-logo" viewBox={VB} role="img" fill="currentColor" fillOpacity=".35" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fillRule="evenodd"><Shape vectorEffect="non-scaling-stroke"/></svg>
<svg ref={boltRef} className="clb-bolt" viewBox={VB} fill="none" strokeLinecap="round" strokeLinejoin="round" fillRule="evenodd">
<defs>
<linearGradient id="clb-sh" gradientUnits="userSpaceOnUse" x1="-90" y1="0" x2="90" y2="0" gradientTransform="skewX(-25)"><stop offset="0" stopColor="#fff" stopOpacity="0"/><stop offset=".5" stopColor="#fff" stopOpacity=".9"/><stop offset="1" stopColor="#fff" stopOpacity="0"/><animateTransform attributeName="gradientTransform" type="translate" additive="sum" values="-250 0;850 0;850 0" keyTimes="0;.5;1" dur="9s" repeatCount="indefinite"/></linearGradient>
<radialGradient ref={spotRef} id="clb-sp" gradientUnits="userSpaceOnUse" cx="305" cy="150" r="144"><stop offset="0" stopColor="#e0f2fe" stopOpacity="1"/><stop offset=".45" stopColor="#7dd3fc" stopOpacity=".5"/><stop offset="1" stopColor="#38bdf8" stopOpacity="0"/></radialGradient>
</defs>
<Shape fill="url(#clb-sh)" stroke="url(#clb-sh)" strokeWidth="1.5" opacity=".55"/>
<g ref={spotG} className="clb-spot"><Shape stroke="url(#clb-sp)" strokeWidth="9" opacity=".3"/><Shape stroke="url(#clb-sp)" strokeWidth="1.6"/></g>
</svg></div></div></div>
    {stars.map((s,i)=><span key={i} className="clb-star" style={{left:s.x+"%",top:s.y+"%",width:s.s,height:s.s,animationDuration:s.d+"s",animationDelay:s.delay+"s"}}/>)}
    {LAYERS.map(L=><div key={L} className="clb-layer" data-k={L}>
      {items.map((it,i)=>{ if(bucket(it.k)!==L)return null; const dir=i%2?1:-1;
        return <div key={it.id} className={"clb-pos"+(it.hm?" clb-hm":"")+(it.cyc?" clb-cycle":"")} style={{left:it.x+"%",top:it.y+"%",animationDelay:it.cyc?-(it.cd*1.07)+"s":undefined}}>
          <div className="clb-float" style={{animationDuration:it.dur+"s",animationDelay:-(i*3.7)+"s","--d":dir,"--a":(it.a??-20)+"deg"}}>
            <div className={"clb-body"+(it.pulse?" clb-pulse":"")} style={{"--o":it.o,"--s":it.sz||1}}>
              {it.icon&&<span className={it.small?"clb-sm":it.md?"clb-md":""}><Icon name={it.icon}/></span>}
              {it.board&&<span className={"clb-board"+(it.state?" clb-state":"")}>{it.board}</span>}
              {it.subject&&<span className="clb-subject">{it.subject}</span>}
              {it.script&&<span className="clb-script" lang={it.lang}>{it.script}</span>}
              {it.c&&<span className="clb-formula">{it.c}</span>}
            </div></div></div>;})}
    </div>)}
  </div>);
}

const CSS = `
.clb-root{position:fixed;top:0;left:0;right:0;height:100vh;height:100lvh;z-index:0;overflow:hidden;pointer-events:none;user-select:none;color:#f1f5f9;contain:strict}
.clb-layer{position:absolute;inset:0;will-change:transform}
.clb-pos{position:absolute;translate:-50% -50%}
.clb-logo{width:var(--lw,min(58vw,820px));height:auto;display:block;color:#e2e8f0;opacity:.26}
.clb-logo-float{position:relative;animation:clb-breathe 38s ease-in-out infinite}
.clb-bolt{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.clb-cycle{opacity:0;animation:clb-cyc 30s linear infinite}
@keyframes clb-cyc{0%{opacity:0}8%{opacity:1}45%{opacity:1}55%{opacity:0}100%{opacity:0}}
.clb-spot{opacity:0;transition:opacity .7s ease}
@keyframes clb-run{to{stroke-dashoffset:-560}}
@keyframes clb-flick{0%{opacity:.85}6%{opacity:.3}8%{opacity:1}30%{opacity:.7}33%{opacity:.25}35%{opacity:.95}62%{opacity:.8}65%{opacity:.35}67%{opacity:1}}
.clb-float{animation:clb-drift 30s ease-in-out infinite}
.clb-body{opacity:min(.42,calc(var(--o)*var(--i)))}
.clb-pulse{animation:clb-pulse 7s ease-in-out infinite}
.clb-icon{width:clamp(34px,4.6vw,64px);height:auto;display:block}
.clb-md .clb-icon{width:clamp(30px,3.8vw,52px)}.clb-sm .clb-icon{width:clamp(24px,3vw,40px)}
.clb-board{font:800 clamp(14px,1.9vw,28px)/1 Inter,system-ui,sans-serif;letter-spacing:.08em;white-space:nowrap}
.clb-state{font-size:calc(clamp(9px,1.2vw,18px)*var(--s,1));letter-spacing:.12em;font-weight:700}
.clb-subject{font:600 clamp(12px,1.35vw,19px)/1 Inter,system-ui,sans-serif;letter-spacing:.22em;white-space:nowrap}
.clb-script{font:600 clamp(15px,1.8vw,26px)/1.3 "Noto Sans Devanagari","Nirmala UI",system-ui,sans-serif;white-space:nowrap;display:inline-block}
.clb-formula{font:italic 400 clamp(13px,1.5vw,22px)/1.2 "Cambria Math","STIX Two Text",Georgia,serif;white-space:nowrap;display:inline-flex;align-items:center;gap:.3em}
.clb-formula sub,.clb-formula sup{font-size:.6em;line-height:0}
.clb-frac{display:inline-flex;flex-direction:column;align-items:center}
.clb-frac>span:first-child{border-bottom:1.2px solid currentColor;padding:0 .25em .08em}
.clb-star{position:absolute;border-radius:50%;background:#f1f5f9;opacity:.08;box-shadow:0 0 6px 1px rgba(226,232,240,.5);animation:clb-twinkle 5s ease-in-out infinite}
@keyframes clb-drift{0%,100%{transform:translate3d(0,0,0) rotate(calc(var(--a,-20deg) - var(--d)*3deg))}50%{transform:translate3d(0,-22px,0) rotate(calc(var(--a,-20deg) + var(--d)*3deg))}}
@keyframes clb-breathe{0%,100%{transform:scale(1)}50%{transform:translate3d(0,-10px,0) scale(1.015)}}
@keyframes clb-pulse{0%,100%{opacity:calc(.08*var(--i))}50%{opacity:min(.42,calc(.22*var(--i)))}}
@keyframes clb-twinkle{0%,100%{opacity:calc(.08*var(--i));transform:scale(.8)}50%{opacity:min(.5,calc(.3*var(--i)));transform:scale(1.4)}}
@media (max-width:640px){.clb-hm{display:none}}
@media (prefers-reduced-motion:reduce){.clb-float,.clb-pulse,.clb-star,.clb-logo-float,.clb-gl{animation:none}.clb-cycle{animation:none;opacity:1}.clb-bolt{display:none}.clb-float{transform:rotate(var(--a,-20deg))}}

.clb-panel{position:absolute;height:auto;bottom:0}
`;

export default memo(CoachingLoginBackgroundImpl);
