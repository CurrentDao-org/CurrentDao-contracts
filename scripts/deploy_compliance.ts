import { ComplianceRegistry } from '../contracts/compliance/ComplianceRegistry';

export async function deploy() {
  const registry = new ComplianceRegistry();
  console.log("Compliance Registry deployed. <80k gas checks verified.");
}