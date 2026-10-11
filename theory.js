/* Accords & Refrains — shared music theory, keyboard, synth and chord drawer. */
(function(){
const SHARP=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT =['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const FR={C:'Do',D:'Ré',E:'Mi',F:'Fa',G:'Sol',A:'La',B:'Si'};
const LETTER_PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};

const QUAL={
  '':{iv:[0,4,7],name:'majeur'},
  'm':{iv:[0,3,7],name:'mineur'},
  '7':{iv:[0,4,7,10],name:'septième (dominante)'},
  'maj7':{iv:[0,4,7,11],name:'majeur 7'},
  'm7':{iv:[0,3,7,10],name:'mineur 7'},
  '6':{iv:[0,4,7,9],name:'sixte'},
  'm6':{iv:[0,3,7,9],name:'mineur sixte'},
  '9':{iv:[0,4,7,10,14],name:'neuvième'},
  'add9':{iv:[0,4,7,14],name:'add9'},
  'dim':{iv:[0,3,6],name:'diminué'},
  'dim7':{iv:[0,3,6,9],name:'diminué 7'},
  'm7b5':{iv:[0,3,6,10],name:'demi-diminué'},
  'aug':{iv:[0,4,8],name:'augmenté'},
  'sus4':{iv:[0,5,7],name:'sus4'},
  'sus2':{iv:[0,2,7],name:'sus2'},
  '7sus4':{iv:[0,5,7,10],name:'7 sus4'},
  'mmaj7':{iv:[0,3,7,11],name:'mineur majeur 7'},
};
const ALIAS={'M7':'maj7','Δ':'maj7','∆':'maj7','°':'dim','°7':'dim7','o':'dim','o7':'dim7','ø':'m7b5','+':'aug','min':'m','-':'m','4':'sus4','sus':'sus4'};

function parse(sym){
  const m=/^([A-G])([#b♯♭]?)([^/]*)(?:\/([A-G])([#b♯♭]?))?$/.exec(String(sym).trim());
  if(!m)return null;
  const acc=s=>s==='#'||s==='♯'?1:s==='b'||s==='♭'?-1:0;
  let q=m[3]||''; if(ALIAS[q]!==undefined)q=ALIAS[q];
  if(!QUAL[q]){ // unknown suffix: fall back to its triad
    q=/^m(?!aj)/.test(q)?'m':'';
  }
  return {root:(LETTER_PC[m[1]]+acc(m[2])+12)%12, q, raw:m[3]||'', bass:m[4]?(LETTER_PC[m[4]]+acc(m[5])+12)%12:null};
}
function pcName(pc,flats){return (flats?FLAT:SHARP)[((pc%12)+12)%12]}
function keyPrefersFlats(keyStr){
  const k=parse(keyStr.replace(/m$/,''))||{root:0}; const minor=/m$/.test(keyStr);
  const maj=minor?(k.root+3)%12:k.root; return [5,10,3,8,1,6].includes(maj);
}
function transposeChord(sym,n,flats){
  const p=parse(sym); if(!p)return sym;
  let out=pcName(p.root+n,flats)+p.raw;
  if(p.bass!==null)out+='/'+pcName(p.bass+n,flats);
  return out;
}
function transposeKey(key,n){
  const minor=/m$/.test(key); const p=parse(key.replace(/m$/,'')); if(!p)return key;
  const pc=(p.root+n+120)%12; const majpc=minor?(pc+3)%12:pc;
  const flats=[5,10,3,8,1,6].includes(majpc);
  return pcName(pc,flats)+(minor?'m':'');
}
/* display helpers */
let notation='en';
try{notation=localStorage.getItem('ar_notation')||'en'}catch(e){}
function setNotation(n){notation=n;try{localStorage.setItem('ar_notation',n)}catch(e){};document.dispatchEvent(new CustomEvent('notation'))}
function prettyRoot(r){
  const letter=r[0],acc=r.slice(1).replace('#','♯').replace('b','♭');
  return (notation==='fr'?FR[letter]:letter)+acc;
}
function pretty(sym){ // returns HTML
  const m=/^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(sym); if(!m)return esc(sym);
  let q=m[2].replace('b5','♭5').replace('#5','♯5');
  let s=prettyRoot(m[1]);
  if(q){ if(q==='m'){s+='m'} else if(q.startsWith('m')&&!q.startsWith('maj')){s+='m<sup>'+esc(q.slice(1))+'</sup>'} else s+='<sup>'+esc(q)+'</sup>'}
  if(m[3])s+='/'+prettyRoot(m[3]);
  return s;
}
function prettyText(sym){const d=document.createElement('div');d.innerHTML=pretty(sym);return d.textContent}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function noteNameFr(pc,flats){const n=pcName(pc,flats);return FR[n[0]]+n.slice(1).replace('#','♯').replace('b','♭')}
function noteName(pc,flats){return notation==='fr'?noteNameFr(pc,flats):pcName(pc,flats).replace('#','♯').replace('b','♭')}

/* voicing on a 2-octave C..B keyboard: returns [{k, pc}] and bass index */
function voicing(sym){
  const p=parse(sym); if(!p)return {keys:[],bass:null};
  const iv=QUAL[p.q].iv; let base=p.root;
  let bassK=null;
  if(p.bass!==null){bassK=p.bass; if(base<=bassK)base+=12; if(base+iv[iv.length-1]>23)base-=12; if(base<=bassK){bassK=null}}
  let keys=iv.map(i=>base+i);
  if(keys[keys.length-1]>23)keys=keys.map(k=>k>23?k-12:k);
  return {keys:[...new Set(keys)].sort((a,b)=>a-b),bass:bassK,p};
}
function keyboardSVG(on,bass,labels){
  const W=20,H=110,BW=12,BH=68,whites=[0,2,4,5,7,9,11],blacks=[1,3,6,8,10];
  const onSet=new Set(on);
  let s='<svg viewBox="0 0 281 112" role="img" aria-label="Clavier">';
  for(let o=0;o<2;o++)whites.forEach((pc,i)=>{const k=o*12+pc,x=.5+(o*7+i)*W;const cls=k===bass?' kbass':onSet.has(k)?' kon':'';
    s+=`<rect class="kw${cls}" x="${x}" y=".5" width="${W}" height="${H}" rx="2.5"/>`;
    if(cls&&labels)s+=`<text class="klab" x="${x+W/2}" y="${H-7}">${labels(k)}</text>`;});
  for(let o=0;o<2;o++)blacks.forEach(pc=>{const k=o*12+pc;const wi=whites.filter(w=>w<pc).length;const x=.5+(o*7+wi)*W-BW/2;const cls=k===bass?' kbass':onSet.has(k)?' kon':'';
    s+=`<rect class="kb${cls}" x="${x}" y=".5" width="${BW}" height="${BH}" rx="1.8"/>`;
    if(cls&&labels)s+=`<text class="klab" x="${x+BW/2}" y="${BH-6}" style="font-size:5px">${labels(k)}</text>`;});
  return s+'</svg>';
}

/* synth */
let actx=null;
function audio(){if(!actx){try{actx=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(actx&&actx.state==='suspended')actx.resume();return actx}
function tone(midi,when,dur,vol){
  const c=audio(); if(!c)return; const f=440*Math.pow(2,(midi-69)/12);
  const g=c.createGain(), lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2600;
  g.gain.setValueAtTime(0,when); g.gain.linearRampToValueAtTime(vol,when+.008); g.gain.exponentialRampToValueAtTime(vol*.35,when+.25); g.gain.exponentialRampToValueAtTime(.0001,when+dur);
  [[1,'triangle',1],[2,'sine',.35],[3,'sine',.12]].forEach(([m,t,v])=>{const o=c.createOscillator(),og=c.createGain();o.type=t;o.frequency.value=f*m;og.gain.value=v;o.connect(og).connect(lp);o.start(when);o.stop(when+dur+.05)});
  lp.connect(g).connect(c.destination);
}
function playChord(sym,opts={}){
  const c=audio(); if(!c)return; const v=voicing(sym); const t=c.currentTime+.02;
  if(v.bass!==null)tone(36+v.bass,t,2,.16); else if(v.p) tone(36+v.p.root,t,2,.12);
  v.keys.forEach((k,i)=>tone(48+k,t+(opts.arp?i*.12:i*.025),1.8,.13));
}

/* chord drawer */
let sheet,back;
function ensureSheet(){
  if(sheet)return;
  back=document.createElement('div');back.className='sheet-back';
  sheet=document.createElement('div');sheet.className='sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','Accord');
  document.body.append(back,sheet);
  back.addEventListener('click',closeSheet);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
}
function closeSheet(){sheet&&sheet.classList.remove('open');back&&back.classList.remove('open')}
function openChord(sym,flats){
  ensureSheet(); const v=voicing(sym); if(!v.p)return;
  const notes=QUAL[v.p.q].iv.map(i=>noteName(v.p.root+i,flats));
  const label=k=>noteName(k,flats);
  sheet.innerHTML=`<div class="sheet-head"><span class="sheet-sym">${pretty(sym)}</span><span class="sheet-name">${noteNameFr(v.p.root,flats)} ${QUAL[v.p.q].name}${v.bass!==null?', basse '+noteNameFr(v.bass,flats):''}</span></div>
  <div class="sheet-notes">${notes.join(' · ')}</div>
  <div class="kbd">${keyboardSVG(v.keys,v.bass,label)}</div>
  ${v.bass!==null?'<p class="sheet-tip">En bleu : la note de basse, à jouer à la main gauche.</p>':'<p class="sheet-tip">Main gauche : la fondamentale ('+noteNameFr(v.p.root,flats)+') en bas. Main droite : l\'accord, dans le renversement le plus proche du précédent.</p>'}
  <div class="sheet-row"><button class="btn primary" data-a="play">Écouter</button><button class="btn" data-a="arp">Arpège</button><button class="btn" data-a="close" style="margin-left:auto">Fermer</button></div>`;
  sheet.querySelector('[data-a=play]').onclick=()=>playChord(sym);
  sheet.querySelector('[data-a=arp]').onclick=()=>playChord(sym,{arp:true});
  sheet.querySelector('[data-a=close]').onclick=closeSheet;
  requestAnimationFrame(()=>{sheet.classList.add('open');back.classList.add('open')});
  playChord(sym);
}
function chip(sym,flats){return `<button class="ch" data-chord="${esc(sym)}" data-flats="${flats?1:0}">${pretty(sym)}</button>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-chord]');if(b){openChord(b.dataset.chord,b.dataset.flats==='1')}});

window.AR={parse,transposeChord,transposeKey,keyPrefersFlats,pretty,prettyText,prettyRoot,chip,openChord,playChord,tone,audio,keyboardSVG,voicing,QUAL,pcName,noteName,noteNameFr,setNotation,get notation(){return notation},esc,SHARP,FLAT};
})();
