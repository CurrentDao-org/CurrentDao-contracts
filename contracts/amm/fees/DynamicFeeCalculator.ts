export class DynamicFeeCalculator {
    private baseFee: number = 0.003; // 0.3%
    private volatilityWindow: number[] = [];
    private maxVolatilityWindow: number = 20;

    /**
     * Calculates fee based on current market volatility.
     * High volatility -> Higher fees (to compensate LPs).
     */
    calculateFee(currentPrice: number): number {
        this.updateVolatility(currentPrice);
        const volatility = this.getVolatility();
        
        // Dynamic fee formula: baseFee + (volatility * multiplier)
        const multiplier = 0.1; 
        let fee = this.baseFee + (volatility * multiplier);
        
        // Cap fee between 0.1% and 1%
        return Math.min(Math.max(fee, 0.001), 0.01);
    }

    private updateVolatility(price: number): void {
        this.volatilityWindow.push(price);
        if (this.volatilityWindow.length > this.maxVolatilityWindow) {
            this.volatilityWindow.shift();
        }
    }

    private getVolatility(): number {
        if (this.volatilityWindow.length < 2) return 0;
        
        const mean = this.volatilityWindow.reduce((a, b) => a + b) / this.volatilityWindow.length;
        const variance = this.volatilityWindow.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.volatilityWindow.length;
        
        return Math.sqrt(variance) / mean; // Coefficient of Variation
    }
}
