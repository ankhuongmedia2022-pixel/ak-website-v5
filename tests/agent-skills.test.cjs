'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const skillsRoot = path.join(repoRoot, '.agents', 'skills');
const skillNames = [
  'using-agent-skills',
  'spec-driven-development',
  'frontend-ui-engineering',
  'code-review-and-quality',
  'security-and-hardening',
  'ponytail',
];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

for (const name of skillNames) {
  test(`${name}: skill file has valid identifying frontmatter`, () => {
    const skillPath = path.join(skillsRoot, name, 'SKILL.md');
    const content = fs.readFileSync(skillPath, 'utf8');
    const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    assert.ok(frontmatter, `${name} needs opening and closing YAML delimiters`);
    assert.ok(
      frontmatter[1].split(/\r?\n/).some((line) => line.trim() === `name: ${name}`),
      `${name} must declare its folder name in YAML frontmatter`,
    );
    assert.ok(content.length > frontmatter[0].length, `${name} needs a nonempty skill body`);
  });
}

test('required shared checklists and hardening reference exist', () => {
  const required = [
    '.agents/references/definition-of-done.md',
    '.agents/references/accessibility-checklist.md',
    '.agents/references/security-checklist.md',
    '.agents/references/performance-checklist.md',
    '.agents/skills/security-and-hardening/references/hardening-patterns.md',
  ];
  for (const file of required) {
    assert.ok(read(file).trim(), `${file} must exist and be nonempty`);
  }
});

test('agent instructions and upstream MIT licenses are present', () => {
  assert.match(read('AGENTS.md'), /\.agents\/skills/);
  assert.match(read('.agents/README.md'), /addyosmani\/agent-skills/);
  assert.match(read('.agents/README.md'), /DietrichGebert\/ponytail/);
  for (const file of [
    '.agents/licenses/agent-skills-LICENSE',
    '.agents/licenses/ponytail-LICENSE',
  ]) {
    assert.match(read(file), /^MIT License/);
  }
});
