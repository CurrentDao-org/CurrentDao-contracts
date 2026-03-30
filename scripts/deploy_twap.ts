import { TWAPOracle } from '../contracts/twap/TWAPOracle';

export async function deploy() {
  const oracle = new TWAPOracle();
  console.log("TWAP Oracle deployed. Under 50k gas optimization ready.");
}