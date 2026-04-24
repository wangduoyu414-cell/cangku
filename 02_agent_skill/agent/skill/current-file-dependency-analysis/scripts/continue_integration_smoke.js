#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const SKILL_ROOT = path.resolve(__dirname, "..");
const DEFAULT_CONFIG_ROOT = "C:\\Users\\admin\\.continue";
const DEFAULT_FILE = path.join(SKILL_ROOT, "src", "app", "services", "orderApi.ts");
const DEFAULT_REPO_ROOT = SKILL_ROOT;
const DEFAULT_OUTPUT = path.join(SKILL_ROOT, "tmp", "continue_integration_smoke_report.json");

function parseArgs(argv) {
  const options = {
    configRoot: DEFAULT_CONFIG_ROOT,
    filePath: DEFAULT_FILE,
    repoRoot: DEFAULT_REPO_ROOT,
    outputPath: DEFAULT_OUTPUT,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--config-root" && next) {
      options.configRoot = next;
      i += 1;
    } else if (arg === "--file" && next) {
      options.filePath = next;
      i += 1;
    } else if (arg === "--repo-root" && next) {
      options.repoRoot = next;
      i += 1;
    } else if (arg === "--output" && next) {
      options.outputPath = next;
      i += 1;
    }
  }

  return options;
}

function execCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        cwd,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          const failure = new Error(stderr || stdout || error.message);
          failure.cause = error;
          reject(failure);
          return;
        }
        resolve([stdout, stderr]);
      },
    );
  });
}

async function compileContinueConfig(configRoot) {
  const tsconfigPath = path.join(configRoot, "tsconfig.json");
  await execCommand(`tsc -p "${tsconfigPath}" --ignoreDeprecations 6.0`, configRoot);
  return path.join(configRoot, "out", "config.js");
}

function loadModifyConfig(configJsPath) {
  const source = fs.readFileSync(configJsPath, "utf8");
  const modules = {};
  const previousSystem = global.System;

  global.System = {
    register(name, deps, declare) {
      const exported = {};
      const exporter = (nameOrMap, value) => {
        if (typeof nameOrMap === "string") {
          exported[nameOrMap] = value;
          return;
        }
        Object.assign(exported, nameOrMap);
      };
      const declared = declare(exporter, { id: name });
      if (declared && typeof declared.execute === "function") {
        declared.execute();
      }
      modules[name] = exported;
    },
  };

  try {
    eval(source);
  } finally {
    global.System = previousSystem;
  }

  if (!modules.config || typeof modules.config.modifyConfig !== "function") {
    throw new Error("Failed to load modifyConfig from compiled Continue config.");
  }
  return modules.config.modifyConfig;
}

function createIde(filePath, repoRoot) {
  return {
    async getCurrentFile() {
      return {
        path: filePath,
        isUntitled: false,
      };
    },
    async getGitRootPath() {
      return repoRoot;
    },
    async subprocess(command, cwd) {
      return execCommand(command, cwd);
    },
  };
}

function createUnsavedIde(repoRoot) {
  return {
    async getCurrentFile() {
      return {
        path: "",
        isUntitled: true,
      };
    },
    async getGitRootPath() {
      return repoRoot;
    },
    async subprocess(command, cwd) {
      return execCommand(command, cwd);
    },
  };
}

async function collectSlashOutput(command, sdk) {
  const messages = [];
  for await (const chunk of command.run(sdk)) {
    if (typeof chunk === "string" && chunk.length > 0) {
      messages.push(chunk);
    }
  }
  return messages;
}

function parseContextItemContent(item) {
  if (!item || typeof item.content !== "string" || item.content.length === 0) {
    return null;
  }
  return JSON.parse(item.content);
}

async function runSmoke(options) {
  const configJsPath = await compileContinueConfig(options.configRoot);
  const modifyConfig = loadModifyConfig(configJsPath);
  const finalConfig = modifyConfig({
    slashCommands: [],
    contextProviders: [],
  });

  const depsctxCommand = (finalConfig.slashCommands || []).find(
    (command) => command.name === "depsctx",
  );
  const depsctxProvider = (finalConfig.contextProviders || []).find(
    (provider) => provider.title === "depsctx",
  );

  if (!depsctxCommand) {
    throw new Error("depsctx slash command not found in modified config.");
  }
  if (!depsctxProvider) {
    throw new Error("depsctx context provider not found in modified config.");
  }

  const contextItems = [];
  const slashSdk = {
    ide: createIde(options.filePath, options.repoRoot),
    llm: {},
    addContextItem(item) {
      contextItems.push(item);
    },
    history: [],
    input: "feature auto evidence pretty",
    params: undefined,
    contextItems: [],
    selectedCode: [],
    config: finalConfig,
    fetch: async () => {
      throw new Error("fetch is not expected in depsctx smoke test");
    },
  };

  const slashMessages = await collectSlashOutput(depsctxCommand, slashSdk);
  const slashPacket = parseContextItemContent(contextItems[0]);

  const providerItems = await depsctxProvider.getContextItems("review pretty", {
    config: finalConfig,
    fullInput: "@depsctx review pretty",
    embeddingsProvider: {},
    reranker: undefined,
    llm: {},
    ide: createIde(options.filePath, options.repoRoot),
    selectedCode: [],
    fetch: async () => {
      throw new Error("fetch is not expected in depsctx smoke test");
    },
  });
  const providerPacket = parseContextItemContent(providerItems[0]);

  const unsavedSlashMessages = await collectSlashOutput(depsctxCommand, {
    ...slashSdk,
    ide: createUnsavedIde(options.repoRoot),
  });
  const unsavedProviderItems = await depsctxProvider.getContextItems("safe-default", {
    config: finalConfig,
    fullInput: "@depsctx safe-default",
    embeddingsProvider: {},
    reranker: undefined,
    llm: {},
    ide: createUnsavedIde(options.repoRoot),
    selectedCode: [],
    fetch: async () => {
      throw new Error("fetch is not expected in depsctx smoke test");
    },
  });

  const report = {
    generated_at: new Date().toISOString(),
    config_root: options.configRoot,
    compiled_config_js: configJsPath,
    file_path: options.filePath,
    repo_root: options.repoRoot,
    slash_command: {
      messages: slashMessages,
      context_item_count: contextItems.length,
      item_name: contextItems[0]?.name ?? "",
      packet_kind: slashPacket?.packet_kind ?? "",
      packet_target: slashPacket?.target?.file ?? "",
      analysis_state: slashPacket?.target?.analysis_state ?? "",
    },
    context_provider: {
      item_count: providerItems.length,
      item_name: providerItems[0]?.name ?? "",
      packet_kind: providerPacket?.packet_kind ?? "",
      packet_target: providerPacket?.target?.file ?? "",
      analysis_state: providerPacket?.target?.analysis_state ?? "",
    },
    unsaved_file_paths: {
      slash_messages: unsavedSlashMessages,
      provider_items: unsavedProviderItems,
    },
  };

  const failures = [];
  if (contextItems.length !== 1) {
    failures.push(`Expected 1 slash context item, got ${contextItems.length}.`);
  }
  if (slashPacket?.packet_kind !== "auto_expand_bundle") {
    failures.push(`Expected slash packet_kind auto_expand_bundle, got ${slashPacket?.packet_kind || "<missing>"}.`);
  }
  if (slashPacket?.target?.file !== path.relative(options.repoRoot, options.filePath).replace(/\\/g, "/")) {
    failures.push("Slash packet target file does not match the requested file.");
  }
  if (providerItems.length !== 1) {
    failures.push(`Expected 1 provider item, got ${providerItems.length}.`);
  }
  if (providerPacket?.packet_kind !== "first_batch") {
    failures.push(`Expected provider packet_kind first_batch, got ${providerPacket?.packet_kind || "<missing>"}.`);
  }
  if (!Array.isArray(unsavedSlashMessages) || unsavedSlashMessages.length === 0) {
    failures.push("Expected slash command unsaved-file path to emit a user-facing message.");
  }
  if (!Array.isArray(unsavedProviderItems) || unsavedProviderItems.length !== 1) {
    failures.push("Expected provider unsaved-file path to return exactly one error item.");
  }

  report.failures = failures;
  report.status = failures.length === 0 ? "pass" : "fail";
  return report;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  try {
    const report = await runSmoke(options);
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({
      output: options.outputPath,
      status: report.status,
      failures: report.failures,
    }, null, 2));
    if (report.status !== "pass") {
      process.exitCode = 1;
    }
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}

main();
