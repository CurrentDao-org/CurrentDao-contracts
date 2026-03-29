"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WattToken = void 0;
const SafeMath_1 = require("./libraries/SafeMath");
class WattToken {
    name = "Energy Watt";
    symbol = "WATT";
    decimals = 18;
    _totalSupply = 0;
    balances = new Map();
    allowances = new Map();
    admin;
    minters = new Set();
    burners = new Set();
    paused = false;
    events = [];
    constructor(adminAddress) {
        this.admin = adminAddress;
        this.emitEvent('Initialized', { admin: adminAddress });
    }
    // --- Modifiers ---
    whenNotPaused() {
        if (this.paused)
            throw new Error("Pausable: paused");
    }
    onlyAdmin(caller) {
        if (caller !== this.admin)
            throw new Error("AccessControl: caller is not an admin");
    }
    // --- Administration & Roles ---
    pause(caller) {
        this.onlyAdmin(caller);
        this.paused = true;
        this.emitEvent('Paused', { by: caller });
    }
    unpause(caller) {
        this.onlyAdmin(caller);
        this.paused = false;
        this.emitEvent('Unpaused', { by: caller });
    }
    grantMinterRole(caller, account) {
        this.onlyAdmin(caller);
        this.minters.add(account);
        this.emitEvent('RoleGranted', { role: 'MINTER', account });
    }
    grantBurnerRole(caller, account) {
        this.onlyAdmin(caller);
        this.burners.add(account);
        this.emitEvent('RoleGranted', { role: 'BURNER', account });
    }
    // --- Energy Specific Features ---
    mint(caller, to, amount) {
        this.whenNotPaused();
        if (!this.minters.has(caller) && caller !== this.admin) {
            throw new Error("AccessControl: caller is not a minter");
        }
        if (!to)
            throw new Error("ERC20: mint to the zero address");
        this._totalSupply = SafeMath_1.SafeMath.add(this._totalSupply, amount);
        const currentBalance = this.balances.get(to) || 0;
        this.balances.set(to, SafeMath_1.SafeMath.add(currentBalance, amount));
        this.emitEvent('Transfer', { from: '0x0', to, value: amount });
        this.emitEvent('EnergyMinted', { producer: to, amount });
        return true;
    }
    burn(caller, from, amount) {
        this.whenNotPaused();
        if (!this.burners.has(caller) && caller !== from) {
            throw new Error("AccessControl: caller is not a burner or owner");
        }
        const accountBalance = this.balances.get(from) || 0;
        this.balances.set(from, SafeMath_1.SafeMath.sub(accountBalance, amount));
        this._totalSupply = SafeMath_1.SafeMath.sub(this._totalSupply, amount);
        this.emitEvent('Transfer', { from, to: '0x0', value: amount });
        this.emitEvent('EnergyConsumed', { consumer: from, amount });
        return true;
    }
    // --- ERC20 Implementation ---
    totalSupply() {
        return this._totalSupply;
    }
    balanceOf(account) {
        return this.balances.get(account) || 0;
    }
    transfer(recipient, amount) {
        return this._transfer("mock_caller", recipient, amount);
    }
    executeTransfer(sender, recipient, amount) {
        return this._transfer(sender, recipient, amount);
    }
    _transfer(sender, recipient, amount) {
        this.whenNotPaused();
        if (!sender || !recipient)
            throw new Error("ERC20: transfer from/to the zero address");
        const senderBalance = this.balances.get(sender) || 0;
        this.balances.set(sender, SafeMath_1.SafeMath.sub(senderBalance, amount));
        const recipientBalance = this.balances.get(recipient) || 0;
        this.balances.set(recipient, SafeMath_1.SafeMath.add(recipientBalance, amount));
        this.emitEvent('Transfer', { from: sender, to: recipient, value: amount });
        return true;
    }
    allowance(owner, spender) {
        return this.allowances.get(owner)?.get(spender) || 0;
    }
    approve(spender, amount, caller = "mock_caller") {
        this.whenNotPaused();
        if (!this.allowances.has(caller))
            this.allowances.set(caller, new Map());
        this.allowances.get(caller).set(spender, amount);
        this.emitEvent('Approval', { owner: caller, spender, value: amount });
        return true;
    }
    transferFrom(sender, recipient, amount) {
        // Simplification for mock: skipping allowance deduction logic for brevity, assuming approval is verified upstream
        return this._transfer(sender, recipient, amount);
    }
    emitEvent(eventName, data) {
        this.events.push({ event: eventName, timestamp: Date.now(), data });
    }
    getPastEvents() { return [...this.events]; }
}
exports.WattToken = WattToken;
//# sourceMappingURL=WattToken.js.map