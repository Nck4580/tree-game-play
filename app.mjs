import {DEFAULTS,COLORS,setup,xy,key,height,reach,sunlight,income,result,check,place,endTurn,moves,upgradeSave} from './engine.mjs?v=layers1';
import {visibleRows,squareSize} from './tv-view.mjs?v=layers1';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let tvMode=false,cursor=null,tvView='roots';try{tvMode=localStorage.getItem('tree-tv-mode')==='true';}catch{}
let s,history=[],notes='',selected='R',block=false,finishSeen=false,storageOK=true,first=true;
try{const saved=JSON.parse(localStorage.getItem('tree-lab-v1'));if(saved?.version===1){s=saved.state;history=saved.history||[];notes=saved.notes||'';first=false;}}catch{}
if(!s)s=setup({...DEFAULTS,seed:`forest-${Date.now().toString(36)}`});else upgradeSave(s);
function save(){try{localStorage.setItem('tree-lab-v1',JSON.stringify({version:1,state:s,history,notes}));storageOK=true;}catch{storageOK=false;}$('saveStatus').textContent=storageOK?'':'Browser storage unavailable. Download a record before closing.';}
function checkpoint(){history.push(structuredClone(s));if(history.length>150)history.shift();}
function showMessage(t){$('message').textContent=t;}

const owner=(kind,k)=>s.players.findIndex(p=>(kind==='R'?p.roots:p.wood).includes(k));
function pieceSVG(x,y){const k=key(x,y),soil=y<0,i=owner(soil?'R':'W',k);if(i<0)return '';const p=s.players[i],color=COLORS[i],has=q=>(soil?p.roots:p.wood).includes(q);let paths='';
 if(soil){for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]])if(has(key(x+dx,y+dy)))paths+=`<path d="M22 22L${22+dx*22} ${22-dy*22}"/>`;paths+='<path d="M22 8L22 29M22 22L12 34M22 22L32 34"/>';}
 else{if(x===p.home)paths+='<path d="M22 44V0"/>';if(has(key(x-1,y)))paths+='<path d="M0 22H22"/>';if(has(key(x+1,y)))paths+='<path d="M22 22H44"/>';if(x!==p.home)paths+='<path d="M16 22H28"/>';}
 let leaf='';if(p.leaves[k]){const lit=sunlight(s,i,k),b=p.leaves[k]==='blocker';leaf=`<circle cx="22" cy="20" r="${b?14:11}" fill="${lit?color:'#eeeae1'}" stroke="${color}" stroke-width="${b?3:1.8}" ${lit?'':'stroke-dasharray="3 2"'}/><path d="M16 25Q14 13 28 13Q31 23 16 25M17 24L26 16" stroke="${lit?'#f8fff5':color}" fill="none" stroke-width="1.5"/>${b?'<text x="33" y="12" font-size="12" fill="#a36c13">✦</text>':''}`;}
 return `<svg viewBox="0 0 44 44" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round">${paths}</g>${leaf}<text x="3" y="40" fill="${color}" font-size="8" font-family="sans-serif" font-weight="bold">${i+1}</text></svg>`;
}
function render(){
 document.body.classList.toggle('round-game',!!s.o.roundLimit);document.documentElement.style.setProperty('--accent',COLORS[s.current]);$('players').style.setProperty('--n',s.o.n);
 $('players').innerHTML=s.players.map((p,i)=>{const inc=income(s,i),[l,r]=reach(p);return `<article class="player ${i===s.current&&!s.ended?'active':''}" style="--p:${COLORS[i]}"><div class="playerHead"><i class="dot"></i><b>${esc(p.name)}</b><span>${i===s.current&&!s.ended?'YOUR TURN':`PLAYER ${i+1}`}</span></div><div class="score"><strong>${inc.leaves}</strong><span>sunlit leaves</span></div><div class="stats">Height ${height(p)} · Roots ${p.roots.length} · Reach ${l}/${r}<br>Leaves ${Object.keys(p.leaves).length} · Unlimited · Bonus spots ${p.roots.filter(k=>s.bonuses[k]).length}</div></article>`;}).join('');
 const variants=[];if(!s.o.ownShade)variants.push('Own leaves pass sunlight');if(s.o.special)variants.push(`Blocking leaves cost ${s.o.blockCost}`);if(!s.o.rootBalance)variants.push('No root support');if(!s.o.sideBalance)variants.push('No side balance');if(s.o.cols!==16||s.o.sky!==10||s.o.wood!==40||s.o.roots!==30)variants.push('Custom forest / supply');
 $('variant').textContent=variants.length?`Experiment: ${variants.join(' · ')}`:`${s.o.roundLimit} full rounds · Unlimited leaves · Mix piece types`;
 const p=s.players[s.current],inc=income(s,s.current);$('roundClock').textContent=s.ended?'Game finished':`Round ${s.round}${s.o.roundLimit?' / '+s.o.roundLimit:''}`;$('turnLabel').textContent=`ROUND ${s.round}${s.o.roundLimit?' / '+s.o.roundLimit:''} · TURN ${s.turn}`;$('turnName').textContent=s.ended?'Game complete':`${p.name}’s turn`;$('growthNumber').textContent=s.ended?'—':s.budget-s.spent;$('budget').textContent=s.ended?'See final scores':`${s.spent} spent of ${s.budget}`;
 const collected=s.collected||inc;$('income').textContent=`Collected at turn start: 1 free + ${collected.leaves} sunlight + ${collected.roots} root bonuses = ${s.budget} Growth.`;$('mobileStatus').textContent=s.ended?'Game complete':`${p.name} · ${s.budget-s.spent} Growth left`;$('mobileEnd').textContent=s.ended?'Play again':s.placed?'End turn →':'Pass →';$('mobileUndo').disabled=!history.length;
 $('finalNotice').hidden=s.ended||(s.o.roundLimit?s.round!==s.o.roundLimit:s.finisher===null);$('finalNotice').textContent=s.o.roundLimit?'Final round: everyone takes one last turn.':s.finisher===s.current?`${p.name} placed the last leaf. End this turn to begin opponents’ final turns.`:`Final turn! Stop before ${s.players[s.finisher??0].name} plays again.`;
 document.querySelectorAll('[data-kind]').forEach(b=>{b.classList.toggle('selected',b.dataset.kind===selected);b.disabled=s.ended;b.setAttribute('aria-pressed',String(b.dataset.kind===selected));});
 $('blockOption').hidden=!s.o.special||selected!=='L';$('blockPrice').textContent=`(${s.o.blockCost} Growth; upgrade ${s.o.blockCost-1})`;$('blockLeaf').checked=block;
 $('instruction').textContent=s.ended?'Review the forest or start a new game.':{W:'Add trunk wood above your trunk, or branches sideways. Both balance checks apply.',R:'Grow beside your roots. Reach a gold bonus to collect extra Growth next turn.',L:block?'Add a blocking leaf, or upgrade an ordinary leaf on your wood.':'Put a leaf on your wood. Leaves first produce on your next turn.'}[selected];
 $('endTurn').textContent=s.ended?'Play again':s.placed?'End turn →':'Pass turn →';$('undo').disabled=!history.length;
 const valid=new Set($('showLegal').checked?moves(s,selected,block).map(([x,y])=>key(x,y)):[]);let html='<div></div>';
 for(let x=1;x<=s.o.cols;x++){const home=s.players.findIndex(t=>t.home===x);html+=`<div class="colHead ${home>=0?'home':''}" style="--p:${COLORS[home]||'#888'}">${String.fromCharCode(64+x)}${home>=0?`<small>P${home+1} TRUNK</small>`:''}</div>`;}
 for(let y=s.o.sky;y>=-s.o.depth;y--){if(!y)continue;html+=`<div class="rowHead">${y===1?'☘':y===-1?'↓':y}</div>`;for(let x=1;x<=s.o.cols;x++){const k=key(x,y),off=x<s.lo||x>s.hi,bon=s.bonuses[k],home=s.players.some(p=>p.home===x),own=owner(y<0?'R':'W',k),leaf=own>=0?s.players[own].leaves[k]:null;
 const label=`${String.fromCharCode(64+x)}, ${y>0?'sky':'soil'} ${Math.abs(y)}${off?', outside forest':''}${own>=0?`, ${s.players[own].name} ${y<0?'root':'wood'}`:''}${leaf?`, ${leaf} leaf, ${sunlight(s,own,k)?'sunlit':'shaded'}`:''}${bon?`, bonus +${bon.value}`:''}${valid.has(k)?', legal move':''}`;
 html+=`<button type="button" class="cell ${y<0?'soil':''} ${y===1?'ground':''} ${off?'off':''} ${home?'homeCol':''} ${valid.has(k)?'legal':''}" data-x="${x}" data-y="${y}" aria-label="${esc(label)}" title="${esc(label)}" ${off?'disabled':''}>${pieceSVG(x,y)}${bon?`<span class="bonus">+${bon.value}</span>`:''}</button>`;}}
 $('board').style.setProperty('--cols',s.o.cols);$('board').innerHTML=html;
 renderTV();
 $('journal').innerHTML=s.events.slice(-4).reverse().map(e=>`<p><b>T${e.turn} · ${esc(s.players[e.player].name)}</b><br>${esc(e.message)}</p>`).join('');
 if(s.ended&&!finishSeen){finishSeen=true;showFinish();}save();
}
function scoreHTML(){return `<table><thead><tr><th>Tree</th><th>Sunlit leaves</th><th>Bonus spots</th></tr></thead><tbody>${result(s).rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.sunlit}</td><td>${r.spots}</td></tr>`).join('')}</tbody></table>`;}
function showFinish(){const w=result(s).winners;$('winner').textContent=w.length===1?`${w[0].name} wins!`:`${w.map(r=>r.name).join(' & ')} share the win!`;$('scoreTable').innerHTML=scoreHTML();$('finishDialog').showModal();}
function buildAt(x,y){const ok=check(s,selected,x,y,block);if(typeof ok==='string'){showMessage(ok);return;}checkpoint();place(s,selected,x,y,block);if(tvMode)cursor=moves(s,selected,block)[0]||[x,y];showMessage('');render();}
$('board').addEventListener('click',e=>{const b=e.target.closest('[data-x]');if(!b)return;const x=Number(b.dataset.x),y=Number(b.dataset.y);if(tvMode){cursor=[x,y];renderCursor();}else buildAt(x,y);});
$('tools').addEventListener('click',e=>{const b=e.target.closest('[data-kind]');if(!b)return;selected=b.dataset.kind;tvView=selected==='R'?'roots':'canopy';block=false;cursor=null;showMessage('');render();});
document.querySelectorAll('#mobileControls [data-kind]').forEach(b=>b.onclick=()=>{selected=b.dataset.kind;tvView=selected==='R'?'roots':'canopy';block=false;cursor=null;showMessage('');render();});
$('mobileEnd').onclick=()=>$('endTurn').click();$('mobileUndo').onclick=()=>$('undo').click();
$('blockLeaf').onchange=e=>{block=e.target.checked;cursor=null;showMessage('');render();};$('showLegal').onchange=render;
$('endTurn').onclick=()=>{if(s.ended){openNewGame();return;}checkpoint();endTurn(s);selected='R';tvView='roots';block=false;cursor=null;showMessage('');render();};
$('undo').onclick=()=>{if(!history.length)return;s=upgradeSave(history.pop());selected=s.kind||'R';tvView=selected==='R'?'roots':'canopy';block=false;cursor=null;finishSeen=false;if($('finishDialog').open)$('finishDialog').close();showMessage('Undid the last action.');render();};
function fillSetup(o){const form=$('setupForm');for(const k of ['n','cols','sky','wood','roots','blockCost','roundLimit','seed'])form.elements[k].value=o[k]??DEFAULTS[k];for(const k of ['rootBalance','sideBalance','ownShade','special'])form.elements[k].checked=o[k];o.names.forEach((v,i)=>form.elements['name'+i].value=v);refreshNames();}
function refreshNames(){const n=Number($('setupForm').elements.n.value);document.querySelectorAll('.names label').forEach((l,i)=>{l.hidden=i>=n;l.style.setProperty('--p',COLORS[i]);});}
$('setupForm').elements.n.onchange=refreshNames;
function openNewGame(){if($('finishDialog').open)$('finishDialog').close();const upgraded=s.o.rulesVersion===3?{}:{leaves:DEFAULTS.leaves,wood:DEFAULTS.wood,roots:DEFAULTS.roots,roundLimit:DEFAULTS.roundLimit};fillSetup({...s.o,...upgraded,seed:`forest-${Date.now().toString(36)}`});$('setupDialog').showModal();}
$('newGame').onclick=openNewGame;$('playAgain').onclick=openNewGame;
$('resetRules').onclick=()=>{const f=$('setupForm');fillSetup({...DEFAULTS,n:Number(f.elements.n.value),seed:f.elements.seed.value,names:Array.from({length:4},(_,i)=>f.elements['name'+i].value)});};
$('setupForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),o={names:Array.from({length:4},(_,i)=>String(f.get('name'+i)||`Player ${i+1}`))};for(const k of ['n','cols','sky','wood','roots','blockCost','roundLimit'])o[k]=Number(f.get(k));for(const k of ['rootBalance','sideBalance','ownShade','special'])o[k]=f.has(k);o.seed=String(f.get('seed')).trim()||'forest';s=setup(o);history=[];notes='';selected='R';tvView='roots';block=false;cursor=null;finishSeen=false;$('setupDialog').close();showMessage('');render();};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>b.closest('dialog').close();
$('help').onclick=()=>{const o=s.o;$('rulesText').innerHTML=`<p><b>Goal:</b> have the most sunlit leaves when the game ends. Leaves are unlimited. Each leaf costs 1 Growth and sits on your own wood, one per square.</p><h3>On your turn</h3><ol><li>Collect 1 free Growth + 1 per sunlit leaf + the printed value of bonuses under your roots. The game calculates this for you.</li><li>Spend your Growth on <b>any mix of wood, roots, and leaves</b>. Each ordinary piece costs 1 Growth. For example, 3 Growth can buy a root, then a wood piece, then a leaf. Choose a piece type whenever you want to switch. Each placement must be legal.</li><li>End your turn. Unused Growth is returned. New pieces produce on your next turn.</li></ol><h3>Build a connected tree</h3><p>Your trunk grows straight up in its home column. Branches grow sideways from your wood and may cross above other trees, including their home columns. They cannot turn upward or occupy another piece’s square. A branch above a rival trunk can block its next upward step; bare wood itself does not shade. Roots touch your roots by an edge. Leaves sit on your wood; one per square.</p><p><b>Root support ${o.rootBalance?'ON':'OFF'}:</b> ${o.rootBalance?'trunk height cannot exceed your total number of roots.':'trunk height is unrestricted by roots.'}<br><b>Side balance ${o.sideBalance?'ON':'OFF'}:</b> ${o.sideBalance?'farthest wood reach left and right differs by at most one square. Check after every piece. Branch rows need not mirror.':'branches can extend freely to either side.'}</p><h3>Sunlight in this game</h3><p>${o.ownShade?'Your own higher leaves shade your lower leaves directly below.':'Your own leaves never shade one another.'} ${o.special?`Only special blocking leaves shade opponents. They cost ${o.blockCost} Growth; upgrade an ordinary leaf for ${o.blockCost-1}. Normal and blocking leaves both earn sunlight. Both are unlimited; pay the stated cost for each.`:'Every leaf shades opponents’ lower leaves directly below.'} Bare wood never shades.</p><h3>Bonuses & finishing</h3><p>A root must occupy the exact bonus square. Only its owner collects; the bonus renews every turn. Play ${o.roundLimit} full rounds: each player gets ${o.roundLimit} turns. The game ends after the last player finishes the final round. Passing still uses your turn.</p><p>Most sunlit leaves wins, then most claimed bonus spots (count tiles, not values), then share. There are ${o.wood} wood and ${o.roots} roots per tree. No moving or removing pieces.</p><h3>Mirroring to a TV</h3><p>Open this page in Safari, turn the phone sideways, start Screen Mirroring, then tap <b>TV mode</b>. Choose Canopy or Roots to see that layer, or Whole forest for an overview. Choosing Wood or Leaves opens the canopy; choosing Roots opens the soil. Empty upper sky appears as trees grow. All spaces stay square. Scores / Menu opens scores, rules, game records and settings. Tap a square to select it, then tap <b>Place</b> to build. Use <b>Previous</b> or <b>Next legal</b> to cycle through available moves. A keyboard can also move the cursor with arrow keys. The gold outline is your cursor. Tap <b>Exit TV</b> to return to the regular layout. TV mode does not create a separate display or connect to the television itself.</p><h3>Testing a new idea</h3><p>Open New game → Experiment with the rules. Change one setting and keep the shuffle seed to compare. Game record lets you download settings, moves, scores, and notes. Games save on this browser; this is shared-screen play.</p>`;$('helpDialog').showModal();};
function openRecord(){$('notes').value=notes;$('recordSummary').innerHTML=`<p>${s.ended?'Finished':'In progress'} · ${s.o.n} players · ${s.turn} turns · Seed <b>${esc(s.o.seed)}</b></p>${scoreHTML()}`;$('fullJournal').innerHTML=s.events.map(e=>`<p>T${e.turn} · ${esc(s.players[e.player].name)}: ${esc(e.message)}</p>`).join('');$('recordDialog').showModal();}
$('record').onclick=openRecord;$('notes').oninput=e=>{notes=e.target.value;save();};
$('export').onclick=()=>{const data={format:'tree-game-playtest-1',exportedAt:new Date().toISOString(),notes,state:s,scores:result(s),rulesBaseline:'Digital v0.3: unlimited leaves, open canopy and mixed-piece turns; round limit and custom settings are recorded in state.o'};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`tree-game-${new Date().toISOString().slice(0,10)}-turn-${s.turn}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('review').onclick=()=>$('finishDialog').close();$('finishRecord').onclick=()=>{$('finishDialog').close();openRecord();};

function fitTV(){
 if(!tvMode)return;
 const rows=visibleRows(s,tvView),board=$('board'),box=board.parentElement.getBoundingClientRect();
 const size=squareSize(box.width,box.height,s.o.cols,rows.length);
 board.style.setProperty('--tv-cell-w',`${size}px`);board.style.setProperty('--tv-cell',`${size}px`);
 for(let i=0;i<board.children.length;i++){
  const row=Math.floor(i/(s.o.cols+1))-1;
  const y=row<s.o.sky?s.o.sky-row:-(row-s.o.sky+1);
  board.children[i].hidden=row>=0&&!rows.includes(y);
 }
 $('rotateTip').hidden=window.innerWidth>window.innerHeight;
}
function renderCursor(){
 document.querySelectorAll('.cell.cursor').forEach(e=>e.classList.remove('cursor'));
 if(!cursor||cursor[0]<s.lo||cursor[0]>s.hi||cursor[1]>s.o.sky||cursor[1]<-s.o.depth){cursor=moves(s,selected,block)[0]||[s.players[s.current].home,selected==='R'?-1:1];}
 if(tvMode&&!visibleRows(s,tvView).includes(cursor[1]))cursor=moves(s,selected,block).find(([,y])=>visibleRows(s,tvView).includes(y))||[s.players[s.current].home,tvView==='roots'?-1:1];
 const [x,y]=cursor,cell=$('board').querySelector(`[data-x="${x}"][data-y="${y}"]`);if(tvMode)cell?.classList.add('cursor');
 const ok=check(s,selected,x,y,block),label=`${String.fromCharCode(64+x)} ${y>0?'Sky':'Soil'} ${Math.abs(y)}`;
 $('cursorLabel').textContent=label;$('placeCursor').disabled=typeof ok==='string';
 $('placeCursor').textContent=typeof ok==='string'?'Choose a legal square':`${label} · ${ok.upgrade?'Upgrade':'Place'} ${selected==='W'?'wood':selected==='R'?'root':block?'blocking leaf':'leaf'} · ${ok.cost} G`;
 $('nextMove').disabled=s.ended||moves(s,selected,block).length===0;
 if(tvMode)showMessage(typeof ok==='string'?ok:'Selected '+label+'. Tap Place to build.');
}
function renderTV(){
 document.body.classList.toggle('tv-mode',tvMode);$('tvToggle').textContent=tvMode?'Exit TV':'TV mode';$('tvToggle').setAttribute('aria-pressed',String(tvMode));$('tvCursor').hidden=!tvMode;$('rotateTip').hidden=!tvMode||window.innerWidth>window.innerHeight;
 syncTVLayout();
 if(tvMode){if(!cursor)cursor=moves(s,selected,block)[0]||null;renderCursor();requestAnimationFrame(fitTV);}
}
$('tvToggle').onclick=()=>{tvMode=!tvMode;cursor=null;try{localStorage.setItem('tree-tv-mode',String(tvMode));}catch{}showMessage('');render();window.scrollTo(0,0);};
$('placeCursor').onclick=()=>{if(cursor)buildAt(...cursor);};
$('prevMove').onclick=()=>{const legal=moves(s,selected,block).filter(([,y])=>!tvMode||visibleRows(s,tvView).includes(y));if(!legal.length)return;const i=legal.findIndex(([x,y])=>cursor&&x===cursor[0]&&y===cursor[1]);cursor=legal[(i-1+legal.length)%legal.length];renderCursor();};
$('nextMove').onclick=()=>{const legal=moves(s,selected,block).filter(([,y])=>!tvMode||visibleRows(s,tvView).includes(y));if(!legal.length)return;const i=legal.findIndex(([x,y])=>cursor&&x===cursor[0]&&y===cursor[1]);cursor=legal[(i+1)%legal.length];renderCursor();};
function moveCursor(direction){if(!cursor)renderCursor();const [x,y]=cursor;let a=x,b=y;if(direction==='left')a--;if(direction==='right')a++;if(direction==='up')b=y===-1?1:y+1;if(direction==='down')b=y===1?-1:y-1;const rows=visibleRows(s,tvView);cursor=[Math.max(s.lo,Math.min(s.hi,a)),Math.max(Math.min(...rows),Math.min(Math.max(...rows),b))];renderCursor();}
for(const b of document.querySelectorAll('[data-direction]'))b.onclick=()=>moveCursor(b.dataset.direction);
window.addEventListener('resize',fitTV);window.visualViewport?.addEventListener('resize',fitTV);
document.addEventListener('keydown',e=>{if(!tvMode||document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const d={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key];if(d){e.preventDefault();moveCursor(d);}});

function syncTVLayout(){
 const panel=document.querySelector('.turnPanel'),actions=document.querySelector('.turnActions');
 if(tvMode){$('tvBottom').append($('tools'),actions);}else{panel.insertBefore($('tools'),$('blockOption'));panel.append(actions);}
 document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('selected',b.dataset.view===tvView);b.setAttribute('aria-pressed',String(b.dataset.view===tvView));});
 if(!tvMode)for(const el of $('board').children)el.hidden=false;
}
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{tvView=b.dataset.view;if(tvView==='roots')selected='R';if(tvView==='canopy'&&selected==='R')selected='W';cursor=null;showMessage('');render();};
$('tvMenu').onclick=()=>{$('tvScores').innerHTML=scoreHTML();$('tvMenuDialog').showModal();};
for(const b of document.querySelectorAll('[data-menu]'))b.onclick=()=>{$('tvMenuDialog').close();$(b.dataset.menu).click();};
render();if(first){fillSetup(s.o);$('setupDialog').showModal();}
