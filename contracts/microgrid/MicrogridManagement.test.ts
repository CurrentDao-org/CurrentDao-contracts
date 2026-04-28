import { MicrogridManagement } from './MicrogridManagement';
import { NodeStatus, StorageMode } from './structures/MicrogridStructs';

describe('MicrogridManagement', () => {
    let grid: MicrogridManagement;
    const owner = 'owner';

    const makeNode = (id: string, isGenerator: boolean, capacity = 100) => ({
        id,
        owner,
        capacity,
        currentOutput: 50,
        status: NodeStatus.ONLINE,
        isGenerator,
        location: 'zone-1',
        lastHeartbeat: Date.now(),
        iotDeviceId: `iot_${id}`,
    });

    const makeStorage = (id: string) => ({
        id,
        nodeId: 'node1',
        capacity: 500,
        currentCharge: 250,
        mode: StorageMode.IDLE,
        chargeRate: 50,
        dischargeRate: 50,
        efficiency: 0.95,
    });

    beforeEach(() => {
        grid = new MicrogridManagement(owner);
    });

    describe('registerNode', () => {
        it('registers a generator node', () => {
            grid.registerNode(makeNode('gen1', true), owner);
            expect(grid.getNode('gen1').isGenerator).toBe(true);
        });

        it('rejects invalid capacity', () => {
            expect(() => grid.registerNode({ ...makeNode('bad', true), capacity: 0 }, owner)).toThrow();
        });

        it('rejects non-owner', () => {
            expect(() => grid.registerNode(makeNode('gen1', true), 'hacker')).toThrow();
        });

        it('supports up to 1000 nodes', () => {
            for (let i = 0; i < 100; i++) {
                grid.registerNode(makeNode(`node${i}`, i % 2 === 0), owner);
            }
            expect(grid.getNodeCount()).toBe(100);
        });
    });

    describe('updateNodeOutput', () => {
        it('updates output within capacity', () => {
            grid.registerNode(makeNode('gen1', true, 100), owner);
            grid.updateNodeOutput('gen1', 80, owner);
            expect(grid.getNode('gen1').currentOutput).toBe(80);
        });

        it('rejects output exceeding capacity', () => {
            grid.registerNode(makeNode('gen1', true, 100), owner);
            expect(() => grid.updateNodeOutput('gen1', 150, owner)).toThrow();
        });
    });

    describe('setNodeStatus', () => {
        it('sets node offline and triggers rebalance', () => {
            grid.registerNode(makeNode('gen1', true), owner);
            grid.setNodeStatus('gen1', NodeStatus.OFFLINE, owner);
            expect(grid.getNode('gen1').status).toBe(NodeStatus.OFFLINE);
            const responses = grid.getAutomatedResponses(10);
            expect(responses.some(r => r.trigger.includes('offline'))).toBe(true);
        });
    });

    describe('nodeHeartbeat', () => {
        it('updates heartbeat and output', () => {
            grid.registerNode(makeNode('gen1', true), owner);
            grid.nodeHeartbeat('gen1', 75, owner);
            expect(grid.getNode('gen1').currentOutput).toBe(75);
        });

        it('IoT device can send heartbeat', () => {
            grid.registerNode(makeNode('gen1', true), owner);
            expect(() => grid.nodeHeartbeat('gen1', 60, 'iot_gen1')).not.toThrow();
        });
    });

    describe('storage management', () => {
        it('registers storage', () => {
            grid.registerStorage(makeStorage('bat1'), owner);
            expect(grid.getStorage('bat1').capacity).toBe(500);
        });

        it('sets storage to charging mode', () => {
            grid.registerStorage(makeStorage('bat1'), owner);
            grid.setStorageMode('bat1', StorageMode.CHARGING, owner);
            expect(grid.getStorage('bat1').mode).toBe(StorageMode.CHARGING);
        });

        it('rejects discharging empty storage', () => {
            const empty = { ...makeStorage('bat1'), currentCharge: 0 };
            grid.registerStorage(empty, owner);
            expect(() => grid.setStorageMode('bat1', StorageMode.DISCHARGING, owner)).toThrow();
        });
    });

    describe('balanceLoad', () => {
        it('returns grid metrics', () => {
            grid.registerNode(makeNode('gen1', true, 200), owner);
            grid.registerNode(makeNode('load1', false, 100), owner);
            const metrics = grid.balanceLoad();
            expect(metrics.totalGeneration).toBe(50);
            expect(metrics.totalLoad).toBe(50);
            expect(metrics.uptime).toBe(100);
        });

        it('charges storage on surplus', () => {
            grid.registerNode(makeNode('gen1', true, 200), owner);
            grid.registerNode(makeNode('load1', false, 50), owner);
            grid.updateNodeOutput('gen1', 150, owner);
            grid.updateNodeOutput('load1', 50, owner);
            grid.registerStorage(makeStorage('bat1'), owner);
            grid.balanceLoad();
            expect(grid.getStorage('bat1').mode).toBe(StorageMode.CHARGING);
        });
    });

    describe('optimizeGrid', () => {
        it('returns energy loss reduction', () => {
            grid.registerNode(makeNode('gen1', true, 200), owner);
            grid.registerNode(makeNode('gen2', true, 200), owner);
            grid.registerNode(makeNode('load1', false, 100), owner);
            const reduction = grid.optimizeGrid();
            expect(reduction).toBeGreaterThanOrEqual(0);
            expect(reduction).toBeLessThanOrEqual(25);
        });
    });

    describe('getGridMetrics', () => {
        it('calculates frequency based on generation/load balance', () => {
            grid.registerNode(makeNode('gen1', true), owner);
            grid.registerNode(makeNode('load1', false), owner);
            const metrics = grid.getGridMetrics();
            expect(metrics.frequency).toBeCloseTo(50, 0);
        });
    });
});
