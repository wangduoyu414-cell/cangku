export interface DaemonConfig {
    port: number;
    host: string;
    mcpPort: number;
    mcpHost: string;
}
export declare function startDaemon(config?: Partial<DaemonConfig>): Promise<void>;
//# sourceMappingURL=daemon.d.ts.map