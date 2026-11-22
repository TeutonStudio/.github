import test from 'node:test'
import assert from 'node:assert/strict'
import {createPreviewRunner} from '../src/preview-runner.js'
function setup() {
 const workers=[],results=[],timers=new Set()
 const createWorker=()=>{const w={messages:[],terminated:false,postMessage(message){this.messages.push(message)},terminate(){this.terminated=true}};workers.push(w);return w}
 const runner=createPreviewRunner(createWorker,result=>results.push(result),{setTimer:fn=>{timers.add(fn);return fn},clearTimer:fn=>timers.delete(fn)})
 const ready=w=>w.onmessage({data:{ready:true}})
 return {workers,results,timers,runner,ready}
}
test('preview waits for worker readiness and returns the exact latest request',()=>{
 const {runner,workers,ready,results,timers}=setup();runner.submit({id:1,viewKey:'roof'})
 assert.deepEqual(workers[0].messages,[]);ready(workers[0]);assert.equal(timers.size,0)
 assert.deepEqual(workers[0].messages,[{id:1,viewKey:'roof'}]);workers[0].onmessage({data:{id:1,plan:{count:87}}})
 assert.deepEqual(results,[{id:1,plan:{count:87}}]);runner.dispose()
})
test('new content cancels an in-flight preview and ignores its late result',()=>{
 const {runner,workers,ready,results}=setup();runner.submit({id:1});ready(workers[0]);const stale=workers[0].onmessage
 runner.submit({id:2});assert.ok(workers[0].terminated);stale({data:{id:1,plan:{count:1}}});ready(workers[1]);workers[1].onmessage({data:{id:2,plan:{count:2}}})
 assert.deepEqual(results,[{id:2,plan:{count:2}}]);runner.dispose()
})
test('idle workers are reused while interrupted mounts can safely restart',()=>{
 const {runner,workers,ready}=setup();runner.submit({id:1});ready(workers[0]);workers[0].onmessage({data:{id:1}});runner.submit({id:2})
 assert.equal(workers.length,1);assert.equal(workers[0].messages.length,2);runner.cancel();runner.submit({id:3});ready(workers[1]);assert.equal(workers[1].messages[0].id,3);runner.dispose()
})
test('an unavailable preview server produces a recoverable startup error instead of permanent pending',()=>{
 const {runner,workers,results,timers,ready}=setup();runner.submit({id:1,viewKey:'roof'});[...timers][0]()
 assert.ok(workers[0].terminated);assert.equal(results[0].id,1);assert.match(results[0].error,/Server/)
 runner.submit({id:2});ready(workers[1]);workers[1].onmessage({data:{id:2,plan:{count:1}}});assert.equal(results[1].plan.count,1);runner.dispose()
})
test('worker loading and message errors finish the current request and allow a retry',()=>{
 const {runner,workers,ready,results}=setup();runner.submit({id:1});workers[0].onerror({message:''});assert.match(results[0].error,/Server/)
 runner.submit({id:2});ready(workers[1]);workers[1].onmessageerror();assert.match(results[1].error,/gelesen/);runner.dispose()
})
test('a disposed worker cannot update the graph preview after an area-panel switch',()=>{
 const {runner,workers,results,timers}=setup();runner.submit({id:1});const stale=workers[0].onmessage;runner.dispose();stale({data:{ready:true}});stale({data:{id:1,plan:{count:1}}})
 assert.ok(workers[0].terminated);assert.equal(timers.size,0);assert.deepEqual(results,[])
})
