export enum NodeStatus {
    ONLINE = 'ONLINE',
    OFFLINE = 'OFFLINE',
    FAULT = 'FAULT',
    MAINTENANCE = 'MAINTENANCE',
}

export enum StorageMode {
    CHARGING = 'CHARGING',
    DISCHARGING = 'DISCHARGING',
    IDLE = 'IDLE',
}

export interface GridNode {
    id: string;
    owner: string;
    capacity: number; // kW
    currentOutput: number; // kW
    status: NodeStatus;
    isGenerator: boolean; // true = DER, false = load
    location: string;
    lastHeartbeat: number;
    iotDeviceId?: string;
}

export interface EnergyStorage {
    id: string;
    nodeId: string;
    capacity: number; // kWh
    currentCharge: number; // kWh
    mode: StorageMode;
    chargeRate: number; // kW
    dischargeRate: number; // kW
    efficiency: number; // 0-1
}

export interface GridMetrics {
    timestamp: number;
    totalGeneration: number; // kW
    totalLoad: number; // kW
    netBalance: number; // kW (positive = surplus)
    frequency: number; // Hz (nominal 50/60)
    voltage: number; // V
    losses: number; // kW
    uptime: number; // percentage
}

export interface AutomatedResponse {
    id: string;
    trigger: string;
    action: string;
    executedAt: number;
    success: boolean;
}
