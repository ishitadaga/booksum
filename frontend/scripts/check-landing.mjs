import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.BOOKSUM_URL || 'http://127.0.0.1:3001';
const artifacts = await mkdtemp(join(tmpdir(), 'booksum-landing-'));
const browser = await chromium.launch({headless:true, executablePath:process.env.BROWSER_EXECUTABLE || undefined});
const context = await browser.newContext({viewport:{width:1440,height:1000}});
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
let retryCalls = 0;
const book = (id, title) => ({book_id:id,title,author:'Example Author',description:'A book used to verify the interface.',genres:'Fiction',publication_year:2020,isbn:null,cover_img:null,rating:4.1,num_ratings:10,source:'test',has_embedding:true});
const dune = book('dune', 'Dune');
const hobbit = book('hobbit/edition &1', 'The Hobbit');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

await context.route('**/api/**', async route => {
  const url = new URL(route.request().url());
  const headers = {'access-control-allow-origin':new URL(baseURL).origin,'access-control-allow-credentials':'true'};
  const send = (body, status=200) => route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)}).catch(() => {});
  if (url.pathname === '/api/auth/me') return send({detail:'Not authenticated'},401);
  if (url.pathname === '/api/books/search') {
    const query = url.searchParams.get('q');
    if (query === 'Dune') await pause(650);
    if (query === 'retry' && retryCalls++ === 0) return send({detail:'Unavailable'},503);
    const books = query === 'missing-book' ? [] : query === 'Dune' ? [dune] : [hobbit];
    return send({books,total:books.length,source:'test'});
  }
  if (url.pathname === '/api/graph/similarity') return send({center_book:{id:hobbit.book_id,label:hobbit.title,author:hobbit.author,genre:'Fiction',cover_img:null,similarity:1,is_center:true,description:hobbit.description,rating:4.1,publication_year:2020},nodes:[],edges:[]});
  if (url.pathname === '/api/playlists') return send({detail:'Not authenticated'},401);
  return send({detail:'Not found'},404);
});

try {
  const guestResponse = page.waitForResponse(response => response.url().includes('/api/auth/me'));
  await page.goto(baseURL);
  await guestResponse;
  assert.equal(new URL(page.url()).pathname, '/', 'Guest session check must not redirect home to login');
  const input = page.getByRole('combobox', {name:'Search a book or author'});
  assert.equal(await input.count(), 1);
  assert.equal(await page.getByRole('heading',{level:1}).textContent(), 'BookSum');
  assert.ok(await page.getByText('Start with a story you love.').isVisible());
  assert.equal(await page.getByText('Similarity Graph', {exact:true}).count(), 0);
  await page.screenshot({path:join(artifacts,'desktop.png'),fullPage:true});
  await page.getByRole('button',{name:'Dune',exact:true}).click();
  assert.equal(await input.inputValue(),'Dune');
  await page.getByText('Searching the library…').waitFor();
  await page.getByRole('listbox').getByRole('option').waitFor();
  await input.press('ArrowDown');
  assert.equal(await page.getByRole('listbox').getByRole('option').getAttribute('aria-selected'),'true');
  await input.press('Escape');
  assert.equal(await page.getByRole('listbox').count(),0);
  assert.equal(await input.inputValue(),'Dune');
  await input.press('ArrowDown');
  assert.equal(await page.getByRole('listbox').count(),1);
  await page.getByRole('button',{name:'Clear search',exact:true}).click();
  assert.equal(await input.inputValue(),'');

  await input.fill('Dune');
  await page.waitForRequest(request => request.url().includes('/api/books/search') && new URL(request.url()).searchParams.get('q') === 'Dune');
  await input.fill('The Hobbit');
  await page.getByRole('listbox').getByRole('option').filter({hasText:'The Hobbit'}).waitFor();
  await pause(800);
  assert.equal(await page.getByRole('listbox').getByRole('option').filter({hasText:'Dune'}).count(),0,'A stale search response must not replace current results');
  await page.screenshot({path:join(artifacts,'results.png'),fullPage:true});
  await input.press('ArrowDown');
  await input.press('Enter');
  await page.waitForURL('**/?book_id=*');
  assert.equal(new URL(page.url()).searchParams.get('book_id'),hobbit.book_id);

  await page.goto(baseURL);
  await input.fill('missing-book');
  await page.getByText('No books found for “missing-book”.').waitFor();
  await input.fill('retry');
  await page.getByRole('button',{name:'Try again',exact:true}).waitFor();
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await page.getByRole('listbox').getByRole('option').waitFor();
  assert.equal(retryCalls,2);
  await input.press('Tab');
  await input.press('Tab');
  // Focus can move naturally through clear and example buttons; no trapped popup.
  await page.getByRole('button',{name:'Clear search',exact:true}).click();

  for (const [width,height] of [[375,812],[320,740],[768,1024],[812,375]]) {
    await page.setViewportSize({width,height});
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),`No horizontal overflow at ${width}`);
    assert.ok(await input.isVisible());
    if (width === 375) {
      await page.screenshot({path:join(artifacts,'mobile.png'),fullPage:true});
      await page.getByRole('button',{name:'The Hobbit',exact:true}).click();
      await page.getByRole('listbox').getByRole('option').waitFor();
      await page.screenshot({path:join(artifacts,'mobile-results.png'),fullPage:true});
      await page.getByRole('listbox').getByRole('option').click();
      await page.waitForURL('**/?book_id=*');
      await page.goto(baseURL);
    }
  }
  await page.setViewportSize({width:375,height:812});
  await page.evaluate(() => {document.documentElement.style.fontSize='200%';});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),'No overflow with larger text');
  await page.evaluate(() => {document.documentElement.style.fontSize='';});
  await page.goto(baseURL + '/graph');
  await page.getByRole('combobox', {name:'Search a book or author'}).fill('The Hobbit');
  await page.getByRole('listbox').getByRole('option').waitFor();
  assert.deepEqual(pageErrors, []);
  console.log('PASS: landing layout, examples, guest access, keyboard/touch selection, graph route, stale-response protection, empty/error/retry states, small screens, landscape, reduced motion, enlarged text, and shared graph search.');
  console.log('Screenshots:',artifacts);
  console.log('API responses in this check are fixtures. Live Fly.io availability is checked separately.');
} finally {
  await browser.close();
}
