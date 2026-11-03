import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('footer social links point at the GEES CHILLS accounts over https', () => {
  const site = readFileSync('src/lib/site.ts', 'utf8');
  assert.match(site, /url: "https:\/\/www\.instagram\.com\/geeschills_\/"/);
  assert.match(site, /url: "https:\/\/www\.tiktok\.com\/@geeschillsgh"/);
  const page = readFileSync('src/components/site-footer.tsx', 'utf8');
  assert.match(page, /className="footer-socials"/);
  assert.match(page, /rel="noopener noreferrer"/);
});
