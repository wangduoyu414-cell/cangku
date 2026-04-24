// Environment setup and validation
import dotenv from 'dotenv';
import chalk from 'chalk';
import { resolve, isAbsolute } from 'path';
import { cwd } from 'process';
const REQUIRED_ENV_VARS = [];
const OPTIONAL_ENV_VARS = [
    'browserHeadless',
    'playwrightBrowsersPath',
    'proxyMobile',
    'proxyResidential',
    'proxyAuth',
    'zsmsApiKey',
    'zsmsApiUrl',
    'osmsApiKey',
    'osmsApiUrl',
    'hsmsApiKey',
    'hsmsApiUrl',
    'vmosApiKey',
    'vmosApiUrl',
    'duoplusApiKey',
    'duoplusApiUrl',
    'databaseUrl',
    'redisUrl',
    'openaiApiKey',
    'openaiBaseUrl',
    'apiKey',
    'sentryDsn',
];
export function loadEnv(envPath) {
    const path = envPath ?? (isAbsolute('.env') ? '.env' : resolve(cwd(), '.env'));
    try {
        dotenv.config({ path });
    }
    catch {
        console.warn(chalk.yellow(`⚠ Could not load .env from ${path}, continuing with defaults`));
    }
    const env = parseEnv();
    validateEnv(env);
    return env;
}
function parseEnv() {
    return {
        // Boolean with string fallback
        browserHeadless: process.env.BROWSER_HEADLESS === 'true',
        playwrightBrowsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH ?? './playwright-browsers',
        // Proxies
        proxyMobile: process.env.PROXY_MOBILE || undefined,
        proxyResidential: process.env.PROXY_RESIDENTIAL || undefined,
        proxyAuth: process.env.PROXY_AUTH || undefined,
        // SMS
        zsmsApiKey: process.env.ZSMS_API_KEY || undefined,
        zsmsApiUrl: process.env.ZSMS_API_URL || undefined,
        osmsApiKey: process.env.OSMS_API_KEY || undefined,
        osmsApiUrl: process.env.OSMS_API_URL || undefined,
        hsmsApiKey: process.env.HSMS_API_KEY || undefined,
        hsmsApiUrl: process.env.HSMS_API_URL || undefined,
        // Cloud Phone
        vmosApiKey: process.env.VMOS_API_KEY || undefined,
        vmosApiUrl: process.env.VMOS_API_URL || undefined,
        duoplusApiKey: process.env.DUOPLUS_API_KEY || undefined,
        duoplusApiUrl: process.env.DUOPLUS_API_URL || undefined,
        // Database
        databaseUrl: process.env.DATABASE_URL || undefined,
        redisUrl: process.env.REDIS_URL || undefined,
        // AI
        openaiApiKey: process.env.OPENAI_API_KEY || undefined,
        openaiBaseUrl: process.env.OPENAI_BASE_URL || undefined,
        // MCP
        mcpPort: parseInt(process.env.MCP_PORT ?? '3001', 10),
        mcpHost: process.env.MCP_HOST ?? '0.0.0.0',
        // REST API
        apiPort: parseInt(process.env.API_PORT ?? '3000', 10),
        apiHost: process.env.API_HOST ?? '0.0.0.0',
        apiKey: process.env.API_KEY || undefined,
        // Monitoring
        sentryDsn: process.env.SENTRY_DSN || undefined,
    };
}
function validateEnv(env) {
    const errors = [];
    for (const key of REQUIRED_ENV_VARS) {
        if (!env[key]) {
            errors.push(`Missing required environment variable: ${key}`);
        }
    }
    if (errors.length > 0) {
        console.error(chalk.red('✗ Environment validation failed:'));
        errors.forEach((e) => console.error(`  - ${e}`));
        process.exit(1);
    }
    const warnings = [];
    for (const key of OPTIONAL_ENV_VARS) {
        if (!env[key]) {
            const prettyName = key.replace(/([A-Z])/g, '_$1').toUpperCase();
            warnings.push(`${prettyName} (optional)`);
        }
    }
    if (warnings.length > 0 && process.env.NODE_ENV === 'production') {
        console.warn(chalk.yellow('⚠ Missing optional environment variables:'));
        warnings.forEach((w) => console.warn(`  - ${w}`));
    }
}
export function getEnv(key, defaultValue) {
    return process.env[key] ?? defaultValue;
}
//# sourceMappingURL=env.js.map