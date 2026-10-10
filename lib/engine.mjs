export const symbols = ['GBPUSD','XAUUSD','EURUSD','USDJPY','EURJPY'];
export function parseCandles(text) {
 const lines=text.trim().split(/\r?\n/); if(lines.length<2) throw Error('Include a header and at least one candle.');
 const delimiter=lines[0].includes('\t')?'\t':',';
 const headers=lines.shift().split(delimiter).map(x=>x.trim().replace(/[<>]/g,'').toLowerCase());
 const idx=k=>headers.indexOf(k);
 if(['open','high','low','close'].some(k=>idx(k)<0)) throw Error('Required columns: time (or date and time), open, high, low, close.');
 const candles=lines.filter(x=>x.trim()).map(line=>{const cells=line.split(delimiter);const date=idx('date')>=0?cells[idx('date')].replaceAll('.','-'):'';const raw=cells[idx('time')]||'';const stamp=date?date+'T'+raw:raw;const time=Date.parse(/(Z|[+-]\d\d:\d\d)$/.test(stamp)?stamp:stamp+'Z');const c={time,open:Number(cells[idx('open')]),high:Number(cells[idx('high')]),low:Number(cells[idx('low')]),close:Number(cells[idx('close')])};if(!Object.values(c).every(Number.isFinite)||c.low>Math.min(c.open,c.close)||c.high<Math.max(c.open,c.close)||c.high<c.low||c.low<=0)throw Error('Invalid timestamp or OHLC values. Use ISO timestamps; timestamps without offsets are treated as UTC.');return c;}).sort((a,b)=>a.time-b.time);
 if(new Set(candles.map(c=>c.time)).size!==candles.length)throw Error('Duplicate candle timestamps.');return candles;
}
export function assess(candles,zone,direction,settings={body:0.75,range:1.2,wick:0.5}) {
 if(!candles.length||!zone||!(zone.low>0&&zone.high>=zone.low))return {stage:'Needs context',reason:'Import completed H1 candles and mark an H4 zone.'};
 const buy=direction==='buy'; const beyond=c=>buy?c.close>zone.high:c.close<zone.low;
 let breakout=-1;for(let i=0;i<candles.length;i++)if(beyond(candles[i])&&(i===0||!beyond(candles[i-1])))breakout=i;
 if(breakout<0)return {stage:'Watching',reason:'No completed candle closes beyond this zone.'};
 const later=candles.slice(breakout+1);if(later.some(c=>buy?c.close<zone.low:c.close>zone.high))return {stage:'Invalidated',reason:'A completed candle closed through the opposite side of the zone.'};
 const touches=c=>c.low<=zone.high&&c.high>=zone.low;
 let retest=-1;for(let i=breakout+1;i<candles.length;i++)if(touches(candles[i])){retest=i;break;}
 if(retest<0)return {stage:'Waiting for retest',reason:'Breakout recorded. Price has not revisited the zone.'};
 const rejection=c=>{const range=c.high-c.low,body=Math.abs(c.close-c.open),wick=buy?Math.min(c.open,c.close)-c.low:c.high-Math.max(c.open,c.close);return range>0&&wick/range>=settings.wick&&wick>=body*2;};
 for(let i=retest;i<candles.length;i++){const c=candles[i],r=c.high-c.low,b=Math.abs(c.close-c.open);const prev=candles.slice(Math.max(0,i-20),i).map(x=>x.high-x.low).sort((a,b)=>a-b);const median=prev.length?prev[Math.floor(prev.length/2)]:Infinity;const momentum=prev.length>=20&&r>0&&b/r>=settings.body&&r>=settings.range*median&&(buy?c.close>c.open:c.close<c.open)&&beyond(c);const trio=candles.slice(i-2,i+1);const wicks=i>=retest+2&&trio.length===3&&trio.every(touches)&&trio.filter(rejection).length>=2&&beyond(c);if(momentum||wicks)return {stage:'Practice setup',reason:(momentum&&wicks?'Momentum and wick':momentum?'Momentum':'Three-candle wick')+' confirmation detected. Review costs and risk before saving.',confirmation:momentum&&wicks?'Both':momentum?'Momentum':'Wicks',entry:c.close,stop:buy?c.low:c.high,time:c.time};}
 return {stage:'Waiting for confirmation',reason:'Retest recorded. No qualifying completed-candle confirmation yet.'};
}
export function sizePosition({balance,riskPercent,entry,stop,direction,tickSize,tickValue,minLot,step,verified,costPerLot=0,marginPerLot=0,freeMargin=0}) {
 if(!verified)return {blocked:true,reason:'Verify your MT5 symbol specifications first.'};
 const values=[balance,riskPercent,entry,stop,tickSize,tickValue,minLot,step];if(values.some(x=>!Number.isFinite(x)||x<=0)||riskPercent>100||costPerLot<0||marginPerLot<0||freeMargin<0)return {blocked:true,reason:'Enter valid positive sizing inputs.'};
 if(direction==='buy'?stop>=entry:stop<=entry)return {blocked:true,reason:'Stop must be on the protective side of entry.'};
 const budget=balance*riskPercent/100,perLot=Math.abs(entry-stop)/tickSize*tickValue+costPerLot;const lot=Math.floor((budget/perLot+1e-10)/step)*step;
 if(lot+1e-10<minLot)return {blocked:true,budget,reason:'Broker minimum exceeds your risk budget. Keep this as practice.'};
 if(!marginPerLot)return {blocked:true,budget,reason:'Enter margin per lot from MT5 to check affordability.'};
 if(lot*marginPerLot>freeMargin)return {blocked:true,budget,reason:'Insufficient free margin for this position.'};
 return {blocked:false,budget,lot:Number(lot.toFixed(8)),loss:lot*perLot,margin:lot*marginPerLot,reason:'Fits the configured budget; execution can differ.'};
}
export function analytics(trades){const closed=trades.filter(t=>t.closed);let equity=0,peak=0,drawdown=0;for(const t of [...closed].sort((a,b)=>a.closedAt-b.closedAt)){equity+=t.pnl;peak=Math.max(peak,equity);drawdown=Math.max(drawdown,peak-equity);}return {count:closed.length,net:equity,drawdown,winRate:closed.length?closed.filter(t=>t.pnl>0).length/closed.length*100:0,averageR:closed.length?closed.reduce((s,t)=>s+(t.initialRisk>0?t.pnl/t.initialRisk:0),0)/closed.length:0};}
export function management(trade,candles){
 const after=candles.filter(c=>c.time>trade.signalTime);const buy=trade.direction==='buy';const count=after.filter(c=>buy?c.close>c.open:c.close<c.open).length;
 let swing=null;for(let i=2;i<after.length-2;i++){const c=after[i],neighbors=[after[i-2],after[i-1],after[i+1],after[i+2]];if(buy?neighbors.every(n=>c.low<n.low):neighbors.every(n=>c.high>n.high)){const price=buy?c.low:c.high;const protective=buy?price>trade.entry:price<trade.entry;const confirmation=after.slice(i+2).find(n=>buy?n.close>c.high:n.close<c.low);if(protective&&confirmation)swing={price,time:c.time};}}
 const candidate=swing?(buy?swing.price-(trade.buffer||0):swing.price+(trade.buffer||0)):null;
 const tighter=candidate!==null&&(buy?candidate>trade.stop:candidate<trade.stop);
 return {count,review:count>=3,swing,stop:tighter?candidate:null,reason:tighter?'Confirmed post-entry protective swing. Review buffer, costs and current price before tightening.':count>=3?'Three directional candles counted: review protection, but no qualifying swing stop yet.':'Waiting for post-entry structure.'};
}
export function additionCheck(existing,plan,spec,budget,confirmation){
 if(existing.length>=5)return 'Five-position practice cap reached.';
 if(!confirmation||!['Momentum','Both'].includes(confirmation.confirmation))return 'An addition requires a fresh retest and momentum confirmation.';
 if(existing.some(t=>t.signalTime===confirmation.time))return 'This confirmation was already used in the campaign.';
 if(existing.some(t=>!t.lot||!t.specSnapshot))return 'Existing positions need verified sizing before adding.';
 const last=existing.at(-1);if(last&&(last.direction==='buy'?last.stop<last.entry:last.stop>last.entry))return 'Previous position must first have its stop at entry or better.';
 if(plan.blocked)return plan.reason;
 let loss=plan.loss,margin=plan.margin;for(const t of existing){const s=t.specSnapshot;loss+=Math.max(0,(t.direction==='buy'?t.entry-t.stop:t.stop-t.entry)/s.tickSize*s.tickValue*t.lot)+(s.costPerLot||0)*t.lot;margin+=(s.marginPerLot||0)*t.lot;}
 if(loss>budget+1e-8)return 'Combined campaign loss exceeds the configured risk budget.';
 if(margin>spec.freeMargin)return 'Combined campaign margin exceeds the practice margin allowance.';
 return null;
}
export function validateBackup(d){
 if(!d||d.version!==1||!Array.isArray(d.trades)||!d.market||!d.zones||!d.specs||!Number.isFinite(d.balance)||d.balance<0||!Number.isFinite(d.riskPercent)||d.riskPercent<=0||d.riskPercent>100)throw Error('Unrecognised backup schema.');
 for(const [s,frames]of Object.entries(d.market)){if(!symbols.includes(s))throw Error('Unknown instrument.');for(const [tf,candles]of Object.entries(frames)){if(!['H1','H4'].includes(tf)||!Array.isArray(candles))throw Error('Invalid candle series.');for(const c of candles)if(![c.time,c.open,c.high,c.low,c.close].every(Number.isFinite)||c.low<=0||c.low>Math.min(c.open,c.close)||c.high<Math.max(c.open,c.close))throw Error('Invalid candles.');}}
 for(const [s,z]of Object.entries(d.zones))if(!symbols.includes(s)||!Number.isFinite(z.low)||!Number.isFinite(z.high)||z.low<=0||z.high<z.low)throw Error('Invalid zone.');
 for(const [s,spec]of Object.entries(d.specs)){if(!symbols.includes(s)||!spec||typeof spec!=='object')throw Error('Invalid specifications.');for(const [k,v]of Object.entries(spec))if(k!=='verified'&&(!Number.isFinite(v)||v<0))throw Error('Invalid specification value.');}
 const ids=new Set();for(const t of d.trades){if(typeof t.id!=='string'||ids.has(t.id)||typeof t.campaign!=='string'||!symbols.includes(t.symbol)||!['buy','sell'].includes(t.direction)||![t.entry,t.stop,t.initialRisk,t.createdAt].every(Number.isFinite)||t.entry<=0||t.stop<=0||t.initialRisk<0||!Array.isArray(t.adjustments)||typeof t.closed!=='boolean'||(t.closed&&(!Number.isFinite(t.pnl)||!Number.isFinite(t.closedAt))))throw Error('Invalid trade.');ids.add(t.id);if(t.screenshot&&(!t.screenshot.startsWith('data:image/')||t.screenshot.length>3000000))throw Error('Invalid screenshot.');}return d;
}
