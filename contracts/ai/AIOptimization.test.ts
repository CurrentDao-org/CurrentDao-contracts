import { AIOptimization } from './AIOptimization';

describe('AIOptimization', () => {
  const oracle = 'AI_ORACLE';

  const ai = new AIOptimization({
    oracle,
    minConfidence: 0.7,
  });

  it('should submit prediction', async () => {
    const id = await ai.submitPrediction(
      'Reduce peak load',
      25,
      0.9,
      oracle
    );

    expect(id).toBeDefined();
  });

  it('should execute decision', async () => {
    const id = await ai.submitPrediction(
      'Shift load',
      20,
      0.8,
      oracle
    );

    await ai.executeDecision(id);

    const model = await ai.getModel();
    expect(model.accuracy).toBeGreaterThan(0.8);
  });

  it('should reject low confidence', async () => {
    await expect(
      ai.submitPrediction('Bad strategy', 10, 0.2, oracle)
    ).rejects.toThrow();
  });
});