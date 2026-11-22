import argparse,json,time,statistics,shutil,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser(description='Repeatable node-drag timings against a local dev or production build, using isolated browser storage.')
parser.add_argument('--url',default='http://127.0.0.1:5173')
parser.add_argument('--output',type=Path,default=Path('/tmp/graphstudio-drag-profile.json'))
parser.add_argument('--profile',action='store_true',help='Also save a Chrome CPU profile for each scenario')
parser.add_argument('--repeats',type=int,default=3)
parser.add_argument('--chromium',default=shutil.which('chromium') or shutil.which('chromium-browser'))
parser.add_argument('--cpu-rate',type=float,default=1,help='Optional Chrome CPU throttling factor')
args=parser.parse_args();args.output.parent.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[1]
fixtures=json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import { starterCard,newNode } from './src/generated/engine.mjs';
const fixtures={};
for(const count of [12,48,96]) {
 const doc=starterCard(),result=doc.graph.nodes.find(n=>n.resultType);
 doc.graph.nodes=[doc.graph.nodes[0],...Array.from({length:count-2},(_,i)=>({...newNode(true,i%3===2?'INT_ADD':'INT',`bench_${i}`,i%8*235,Math.floor(i/8)*130),...(i%3===2?{inputs:[`bench_${i-2}`,`bench_${i-1}`]}:{countValue:1})})),{...result,x:8*235,y:130,resultType:'INT',resultMode:'VALUE',resultSource:'bench_2',inputs:['bench_2']}];
 doc.name='Drag Benchmark';fixtures[count]={schema:1,drafts:{building:{mode:'building',document:doc,materials:{}}},graphs:[],nodeGroups:[],mods:[],documentNames:{}};
}
console.log(JSON.stringify(fixtures));
"""],cwd=root))
WORKERS="""window.__workerPosts=0;const NativeWorker=window.Worker;window.Worker=class extends NativeWorker {postMessage(...args){window.__workerPosts++;return super.postMessage(...args)}};"""
def percentile(values,p): return sorted(values)[min(len(values)-1,int(len(values)*p))] if values else 0
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=args.chromium,headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for count,multiple in [(12,1),(48,1),(96,1),(96,5)]:
  for repeat in range(args.repeats):
   context=browser.new_context(viewport={'width':1440,'height':1000});page=context.new_page();page.add_init_script(WORKERS);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(args.url+'/?editor=graph');page.wait_for_selector('.react-flow__node')
   workspace=fixtures[str(count)]
   page.evaluate("""async data=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('copycat-architect-graphstudio',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise((resolve,reject)=>{const tx=db.transaction('workspace','readwrite');tx.objectStore('workspace').put(data,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}""",workspace)
   page.reload();page.wait_for_selector('.react-flow__node[data-id="bench_0"]');page.wait_for_timeout(1500)
   for i in range(multiple):
    page.locator(f'.react-flow__node[data-id="bench_{i}"] .node-heading').click(modifiers=['Control'] if i else [])
   page.wait_for_timeout(400)
   target=page.locator('.react-flow__node[data-id="bench_0"]');bounds=target.bounding_box();x=bounds['x']+bounds['width']/2;y=bounds['y']+12
   cdp=context.new_cdp_session(page);cdp.send('Performance.enable');cdp.send('Emulation.setCPUThrottlingRate',{'rate':args.cpu_rate});page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+5,y+2);page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');before={m['name']:m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}
   page.evaluate('''()=>{window.__workerPosts=0;window.__frames=[];window.__longTasks=[];window.__watch=true;window.__observer=new PerformanceObserver(l=>window.__longTasks.push(...l.getEntries().map(e=>e.duration)));window.__observer.observe({type:'longtask'});let last=performance.now();function frame(t){window.__frames.push(t-last);last=t;if(window.__watch)requestAnimationFrame(frame)}requestAnimationFrame(frame)}''')
   if args.profile:cdp.send('Profiler.enable');cdp.send('Profiler.start')
   latencies=[];start=time.perf_counter()
   for step in range(1,61):
    t=time.perf_counter();page.mouse.move(x+step*1.7,y+25*__import__('math').sin(step/12));latencies.append((time.perf_counter()-t)*1000)
   drag_ms=(time.perf_counter()-start)*1000
   mid={m['name']:m['value'] for m in cdp.send('Performance.getMetrics')['metrics']};drag_data=page.evaluate('({frames:window.__frames.slice(),longTasks:window.__longTasks.slice()})')
   t=time.perf_counter();page.mouse.up();page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');drop_ms=(time.perf_counter()-t)*1000
   after={m['name']:m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}
   if args.profile:
    profile=cdp.send('Profiler.stop')['profile'];args.output.with_name(f'{args.output.stem}-{count}-{multiple}-{repeat}.cpuprofile').write_text(json.dumps(profile))
   data=page.evaluate('''()=>{window.__watch=false;window.__observer.disconnect();return {renders:window.__renderCounts||{},workerPosts:window.__workerPosts,frames:window.__frames,longTasks:window.__longTasks}}''')
   row={'nodes':count,'selection':multiple,'repeat':repeat,'dragMs':round(drag_ms,2),'moveP50Ms':round(statistics.median(latencies),2),'moveP95Ms':round(percentile(latencies,.95),2),'dropMs':round(drop_ms,2),'frameP95Ms':round(percentile(drag_data['frames'],.95),2),'maxFrameMs':round(max(drag_data['frames']),2),'longTasksDuringDrag':len(drag_data['longTasks']),'taskMs':round((after['TaskDuration']-before['TaskDuration'])*1000,2),'scriptMs':round((after['ScriptDuration']-before['ScriptDuration'])*1000,2),'layoutMs':round((after['LayoutDuration']-before['LayoutDuration'])*1000,2),'dragScriptMs':round((mid['ScriptDuration']-before['ScriptDuration'])*1000,2),'dropScriptMs':round((after['ScriptDuration']-mid['ScriptDuration'])*1000,2),'workerPosts':data['workerPosts'],'errors':errors}
   results.append(row);args.output.write_text(json.dumps({'browser':browser.version,'cpuRate':args.cpu_rate,'url':args.url,'scenarios':results},indent=2));print(json.dumps(row),flush=True);assert not errors,errors;assert data['workerPosts']==0,'Layout-only edits must not recompute preview geometry';context.close()
 browser.close()
