// Mock for deploy script (replace with real WattToken interface in prod)
export class MockWattToken {
  constructor(public addr: string) {}
  
  balanceOf(_addr: string): number { return 1000; }
  totalSupply(): number { return 1000000; }
}

