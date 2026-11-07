export function visibleRows(s,view){
 const top=view==='canopy'?Math.min(s.o.sky,Math.max(5,...s.players.flatMap(p=>p.wood.map(k=>Number(k.split(',')[1])+1)))):s.o.sky;
 if(view==='roots')return Array.from({length:s.o.depth},(_,i)=>-i-1);
 const sky=Array.from({length:top},(_,i)=>top-i);
 return view==='whole'?sky.concat(Array.from({length:s.o.depth},(_,i)=>-i-1)):sky;
}
export function squareSize(width,height,cols,rows){return Math.max(1,Math.floor(Math.min((width-22)/cols,(height-19)/rows)));}
