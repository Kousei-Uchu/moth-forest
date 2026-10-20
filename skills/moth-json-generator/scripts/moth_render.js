#!/usr/bin/env node
// Standalone copy of the renderer from the Moth Generator page. Validates and renders a parameter JSON.

/* ===================== CORE: renderMoth(params) -> SVG string ===================== */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const get=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
const set=(o,p,v)=>{const k=p.split('.'),l=k.pop();k.reduce((a,x)=>a[x],o)[l]=v};
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const dm=(a,b)=>{if(b===undefined)return a;if(Array.isArray(b))return b.map(x=>dm(undefined,x));if(b&&typeof b==='object'){const o={...(a&&typeof a==='object'&&!Array.isArray(a)?a:{})};for(const k in b)o[k]=dm(o[k],b[k]);return o}return b};
// closed Catmull-Rom spline -> smooth, corner-free wing outlines
const cr=(P,n=8)=>{const N=P.length,o=[];for(let i=0;i<N;i++){const a=P[(i+N-1)%N],b=P[i],c=P[(i+1)%N],d=P[(i+2)%N];for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t;o.push([0,1].map(j=>.5*(2*b[j]+(-a[j]+c[j])*t+(2*a[j]-5*b[j]+4*c[j]-d[j])*t2+(-a[j]+3*b[j]-3*c[j]+d[j])*t3)))}}return o};
const wavy=(pts,n,amp,c)=>n&&amp?pts.map((p,i)=>{const t=i/(pts.length-1),k=amp*(.5-.5*Math.cos(2*Math.PI*n*t)),dx=c[0]-p[0],dy=c[1]-p[1],d=Math.hypot(dx,dy)||1;return[p[0]+dx/d*k,p[1]+dy/d*k]}):pts;
const mapper=(A,T,I)=>(u,v)=>{const tx=A[0]*u,ty=A[1]*u,bx=T[0]*u+I[0]*(1-u),by=T[1]*u+I[1]*(1-u);return[tx+(bx-tx)*v,ty+(by-ty)*v]};
const pathOf=(p,close=true)=>'M'+p.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join('L')+(close?'Z':'');
const bd=(u,w,c,skew=0,wv=0,freq=9,w2=w)=>({u,w,w2,skew,wave:wv,freq,c});
const sp=(u,v,rx,ry,c,ring='',o=1,rot=0)=>({u,v,rx,ry,c,ring:ring||'#000000',rw:ring?1.6:0,o,rot});
const E=(u,v,r,cols,hl=true)=>({u,v,r,cols,hl});
const hex2=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)),mix=(a,b,t)=>{const x=hex2(a),y=hex2(b);return'#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('')};
const tint=(o,f)=>typeof o==='string'?(/^#[0-9a-f]{6}$/i.test(o)?f(o):o):Array.isArray(o)?o.map(x=>tint(x,f)):o&&typeof o==='object'?Object.fromEntries(Object.entries(o).map(([k,v])=>[k,tint(v,f)])):o;
// text or number -> 32-bit seed (4,294,967,296 possible seeds)
const seedOf=t=>{t=String(t).trim();if(/^\d+$/.test(t)&&+t<4294967296)return+t;let h=2166136261;for(const ch of t){h^=ch.codePointAt(0);h=Math.imul(h,16777619)}return h>>>0};
const M=(w,c)=>({on:true,w,c}),SK=(n,s,c,rc)=>({on:true,n,s,c,ring:!!rc,rc:rc||'#111111'});

const PAT={margin:{on:false,w:5,c:'#6b4f33'},costalBand:{on:false,w:5,c:'#6b4f33'},grad:{on:false,c:'#8a6a45'},veins:{on:false,c:'#6b4f33'},fringe:{on:false,len:.6,c:'#e8ddc6'},speck:{on:false,n:50,s:.012,c:'#3a2c20',ring:false,rc:'#111111'},bands:[],spots:[],eyes:[]};
const DEF={seed:1,view:'top',organic:0,underFade:.35,
 fore:{len:100,chord:44,sweep:.14,hook:0,bulge:.2,tx:.8,costal:.3,teeth:0,tooth:0,tilt:0,apex:0,tornus:0,base:'#c9b18c',edge:'#4a3a28',...PAT},
 hind:{len:66,chord:56,round:.4,tail:0,tw:4,curl:0,teeth:0,tooth:0,tilt:12,tailPos:.58,apex:0,anal:0,base:'#d8c4a0',edge:'#4a3a28',...PAT},
 body:{tw:13,abdW:11,abdLen:62,head:.55,eyes:true,eyeSize:.15,eyeColor:'#1c1612',taper:.5,fuzz:1,segments:true,color:'#8a7050',alt:'#6f5a40',stripe:{on:false,c:'#3a2c20'},mark:{on:false,c:'#e8d8a8'},legs:{on:false,c:'#7a6244'}},
 antenna:{type:'thread',len:36,spread:30,barb:7,color:'#3a2e22'}};
const full=o=>{const O=dm(structuredClone(DEF),o);for(const k of['fore','hind'])O[k].eyes.forEach(e=>{while(e.cols.length<4)e.cols.push(e.cols[e.cols.length-1])});return O};

/* ---- parameter specs: also drive the UI and the cross-parameter realism limits ---- */
const lim=(f,c)=>typeof f==='function'?f(c):f,g=(c,p)=>get(c,p);
const R=(p,l,mn,mx,st,vis)=>({t:'r',p,l,mn,mx,st,vis}),K=(p,l,vis)=>({t:'c',p,l,vis}),T=(p,l,vis)=>({t:'t',p,l,vis}),S=(p,l,o,vis)=>({t:'s',p,l,o,vis}),L=(p,l,item,make)=>({t:'l',p,l,item,make});
const on=p=>c=>!!get(c,p);
const pat=k=>[K(k+'.base','Base colour'),K(k+'.edge','Outline colour'),
 T(k+'.grad.on','Gradient to outer edge'),K(k+'.grad.c','Outer colour',on(k+'.grad.on')),
 T(k+'.margin.on','Margin band'),R(k+'.margin.w','Margin width',1,14,.5,on(k+'.margin.on')),K(k+'.margin.c','Margin colour',on(k+'.margin.on')),
 T(k+'.costalBand.on','Leading-edge band'),R(k+'.costalBand.w','Band width',1,12,.5,on(k+'.costalBand.on')),K(k+'.costalBand.c','Band colour',on(k+'.costalBand.on')),
 T(k+'.fringe.on','Wing fringe (hair-like scales along the edge)'),R(k+'.fringe.len','Fringe length',.2,1.6,.05,on(k+'.fringe.on')),K(k+'.fringe.c','Fringe colour',on(k+'.fringe.on')),
 T(k+'.veins.on','Veins'),K(k+'.veins.c','Vein colour',on(k+'.veins.on')),
 T(k+'.speck.on','Speckling'),R(k+'.speck.n','Speck count',5,200,1,on(k+'.speck.on')),R(k+'.speck.s','Speck size',.006,.03,.001,on(k+'.speck.on')),K(k+'.speck.c','Speck colour',on(k+'.speck.on')),T(k+'.speck.ring','Ringed specks',on(k+'.speck.on')),K(k+'.speck.rc','Ring colour',c=>g(c,k+'.speck.on')&&g(c,k+'.speck.ring')),
 L(k+'.bands','Bands / lines',[R('u','Position',.03,.97,.01),R('w','Width at leading edge',.01,.4,.005),R('w2','Width at inner edge',.01,.5,.005),R('skew','Skew',-.6,.6,.01),R('wave','Waviness',0,8,.1),R('freq','Wave frequency',2,16,.5),K('c','Colour')],()=>bd(.5,.05,'#5a4630',0,3,9)),
 L(k+'.spots','Spots',[R('u','Along wing',.03,.97,.01),R('v','Across wing',-.1,1.1,.01),R('rx','Width',.01,.2,.005),R('ry','Height',.01,.2,.005),R('rot','Rotation',-90,90,1),R('o','Opacity',.2,1,.05),K('c','Fill'),R('rw','Ring width',0,3,.1),K('ring','Ring colour')],()=>sp(.5,.5,.05,.07,'#e8dcc0','#3a2c20')),
 L(k+'.eyes','Eyespots',[R('u','Along wing',.05,.95,.01),R('v','Across wing',0,1,.01),R('r','Size',.04,.24,.005),T('hl','Highlight'),K('cols.0','Outer ring'),K('cols.1','Ring 2'),K('cols.2','Ring 3'),K('cols.3','Pupil')],()=>E(.5,.5,.12,['#2a2420','#f0cf5e','#2a2420','#86b3da']))];
const TABS={
'Forewing':[R('fore.chord','Wing width',30,62,.5),R('fore.sweep','Apex rake (forward sweep)',0,.34,.01),
 R('fore.hook','Falcate apex hook',0,c=>clamp((70-g(c,'fore.chord'))/25,0,.9),.01),R('fore.bulge','Outer margin convexity',0,c=>.4-g(c,'fore.hook')*.25,.01),
 R('fore.tx','Tornus position',.68,.92,.01),R('fore.costal','Leading-edge convexity',0,.5,.01),R('fore.apex','Front corner (apex): round ◂ 0 ▸ sharp',-.9,.9,.01),R('fore.tornus','Back corner (tornus): round ◂ 0 ▸ sharp',-.9,.9,.01),
 R('fore.teeth','Scallops',0,7,1),R('fore.tooth','Scallop depth',0,c=>g(c,'fore.chord')*.05,.1,c=>g(c,'fore.teeth')>0),R('fore.tilt','Wing angle',-6,8,.5)],
'Hindwing':[R('hind.len','Length',55,c=>Math.min(92,g(c,'fore.chord')*2.3),1),
 R('hind.chord','Width',c=>g(c,'hind.len')*.7,c=>Math.min(g(c,'hind.len')*1.08,g(c,'fore.chord')*1.5),.5),R('hind.round','Outer roundness',0,1,.01),R('hind.apex','Front corner: round ◂ 0 ▸ sharp',-.9,.9,.01),R('hind.anal','Back corner (anal angle): round ◂ 0 ▸ sharp',-.9,.9,.01,c=>g(c,'hind.tail')<=2),
 R('hind.tail','Tail length',0,c=>g(c,'hind.len')*1.6,1),R('hind.tw','Tail root width',2,c=>Math.max(2.5,g(c,'hind.tail')*.12+2),.1,c=>g(c,'hind.tail')>2),R('hind.curl','Tail curl',-.5,.5,.01,c=>g(c,'hind.tail')>2),R('hind.tailPos','Tail position along trailing edge',.35,.78,.01,c=>g(c,'hind.tail')>2),
 R('hind.teeth','Scallops',0,7,1),R('hind.tooth','Scallop depth',0,c=>g(c,'hind.chord')*.05,.1,c=>g(c,'hind.teeth')>0),R('hind.tilt','Wing angle',4,24,.5)],
'Body':[R('body.tw','Thorax width',10,c=>Math.min(21,g(c,'fore.chord')*.5),.5),R('body.head','Head size',.42,.66,.01),
 R('body.abdW','Abdomen width',c=>g(c,'body.tw')*.45,c=>g(c,'body.tw')*.95,.5),R('body.abdLen','Abdomen length',38,c=>Math.min(100,1100/g(c,'body.abdW'),g(c,'hind.chord')+40),1),
 R('body.taper','Abdomen taper',0,1,.01),R('body.fuzz','Fuzz / hair-scales',0,2.2,.05),
 T('body.eyes','Show eyes'),R('body.eyeSize','Eye size',.08,.26,.01,on('body.eyes')),T('body.segments','Abdomen segments'),
 T('body.stripe.on','Abdomen bands'),K('body.stripe.c','Band colour',on('body.stripe.on')),T('body.mark.on','Thorax marking'),K('body.mark.c','Marking colour',on('body.mark.on')),
 K('body.legs.c','Leg colour (bottom view only)')],
'Antennae':[S('antenna.type','Type',['thread','serrate','feather']),R('antenna.len','Length',22,60,1),R('antenna.spread','Spread angle',15,50,1),
 R('antenna.barb','Barb length',2,c=>g(c,'antenna.len')*.28,.5,c=>g(c,'antenna.type')!=='thread')],
'Fore pattern':pat('fore'),'Hind pattern':pat('hind'),
'Style':[S('view','View',['top','bottom']),R('organic','Organic irregularity',0,1,.01),R('underFade','Underside fade (bottom view)',0,.8,.01)],'Palette':[K('fore.base','Forewing'),K('fore.edge','Forewing outline'),K('hind.base','Hindwing'),K('hind.edge','Hindwing outline'),K('body.color','Body'),K('body.alt','Body tufts'),K('body.eyeColor','Eyes'),K('antenna.color','Antennae')]};
const walk=(specs,o,fn)=>{for(const s of specs){if(s.t==='l')(get(o,s.p)||[]).forEach((_,i)=>walk(s.item.map(x=>({...x,p:`${s.p}.${i}.${x.p}`})),o,fn));else fn(s)}};
function constrain(o){for(let n=0;n<2;n++)for(const sp_ of Object.values(TABS))walk(sp_,o,s=>{if(s.t!=='r')return;const v=get(o,s.p);if(typeof v!=='number')return;const mn=lim(s.mn,o),mx=Math.max(mn,lim(s.mx,o));set(o,s.p,clamp(v,mn,mx))});return o}

/* ---- wing outlines: smooth splines + low-frequency organic noise ---- */
const nz=rj=>{const p=[rj()*6.28,rj()*6.28,rj()*6.28];return i=>Math.sin(i*.45+p[0])+.6*Math.sin(i*1.1+p[1])+.3*Math.sin(i*2.3+p[2])};
// corner sharpness: pull neighbours in and push the corner out -> tighter turn
const sharp=(P,i,s)=>{if(!s)return;const b=P[i],a=P[i-1],c=P[i+1],m=[(a[0]+c[0])/2,(a[1]+c[1])/2],nb=[b[0]+(b[0]-m[0])*s*.4,b[1]+(b[1]-m[1])*s*.4],k=1-.45*s;P[i]=nb;P[i-1]=[nb[0]+(a[0]-nb[0])*k,nb[1]+(a[1]-nb[1])*k];P[i+1]=[nb[0]+(c[0]-nb[0])*k,nb[1]+(c[1]-nb[1])*k]};
function finish(P,oS,oE,cE,A,T,I,w,L,C,org,rj){const n=8;let all=cr(P,n);
 if(org){const f=nz(rj),amp=org*.011*L;all=all.map((p,i)=>{const dx=p[0]-L*.45,dy=p[1]-C*.4,m=Math.hypot(dx,dy)||1,k=amp*f(i);return[p[0]+dx/m*k,p[1]+dy/m*k]})}
 const a=oS*n,b=oE*n,outer=wavy(all.slice(a,b+1),w.teeth,w.tooth,[L*.5,C*.5]);all.splice(a,b-a+1,...outer);return{pts:all,outer,costal:all.slice(0,cE*n+1),map:mapper(A,T,I),len:L,chord:C}}
function foreShape(w,org,rj){const L=w.len,C=w.chord,ay=-w.sweep*L,h=w.hook,t=w.tx;
 const P=[[0,-.03*C],[.32*L,ay*.32-w.costal*.2*C],[.68*L,ay*.72-w.costal*.16*C],[.92*L,ay*.97+.04*C],[L+h*.1*L,ay+.2*C-h*.22*C],[L*(.97+w.bulge*.06)-h*.14*L,ay+(C-ay)*.45],[L*t+.08*L,C*.88],[L*t-.03*L,C],[.55*L,C*.98],[.22*L,C*.62],[0,C*.3]];
 sharp(P,4,w.apex);sharp(P,7,w.tornus);
 return finish(P,4,7,4,[L,ay+.1*C],[L*t,C*.95],[0,C*.3],w,L,C,org,rj)}
function hindShape(w,org,rj){const L=w.len,C=w.chord,Q=[w.tailPos*L,C],tl=w.tail,tw=w.tw,k=w.curl*tl*.4;
 const P=[[0,-.02*C],[.4*L,-.05*C],[.78*L,0],[L*.98,.2*C],[L*(1+w.round*.03),.52*C],[Math.min(.9*L,Q[0]+.3*L),.82*C]];
 if(tl>2)P.push([Q[0]+tw,C*.97],[Q[0]+tw*.6+k*.5,C+tl*.55],[Q[0]+w.curl*tl,C+tl],[Q[0]-tw*.6+k*.5,C+tl*.55],[Q[0]-tw,C*.97]);else P.push([Q[0],C]);
 P.push([Q[0]*.52,.86*C],[Q[0]*.14,.5*C]);
 sharp(P,3,w.apex);if(!(tl>2))sharp(P,6,w.anal);
 return finish(P,3,6,3,[L,.12*C],Q,[0,.35*C],w,L,C,org,rj)}
// hand-drawn-feeling venation: discal cell, forking curved veins from its end, posterior veins
function veinsD(S,rj,org){const N=S.outer.length-1,m=S.map,C=S.chord,k=8,Qd=(a,b,c)=>`M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${b[0].toFixed(1)} ${b[1].toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;let d='';
 d+=Qd(m(.02,.4),m(.2,.28),m(.42,.34))+Qd(m(.02,.56),m(.2,.64),m(.4,.6))+Qd(m(.42,.34),m(.48,.47),m(.4,.6));
 for(let i=0;i<k;i++){const t=(i+.5)/k,s=m(.42+.02*Math.sin(t*3.1),.34+.26*t),e=S.outer[clamp(Math.round(N*(t+(rj()-.5)*.05)),0,N)],mid=[(s[0]+e[0])/2,(s[1]+e[1])/2],len=Math.hypot(e[0]-s[0],e[1]-s[1])||1,b=(rj()-.5)*C*(.15+.3*org),c=[mid[0]-(e[1]-s[1])/len*b,mid[1]+(e[0]-s[0])/len*b];
  d+=Qd(s,c,e);
  if(i%2){const p=[s[0]+(e[0]-s[0])*.7+(c[0]-mid[0])*.3,s[1]+(e[1]-s[1])*.7+(c[1]-mid[1])*.3],f=S.outer[clamp(Math.round(N*(t+.09)),0,N)];d+=Qd(p,[(p[0]+f[0])/2,(p[1]+f[1])/2+2],f)}}
 return d+Qd(m(.02,.6),m(.3,.8),m(.55,.97))+Qd(m(.02,.58),m(.15,.8),m(.27,.97))}
function wingSVG(S,P,id,org,rs,rj){
 const d=pathOf(S.pts),L=S.len,C=S.chord,J=(a=1)=>(rj()-.5)*org*a;let g_='',pre='',df=`<clipPath id="${id}c"><path d="${d}"/></clipPath>`,fill=P.base;
 if(P.grad.on){df+=`<linearGradient id="${id}g"><stop offset=".15" stop-color="${P.base}"/><stop offset="1" stop-color="${P.grad.c}"/></linearGradient>`;fill=`url(#${id}g)`}
 // scale fringe: hair-like scales along the outer margin, irregular length/angle
 if(P.fringe.on){const cx=L*.5,cy=C*.45,l0=P.fringe.len*L*.055;let q='';for(const p of S.outer)for(let r=0;r<2;r++){const dx=p[0]-cx,dy=p[1]-cy,m=Math.hypot(dx,dy)||1,a=J(.5),ux=(dx*Math.cos(a)-dy*Math.sin(a))/m,uy=(dx*Math.sin(a)+dy*Math.cos(a))/m,l=l0*(1+J(1.1)),o=r*.6;q+=`M${(p[0]+o-ux*l*.5).toFixed(1)} ${(p[1]-uy*l*.5).toFixed(1)}L${(p[0]+o+ux*l).toFixed(1)} ${(p[1]+uy*l).toFixed(1)}`}pre=`<path d="${q}" stroke="${P.fringe.c}" stroke-width=".9" stroke-linecap="round" fill="none"/>`}
 // tonal mottling so flat colour doesn't feel mechanical
 if(org>.02)for(let i=0,n=Math.round(40*org);i<n;i++){const[x,y]=S.map(rj(),rj()*1.1-.05);g_+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(L*(.04+rj()*.08)).toFixed(1)}" ry="${(C*(.015+rj()*.035)).toFixed(1)}" transform="rotate(${(Math.atan2(y-C*.3,x+1)*57.3).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${rj()<.5?'#000':'#fff'}" opacity="${(.025+rj()*.045).toFixed(3)}"/>`}
 if(P.veins.on)g_+=`<path d="${veinsD(S,rj,org)}" fill="none" stroke="${P.veins.c}" stroke-width="1" opacity=".5" stroke-linecap="round"/>`;
 if(P.margin.on)g_+=`<path d="${pathOf(S.outer,false)}" fill="none" stroke="${P.margin.c}" stroke-width="${P.margin.w*2}" stroke-linejoin="round"/>`;
 if(P.costalBand.on)g_+=`<path d="${pathOf(S.costal,false)}" fill="none" stroke="${P.costalBand.c}" stroke-width="${P.costalBand.w*2}"/>`;
 for(const b of P.bands){const l=[],r=[],f=nz(rj);for(let i=0;i<=16;i++){const v=-.3+1.6*i/16,u=b.u+b.skew*(v-.5)+b.wave*Math.sin(v*b.freq)/L+f(i)*org*.008,hw=(b.w+(b.w2-b.w)*clamp(v,0,1))/2*(1+f(i+7)*org*.12);l.push(S.map(u-hw,v));r.push(S.map(u+hw,v))}g_+=`<path d="${pathOf([...l,...r.reverse()])}" fill="${b.c}"/>`}
 for(const s of P.spots){const[x,y]=S.map(s.u+J(.03),s.v+J(.03));g_+=`<ellipse cx="${x}" cy="${y}" rx="${s.rx*L*(1+J(.4))}" ry="${s.ry*C*(1+J(.4))}" transform="rotate(${s.rot+J(30)} ${x} ${y})" fill="${s.c}"${s.rw>0?` stroke="${s.ring}" stroke-width="${s.rw}"`:''} opacity="${s.o}"/>`}
 if(P.speck.on){const k=P.speck;for(let i=0;i<k.n;i++){const[x,y]=S.map(rs(),rs()*1.1-.05);g_+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(k.s*L*(.5+rs())*(1+J(.3))).toFixed(1)}" fill="${k.c}"${k.ring?` stroke="${k.rc}"`:''}/>`}}
 for(const e of P.eyes){const[x,y]=S.map(e.u,e.v),n=e.cols.length;e.cols.forEach((c,i)=>{const r=e.r*L*(1-.65*i/Math.max(n-1,1));g_+=`<ellipse cx="${(x+J(.08)*r*i).toFixed(1)}" cy="${(y+J(.08)*r*i).toFixed(1)}" rx="${(r*(1+J(.08))).toFixed(1)}" ry="${(r*(1+J(.08))).toFixed(1)}" fill="${c}"/>`});if(e.hl)g_+=`<ellipse cx="${x-e.r*L*.15}" cy="${y-e.r*L*.18}" rx="${e.r*L*.12}" ry="${e.r*L*.08}" fill="#fff" opacity=".85"/>`}
 return{defs:df,body:`<g>${pre}<path d="${d}" fill="${fill}"/><g clip-path="url(#${id}c)">${g_}</g><path d="${d}" fill="none" stroke="${P.edge}" stroke-width="1.5" stroke-linejoin="round"/></g>`}}

/* ---- body: thorax, small head with lateral eyes, rounded segmented abdomen, antennae ---- */
function bodySVG(B,A,id,rnd,org,bottom){
 const tw=B.tw/2,tl=tw*1.15,hw=tw*B.head,hl=hw*.78,hy=-tl-hl*.5,a0=tl*.3,AL=B.abdLen,AW=B.abdW/2,f=nz(rnd),J=(a=1)=>(rnd()-.5)*org*a;
 const tc=i=>[B.color,mix(B.color,B.alt,.3),mix(B.color,'#ffffff',.12)][i%3];
 const hwid=t=>AW*Math.pow(1-Math.pow(t,3.4),.5)*(1-B.taper*.4*t)*(1+f(t*24)*org*.05);
 const Rr=[],Ll=[];for(let i=0;i<=24;i++){const t=i/24,h=hwid(t),y=a0+AL*t;Rr.push([h,y]);Ll.push([-h,y])}
 const abd=pathOf([...Rr,...Ll.reverse()]);let s=`<clipPath id="${id}a"><path d="${abd}"/></clipPath>`;
 if(bottom)for(const sg of[1,-1])for(let i=0;i<3;i++){const y=-tl*.35+i*tl*.5;s+=`<path d="M${sg*tw*.7} ${y}L${sg*(tw+9+i*3+J(3))} ${y+(i-1)*6-3+J(3)}" stroke="${B.legs.c}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`}
 s+=`<path d="${abd}" fill="${B.color}"/><g clip-path="url(#${id}a)">`;
 if(B.stripe.on)for(let i=1;i<9;i+=2)s+=`<rect x="${-AW}" y="${a0+AL*i/9}" width="${AW*2}" height="${AL/9}" fill="${bottom?mix(B.stripe.c,B.color,.4):B.stripe.c}"/>`;
 if(B.segments)for(let i=1;i<10;i++){const y=a0+AL*i/10+J(AL*.02);s+=`<path d="M${-AW} ${y}L${AW} ${y+J(1.5)}" stroke="${B.alt}" stroke-width="1.1" opacity=".7"/>`}
 s+='</g>';
 const na=Math.round(12*B.fuzz);for(let i=0;i<na;i++){const t=.04+.42*i/na,h=hwid(t);for(const sg of[1,-1])s+=`<circle cx="${(sg*h*(.95+rnd()*.1)).toFixed(1)}" cy="${(a0+AL*t+J(2)).toFixed(1)}" r="${(AW*.2*(1+J(.7))).toFixed(1)}" fill="${tc(i+(sg>0))}"/>`}
 s+=`<ellipse rx="${tw}" ry="${tl}" fill="${B.color}"/>`;
 const nt=Math.round(28*B.fuzz);for(let i=0;i<nt;i++){const a=Math.PI*2*i/nt+rnd()*.2,k=.92+rnd()*.12;s+=`<circle cx="${(Math.cos(a)*tw*k).toFixed(1)}" cy="${(Math.sin(a)*tl*k).toFixed(1)}" r="${(tw*.24*(1+J(.7))).toFixed(1)}" fill="${tc(i)}"/>`}
 if(B.mark.on&&!bottom)s+=`<ellipse cy="${-tl*.1}" rx="${tw*.42}" ry="${tl*.55}" fill="${B.mark.c}"/>`;
 s+=`<ellipse cy="${hy}" rx="${hw}" ry="${hl}" fill="${B.color}"/>`;
 for(let i=0;i<9;i++){const a=Math.PI*(1+i/8);s+=`<circle cx="${Math.cos(a)*hw*.9}" cy="${hy+Math.sin(a)*hl*.9}" r="${hw*.28*(1+J(.5))}" fill="${tc(i)}"/>`}
 if(B.eyes)for(const sg of[1,-1])s+=`<ellipse cx="${sg*hw*.78}" cy="${hy+hl*.1}" rx="${hw*B.eyeSize}" ry="${hw*B.eyeSize*1.25}" fill="${B.eyeColor}"/>`;
 const ant=sg=>{const bx=sg*hw*.4,by=hy-hl*.6,a=(A.spread+J(8))*Math.PI/180,t=[bx+sg*Math.sin(a)*A.len,by-Math.cos(a)*A.len],pts=qz([bx,by],[bx+sg*A.len*.1,by-A.len*.8],t,24);
  let o=`<path d="${pathOf(pts,false)}" fill="none" stroke="${A.color}" stroke-width="1.5" stroke-linecap="round"/>`;
  if(A.type!=='thread'){const f=A.type==='serrate'?.35:1;let d='';for(let i=2;i<24;i++){const p=pts[i],dx=pts[i+1][0]-pts[i-1][0],dy=pts[i+1][1]-pts[i-1][1],nn=Math.hypot(dx,dy)||1,l=A.barb*f*(1-i/30)*(1+J(.4)),nx=-dy/nn,ny=dx/nn,fx=dx/nn*l*.5,fy=dy/nn*l*.5;d+=`M${p[0]+nx*l+fx} ${p[1]+ny*l+fy}L${p[0]} ${p[1]}L${p[0]-nx*l+fx} ${p[1]-ny*l+fy}`}o+=`<path d="${d}" fill="none" stroke="${A.color}" stroke-linecap="round"/>`}return o};
 return s+ant(1)+ant(-1)}
const qz=(a,b,c,n)=>cr4([a,[a[0]+(b[0]-a[0])*2/3,a[1]+(b[1]-a[1])*2/3],[c[0]+(b[0]-c[0])*2/3,c[1]+(b[1]-c[1])*2/3],c],n);
const cr4=(p,n)=>Array.from({length:n+1},(_,i)=>{const t=i/n,u=1-t,a=u*u*u,b=3*u*u*t,c=3*u*t*t,d=t*t*t;return[a*p[0][0]+b*p[1][0]+c*p[2][0]+d*p[3][0],a*p[0][1]+b*p[1][1]+c*p[2][1]+d*p[3][1]]});

// top view: forewings over hindwings, body on top. bottom view: layer order reverses, undersides are paler, legs show.
function renderMoth(o={},opt={}){
 const O=full(o);if(!opt.free)constrain(O);
 const org=O.organic,bottom=O.view==='bottom',sd=(O.seed>>>0)||1,mk=k=>mulberry(sd*31+k),id='m'+Math.random().toString(36).slice(2,7);
 const fade=c=>mix(c,'#efe6d4',O.underFade*.8),F=bottom?tint(O.fore,fade):O.fore,H=bottom?tint(O.hind,fade):O.hind,A=O.antenna;
 const B=bottom?{...O.body,color:mix(O.body.color,O.body.alt,.6),legs:{...O.body.legs,on:true}}:O.body,tw=B.tw/2,tl=tw*1.15;
 const fb=[tw*.5,-tl*.45],hb=[tw*.4,tl*.3];
 const sides=[0,1].map(s=>{const fs=foreShape(F,org,mk(1+s*2)),hs=hindShape(H,org,mk(2+s*2));return{fs,hs,fw:wingSVG(fs,F,id+'f'+s,org,mk(5),mk(11+s)),hw:wingSVG(hs,H,id+'h'+s,org,mk(6),mk(13+s)),ft:F.tilt+(mk(21+s)()-.5)*org*1.6,ht:H.tilt+(mk(23+s)()-.5)*org*1.6}});
 const sh=`url(#sh${id})`,grp=(w,b,a,s,shadow)=>`<g${shadow?` filter="${sh}"`:''} transform="${s?'scale(-1 1) ':''}translate(${b}) rotate(${a})">${w.body}</g>`;
 const hindG=sides.map((q,s)=>grp(q.hw,hb,q.ht,s,bottom)).join(''),foreG=sides.map((q,s)=>grp(q.fw,fb,q.ft,s,!bottom)).join('');
 const bb={x:0,y1:1e9,y2:-1e9};
 const ext=(pts,b,a)=>{const c=Math.cos(a*Math.PI/180),s=Math.sin(a*Math.PI/180);pts.forEach(p=>{const x=b[0]+p[0]*c-p[1]*s,y=b[1]+p[0]*s+p[1]*c;bb.x=Math.max(bb.x,Math.abs(x));bb.y1=Math.min(bb.y1,y);bb.y2=Math.max(bb.y2,y)})};
 sides.forEach(q=>{ext(q.fs.pts,fb,q.ft);ext(q.hs.pts,hb,q.ht)});
 const hy=-tl-tw*B.head*.78*.5;bb.y1=Math.min(bb.y1,hy-A.len-tw*B.head*.5);bb.y2=Math.max(bb.y2,tl*.3+B.abdLen);bb.x=Math.max(bb.x,Math.sin(A.spread*Math.PI/180)*A.len+8);
 const pad=14,defs=sides.map(q=>q.fw.defs+q.hw.defs).join('')+`<filter id="sh${id}" x="-15%" y="-15%" width="130%" height="135%"><feDropShadow dx="0" dy="1.8" stdDeviation="2.2" flood-color="#000" flood-opacity=".25"/></filter>`;
 return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(-bb.x-pad).toFixed(1)} ${(bb.y1-pad).toFixed(1)} ${(2*(bb.x+pad)).toFixed(1)} ${(bb.y2-bb.y1+2*pad).toFixed(1)}" role="img" aria-label="Moth, ${bottom?'bottom':'top'} view"><defs>${defs}</defs>${bottom?foreG+hindG:hindG+foreG}<g filter="${sh}">${bodySVG(B,A,id,mk(30),org,bottom)}</g></svg>`}

/* ---- random species: category archetypes. seed + style -> the same moth every time ---- */
const hx=(h,s,l)=>{h=((h%360)+360)%360;s/=100;l/=100;const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))))};return'#'+[f(0),f(8),f(4)].map(v=>v.toString(16).padStart(2,'0')).join('')};
const CATS=['Any','Cool','Cute','Cryptic','Showy','Spooky','Elegant','Eyespot','Classic species'];
const hsl2=c=>{const[r,g,b]=hex2(c).map(v=>v/255),x=Math.max(r,g,b),n=Math.min(r,g,b),d=x-n,l=(x+n)/2;let h=0;if(d)h=x===r?((g-b)/d+6)%6:x===g?(b-r)/d+2:(r-g)/d+4;return[h*60,d?d/(1-Math.abs(2*l-1))*100:0,l*100]};
const rot=(c,d)=>{const[h,s,l]=hsl2(c);return hx(h+d,s,l)};
function randomMoth(seed,cat='Any'){
 const r=mulberry(seed*7919+13),Rn=(a,b)=>a+(b-a)*r(),P=a=>a[Math.floor(r()*a.length)],Y=p=>r()<p,I=(a,b)=>Math.round(Rn(a,b));
 if(cat==='Any')cat=P(['Cool','Cool','Cool','Cute','Cute','Cryptic','Showy','Showy','Spooky','Elegant','Elegant','Eyespot','Eyespot','Classic species','Classic species']);
 randomMoth.last=cat;
 if(cat==='Classic species'){const n=P(Object.keys(MOTHS)),ex=Y(.3);let o=structuredClone(MOTHS[n]);randomMoth.last=cat+': '+n+(ex?'':' cousin');
  if(!ex){o=tint(o,c=>rot(c,Rn(-35,35)));o.fore=dm(o.fore,{chord:(o.fore.chord||44)*Rn(.92,1.08),sweep:(o.fore.sweep??.14)*Rn(.8,1.2)})}
  return constrain(full({...o,seed}))}
 const V=(x,d)=>{x=x??d;return Array.isArray(x)?Rn(...x):x};
 const geo=(o={})=>{const hl=V(o.hl,[58,84]);return{
  fore:{chord:V(o.chord,[34,56]),sweep:V(o.sweep,[.06,.26]),hook:Y(o.hookP??.2)?Rn(.2,.7):0,bulge:V(o.bulge,[.1,.35]),tx:V(o.tx,[.74,.9]),costal:V(o.costal,[.15,.4]),apex:V(o.apex,[-.3,.5]),tornus:V(o.tornus,[-.3,.4]),teeth:Y(o.teethP??.08)?P([3,4,5,6]):0,tooth:Rn(1,2.2),tilt:Rn(-2,4)},
  hind:{len:hl,chord:hl*V(o.hr,[.75,1]),round:Rn(.2,.9),tail:Y(o.tailP??.08)?hl*Rn(.4,1):0,tw:Rn(3,5),curl:Rn(-.2,.4),tilt:Rn(8,18),apex:V(o.hapex,[-.3,.4]),anal:V(o.anal,[-.3,.4]),tailPos:Rn(.5,.68)},
  body:{tw:V(o.tw,[11,18]),abdLen:V(o.abdLen,[46,80]),head:V(o.head,[.5,.62]),eyeSize:V(o.eye,[.11,.2]),taper:Rn(.3,.8),fuzz:V(o.fuzz,[.7,1.6])},
  antenna:{type:P(o.ant||['thread','thread','serrate','feather']),len:V(o.al,[28,46]),spread:Rn(20,40),barb:5}}};
 const mk=(g,f,h,b,a)=>constrain(full({seed,fore:{...g.fore,...f},hind:{...g.hind,...h},body:{...g.body,abdW:g.body.tw*Rn(.6,.9),...b},antenna:{...g.antenna,...a}}));
 const ln=(n,u0,u1,w,c,wv,fq,sk)=>Array.from({length:n},(_,i)=>bd(n>1?u0+(u1-u0)*i/(n-1):u0,w,c,sk??Rn(-.25,.25),wv,fq,w*Rn(.8,1.3)));
 const scatter=(n,u0,u1,v0,v1,rx,ry,c,ring,o)=>Array.from({length:n},()=>sp(Rn(u0,u1),Rn(v0,v1),V(rx),V(ry),c,ring,o||1,Rn(-40,40)));
 let h,g,base,dk,lt,mid;
 if(cat==='Cool'){h=Rn(0,360);const dark=Y(.65);g=geo({chord:[40,56],sweep:[.12,.28],hookP:.35,tailP:.3,ant:['feather','feather','serrate']});
  base=dark?hx(h,Rn(20,50),Rn(7,16)):hx(h,Rn(55,80),Rn(30,44));const a=hx(h+P([150,180,210]),Rn(70,95),Rn(50,62)),b=hx(h+P([30,60,-40]),Rn(75,95),Rn(52,64)),pale=hx(h+Rn(-20,20),15,94),edge=hx(h,40,dark?5:18);
  const f={base,edge,fringe:{on:false,len:.5,c:pale},bands:ln(I(2,3),.22,.66,Rn(.025,.045),a,Rn(2,5),Rn(6,10),Rn(-.15,.15)).map((x,i)=>i%2?{...x,c:b}:x),spots:Y(.5)?[sp(.5,Rn(.3,.5),.03,.045,pale)]:[]};
  if(Y(.55))f.margin=M(Rn(2,4),P([pale,b]));if(Y(.35))f.grad={on:true,c:a};if(Y(.3))f.costalBand=M(Rn(3,6),b);
  const hd={base:Y(.6)?hx(h+P([180,30,-30,60]),Rn(80,95),Rn(48,58)):mix(base,a,.25),edge,fringe:{on:false,len:.5,c:pale},margin:M(Rn(3,8),dark?edge:pale)};
  if(Y(.5))hd.spots=[sp(Rn(.45,.65),Rn(.5,.65),Rn(.12,.22),Rn(.1,.16),a),sp(Rn(.6,.8),Rn(.25,.4),.07,.08,b)];else hd.eyes=[E(.45,.5,Rn(.14,.2),[edge,b,edge,pale])];
  if(Y(.4))hd.bands=ln(I(1,2),.2,.35,.04,a,3,8);
  return mk(g,f,hd,{color:dark?mix(base,a,.15):mix(base,pale,.2),alt:a,stripe:{on:Y(.5),c:b}},{color:edge})}
 if(cat==='Cute'){h=P([340,50,20,270,150,200,10]);const s=Rn(55,85);g=geo({chord:[46,60],sweep:[.03,.12],hookP:0,bulge:[.25,.4],apex:[-.7,-.3],tornus:[-.6,-.2],hl:[56,70],hr:[.92,1.06],hapex:[-.6,-.3],anal:[-.6,-.3],tailP:0,teethP:0,tw:[15,19],abdLen:[38,50],head:[.6,.66],eye:[.18,.26],fuzz:[1.7,2.2],al:[22,30],ant:['feather','feather','thread']});
  base=hx(h,s,Rn(72,84));const c2=hx(h+P([40,-40,180,120]),s,Rn(78,88));dk=hx(h,s*.8,Rn(55,65));lt=hx(h,s*.5,94);
  const f={base,edge:dk,fringe:{on:false,len:Rn(.6,1.1),c:lt},margin:M(Rn(3,6),c2),spots:scatter(I(2,4),.25,.8,.25,.75,[.025,.04],[.05,.08],P([lt,c2]))};if(Y(.5))f.grad={on:true,c:c2};
  return mk(g,f,{base:c2,edge:dk,fringe:{on:false,len:Rn(.6,1.1),c:lt},margin:M(Rn(3,6),base)},{color:mix(c2,'#ffffff',.2),alt:mix(base,c2,.5),eyeColor:'#2a1c1c',legs:{c:dk}},{color:dk})}
 if(cat==='Cryptic'){const k=P(['bark','bark','lichen','leaf','birch','sand']),lf=k==='leaf';g=geo({chord:lf?[38,50]:[36,54],sweep:lf?[.2,.3]:[.06,.2],hookP:lf?1:.1,teethP:lf?.4:.08,tailP:0,ant:['thread','serrate','feather']});
  h={bark:Rn(20,40),lichen:Rn(70,110),leaf:Rn(22,38),birch:Rn(30,50),sand:Rn(35,48)}[k];const s={bark:Rn(8,25),lichen:Rn(8,22),leaf:Rn(35,55),birch:Rn(5,15),sand:Rn(25,45)}[k],l={bark:Rn(30,50),lichen:Rn(55,72),leaf:Rn(34,48),birch:Rn(88,95),sand:Rn(68,80)}[k];
  base=hx(h,s,l);dk=hx(h,s+10,Math.max(l*.3,8));mid=hx(h,s,l*.7);lt=hx(h,s*.6,Math.min(l+22,96));
  const f={base,edge:mid,fringe:{on:false,len:.4,c:lt},veins:{on:lf||Y(.3),c:mid},bands:[],spots:[]},hb=mix(base,lt,.5);
  if(lf){f.bands=[bd(.5,.03,dk,P([-.5,.5]),2,9,.025),...ln(3,.3,.75,.012,mid,2,9,P([-.5,.5]))];f.speck=SK(I(20,50),.012,mid)}
  else{f.bands=ln(I(2,3),.25,.7,Rn(.015,.03),dk,Rn(3,7),Rn(7,13));f.spots=[sp(.4,.35,.03,.05,lt,dk),sp(.55,.45,.025,.04,lt,dk)];if(k!=='sand'||Y(.5))f.speck=SK(I(60,150),Rn(.008,.016),dk);
   if(k==='lichen')f.spots.push(...scatter(4,.2,.8,.2,.8,[.07,.13],[.08,.2],hx(h+Rn(10,40),s+15,l-12),'',.5));if(Y(.4))f.costalBand=M(Rn(3,6),mid)}
  return mk(g,f,{base:hb,edge:mid,fringe:{on:false,len:.4,c:lt},bands:ln(1,.55,.55,.02,dk,4,10),speck:SK(I(20,70),.01,dk)},{color:Y(.5)?mid:base,alt:dk,stripe:{on:false}},{color:dk})}
 if(cat==='Showy'){const k=P(['tiger','burnet','harlequin']);dk=hx(P([230,270,20]),25,12);h=P([2,12,25,45]);const pop=hx(h,Rn(80,95),Rn(48,56)),cream=hx(Rn(38,55),Rn(30,55),Rn(88,94));g=geo({chord:[32,46],sweep:[.08,.16],hookP:0,hl:[58,70],tailP:0,ant:['thread','serrate','feather']});let f,hd;
  if(k==='tiger'){const br=hx(Rn(15,30),Rn(40,60),Rn(18,28));f={base:cream,edge:br,fringe:{on:false,len:.5,c:br},spots:scatter(I(4,6),.2,.85,.15,.85,[.05,.1],[.08,.14],br)};hd={base:pop,edge:dk,spots:scatter(I(3,5),.25,.8,.25,.8,[.05,.08],[.07,.1],hx(225,50,20),dk)};}
  else if(k==='burnet'){f={base:dk,edge:dk,costalBand:{on:Y(.5),w:5,c:pop},spots:scatter(I(3,5),.25,.85,.35,.9,[.05,.07],[.07,.09],pop)};hd={base:pop,edge:dk,margin:M(Rn(4,6),dk)}}
  else{f={base:dk,edge:dk,margin:M(2.5,cream),bands:[bd(Rn(.3,.5),Rn(.08,.14),cream,Rn(-.2,.2),2,9,.12)],spots:scatter(2,.6,.85,.2,.7,.05,.07,pop)};hd={base:hx(Rn(42,55),90,56),edge:dk,margin:M(Rn(6,9),dk),bands:ln(1,.5,.5,.06,dk,3,8)}}
  return mk(g,f,hd,{color:dk,alt:mix(dk,pop,.3),stripe:{on:true,c:k==='tiger'?pop:cream}},{color:dk})}
 if(cat==='Spooky'){const k=P(['night','bone']);h=P([270,0,160,330]);const glow=P(['#d8202a','#7ad04a','#b05cf0']),bone=hx(45,25,88);dk=hx(h,Rn(10,35),Rn(8,15));g=geo({chord:[42,56],sweep:[.16,.3],hookP:.6,tailP:.1,hl:[62,84],ant:['feather','serrate'],tw:[14,19]});let f,hd;
  if(k==='night'){f={base:dk,edge:'#050505',grad:{on:true,c:mix(dk,glow,.3)},fringe:{on:false,len:.5,c:mix(dk,bone,.4)},bands:ln(2,.25,.62,.015,bone,Rn(3,6),Rn(8,12)),spots:[sp(.5,.4,.025,.04,bone),sp(.62,.5,.02,.03,bone)],veins:{on:Y(.4),c:mix(dk,bone,.3)}};hd={base:mix(dk,glow,.15),edge:'#050505',margin:M(6,dk),eyes:[E(.45,.5,Rn(.16,.22),[dk,glow,dk,bone])]}}
  else{f={base:bone,edge:dk,bands:ln(3,.25,.7,Rn(.03,.06),dk,Rn(3,6),Rn(7,11)),speck:SK(I(40,90),.012,dk),spots:[sp(.45,.4,.03,.05,glow,dk)]};hd={base:mix(dk,bone,.2),edge:dk,spots:scatter(3,.3,.8,.3,.8,.05,.07,bone),margin:M(5,dk)}}
  return mk(g,f,hd,{color:k==='bone'?bone:dk,alt:mix(dk,glow,.3),mark:{on:true,c:bone},stripe:{on:Y(.5),c:glow}},{color:mix(dk,bone,.55)})}
 if(cat==='Elegant'){h=P([140,170,200,280,40,20,60]);g=geo({chord:[32,44],sweep:[.14,.28],hookP:.3,tailP:1,hl:[64,84],hr:[.7,.85],anal:0,ant:['feather'],al:[34,46],abdLen:[56,72]});g.hind.tail=g.hind.len*Rn(.7,1.15);
  base=hx(h,Rn(35,65),Rn(78,88));const ac=hx(h+P([150,180,-40,40]),Rn(35,60),Rn(30,42)),lt2=hx(h,25,95),cb=Y(.6);
  const eyes=n=>[E(.5,.4,.07,[ac,hx(50,80,78),lt2,'#9ec7ee'])];const f={base,edge:mix(base,ac,.4),veins:{on:true,c:mix(base,ac,.35)},fringe:{on:false,len:.4,c:lt2},eyes:Y(.7)?eyes():[]};if(cb)f.costalBand=M(Rn(3,6),ac);if(Y(.4))f.grad={on:true,c:lt2};
  return mk(g,f,{base,edge:mix(base,ac,.4),veins:{on:true,c:mix(base,ac,.35)},margin:Y(.6)?M(2.5,ac):{on:false},eyes:Y(.7)?[E(.45,.4,.08,[ac,hx(50,80,78),lt2,'#9ec7ee'])]:[]},{color:mix(lt2,base,.3),alt:mix(base,'#ffffff',.5),fuzz:1.3},{color:mix(base,ac,.5)})}
 // Eyespot
 h=P([25,40,55,15,80,340]);g=geo({chord:[40,56],hookP:.1,hl:[62,80],hr:[.85,1.05],tailP:.05,ant:['feather','serrate','thread']});
 base=hx(h,Rn(35,65),Rn(40,60));dk=hx(h,45,10);const hb=hx(h+Rn(-15,15),Rn(55,85),Rn(52,66)),rc=()=>[dk,hx(h+Rn(20,50),85,62),hx(h,45,12),P(['#ffffff','#9ec7ee','#f6e6a0'])];
 const f={base,edge:mix(base,dk,.5),fringe:{on:false,len:.5,c:hx(h,30,85)},bands:ln(I(1,2),.3,.65,.025,dk,Rn(3,6),Rn(7,12)),eyes:Y(.55)?[E(.5,.4,Rn(.06,.09),rc())]:[],margin:Y(.4)?M(3,mix(base,dk,.4)):{on:false}};if(Y(.4))f.grad={on:true,c:hx(h+20,50,30)};
 return mk(g,f,{base:hb,edge:mix(hb,dk,.5),margin:M(Rn(3,5),mix(hb,dk,.3)),eyes:Y(.5)?[E(.42,.5,Rn(.16,.24),rc())]:[E(.45,.3,.12,rc()),E(.45,.72,.1,rc())]},{color:mix(base,dk,.3),alt:mix(hb,dk,.2)},{color:dk})}

/* ---- personality quiz: answers -> style (scored) + seed (hash) + palette hue. Pure + deterministic ---- */
const QZ=[
 {k:'eve',q:'Your ideal evening?',o:[['Blanket, snacks, a favourite show',{Cute:2,Cryptic:1}],['A loud night out',{Showy:2,Cool:1}],['A long walk alone after dark',{Spooky:2,Elegant:1}],['Making something with your hands',{Eyespot:2,Cryptic:1}]]},
 {k:'grp',q:'In a group, you’re usually…',o:[['The one making everyone laugh',{Showy:2,Cute:1}],['Quietly observing',{Cryptic:2,Spooky:1}],['The calm planner',{Elegant:2,Eyespot:1}],['The wildcard',{Cool:2,Eyespot:1}]]},
 {k:'plc',q:'Pick a place',o:[['Misty pine forest',{Cryptic:2,Elegant:1}],['Neon city at night',{Cool:2,Showy:1}],['Sunlit meadow',{Cute:2,Elegant:1}],['Moonlit ruins',{Spooky:2,Cryptic:1}]]},
 {k:'bad',q:'When things go wrong, you…',o:[['Laugh and improvise',{Showy:1,Cool:1}],['Retreat and recharge',{Cryptic:1,Cute:1}],['Make a plan',{Elegant:2}],['Bluff and stand tall',{Eyespot:2,Spooky:1}]]},
 {k:'wrd',q:'Pick a word',o:[['Gentle',{Cute:2}],['Magnetic',{Cool:2}],['Mysterious',{Spooky:2}],['Graceful',{Elegant:2}],['Unassuming',{Cryptic:2}],['Bold',{Showy:2}],['Playful',{Eyespot:2}]]}];
const HUES=[['Red',5],['Orange',28],['Yellow',50],['Green',130],['Blue',215],['Violet',280],['Pink',330],['No preference',null]],QCATS=['Cool','Cute','Cryptic','Showy','Spooky','Elegant','Eyespot'];
function personal(A,hue,name){const sc={};QZ.forEach(q=>{const i=A[q.k];if(i!=null)for(const[c,v]of Object.entries(q.o[i][1]))sc[c]=(sc[c]||0)+v});
 const key=JSON.stringify([QZ.map(q=>A[q.k]??-1),hue,(name||'').trim().toLowerCase()]),seed=seedOf(key),r=mulberry(seed);let best='Cool',bv=-1;
 for(const c of QCATS){const v=(sc[c]||0)+r()*.5;if(v>bv){bv=v;best=c}}
 let m=randomMoth(seed,best);if(hue!=null){const[h,s]=hsl2(m.fore.base);if(s>12){const d=hue-h;m=tint(m,c=>rot(c,d))}}
 return{m:constrain(full(m)),cat:best,seed,key,sc}}

/* ---- species presets ---- */
const MOTHS={
'Rosy maple moth':{fore:{chord:56,sweep:.1,bulge:.3,tx:.82,costal:.2,apex:-.5,tornus:-.4,base:'#ec7fa5',edge:'#c25a82',fringe:{on:false,len:.5,c:'#f6c3d3'},bands:[bd(.48,.1,'#f8e47c',.05,0,9,.46)]},
 hind:{len:70,chord:62,round:.5,apex:-.4,anal:-.4,base:'#f8e47c',edge:'#d9b85a',margin:M(3.5,'#f2a6bf'),fringe:{on:false,len:.5,c:'#f6c3d3'}},
 body:{tw:17,abdW:15,abdLen:46,head:.62,eyeSize:.12,taper:.35,fuzz:1.9,color:'#f8e47c',alt:'#f0a9c0',legs:{on:true,c:'#ee86a8'}},
 antenna:{type:'feather',len:28,spread:34,barb:5,color:'#ee86a8'}},
'Luna moth':{fore:{chord:40,sweep:.2,hook:.1,bulge:.2,tx:.84,apex:.3,base:'#bfe0a8',edge:'#8aa070',costalBand:M(6,'#7a4b5c'),veins:{on:true,c:'#7f9a68'},fringe:{on:false,len:.4,c:'#e9f3d9'},eyes:[E(.5,.4,.07,['#6b3b6b','#f2e38a','#e8f1f4'])]},
 hind:{len:62,chord:46,tail:80,tw:5,curl:.3,tilt:14,base:'#bfe0a8',edge:'#8aa070',margin:M(2.5,'#8d6a6a'),veins:{on:true,c:'#7f9a68'},eyes:[E(.45,.4,.08,['#6b3b6b','#f2e38a','#e8f1f4'])]},
 body:{tw:15,abdW:13,abdLen:66,fuzz:1.3,color:'#f4f1e6',alt:'#e0dccb'},antenna:{type:'feather',len:36,barb:8,spread:38,color:'#a89878'}},
'Atlas moth':{fore:{chord:56,sweep:.26,hook:.55,bulge:.22,tx:.74,apex:.6,base:'#b0552a',edge:'#5a2214',margin:M(6,'#e9c48c'),bands:[bd(.22,.05,'#e9dcc8',.1,6),bd(.6,.07,'#3a1a12',.1,5)],spots:[sp(.32,.42,.11,.16,'#fff7e6','#2a120c',.9,15),sp(.88,.12,.04,.08,'#2a120c')]},
 hind:{len:82,chord:66,round:.4,tilt:14,apex:-.2,base:'#b8602f',edge:'#5a2214',margin:M(6,'#e9c48c'),bands:[bd(.62,.08,'#e9dcc8',.2,5)],spots:[sp(.3,.5,.1,.15,'#fff7e6','#2a120c',.9,10)]},
 body:{tw:20,abdW:18,abdLen:60,color:'#7a3b22',alt:'#a05a38',stripe:{on:true,c:'#e9dcc8'},fuzz:1.6},antenna:{type:'feather',len:40,barb:9,spread:40,color:'#4a2a1e'}},
'Polyphemus moth':{fore:{chord:54,sweep:.1,bulge:.3,tx:.82,apex:-.4,tornus:-.3,base:'#d9a867',edge:'#8a5a30',bands:[bd(.26,.03,'#e9a9a3',.15,4),bd(.72,.03,'#8a5a78',.1,4)],spots:[sp(.48,.42,.045,.07,'#f6e8c8','#3a2a22',.9)]},
 hind:{len:74,chord:70,tilt:16,apex:-.4,anal:-.3,base:'#d9a867',edge:'#8a5a30',eyes:[E(.42,.5,.2,['#2a2420','#f0cf5e','#2a2420','#86b3da'])]},
 body:{tw:17,abdW:15,abdLen:58,color:'#b07840',alt:'#c9955a',fuzz:1.4},antenna:{type:'feather',len:36,barb:9,spread:36,color:'#6a4a2a'}},
'Io moth':{fore:{chord:40,sweep:.1,bulge:.3,tx:.82,apex:-.3,base:'#e8be46',edge:'#8a5a20',bands:[bd(.4,.06,'#c97a3a',.2,3)],spots:[sp(.55,.45,.03,.05,'#f6e8b0','#8a5a20')]},
 hind:{len:66,chord:56,tilt:14,base:'#f1d04a',edge:'#8a5a20',bands:[bd(.85,.05,'#6b3a2a',.1,2)],eyes:[E(.45,.5,.22,['#1c1818','#b5c4e0','#1c1818'])]},
 body:{tw:13,abdW:11,abdLen:56,color:'#e0a83a',alt:'#c98a2a',fuzz:1.3},antenna:{type:'feather',len:28,barb:6,spread:34,color:'#5a3a1a'}},
'Cinnabar moth':{fore:{chord:32,sweep:.1,bulge:.2,tx:.88,base:'#2d2a33',edge:'#15131a',costalBand:M(5,'#d42a2f'),spots:[sp(.5,.8,.07,.08,'#d42a2f'),sp(.82,.68,.05,.07,'#d42a2f')]},
 hind:{len:62,chord:44,tilt:10,anal:.3,base:'#d42a2f',edge:'#2d2a33',margin:M(5,'#2d2a33')},
 body:{tw:12,abdW:9,abdLen:62,color:'#2d2a33',alt:'#3f3b47',stripe:{on:true,c:'#d42a2f'},fuzz:.8},antenna:{type:'thread',len:34,color:'#2d2a33'}},
'Sunset moth':{fore:{chord:40,sweep:.1,bulge:.2,tx:.85,apex:.3,base:'#16181f',edge:'#0a0b0f',margin:M(3,'#f3f1ea'),bands:[bd(.22,.045,'#2fcf9f',.2,3),bd(.42,.05,'#27b8c8',.2,3),bd(.63,.04,'#2fcf9f',.15,3)]},
 hind:{len:74,chord:56,round:.4,tail:55,tw:4,curl:.15,tilt:14,base:'#16181f',edge:'#0a0b0f',margin:M(4,'#f3f1ea'),bands:[bd(.2,.05,'#2fcf9f',.1,3)],spots:[sp(.55,.62,.2,.18,'#f08a24'),sp(.7,.35,.1,.1,'#e24a2a')]},
 body:{tw:12,abdW:10,abdLen:66,color:'#20242b',alt:'#343a44',stripe:{on:true,c:'#f3f1ea'}},antenna:{len:40,color:'#222222'}},
'Giant leopard moth':{fore:{chord:38,sweep:.1,bulge:.25,tx:.84,base:'#f5f2ea',edge:'#2a2a33',speck:SK(22,.03,'#1f3550','#111111')},
 hind:{len:66,chord:50,tilt:12,base:'#f5f2ea',edge:'#2a2a33',speck:SK(12,.03,'#1f3550','#111111')},
 body:{tw:15,abdW:13,abdLen:66,color:'#1f3a5c',alt:'#2c4f7c',stripe:{on:true,c:'#e48a2e'},fuzz:1.1},antenna:{type:'feather',len:30,barb:5,spread:34,color:'#222222'}},
'Peppered moth':{fore:{chord:42,sweep:.12,bulge:.3,tx:.82,apex:.2,tornus:.1,base:'#ece7da',edge:'#5a5750',bands:[bd(.3,.025,'#2d2c2a',.1,6,11),bd(.66,.025,'#2d2c2a',.1,6,11)],speck:SK(110,.012,'#2d2c2a')},
 hind:{len:62,chord:50,base:'#e8e3d6',edge:'#5a5750',bands:[bd(.6,.02,'#2d2c2a',0,5,12)],speck:SK(50,.012,'#2d2c2a')},
 body:{tw:13,abdW:10,abdLen:60,color:'#e6e0d2',alt:'#c9c2b2',stripe:{on:true,c:'#2d2c2a'}},antenna:{len:32,color:'#3a3a38'}},
'Death’s-head hawkmoth':{fore:{chord:33,sweep:.2,hook:.3,bulge:.2,tx:.88,apex:.4,tornus:.2,base:'#4b3828',edge:'#241a12',bands:[bd(.35,.06,'#b08e55',.15,5),bd(.7,.05,'#b08e55',.1,5)],speck:SK(50,.015,'#c9a566'),spots:[sp(.5,.45,.025,.04,'#f1e6c0')]},
 hind:{len:60,chord:42,tilt:14,base:'#f0b52f',edge:'#241a12',margin:M(8,'#3a2a1e'),bands:[bd(.45,.09,'#3a2a1e',.1,4),bd(.78,.07,'#3a2a1e',.1,4)]},
 body:{tw:16.5,abdW:15,abdLen:73,color:'#6a4e30',alt:'#8a6a44',stripe:{on:true,c:'#f0b52f'},mark:{on:true,c:'#ecdcab'},fuzz:1.2},antenna:{len:34,spread:30,color:'#241a12'}},
'Elephant hawkmoth':{fore:{chord:30,sweep:.24,hook:.3,bulge:.2,tx:.87,apex:.5,tornus:.2,base:'#9c9d56',edge:'#555a30',margin:M(2.5,'#e27a9b'),bands:[bd(.3,.07,'#e27a9b',.2,2,9,.05),bd(.62,.05,'#e27a9b',.15,2,9,.04)],fringe:{on:false,len:.4,c:'#f0c4cf'}},
 hind:{len:55,chord:40,tilt:12,base:'#e8758f',edge:'#9a4c62',margin:M(7,'#3a3a28'),fringe:{on:false,len:.4,c:'#f0c4cf'}},
 body:{tw:16,abdW:12,abdLen:62,color:'#9c9d56',alt:'#e27a9b',taper:.7,stripe:{on:true,c:'#e27a9b'}},antenna:{len:26,spread:28,color:'#e27a9b'}},
'Garden tiger moth':{fore:{chord:42,sweep:.1,bulge:.3,tx:.82,apex:-.1,base:'#f4eddb',edge:'#6b4a2c',fringe:{on:false,len:.5,c:'#8a5a34'},spots:[sp(.25,.32,.09,.14,'#6a3d1f','',1,20),sp(.5,.22,.08,.12,'#5a3318','',1,-10),sp(.72,.4,.09,.15,'#6a3d1f','',1,30),sp(.45,.62,.1,.11,'#5a3318'),sp(.85,.75,.07,.09,'#6a3d1f')]},
 hind:{len:64,chord:52,tilt:12,base:'#e8531f',edge:'#7a2a12',spots:[sp(.35,.4,.07,.09,'#1b2442','#0c1226'),sp(.62,.62,.07,.09,'#1b2442','#0c1226'),sp(.78,.3,.06,.08,'#1b2442','#0c1226'),sp(.3,.72,.05,.07,'#1b2442','#0c1226')]},
 body:{tw:16,abdW:13,abdLen:58,color:'#d4531e',alt:'#6a3d1f',stripe:{on:true,c:'#1b1816'},fuzz:1.5},antenna:{type:'serrate',len:30,color:'#2a2016'}},
'Imperial moth':{fore:{chord:50,sweep:.12,bulge:.28,tx:.82,apex:-.1,base:'#f1d24c',edge:'#a8703a',speck:SK(130,.014,'#a5573a'),bands:[bd(.55,.07,'#b5673f',.3,3,9,.05)],fringe:{on:false,len:.5,c:'#e9c24a'}},
 hind:{len:66,chord:58,tilt:14,base:'#f1d24c',edge:'#a8703a',speck:SK(70,.014,'#a5573a'),margin:M(3,'#b5673f')},
 body:{tw:17,abdW:14,abdLen:56,color:'#e9c24a',alt:'#b5673f',fuzz:1.5},antenna:{type:'feather',len:30,barb:6,color:'#9a5a3a'}},
'Cecropia moth':{fore:{chord:54,sweep:.14,bulge:.28,tx:.8,apex:.1,base:'#8a3b2c',edge:'#3a1a14',grad:{on:true,c:'#c9bdb0'},margin:M(2.5,'#f2eee8'),bands:[bd(.28,.05,'#f2eee8',.1,3,9,.05),bd(.66,.04,'#f2eee8',.1,3,9)],spots:[sp(.46,.4,.05,.1,'#f6f1ea','#2a1210'),sp(.9,.1,.03,.06,'#2a1a14')]},
 hind:{len:72,chord:62,tilt:14,base:'#8a3b2c',edge:'#3a1a14',grad:{on:true,c:'#c9bdb0'},margin:M(2.5,'#f2eee8'),bands:[bd(.6,.04,'#f2eee8',.1,3,9)],spots:[sp(.42,.5,.05,.1,'#f6f1ea','#2a1210')]},
 body:{tw:19,abdW:17,abdLen:60,color:'#b83a2a',alt:'#8a2a20',stripe:{on:true,c:'#f2eee8'},mark:{on:true,c:'#f2eee8'},fuzz:1.5},antenna:{type:'feather',len:38,barb:9,spread:38,color:'#3a1a14'}},
'Buff-tip moth':{fore:{chord:36,sweep:.1,bulge:.3,tx:.84,apex:-.2,base:'#bdb9b0',edge:'#8a8478',grad:{on:true,c:'#e6cf8c'},fringe:{on:false,len:.5,c:'#e6cf8c'},bands:[bd(.3,.012,'#7a756b',.08,2,9),bd(.5,.012,'#7a756b',.08,2,9),bd(.68,.012,'#7a756b',.08,2,9)],spots:[sp(.45,.38,.03,.05,'#d9d2c0','#7a756b')]},
 hind:{len:58,chord:48,base:'#ece6d6',edge:'#9a9486',fringe:{on:false,len:.5,c:'#e6cf8c'}},
 body:{tw:15,abdW:11,abdLen:56,color:'#e0c680',alt:'#b8b0a0',fuzz:1.5},antenna:{type:'serrate',len:28,color:'#6a6558'}}
};

module.exports={renderMoth,full,constrain,MOTHS,TABS,get,walk,lim};
if(require.main===module){const fs=require('fs'),[,,inp,out]=process.argv;
 if(!inp){console.log('usage: node moth_render.js params.json [out.svg]   (use - for stdin)');process.exit(1)}
 let raw;try{raw=JSON.parse(fs.readFileSync(inp==='-'?0:inp,'utf8'))}catch(e){console.error('INVALID JSON: '+e.message);process.exit(2)}
 const a=full(raw),b=constrain(full(raw)),diffs=[];
 (function w(x,y,p){for(const k in x){if(typeof x[k]==='number'&&typeof y[k]==='number'&&Math.abs(x[k]-y[k])>1e-6&&get(raw,p+k)!==undefined)diffs.push(p+k+': '+x[k]+' -> '+(+y[k].toFixed(3)));else if(x[k]&&typeof x[k]==='object'&&y[k])w(x[k],y[k],p+k+'.')}})(a,b,'');
 const bad=[];(function w(x,p){for(const k in x){const v=x[k];if(typeof v==='number'&&!isFinite(v))bad.push(p+k);else if(v===undefined)bad.push(p+k+' (missing)');else if(typeof v==='string'&&/^#/.test(v)&&!/^#[0-9a-f]{6}$/i.test(v))bad.push(p+k+' bad colour '+v);else if(v&&typeof v==='object')w(v,p+k+'.')}})(raw,'');
 for(const sp_ of Object.values(TABS))for(const s of sp_)if(s.t==='l')(get(a,s.p)||[]).forEach((it,i)=>s.item.forEach(f=>{if(get(it,f.p)===undefined)bad.push(s.p+'.'+i+'.'+f.p+' (MISSING: every list item needs all its fields)')}));
 if(bad.length)console.error('PROBLEMS (fix these):\n  '+bad.join('\n  '));
 console.error(diffs.length?'CLAMPED to realism limits (the page will do the same):\n  '+diffs.join('\n  '):'No values clamped.');
 const svg=renderMoth(raw);if(out){fs.writeFileSync(out,svg);console.error('wrote '+out)}else process.stdout.write(svg)}
