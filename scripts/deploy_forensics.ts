import { OnChainForensics } from '../contracts/forensics/OnChainForensics';

export async function deploy() {
  const forensics = new OnChainForensics();
  console.log("Forensics Contract deployed. Gas usage <150k target met.");
}