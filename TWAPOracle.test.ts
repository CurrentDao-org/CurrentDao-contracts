import { TWAPOracle } from '../../contracts/twap/TWAPOracle';

describe('TWAPOracle', () => {
  let oracle: TWAPOracle;

  beforeEach(() => {
    oracle = new TWAPOracle();
  });

  it('should set valid window', () => {
    oracle.setWindow('WATT', 3600); // 1 hour
    expect(() => oracle.setWindow('WATT', 10)).toThrow('Time windows must be between 1 minute and 24 hours.');
  });

  it('should calculate TWAP using geometric mean and respect 30s schedule', () => {
    const now = Math.floor(Date.now() / 1000);
    oracle.updatePrice('WATT', 100, 'sourceA', 60, now - 40);
    oracle.updatePrice('WATT', 110, 'sourceB', 60, now);
    
    expect(() => oracle.updatePrice('WATT', 120, 'sourceC', 60, now + 10)).toThrow('Updates must be scheduled at least 30 seconds apart.');
    
    const twap = oracle.getTWAP('WATT', 3600);
    expect(twap).toBeCloseTo(Math.sqrt(100 * 110));
    
    const isManipulated = oracle.checkManipulation('WATT', 60);
    expect(isManipulated).toBe(true); // 60 >= 51%
  });
});