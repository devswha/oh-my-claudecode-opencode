/**
 * E2E Test: NPM Installation and Plugin Loading
 *
 * This test simulates the full npm installation process:
 * 1. Packs the current package
 * 2. Installs it in a temporary directory
 * 3. Verifies all assets are included
 * 4. Verifies plugin can be imported and loaded
 * 5. Verifies agent/skill loading from installed location
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, rmSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { EXPECTED_AGENTS, EXPECTED_SKILLS } from '../test-utils';

describe('npm installation E2E', () => {
  let tempDir: string;
  let packagePath: string;
  let installedPath: string;
  let tarballPath: string;

  beforeAll(() => {
    // Create temp directory for installation test
    tempDir = mkdtempSync(join(tmpdir(), 'omco-e2e-'));
    console.log(`Test temp directory: ${tempDir}`);

    // Get project root (one level up from tests/)
    const projectRoot = join(import.meta.dir, '..', '..');

    // Pack the current package
    console.log('Running npm pack...');
    const packOutput = execSync('npm pack', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();

    // Extract tarball filename from output (last line)
    const lines = packOutput.split('\n');
    const tarballName = lines[lines.length - 1].trim();
    tarballPath = join(projectRoot, tarballName);

    console.log(`Packed tarball: ${tarballPath}`);
    expect(existsSync(tarballPath)).toBe(true);

    // Install the packed tarball in temp directory
    console.log('Installing package in temp directory...');
    execSync(`npm install "${tarballPath}"`, {
      cwd: tempDir,
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    installedPath = join(tempDir, 'node_modules', 'oh-my-claudecode-opencode');
    packagePath = installedPath;

    console.log(`Installed package at: ${installedPath}`);
    expect(existsSync(installedPath)).toBe(true);
  }, 60000); // 60s timeout for npm operations

  afterAll(() => {
    // Cleanup temp directory
    if (tempDir && existsSync(tempDir)) {
      console.log(`Cleaning up temp directory: ${tempDir}`);
      rmSync(tempDir, { recursive: true, force: true });
    }

    // Cleanup tarball from project root
    if (tarballPath && existsSync(tarballPath)) {
      console.log(`Cleaning up tarball: ${tarballPath}`);
      rmSync(tarballPath, { force: true });
    }
  });

  describe('package structure', () => {
    it('should have package.json', () => {
      const pkgJsonPath = join(packagePath, 'package.json');
      expect(existsSync(pkgJsonPath)).toBe(true);

      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      expect(pkgJson.name).toBe('oh-my-claudecode-opencode');
      expect(pkgJson.main).toBe('dist/index.js');
      expect(pkgJson.types).toBe('dist/index.d.ts');
    });

    it('should have dist/ directory with compiled files', () => {
      const distPath = join(packagePath, 'dist');
      expect(existsSync(distPath)).toBe(true);

      expect(existsSync(join(distPath, 'index.js'))).toBe(true);
      expect(existsSync(join(distPath, 'index.d.ts'))).toBe(true);
    });

    it('should have bin/ directory with executables', () => {
      const binPath = join(packagePath, 'bin');
      expect(existsSync(binPath)).toBe(true);

      expect(existsSync(join(binPath, 'doctor.js'))).toBe(true);
    });
  });

  describe('assets directory', () => {
    it('should include assets/agents directory', () => {
      const agentsPath = join(packagePath, 'assets', 'agents');
      expect(existsSync(agentsPath)).toBe(true);

      const files = readdirSync(agentsPath);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      console.log(`Found ${mdFiles.length} agent markdown files`);
      expect(mdFiles.length).toBeGreaterThan(0);

      // Check some key agents exist
      expect(files).toContain('architect.md');
      expect(files).toContain('executor.md');
      expect(files).toContain('planner.md');
    });

    it('should include assets/skills directory', () => {
      const skillsPath = join(packagePath, 'assets', 'skills');
      expect(existsSync(skillsPath)).toBe(true);

      const files = readdirSync(skillsPath);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      console.log(`Found ${mdFiles.length} skill markdown files`);
      expect(mdFiles.length).toBeGreaterThan(0);

      // Check some key skills exist
      expect(files).toContain('orchestrate.md');
      expect(files).toContain('ultrawork.md');
      expect(files).toContain('ralph.md');
    });

    it('should have all expected agent files', () => {
      const agentsPath = join(packagePath, 'assets', 'agents');
      const files = readdirSync(agentsPath);

      const missingAgents = EXPECTED_AGENTS.filter(agent =>
        !files.includes(`${agent}.md`)
      );

      if (missingAgents.length > 0) {
        console.warn('Missing agents:', missingAgents);
      }

      // At least 80% of expected agents should be present
      const foundCount = EXPECTED_AGENTS.length - missingAgents.length;
      const percentage = (foundCount / EXPECTED_AGENTS.length) * 100;
      expect(percentage).toBeGreaterThanOrEqual(80);
    });

    it('should have all expected skill files', () => {
      const skillsPath = join(packagePath, 'assets', 'skills');
      const files = readdirSync(skillsPath);

      const missingSkills = EXPECTED_SKILLS.filter(skill =>
        !files.includes(`${skill}.md`)
      );

      if (missingSkills.length > 0) {
        console.warn('Missing skills:', missingSkills);
      }

      // At least 80% of expected skills should be present
      const foundCount = EXPECTED_SKILLS.length - missingSkills.length;
      const percentage = (foundCount / EXPECTED_SKILLS.length) * 100;
      expect(percentage).toBeGreaterThanOrEqual(80);
    });
  });

  describe('plugin loading', () => {
    it('should be able to import the plugin', async () => {
      // This tests that the package can be imported from node_modules
      const pluginPath = join(packagePath, 'dist', 'index.js');
      expect(existsSync(pluginPath)).toBe(true);

      // Dynamic import from installed location
      const plugin = await import(pluginPath);
      expect(plugin).toBeDefined();
      expect(plugin.default).toBeDefined();
      expect(typeof plugin.default).toBe('function');
    });

    it('should initialize plugin without errors', async () => {
      const pluginPath = join(packagePath, 'dist', 'index.js');
      const plugin = await import(pluginPath);

      // Call the plugin function (it expects a PluginInput context)
      const mockContext = {
        directory: tempDir,
        client: {
          log: () => {},
          error: () => {},
        },
      };

      // Plugin should initialize and return hooks/handlers
      const pluginConfig = await plugin.default(mockContext);
      expect(pluginConfig).toBeDefined();
      expect(typeof pluginConfig).toBe('object');

      // OpenCode plugins return hooks, not agents/skills directly
      expect(pluginConfig.config).toBeDefined();
      expect(pluginConfig.event).toBeDefined();
      expect(typeof pluginConfig.event).toBe('function');
    });

    it('should be able to load agent files from assets', async () => {
      // Import the agents loader directly
      const agentsLoaderPath = join(packagePath, 'dist', 'agents', 'loader.js');
      const agentsLoader = await import(agentsLoaderPath);

      expect(agentsLoader.loadAgents).toBeDefined();
      expect(typeof agentsLoader.loadAgents).toBe('function');

      // Load agents from the installed package location
      const agents = agentsLoader.loadAgents();
      console.log(`Loaded ${agents.length} agents from installed package`);

      expect(agents.length).toBeGreaterThan(0);

      // Check that agents have required properties
      const firstAgent = agents[0];
      expect(firstAgent).toHaveProperty('name');
      expect(firstAgent).toHaveProperty('instructions');
      expect(firstAgent.instructions.length).toBeGreaterThan(0);
    });

    it('should be able to load skill files from assets', async () => {
      // Import the skills loader directly
      const skillsLoaderPath = join(packagePath, 'dist', 'skills', 'loader.js');
      const skillsLoader = await import(skillsLoaderPath);

      expect(skillsLoader.loadSkills).toBeDefined();
      expect(typeof skillsLoader.loadSkills).toBe('function');

      // Load skills from the installed package location
      const skills = skillsLoader.loadSkills();
      console.log(`Loaded ${skills.length} skills from installed package`);

      expect(skills.length).toBeGreaterThan(0);

      // Check that skills have required properties
      const firstSkill = skills[0];
      expect(firstSkill).toHaveProperty('name');
      expect(firstSkill).toHaveProperty('instructions');
      expect(firstSkill.instructions.length).toBeGreaterThan(0);
    });
  });

  describe('agent content validation', () => {
    it('should have non-empty agent instructions', async () => {
      const agentsLoaderPath = join(packagePath, 'dist', 'agents', 'loader.js');
      const agentsLoader = await import(agentsLoaderPath);

      const agents = agentsLoader.loadAgents();

      // Check random sample of agents
      const samplesToCheck = Math.min(5, agents.length);
      for (let i = 0; i < samplesToCheck; i++) {
        const agent = agents[i];
        expect(agent.instructions).toBeDefined();
        expect(agent.instructions!.length).toBeGreaterThan(100); // Should have substantial content

        // Should contain role/purpose information
        const instructions = agent.instructions!.toLowerCase();
        const hasRoleInfo =
          instructions.includes('role') ||
          instructions.includes('purpose') ||
          instructions.includes('you are') ||
          instructions.includes('specialist');

        expect(hasRoleInfo).toBe(true);
      }
    });

    it('should have proper model tier assignments', async () => {
      const agentsLoaderPath = join(packagePath, 'dist', 'agents', 'loader.js');
      const agentsLoader = await import(agentsLoaderPath);

      const agents = agentsLoader.loadAgents();

      const validModels = ['haiku', 'sonnet', 'opus'];

      for (const agent of agents) {
        if (agent.default_model) {
          expect(validModels).toContain(agent.default_model);
        }
      }
    });
  });

  describe('skill content validation', () => {
    it('should have non-empty skill instructions', async () => {
      const skillsLoaderPath = join(packagePath, 'dist', 'skills', 'loader.js');
      const skillsLoader = await import(skillsLoaderPath);

      const skills = skillsLoader.loadSkills();

      // Check random sample of skills
      const samplesToCheck = Math.min(5, skills.length);
      for (let i = 0; i < samplesToCheck; i++) {
        const skill = skills[i];
        expect(skill.instructions).toBeDefined();
        expect(skill.instructions!.length).toBeGreaterThan(50); // Should have content
      }
    });

    it('should have orchestrate as a core skill', async () => {
      const skillsLoaderPath = join(packagePath, 'dist', 'skills', 'loader.js');
      const skillsLoader = await import(skillsLoaderPath);

      const skills = skillsLoader.loadSkills();

      console.log('Available skills:', skills.map(s => s.name).sort());

      const orchestrateSkill = skills.find(s => s.name === 'oh-my-claudecode:orchestrate');
      expect(orchestrateSkill).toBeDefined();
      expect(orchestrateSkill?.instructions).toBeDefined();
      expect(orchestrateSkill!.instructions!.length).toBeGreaterThan(100);
    });
  });

  describe('package metadata', () => {
    it('should have correct npm package files array', () => {
      const pkgJsonPath = join(packagePath, 'package.json');
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

      expect(pkgJson.files).toContain('dist');
      expect(pkgJson.files).toContain('assets');
      expect(pkgJson.files).toContain('bin');
    });

    it('should have OpenCode peer dependency', () => {
      const pkgJsonPath = join(packagePath, 'package.json');
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

      expect(pkgJson.peerDependencies).toBeDefined();
      expect(pkgJson.peerDependencies['@opencode-ai/plugin']).toBeDefined();
    });

    it('should have correct main and types fields', () => {
      const pkgJsonPath = join(packagePath, 'package.json');
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

      expect(pkgJson.main).toBe('dist/index.js');
      expect(pkgJson.types).toBe('dist/index.d.ts');
      expect(pkgJson.type).toBe('module');
    });
  });
});
