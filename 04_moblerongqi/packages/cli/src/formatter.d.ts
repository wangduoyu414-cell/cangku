import type { Account, ContainerMetrics } from '@creator-os/core';
import type { SimulationContainer } from '@creator-os/container';
import type { MCPTool } from '../../api/src/mcp/index.js';
export interface TableColumn {
    header: string;
    key: string;
    width?: number;
}
export declare function formatTable<T extends Record<string, unknown>>(rows: T[], columns: TableColumn[]): string;
export declare function formatJSON(data: unknown): string;
export declare function formatContainer(c: SimulationContainer): string;
export declare function formatAccount(a: Account): string;
export declare function formatMetrics(m: ContainerMetrics): string;
export declare function formatError(error: string | Error): string;
export declare function formatSuccess(message: string): string;
export declare function formatWarning(message: string): string;
export declare function formatInfo(message: string): string;
export declare function formatTask(task: {
    id: string;
    type: string;
    status: string;
    priority: number;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
}): string;
export declare function formatMCPTool(tool: MCPTool): string;
//# sourceMappingURL=formatter.d.ts.map