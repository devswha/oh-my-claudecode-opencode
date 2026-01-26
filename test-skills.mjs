import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const pluginDir = process.env.HOME + '/.config/opencode/node_modules/oh-my-claudecode-opencode';
const skillsDir = join(pluginDir, 'assets/skills');

// Simulate the loader.ts logic
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, body: content };
  }

  const [, yamlContent, body] = match;
  const metadata = {};

  const lines = yamlContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    // Convert kebab-case to camelCase
    const camelKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    if (value === 'true') {
      metadata[camelKey] = true;
    } else if (value === 'false') {
      metadata[camelKey] = false;
    } else {
      metadata[camelKey] = value.replace(/^["']|["']$/g, '');
    }
  }

  return { metadata, body };
}

// Load all skills
const files = readdirSync(skillsDir).filter(f => f.endsWith('.md'));
console.log('Total skill files:', files.length);
console.log('');

const invocableSkills = [];

for (const file of files) {
  const content = readFileSync(join(skillsDir, file), 'utf-8');
  const { metadata } = parseFrontmatter(content);

  if (metadata.userInvocable === true) {
    invocableSkills.push(metadata.name);
  }
}

console.log('User-invocable skills:', invocableSkills.length);
console.log('');
console.log('Has version?', invocableSkills.includes('version'));
console.log('');

// Check version.md specifically
const versionContent = readFileSync(join(skillsDir, 'version.md'), 'utf-8');
const { metadata: versionMeta } = parseFrontmatter(versionContent);
console.log('version.md metadata:', JSON.stringify(versionMeta, null, 2));
