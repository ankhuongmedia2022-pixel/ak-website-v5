const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Public pages run at /ak-website-v5/ on GitHub Pages and / on Vercel.
test('local HTML links do not depend on Vercel-only routes', () => {
  const root = path.resolve(__dirname, '..');
  const issues = [];
  for (const page of fs.readdirSync(root).filter(p => p.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const match of html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
      const ref = match[1].trim();
      if (!ref || /^(?:#|https?:\/\/|mailto:|tel:|sms:|data:|javascript:)/i.test(ref)) continue;
      const file = ref.split(/[?#]/)[0];
      if (file.startsWith('/')) issues.push(page + ': root-relative ' + ref);
      else if (file && !fs.existsSync(path.resolve(root, file))) issues.push(page + ': missing ' + ref);
    }
  }
  assert.deepEqual(issues, []);
});
