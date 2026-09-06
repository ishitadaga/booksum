import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.BOOKSUM_URL || 'http://127.0.0.1:3001';
const artifacts = await mkdtemp(join(tmpdir(), 'booksum-themes-'));
const browser = await chromium.launch({headless:true, executablePath:process.env.BROWSER_EXECUTABLE || undefined});
const context = await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light'});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const node = (id,label,genre,similarity) => ({id,label,genre,similarity,author:'Fixture author',description:'A fixture book for testing theme and graph interactions.',cover_img:null,is_center:id==='dune',rating:4.2,publication_year:1965});
const center = node('dune','Dune','Science Fiction',1);
const nodes = [node('hobbit','The Hobbit','Fantasy',.8),node('foundation','Foundation','Science Fiction',.7),node('earthsea','A Wizard of Earthsea','Fantasy',.6),node('left-hand','The Left Hand of Darkness','Fiction',.5)];
const graph = {center_book:center,nodes,edges:[...nodes.map(n=>({source:center.id,target:n.id,weight:n.similarity})),{source:'hobbit',target:'earthsea',weight:.75}]};
const playlist = {id:1,user_id:1,name:'A shelf of possibilities',genre:'Fantasy',description:'Theme testing fixture',is_public:true,username:'reader',book_count:4,preview_covers:[]};
let authenticated = false;
await context.route('**/api/**', async route => {
  const url = new URL(route.request().url());
  const send = (body,status=200) => route.fulfill({status,headers:{'access-control-allow-origin':new URL(baseURL).origin,'access-control-allow-credentials':'true'},contentType:'application/json',body:JSON.stringify(body)});
  if (url.pathname === '/api/auth/me') return authenticated ? send({id:1,username:'reader',display_name:'Reader'}) : send({detail:'Not authenticated'},401);
  if (url.pathname === '/api/graph/similarity') return send(graph);
  if (url.pathname === '/api/playlists') return send([playlist]);
  if (url.pathname === '/api/playlists/1') return send({...playlist,books:[]});
  if (url.pathname.startsWith('/api/social')) return send([]);
  if (url.pathname === '/api/books/search') return send({books:[],total:0,source:'fixture'});
  return send({detail:'Not found'},404);
});
const theme = () => page.getByRole('combobox',{name:'Color theme',exact:true});
const resolved = expected => page.waitForFunction(value => document.documentElement.dataset.theme === value,expected);
const canvasState = () => page.evaluate(() => {
  const cy = [...document.querySelectorAll('div')].find(el=>el._cyreg?.cy)?._cyreg.cy;
  if (!cy) return null;
  return {edge:cy.edges()[0].style('line-color'),zoom:cy.zoom(),pan:cy.pan(),positions:cy.nodes().map(n=>({id:n.id(),...n.position()})),selected:cy.nodes('.focused').map(n=>n.id())};
});

try {
  await page.goto(baseURL);
  await resolved('light');
  assert.equal(await theme().inputValue(),'system');
  await page.emulateMedia({colorScheme:'dark'});
  await resolved('dark');
  await theme().selectOption('light');
  await resolved('light');
  await page.reload();
  await resolved('light');
  assert.equal(await theme().inputValue(),'light','Explicit choice persists across reload');
  await theme().selectOption('system');
  await resolved('dark');
  await page.emulateMedia({colorScheme:'light'});
  await resolved('light');

  // A second tab's choice should update the current one.
  const second = await context.newPage();
  await second.goto(baseURL);
  await second.getByRole('combobox',{name:'Color theme',exact:true}).selectOption('dark');
  await resolved('dark');
  await second.close();

  for (const value of ['light','dark']) {
    await theme().selectOption(value);
    await resolved(value);
    const ratios = await page.evaluate(() => {
      const css=getComputedStyle(document.documentElement);
      const lum = name => css.getPropertyValue(name).trim().split(/\s+/).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
      const pairs = ['--primary','--secondary','--muted','--accent'].flatMap(fg=>['--canvas','--surface','--raised'].map(bg=>({fg,bg,ratio:(Math.max(lum(fg),lum(bg))+.05)/(Math.min(lum(fg),lum(bg))+.05)})));
      return pairs;
    });
    for (const p of ratios) assert.ok(p.ratio>=4.5,`${value} ${p.fg}/${p.bg} contrast ${p.ratio.toFixed(2)}`);
    await page.screenshot({path:join(artifacts,`${value}-desktop.png`),fullPage:true});
    for (const [width,height] of [[375,812],[320,740],[812,375]]) {
      await page.setViewportSize({width,height});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${value} overflow at ${width}`);
      assert.ok(await theme().isVisible());
      if(width===375)await page.screenshot({path:join(artifacts,`${value}-mobile.png`),fullPage:true});
    }
    await page.setViewportSize({width:1440,height:1000});
  }

  // Advance the real interval without spending 24 wall-clock seconds.
  await page.clock.install();
  await page.reload();
  await page.getByText('Start with a story you love.').waitFor();
  await page.clock.fastForward(8100);
  await page.waitForFunction(()=>[...document.querySelectorAll('p')].some(p=>p.className.includes('_active')&&p.textContent.includes('One good book')));
  assert.equal(await page.getByRole('button',{name:/Pause discovery|Next discovery/}).count(),0);
  await page.clock.fastForward(8100);
  await page.waitForFunction(()=>[...document.querySelectorAll('p')].some(p=>p.className.includes('_active')&&p.textContent.includes('Start with a book you love.')));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.reload();
  await page.getByText('Start with a story you love.').waitFor();
  await page.clock.fastForward(24000);
  assert.ok(await page.getByText('Start with a story you love.').evaluate(p=>p.className.includes('_active')));
  assert.equal(await page.getByRole('button',{name:'Pause discovery messages'}).count(),0);

  await page.goto(baseURL+'/graph?book_id=dune');
  await page.waitForFunction(()=>[...document.querySelectorAll('div')].some(el=>el._cyreg?.cy?.nodes().length===5));
  await page.evaluate(()=>{
    const cy=[...document.querySelectorAll('div')].find(el=>el._cyreg?.cy)._cyreg.cy;
    cy.getElementById('dune').emit('tap');cy.zoom(1.2);cy.pan({x:120,y:130});
  });
  await page.getByRole('heading',{name:'Dune',exact:true,level:2}).waitFor();
  await theme().selectOption('light');
  const before = await canvasState();
  await page.screenshot({path:join(artifacts,'graph-light.png'),fullPage:true});
  await theme().selectOption('dark');
  await resolved('dark');
  const after = await canvasState();
  assert.notEqual(before.edge,after.edge,'Canvas edge colors must change');
  assert.deepEqual({...before,edge:null},{...after,edge:null},'Theme changes must retain graph state');
  await page.screenshot({path:join(artifacts,'graph-dark.png'),fullPage:true});
  await page.setViewportSize({width:375,height:812});
  await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Graph does not overflow horizontally');
  await page.screenshot({path:join(artifacts,'graph-mobile.png'),fullPage:true});

  authenticated=true;
  await page.setViewportSize({width:1440,height:1000});
  for (const value of ['light','dark']) {
    await theme().selectOption(value);
    for (const path of ['/login','/register','/playlists','/profile','/social']) {
      await page.goto(baseURL+path);
      await resolved(value);
      assert.equal(await theme().inputValue(),value);
      assert.ok(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor!=='rgba(0, 0, 0, 0)'));
      if(path==='/playlists') {
        await page.getByText(playlist.name).waitFor();
        await page.getByRole('button',{name:'Create Playlist',exact:true}).click();
        await page.getByRole('heading',{name:'Create Playlist'}).waitFor();
        await page.screenshot({path:join(artifacts,`playlist-modal-${value}.png`),fullPage:true});
      }
    }
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: light/dark/system, persistence, system changes, cross-tab sync, contrast, responsive layouts, natural rotation/reduced motion, graph repaint/state preservation, themed routes and modal.');
  console.log('Screenshots:',artifacts);
  console.log('All API responses are isolated fixtures; no backend data was written.');
} finally {await browser.close();}
