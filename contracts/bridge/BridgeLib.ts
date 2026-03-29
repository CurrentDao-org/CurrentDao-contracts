import { SafeMath } from '../../scripts/SafeMath';

export class BridgeLib {
    /**
     * Calculates the dynamic fee for bridging based on base fee, congestion, and utilization
     */
    public static calculateFee(amount: number, baseFee: number, congestionFactor: number, liquidityUtilization: number): number {
        // dynamic fee = baseFee + (amount * congestionFactor) + (amount * liquidityUtilization)
        // using factors where 10000 = 100%
        const congestionFee = SafeMath.div(SafeMath.mul(amount, congestionFactor), 10000);
        const utilizationFee = SafeMath.div(SafeMath.mul(amount, liquidityUtilization), 10000);
        return SafeMath.add(baseFee, SafeMath.add(congestionFee, utilizationFee));
    }

    /**
     * Checks if the expected output satisfies the minimum output after slippage
     */
    public static checkSlippage(expectedOut: number, minOut: number): boolean {
        return expectedOut >= minOut;
    }

    /**
     * Generate a unique transaction hash for bridge payloads
     */
    public static generateTxHash(nonce: number, origin: string, dest: string, token: string, sender: string, recipient: string, amount: number): string {
        // Basic string concatenation mimicking a hash for TS
        const payload = `${nonce}:${origin}:${dest}:${token}:${sender}:${recipient}:${amount}`;
        // Using a simple 32-bit integer hash to remove dependency on Node's Buffer
        let hash = 0;
        for (let i = 0; i < payload.length; i++) {
            const char = payload.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return `hash_${Math.abs(hash).toString(16)}`;
    }
}
