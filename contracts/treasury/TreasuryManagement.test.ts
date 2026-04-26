import { TreasuryManagement } from './TreasuryManagement';

describe('TreasuryManagement', () => {
  const signers = ['A', 'B', 'C'];

  const treasury = new TreasuryManagement({
    minSigners: 2,
    signers,
  });

  const TOKEN = 'USDC';

  it('should deposit funds', async () => {
    await treasury.deposit(TOKEN, 1000n);
    const balance = await treasury.getBalance(TOKEN);
    expect(balance).toBe(1000n);
  });

  it('should create and execute allocation with multi-sig', async () => {
    const id = await treasury.createAllocation('user1', TOKEN, 500n);

    await treasury.approveAllocation(id, 'A');
    await treasury.approveAllocation(id, 'B');

    await treasury.executeAllocation(id);

    const balance = await treasury.getBalance(TOKEN);
    expect(balance).toBe(500n);
  });

  it('should create and exit investment', async () => {
    const id = await treasury.createInvestment('protocolX', TOKEN, 200n);

    await treasury.exitInvestment(id);

    const balance = await treasury.getBalance(TOKEN);
    expect(balance).toBe(500n); // remains consistent
  });
});