import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const routesSource = readFileSync('src/lib/routes.ts', 'utf8');
const routePaths = [...routesSource.matchAll(/^\s+\w+: '(\/[^']*)',$/gm)].map(match => match[1]);

// "/" lives at src/app/(site)/page.tsx, "/packages/" at src/app/(site)/packages/page.tsx, and so on.
const pageFileFor = path => join('src/app/(site)', path, 'page.tsx');

function sourceFiles(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.tsx') ? [path] : [];
  });
}

test('every route in src/lib/routes.ts has a page', () => {
  assert.deepEqual(routePaths, ['/', '/packages/', '/how-it-works/', '/enquire/']);
  for (const path of routePaths) assert.ok(existsSync(pageFileFor(path)), `missing page for ${path}`);
});

test('every sub page sets its own title and canonical URL', () => {
  for (const path of routePaths.filter(path => path !== '/')) {
    const page = readFileSync(pageFileFor(path), 'utf8');
    assert.match(page, /title: '[^']+\| GEES CHILLS'/, `${path} has no title`);
    assert.match(page, /canonical: routes\.\w+/, `${path} has no canonical URL`);
    assert.match(page, /<h1 |<PageIntro /, `${path} has no main heading`);
  }
});

test('every in-page link points at an id that exists', () => {
  const files = [...sourceFiles('src/app/(site)'), ...sourceFiles('src/components')];
  const sources = files.map(file => [file, readFileSync(file, 'utf8')]);
  const ids = new Set(sources.flatMap(([, source]) => [...source.matchAll(/ id="([^"]+)"/g)].map(match => match[1])));
  for (const [file, source] of sources) {
    for (const [, target] of source.matchAll(/href="#([^"]*)"/g)) {
      // "#" is back to top; "#main" is the skip link target in the shared layout.
      if (target === '' || target === 'main') continue;
      assert.ok(ids.has(target), `${file} links to missing section #${target}`);
    }
  }
});

test('the sitemap lists every public page', () => {
  const sitemap = readFileSync('src/app/sitemap.ts', 'utf8');
  assert.match(sitemap, /publicPages\.map/);
});

test('isCurrentPage matches a path with or without its trailing slash', async () => {
  const { isCurrentPage, routes } = await import('../src/lib/routes.ts');
  assert.equal(isCurrentPage('/enquire', routes.enquire), true);
  assert.equal(isCurrentPage('/enquire/', routes.enquire), true);
  assert.equal(isCurrentPage('/', routes.home), true);
  assert.equal(isCurrentPage('/packages/', routes.enquire), false);
  // The home path must not count as a prefix of every other page.
  assert.equal(isCurrentPage('/', routes.packages), false);
  assert.equal(isCurrentPage(null, routes.home), false);
});

test('no FAQ question is repeated across pages', async () => {
  const { packageFaqs, enquiryFaqs } = await import('../src/lib/faqs.ts');
  const questions = [...packageFaqs, ...enquiryFaqs].map(item => item.question);
  assert.equal(new Set(questions).size, questions.length);
  for (const item of [...packageFaqs, ...enquiryFaqs]) assert.ok(item.answer.trim(), `${item.question} has no answer`);
});

test('Packages and How it works each end with a link to the other', () => {
  const packages = readFileSync(pageFileFor('/packages/'), 'utf8');
  const howItWorks = readFileSync(pageFileFor('/how-it-works/'), 'utf8');
  assert.match(packages, /<NextStep [^>]*href=\{routes\.howItWorks\}/);
  assert.match(howItWorks, /<NextStep [^>]*href=\{routes\.packages\}/);
});

test('the home page links to every sub page', () => {
  const home = readFileSync(pageFileFor('/'), 'utf8');
  for (const key of ['packages', 'howItWorks', 'enquire']) assert.match(home, new RegExp(`href: routes\\.${key}`), `home has no card for ${key}`);
});

test('the header keeps the page links visible on small screens', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  assert.doesNotMatch(css, /nav>a:not\(\.button\)\{display:none\}/);
});
