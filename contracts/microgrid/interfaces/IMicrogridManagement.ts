import { GridNode, EnergyStorage, GridMetrics, AutomatedResponse, NodeStatus, StorageMode } from '../structures/MicrogridStructs';

export interface IMicrogridManagement {
    registerNode(node: GridNode, caller: string): void;

    updateNodeOutput(nodeId: string, output: number, caller: string): void;

    setNodeStatus(nodeId: string, status: NodeStatus, caller: string): void;

    registerStorage(storage: EnergyStorage, caller: string): void;

    setStorageMode(storageId: string, mode: StorageMode, caller: string): void;

    balanceLoad(): GridMetrics;

    optimizeGrid(): number; // returns energy loss reduction percentage

    getGridMetrics(): GridMetrics;

    getNode(nodeId: string): GridNode;

    getStorage(storageId: string): EnergyStorage;

    getAutomatedResponses(limit: number): AutomatedResponse[];

    nodeHeartbeat(nodeId: string, output: number, caller: string): void;
}
