#!/usr/bin/env node

// bin/doctor.ts
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
var OPENCODE_CONFIG_DIR = path.join(os.homedir(), ".config", "opencode");
var PLUGIN_NAME = "oh-my-claudecode-opencode";
function checkPluginInstalled() {
  const pluginPath = path.join(OPENCODE_CONFIG_DIR, "node_modules", PLUGIN_NAME);
  try {
    const stats = fs.statSync(pluginPath);
    if (stats.isDirectory()) {
      const pkgPath = path.join(pluginPath, "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        return {
          status: "OK",
          message: `Plugin installed (v${pkg.version})`,
          details: pluginPath
        };
      }
      return {
        status: "WARN",
        message: "Plugin directory exists but package.json missing",
        details: pluginPath,
        fix: "Run: cd ~/.config/opencode && npm install oh-my-claudecode-opencode@latest"
      };
    }
  } catch (e) {}
  return {
    status: "FAIL",
    message: "Plugin not installed",
    fix: "Run: cd ~/.config/opencode && npm install oh-my-claudecode-opencode"
  };
}
function checkPluginInConfig() {
  const configPath = path.join(OPENCODE_CONFIG_DIR, "opencode.json");
  try {
    if (!fs.existsSync(configPath)) {
      return {
        status: "FAIL",
        message: "opencode.json not found",
        fix: `Create ${configPath} with: { "plugin": ["oh-my-claudecode-opencode"] }`
      };
    }
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const plugins = config.plugin || config.plugins || [];
    if (Array.isArray(plugins) && plugins.includes(PLUGIN_NAME)) {
      return {
        status: "OK",
        message: "Plugin registered in opencode.json",
        details: `plugins: ${JSON.stringify(plugins)}`
      };
    }
    return {
      status: "FAIL",
      message: "Plugin not in opencode.json plugin array",
      details: `Current plugins: ${JSON.stringify(plugins)}`,
      fix: `Add "${PLUGIN_NAME}" to the "plugin" array in opencode.json`
    };
  } catch (e) {
    return {
      status: "FAIL",
      message: `Failed to parse opencode.json: ${e.message}`,
      fix: "Check opencode.json for JSON syntax errors"
    };
  }
}
function checkAssetsPresent() {
  const pluginPath = path.join(OPENCODE_CONFIG_DIR, "node_modules", PLUGIN_NAME);
  const assetsPath = path.join(pluginPath, "assets", "agents");
  try {
    if (!fs.existsSync(assetsPath)) {
      return {
        status: "FAIL",
        message: "Assets directory missing",
        details: `Expected: ${assetsPath}`,
        fix: "Reinstall: cd ~/.config/opencode && npm install oh-my-claudecode-opencode@latest"
      };
    }
    const agentFiles = fs.readdirSync(assetsPath).filter((f) => f.endsWith(".md"));
    if (agentFiles.length === 0) {
      return {
        status: "FAIL",
        message: "No agent files in assets/agents/",
        fix: "Reinstall: cd ~/.config/opencode && npm install oh-my-claudecode-opencode@latest"
      };
    }
    return {
      status: "OK",
      message: `Found ${agentFiles.length} agent definitions`,
      details: agentFiles.slice(0, 5).join(", ") + (agentFiles.length > 5 ? "..." : "")
    };
  } catch (e) {
    return {
      status: "FAIL",
      message: `Failed to check assets: ${e.message}`,
      fix: "Check filesystem permissions"
    };
  }
}
function checkPackageDependency() {
  const pkgPath = path.join(OPENCODE_CONFIG_DIR, "package.json");
  try {
    if (!fs.existsSync(pkgPath)) {
      return {
        status: "WARN",
        message: "No package.json in ~/.config/opencode/",
        details: "Plugin may have been installed globally or manually",
        fix: "Initialize: cd ~/.config/opencode && npm init -y && npm install oh-my-claudecode-opencode"
      };
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps[PLUGIN_NAME]) {
      return {
        status: "OK",
        message: `Listed in package.json: ${deps[PLUGIN_NAME]}`,
        details: pkgPath
      };
    }
    return {
      status: "WARN",
      message: "Plugin not in package.json dependencies",
      details: "Plugin may work but won't survive npm prune",
      fix: "Run: cd ~/.config/opencode && npm install oh-my-claudecode-opencode --save"
    };
  } catch (e) {
    return {
      status: "WARN",
      message: `Failed to parse package.json: ${e.message}`,
      fix: "Check package.json for JSON syntax errors"
    };
  }
}
function checkOmcoConfig() {
  const localConfig = path.join(process.cwd(), ".opencode", "omco.json");
  const globalConfig = path.join(OPENCODE_CONFIG_DIR, "omco.json");
  const configPaths = [localConfig, globalConfig];
  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        return {
          status: "OK",
          message: "OMCO config found and valid",
          details: configPath
        };
      } catch (e) {
        return {
          status: "FAIL",
          message: `Invalid JSON in omco.json`,
          details: configPath,
          fix: "Fix JSON syntax errors in omco.json"
        };
      }
    }
  }
  return {
    status: "OK",
    message: "No omco.json (using defaults)",
    details: "Optional: create .opencode/omco.json for custom config"
  };
}
function runDiagnostics() {
  const checks = {
    pluginInstalled: checkPluginInstalled(),
    pluginInConfig: checkPluginInConfig(),
    assetsPresent: checkAssetsPresent(),
    packageDependency: checkPackageDependency(),
    omcoConfigValid: checkOmcoConfig()
  };
  const values = Object.values(checks);
  const summary = {
    total: values.length,
    ok: values.filter((c) => c.status === "OK").length,
    warn: values.filter((c) => c.status === "WARN").length,
    fail: values.filter((c) => c.status === "FAIL").length
  };
  const recommendations = [];
  for (const check of values) {
    if (check.fix && check.status !== "OK") {
      recommendations.push(check.fix);
    }
  }
  let omcoVersion = null;
  const pluginPkgPath = path.join(OPENCODE_CONFIG_DIR, "node_modules", PLUGIN_NAME, "package.json");
  if (fs.existsSync(pluginPkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pluginPkgPath, "utf-8"));
      omcoVersion = pkg.version;
    } catch {}
  }
  return {
    timestamp: new Date().toISOString(),
    omcoVersion,
    nodeVersion: process.version,
    platform: process.platform,
    installPath: path.join(OPENCODE_CONFIG_DIR, "node_modules", PLUGIN_NAME),
    checks,
    summary,
    recommendations
  };
}
function formatTextReport(report) {
  const lines = [];
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                    OMCO Doctor Report                         ");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`Timestamp:    ${report.timestamp}`);
  lines.push(`OMCO Version: ${report.omcoVersion || "NOT INSTALLED"}`);
  lines.push(`Node Version: ${report.nodeVersion}`);
  lines.push(`Platform:     ${report.platform}`);
  lines.push("");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("                    Diagnostic Checks                          ");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  const statusIcon = (s) => s === "OK" ? "✓" : s === "WARN" ? "⚠" : "✗";
  for (const [name, check] of Object.entries(report.checks)) {
    const icon = statusIcon(check.status);
    lines.push(`[${icon}] ${check.status.padEnd(4)} | ${name}`);
    lines.push(`         ${check.message}`);
    if (check.details) {
      lines.push(`         Details: ${check.details}`);
    }
    lines.push("");
  }
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push(`Summary: ${report.summary.ok} OK, ${report.summary.warn} WARN, ${report.summary.fail} FAIL`);
  lines.push("───────────────────────────────────────────────────────────────");
  if (report.recommendations.length > 0) {
    lines.push("");
    lines.push("Recommended Fixes:");
    for (let i = 0;i < report.recommendations.length; i++) {
      lines.push(`  ${i + 1}. ${report.recommendations[i]}`);
    }
  }
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");
  return lines.join(`
`);
}
var args = process.argv.slice(2);
var jsonOutput = args.includes("--json");
var outputIndex = args.indexOf("--output");
var outputFile = outputIndex !== -1 ? args[outputIndex + 1] : null;
var report = runDiagnostics();
var output = jsonOutput ? JSON.stringify(report, null, 2) : formatTextReport(report);
if (outputFile) {
  fs.writeFileSync(outputFile, output);
  console.log(`Report saved to: ${outputFile}`);
} else {
  console.log(output);
}
if (report.summary.fail > 0) {
  process.exit(1);
} else if (report.summary.warn > 0) {
  process.exit(2);
} else {
  process.exit(0);
}
