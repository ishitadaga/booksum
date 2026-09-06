import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BOOKSUM_URL||'http://127.0.0.1:3002';
const artifacts=await mkdtemp(join(tmpdir(),'booksum-discovery-'));
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined});
const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light'});
const page=await context.newPage(), errors=[];
page.on('pageerror',e=>errors.push(e.message));
const makeNode=(id,label)=>({id,label,author:'Fixture author',genre:Number(id)%3?'Science Fiction':'Fiction',description:'A story of distant worlds and unexpected connections.',cover_img:null,similarity:.9-Number(id)/100,is_center:id==='0',rating:4,publication_year:2000});
let graph;
if(process.env.LIVE_DATA==='1') {
 const response=await context.request.get('https://booksum-api.fly.dev/api/graph/similarity?book_id=b2fd0ee1a6b3&top_n=20&min_similarity=0.2',{timeout:45000});
 assert.ok(response.ok()); graph=await response.json();
} else {
 const titles=['Dune','Foundation','The Left Hand of Darkness','Hyperion','Children of Time','A Fire Upon the Deep','The Dispossessed','The Martian','Project Hail Mary','Neuromancer','The Three-Body Problem','Solaris','Snow Crash','The Book of the New Sun','Contact','The Stars My Destination','Rendezvous with Rama','Ancillary Justice','The Forever War','Do Androids Dream of Electric Sheep?','The Expanse'];
 const books=titles.map((title,i)=>makeNode(String(i),title));
 graph={center_book:books[0],nodes:books.slice(1),edges:books.flatMap((a,i)=>books.slice(i+1).map((b,j)=>({source:a.id,target:b.id,weight:.95-(i+j)/100})))};
}
let failure=false, expansionFailure=false;
await context.route('**/api/**',async route=>{
 const url=new URL(route.request().url());
 const send=(body,status=200)=>route.fulfill({status,headers:{'access-control-allow-origin':new URL(base).origin,'access-control-allow-credentials':'true'},contentType:'application/json',body:JSON.stringify(body)});
 if(url.pathname==='/api/auth/me')return send({},401);
 if(url.pathname==='/api/graph/similarity')return failure?send({},503):send(graph);
 if(url.pathname.endsWith('/expand')) {
   if(expansionFailure)return send({},503);
   const next={...makeNode('new','A newly connected book'),similarity:.65};
   return send({center_book:graph.center_book,nodes:[next],edges:[{source:graph.center_book.id,target:next.id,weight:.65}]});
 }
 return send({books:[],total:0});
});
const cyEval=fn=>page.evaluate(fn);
const state=()=>cyEval(()=>{const cy=[...document.querySelectorAll('div')].find(e=>e._cyreg?.cy)?._cyreg.cy;return cy?{nodes:cy.nodes().length,edges:cy.edges().length,positions:cy.nodes().map(n=>n.position()),zoom:cy.zoom()}:null;});
try {
 await page.goto(base+'/graph?book_id='+graph.center_book.id);
 await page.waitForURL('**/?book_id=*');
 await page.getByRole('img',{name:/Book connection map/}).waitFor();
 await page.waitForFunction(()=>[...document.querySelectorAll('div')].some(e=>e._cyreg?.cy?.nodes().length===21));
 const initial=await state(); assert.equal(initial.nodes,21);assert.ok(initial.edges<=27);
 assert.equal(await page.getByRole('link',{name:'Explore',exact:true}).count(),0);
 await page.screenshot({path:join(artifacts,'map-light.png'),fullPage:true});
 await page.getByRole('checkbox',{name:'All connections'}).check();
 const full=await state();assert.equal(full.edges,210);assert.deepEqual(full.positions,initial.positions);
 await page.getByRole('checkbox',{name:'All connections'}).uncheck();
 const target=await page.evaluate(()=>{
  const el=[...document.querySelectorAll('div')].find(e=>e._cyreg?.cy),cy=el._cyreg.cy;
  const node=cy.nodes('.center'),p=node.renderedPosition(),box=el.getBoundingClientRect();
  return {id:node.id(),x:box.x+p.x,y:box.y+p.y,position:node.position()};
 });
 await page.mouse.move(target.x,target.y);await page.mouse.down();
 await page.mouse.move(target.x+45,target.y+30,{steps:8});await page.mouse.up();
 const moved=await page.evaluate(id=>[...document.querySelectorAll('div')].find(e=>e._cyreg?.cy)._cyreg.cy.getElementById(id).position(),target.id);
 assert.notDeepEqual(moved,target.position,'Pointer dragging moves a node');
 await page.mouse.move(20,180);
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();
 assert.ok((await state()).zoom>initial.zoom);
 await page.getByRole('button',{name:'Reset map view',exact:true}).click();
 const bookButton=page.getByRole('complementary',{name:'Books in this map'}).getByRole('button').nth(1);
 await bookButton.focus();await page.keyboard.press('Enter');
 await page.getByRole('heading',{name:'About this book',exact:true}).waitFor();
 await page.getByRole('button',{name:'All books',exact:false}).click();
 await page.getByRole('combobox',{name:'Color theme',exact:true}).selectOption('dark');
 await page.screenshot({path:join(artifacts,'map-dark.png'),fullPage:true});
 for(const width of [375,320,768]) {
  await page.setViewportSize({width,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No overflow at '+width);
  await page.getByRole('button',{name:'Reset map view',exact:true}).click();
  await page.screenshot({path:join(artifacts,'map-'+width+'.png'),fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('complementary',{name:'Books in this map'}).getByRole('button').first().click();
 expansionFailure=true;
 await page.getByRole('button',{name:'Add its connections to this map'}).click();
 await page.getByRole('alert').waitFor(); assert.equal((await state()).nodes,21);
 expansionFailure=false;
 await page.getByRole('button',{name:'Add its connections to this map'}).click();
 await page.waitForFunction(()=>[...document.querySelectorAll('div')].some(e=>e._cyreg?.cy?.nodes().length===22));
 failure=true;
 await page.reload();await page.getByText(/The book map couldn’t load/).waitFor();
 failure=false;await page.getByRole('button',{name:'Reload map'}).click();
 await page.getByRole('img',{name:/Book connection map/}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS: canonical route, sparse/all links, stable positions, dragging, zoom/reset, keyboard details, themes, mobile, expansion and retry. '+(process.env.LIVE_DATA==='1'?'Real Fly.io graph data, replayed locally to bypass preview CORS.':'Isolated fixture data.'));
 console.log('Screenshots: '+artifacts);
}finally{await browser.close();}
