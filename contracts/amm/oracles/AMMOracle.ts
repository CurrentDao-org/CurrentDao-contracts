export class AMMOracle {
    private currentPrice: number = 1.0;
    private lastUpdate: number = Date.now();
    private priceTolerance: number = 0.05; // 5% max deviation between oracle and AMM

    /**
     * Updates the oracle price with timestamp check.
     */
    updatePrice(price: number): void {
        this.currentPrice = price;
        this.lastUpdate = Date.now();
    }

    /**
     * Checks if the AMM price is within an acceptable range of the oracle.
     * This prevents manipulation via flash loans.
     */
    isPriceStable(ammPrice: number): boolean {
        if (Date.now() - this.lastUpdate > 3600000) { // 1 hour stale check
            return false;
        }

        const deviation = Math.abs(ammPrice - this.currentPrice) / this.currentPrice;
        return deviation <= this.priceTolerance;
    }

    getPrice(): number {
        return this.currentPrice;
    }
}
