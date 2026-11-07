export const DEFAULTS={n:2,names:['Cedar','Birch','Maple','Willow'],cols:16,sky:10,depth:6,leaves:null,wood:40,roots:30,roundLimit:12,rulesVersion:3,rootBalance:true,sideBalance:true,ownShade:true,special:false,blockCost:3,seed:'forest-1'};
export const COLORS=['#287552','#326fba','#b45d2e','#8158a7'];
export const key=(x,y)=>`${x},${y}`;
export function random(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);return ()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function setup(opts={}){
 const o={...DEFAULTS,...opts};o.leaves=null;o.roundLimit=o.roundLimit||12;o.names=[...(opts.names||DEFAULTS.names)];
 const offset={2:[-2.5,2.5],3:[-3.5,-.5,3.5],4:[-3.5,-1.5,1.5,3.5]}[o.n];
 const p={lo:1,hi:o.cols,homes:offset.map(x=>Math.round((o.cols+1)/2+x))};
 const rng=random(o.seed),vals=[1,1,1,1,1,1,1,1,2,2,2,2];for(let i=11;i>0;i--){const j=Math.floor(rng()*(i+1));[vals[i],vals[j]]=[vals[j],vals[i]];}
 const positions=[[4,-3],[6,-3],[11,-3],[13,-3],[3,-4],[7,-4],[10,-4],[14,-4],[5,-6],[8,-6],[9,-6],[12,-6]];
 const bonuses={};positions.forEach(([x,y],i)=>bonuses[key(o.cols===16?x:Math.round(2+(x-3)*(o.cols-3)/11),y)]={value:vals[i],starter:false});
 const players=p.homes.map((home,i)=>{bonuses[key(home,-2)]={value:1,starter:true};return {name:String(o.names[i]||`Player ${i+1}`).slice(0,25),home,wood:[key(home,1)],roots:[key(home,-1)],leaves:{[key(home,1)]:'normal'}};});
 const s={o,lo:p.lo,hi:p.hi,players,bonuses,current:0,turn:1,round:1,kind:null,spent:0,placed:0,budget:0,finisher:null,passes:0,ended:false,events:[],startedAt:new Date().toISOString()};
 s.collected=income(s,0);s.budget=s.collected.total;log(s,'Game started. All players have a seedling.');return s;
}
export function log(s,message){s.events.push({turn:s.turn,player:s.current,message});}
export function xy(k){return k.split(',').map(Number);}
export function height(p){return Math.max(...p.wood.map(xy).filter(([x])=>x===p.home).map(([,y])=>y));}
export function reach(p){const xs=p.wood.map(xy).map(([x])=>x);return [p.home-Math.min(...xs),Math.max(...xs)-p.home];}
export function sunlight(s,i,k){const [x,y]=xy(k);for(let j=0;j<s.players.length;j++)for(const [q,type] of Object.entries(s.players[j].leaves)){const [a,b]=xy(q);if(a===x&&b>y){if(j===i&&s.o.ownShade)return false;if(j!==i&&(!s.o.special||type==='blocker'))return false;}}return true;}
export function income(s,i){const p=s.players[i],leaves=Object.keys(p.leaves).filter(k=>sunlight(s,i,k)).length,roots=p.roots.reduce((v,k)=>v+(s.bonuses[k]?.value||0),0);return {base:1,leaves,roots,total:1+leaves+roots};}
export function result(s){const rows=s.players.map((p,i)=>({name:p.name,i,sunlit:income(s,i).leaves,spots:p.roots.filter(k=>s.bonuses[k]).length,leaves:Object.keys(p.leaves).length}));const sorted=[...rows].sort((a,b)=>b.sunlit-a.sunlit||b.spots-a.spots);return {rows,winners:sorted.filter(r=>r.sunlit===sorted[0].sunlit&&r.spots===sorted[0].spots)};}
export function check(s,kind,x,y,block=false){
 if(s.ended)return 'This game has finished.';
 const p=s.players[s.current],k=key(x,y),cost=kind==='L'&&block?s.o.blockCost:1;
 const upgrade=kind==='L'&&block&&p.leaves[k]==='normal';const actual=upgrade?cost-1:cost;
 if(block&&!s.o.special)return 'Blocking leaves are not enabled for this game.';
 if(s.budget-s.spent<actual)return `You need ${actual} Growth for this piece.`;
 if(x<s.lo||x>s.hi||y===0||y>s.o.sky||y< -s.o.depth)return 'That square is outside the forest.';
 const touching=(list,dirs)=>dirs.some(([dx,dy])=>list.includes(key(x+dx,y+dy)));
 if(kind==='R'){
  if(y>0)return 'Roots grow underground.';
  if(p.roots.length>=s.o.roots)return 'You have used all your root pieces.';
  if(s.players.some(t=>t.roots.includes(k)))return 'That soil square already has a root.';
  if(!touching(p.roots,[[0,1],[1,0],[0,-1],[-1,0]]))return 'Roots must touch one of your roots by an edge.';
 }else if(kind==='W'){
  if(y<0)return 'Wood grows above ground.';
  if(p.wood.length>=s.o.wood)return 'You have used all your wood pieces.';
  if(s.players.some(t=>t.wood.includes(k)))return 'That square already has wood.';
  if(x===p.home){if(y!==height(p)+1)return 'Add trunk wood directly above your trunk.';if(s.o.rootBalance&&y>p.roots.length)return 'Grow more roots first: trunk height cannot exceed root count.';}
  else{if(!touching(p.wood,[[1,0],[-1,0]]))return 'Branches grow sideways from your own wood.';if(s.o.sideBalance){const [l,r]=reach({...p,wood:[...p.wood,k]});if(Math.abs(l-r)>1)return 'Balance your tree: left and right reach can differ by at most one.';}}
 }else if(kind==='L'){
  if(!p.wood.includes(k))return 'Put a leaf on one of your wood pieces.';
  if(p.leaves[k]&&!upgrade)return 'This wood already has that leaf.';
 }else return 'Choose wood, roots, or leaves.';
 return {cost:actual,upgrade};
}
export function place(s,kind,x,y,block=false){const ok=check(s,kind,x,y,block);if(typeof ok==='string')return ok;
 const p=s.players[s.current],k=key(x,y);s.kind=kind;s.spent+=ok.cost;s.placed++;
 if(kind==='W')p.wood.push(k);if(kind==='R')p.roots.push(k);if(kind==='L')p.leaves[k]=block?'blocker':'normal';
 log(s,`${ok.upgrade?'Upgraded to': 'Placed'} ${block?'blocking leaf':{W:'wood',R:'root',L:'leaf'}[kind]} at ${String.fromCharCode(64+x)}${y>0?'↑':'↓'}${Math.abs(y)} (${ok.cost} Growth).`);
 return null;
}
export function endTurn(s){if(s.ended)return;s.passes=s.placed===0?s.passes+1:0;log(s,s.placed?`Ended turn; ${s.budget-s.spent} Growth returned.`:'Passed.');const next=(s.current+1)%s.o.n;
 const roundsDone=s.o.roundLimit&&s.round>=s.o.roundLimit&&next===0;
 if(roundsDone){s.ended=true;s.finishedAt=new Date().toISOString();log(s,roundsDone?`Game finished after ${s.o.roundLimit} full rounds.`:'Game finished.');return;}
 s.current=next;s.turn++;s.round=Math.floor((s.turn-1)/s.o.n)+1;s.kind=null;s.spent=0;s.placed=0;s.collected=income(s,s.current);s.budget=s.collected.total;
}
export function moves(s,kind,block=false){const a=[];for(let y=-s.o.depth;y<=s.o.sky;y++){if(!y)continue;for(let x=s.lo;x<=s.hi;x++)if(typeof check(s,kind,x,y,block)!=='string')a.push([x,y]);}return a;}

export function upgradeSave(s){s.o.leaves=null;s.o.roundLimit=s.o.roundLimit||12;s.o.rulesVersion=3;s.lo=1;s.hi=s.o.cols;s.finisher=null;return s;}
