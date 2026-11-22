"""Exercise canvas render isolation and real Graphstudio layout/history/storage."""
import argparse,json,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:5173');parser.add_argument('--chromium',default=shutil.which('chromium') or shutil.which('chromium-browser'));parser.add_argument('--artifacts',type=Path,default=Path('/tmp/graphstudio-node-drag'));args=parser.parse_args();args.artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=args.chromium,headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(20000)
 page.goto(args.url.rstrip('/')+'/test/fixtures/node-drag.html');target=page.locator('.react-flow__node[data-id="node_0"]');expect(target).to_be_visible();page.wait_for_timeout(300)
 box=target.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+10,y+5);page.wait_for_timeout(100)
 before=page.evaluate('structuredClone(window.dragTest)')
 for i in range(1,31):page.mouse.move(x+10+i*2,y+5+i)
 held=page.evaluate('structuredClone(window.dragTest)')
 assert held['renders']==before['renders'],(before['renders'],held['renders'])
 assert held['commits']==0 and held['document']==before['document']
 page.mouse.up();page.wait_for_timeout(200);after=page.evaluate('structuredClone(window.dragTest)')
 assert after['commits']==1 and after['document'][0]['position']!=before['document'][0]['position']
 # A rejected/no-op transaction restores the document position instead of
 # leaving a transient visual move that would be lost on reload.
 page.evaluate('window.dragTest.reject=true');box=target.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
 initial_box=dict(box);page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+30,y+15,steps=10);page.mouse.up();page.wait_for_timeout(100)
 box=target.bounding_box();assert abs(box['x']-initial_box['x'])<1 and abs(box['y']-initial_box['y'])<1
 page.goto(args.url.rstrip('/')+'/?editor=graph');page.wait_for_selector('.react-flow__node');page.wait_for_timeout(500)
 # Seed two explicit sources: fresh cards do not include two editable
 # sources, so multi-selection must not rely on demo contents.
 page.evaluate("""async()=>{const {stored,emptyWorkspace}=await import('/src/storage.js');const {newCard}=await import('/src/cards.js');const {newNode}=await import('/src/generated/engine.mjs');const document=newCard();document.graph.nodes=document.graph.nodes.map(n=>n.resultType?{...n,x:640,y:160}:n);document.graph.nodes.push(newNode(true,'INT','drag_a',0,200),newNode(true,'INT','drag_b',300,200));await stored('workspace','current',{...emptyWorkspace(),drafts:{building:{mode:'building',document,materials:{}}}})}""")
 page.reload();page.wait_for_selector('.react-flow__node[data-id="drag_a"]');page.wait_for_timeout(400)
 def export():
  page.locator('.graph-heading').get_by_role('button',name='Bibliothek',exact=True).click();dialog=page.get_by_role('dialog',name='Bibliothek',exact=True)
  with page.expect_download() as downloaded:dialog.get_by_role('button',name='Export …',exact=True).click()
  document=json.loads(Path(downloaded.value.path()).read_text());dialog.locator('header > button[aria-label="Schließen"]').click();return document
 original=export();ids=['drag_a','drag_b']
 # Inline value and operation controls on 0.6.5 must still commit the current
 # document after moving state into the canvas, and keep one undo transition.
 source=page.locator('.react-flow__node[data-id="drag_a"]')
 source.get_by_role('textbox',name='Wert',exact=True).fill('7')
 source.get_by_role('textbox',name='Wert',exact=True).press('Tab')
 assert next(n for n in export()['graph']['nodes'] if n['id']=='drag_a')['countValue']==7
 page.get_by_role('button',name='Rückgängig',exact=True).click();assert export()==original
 source.get_by_role('combobox',name='Zahlenoperator · Operation',exact=True).click()
 page.get_by_role('option',name='Addition',exact=True).click()
 assert next(n for n in export()['graph']['nodes'] if n['id']=='drag_a')['kind']=='INT_ADD'
 page.get_by_role('button',name='Rückgängig',exact=True).click();assert export()==original
 for i,id in enumerate(ids):page.locator(f'.react-flow__node[data-id="{id}"] .node-heading').click(modifiers=['Control'] if i else [])
 target=page.locator(f'.react-flow__node[data-id="{ids[0]}"]');box=target.bounding_box();x=box['x']+box['width']/2;y=box['y']+12
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+80,y+30,steps=20);page.mouse.up();page.wait_for_timeout(300)
 moved=export();old={n['id']:n for n in original['graph']['nodes']};new={n['id']:n for n in moved['graph']['nodes']}
 deltas=[(new[id]['x']-old[id]['x'],new[id]['y']-old[id]['y']) for id in ids];assert deltas[0]==deltas[1] and deltas[0]!=(0,0),deltas
 for id in old:
  assert {k:v for k,v in old[id].items() if k not in ['x','y']}=={k:v for k,v in new[id].items() if k not in ['x','y']}
  assert not any(k in new[id] for k in ['measured','dragging','selected'])
 page.get_by_role('button',name='Rückgängig',exact=True).click();assert export()==original
 page.get_by_role('button',name='Wiederholen',exact=True).click();assert export()==moved
 page.wait_for_timeout(400);page.reload();page.wait_for_selector('.react-flow__node');assert export()==moved
 # View-only saved versions move locally without creating a document edit.
 page.locator('.save-version').click();page.wait_for_timeout(300)
 version=page.get_by_role('combobox',name='Graphversion');version.click();page.get_by_role('option',name='v1',exact=True).click();page.wait_for_timeout(300)
 saved=export();target=page.locator(f'.react-flow__node[data-id="{ids[0]}"]');box=target.bounding_box();x=box['x']+box['width']/2;y=box['y']+12
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+35,y+10,steps=10);page.mouse.up();page.wait_for_timeout(200)
 expect(page.get_by_role('button',name='Rückgängig',exact=True)).to_be_disabled()
 # Export retains the saved version's content; layout is only a viewing aid.
 view=export();assert {k:v for k,v in view.items() if k!='graph'}=={k:v for k,v in saved.items() if k!='graph'}
 for n in view['graph']['nodes']:assert {k:v for k,v in n.items() if k not in ['x','y']}=={k:v for k,v in next(old for old in saved['graph']['nodes'] if old['id']==n['id']).items() if k not in ['x','y']}
 # Folded group dragging must move every member by one common delta.
 group_id=page.evaluate("""async()=>{const {stored}=await import('/src/storage.js');const {splitVector}=await import('/src/reference-groups.js');const data=await stored('workspace','current');const entry=data.drafts.building;const result=splitVector('building',entry.document,null,{x:300,y:300});await stored('workspace','current',{...data,drafts:{...data.drafts,building:{...entry,document:result.document}}});return result.nodeId}""")
 page.reload();page.wait_for_selector(f'.react-flow__node[data-id="{group_id}"]');page.wait_for_timeout(400)
 grouped=export();members=next(g['nodes'] for g in grouped['graph']['nodeGroups'] if g['id']==group_id)
 target=page.locator(f'.react-flow__node[data-id="{group_id}"]');box=target.bounding_box();x=box['x']+box['width']/2;y=box['y']+12
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+50,y+20,steps=15);page.mouse.up();page.wait_for_timeout(200)
 shifted=export();old={n['id']:n for n in grouped['graph']['nodes']};new={n['id']:n for n in shifted['graph']['nodes']}
 deltas=[(new[id]['x']-old[id]['x'],new[id]['y']-old[id]['y']) for id in members];assert len(set(deltas))==1 and deltas[0]!=(0,0),deltas
 page.get_by_role('button',name='Rückgängig',exact=True).click();assert export()==grouped
 page.get_by_role('button',name='Wiederholen',exact=True).click();assert export()==shifted
 page.screenshot(path=str(args.artifacts/'node-drag.png'),full_page=True)
 assert not errors,errors
 browser.close()
print('PASS: drag stays on canvas, one commit on release, multi-node movement, native JSON retention, Undo/Redo, reload view-only versions, rejected edits, folded groups and inline node controls.')
