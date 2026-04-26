import { MultiCurrencyBridge } from './MultiCurrencyBridge';

describe('MultiCurrencyBridge', () => {
  const validators = ['A', 'B', 'C'];

  const bridge = new MultiCurrencyBridge({
    validators,
    minApprovals: 2,
    feeBps: 50,
    paused: false,
  });

  const TOKEN = 'USDC';

  it('should deposit and create tx', async () => {
    const id = await bridge.deposit('user1', TOKEN, 1000n, 2);
    expect(id).toBeDefined();
  });

  it('should validate and claim', async () => {
    const id = await bridge.deposit('user1', TOKEN, 1000n, 2);

    await bridge.validateTx(id, 'A');
    await bridge.validateTx(id, 'B');

    // preload liquidity on destination
    (bridge as any).liquidity.set('USDC-2', {
      token: TOKEN,
      chainId: 2,
      liquidity: 1000n,
    });

    const result = await bridge.claim(id, 'user1');

    expect(result.amount).toBeGreaterThan(0n);
  });

  it('should pause bridge', async () => {
    await bridge.emergencyPause();

    await expect(
      bridge.deposit('user1', TOKEN, 100n, 2)
    ).rejects.toThrow();
  });
});