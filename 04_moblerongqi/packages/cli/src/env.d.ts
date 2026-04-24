export interface EnvConfig {
    browserHeadless: boolean;
    playwrightBrowsersPath: string;
    proxyMobile?: string;
    proxyResidential?: string;
    proxyAuth?: string;
    zsmsApiKey?: string;
    zsmsApiUrl?: string;
    osmsApiKey?: string;
    osmsApiUrl?: string;
    hsmsApiKey?: string;
    hsmsApiUrl?: string;
    vmosApiKey?: string;
    vmosApiUrl?: string;
    duoplusApiKey?: string;
    duoplusApiUrl?: string;
    databaseUrl?: string;
    redisUrl?: string;
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    mcpPort: number;
    mcpHost: string;
    apiPort: number;
    apiHost: string;
    apiKey?: string;
    sentryDsn?: string;
}
export declare function loadEnv(envPath?: string): EnvConfig;
export declare function getEnv(key: keyof EnvConfig, defaultValue?: string): string | undefined;
//# sourceMappingURL=env.d.ts.map