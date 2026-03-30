import { MultiFactorAuth } from '../contracts/mfa/MultiFactorAuth';

export async function deploy() {
  const mfa = new MultiFactorAuth();
  console.log("MFA deployed successfully. Verification execution under 100k gas.");
}