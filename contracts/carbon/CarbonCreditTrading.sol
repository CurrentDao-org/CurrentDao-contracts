// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/ICarbonCreditTrading.sol";
import "./structures/CarbonStructs.sol";
import "./libraries/CarbonLib.sol";

/**
 * @title CarbonCreditTrading
 * @author CurrentDao
 * @notice Main contract for carbon credit trading marketplace
 */
contract CarbonCreditTrading is ICarbonCreditTrading, ERC20, Ownable, Pausable, ReentrancyGuard {
    using CarbonLib for CarbonStructs.CarbonCredit;
    using CarbonLib for CarbonStructs.Order;
    
    // State variables
    uint256 private _nextCreditId;
    uint256 private _nextOrderId;
    uint256 private _nextTradeId;
    uint256 private _nextCertificateId;
    uint256 private _nextFuturesId;
    uint256 private _nextBundleId;
    
    // Fee configuration (in basis points)
    uint256 public tradingFeeBps = 50; // 0.5%
    uint256 public verificationFeeBps = 10; // 0.1%
    
    // Storage
    mapping(uint256 => CarbonStructs.CarbonCredit) public credits;
    mapping(uint256 => CarbonStructs.Order) public orders;
    mapping(uint256 => CarbonStructs.Trade) public trades;
    mapping(uint256 => CarbonStructs.VerificationReport) public verificationReports;
    mapping(uint256 => CarbonStructs.ImpactMetrics) public impactMetrics;
    mapping(uint256 => CarbonStructs.RetirementCertificate) public retirementCertificates;
    mapping(uint256 => CarbonStructs.FuturesContract) public futuresContracts;
    mapping(uint256 => CarbonStructs.GasBundle) public gasBundles;
    
    // Account mappings
    mapping(address => uint256[]) public accountCredits;
    mapping(address => mapping(uint256 => uint256)) public accountBalances;
    mapping(address => uint256[]) public accountOrders;
    mapping(address => bool) public verifiers;
    mapping(string => bool) public supportedStandards;
    
    // Marketplace statistics
    CarbonStructs.MarketplaceStats public marketplaceStats;
    
    // Credit to orders mapping
    mapping(uint256 => uint256[]) public creditOrders;
    
    // Total supply tracking
    uint256 public totalSupply;
    uint256 public retiredSupply;
    
    // Events (already defined in interface)
    
    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        _nextCreditId = 1;
        _nextOrderId = 1;
        _nextTradeId = 1;
        _nextCertificateId = 1;
        _nextFuturesId = 1;
        _nextBundleId = 1;
        
        // Initialize supported standards
        supportedStandards["VCS"] = true;
        supportedStandards["Gold Standard"] = true;
        supportedStandards["CDM"] = true;
        supportedStandards["Carbon Registry"] = true;
        
        // Initialize marketplace stats
        marketplaceStats = CarbonStructs.MarketplaceStats({
            totalVolume: 0,
            totalTrades: 0,
            totalCredits: 0,
            activeOrders: 0,
            averagePrice: 0,
            lastUpdated: block.timestamp
        });
    }
    
    // Credit Management Functions
    
    function issueCredit(
        string calldata projectId,
        uint256 amount,
        uint256 vintage,
        string calldata standard,
        string calldata methodology,
        string calldata metadataURI
    ) external override whenNotPaused returns (uint256 creditId) {
        require(supportedStandards[standard], "Standard not supported");
        require(amount > 0, "Amount must be positive");
        require(vintage > 0 && vintage <= block.timestamp, "Invalid vintage");
        
        creditId = _nextCreditId++;
        
        credits[creditId] = CarbonStructs.CarbonCredit({
            id: creditId,
            projectId: projectId,
            amount: amount,
            vintage: vintage,
            standard: standard,
            methodology: methodology,
            issuer: msg.sender,
            currentOwner: msg.sender,
            issuedAt: block.timestamp,
            expiresAt: 0, // No expiration by default
            isRetired: false,
            isVerified: false,
            metadataURI: metadataURI
        });
        
        // Update account balances
        accountCredits[msg.sender].push(creditId);
        accountBalances[msg.sender][creditId] = amount;
        
        // Update total supply
        totalSupply += amount;
        marketplaceStats.totalCredits = totalSupply;
        
        emit CreditIssued(creditId, msg.sender, amount, standard);
    }
    
    function verifyCredit(
        uint256 creditId,
        bool isValid,
        string calldata reportURI,
        uint8 confidence
    ) external override {
        require(verifiers[msg.sender], "Not authorized verifier");
        require(credits[creditId].id != 0, "Credit does not exist");
        require(confidence <= 100, "Confidence must be <= 100");
        
        verificationReports[creditId] = CarbonStructs.VerificationReport({
            creditId: creditId,
            verifier: msg.sender,
            timestamp: block.timestamp,
            isValid: isValid,
            reportURI: reportURI,
            standard: credits[creditId].standard,
            confidence: confidence
        });
        
        credits[creditId].isVerified = isValid;
        
        emit CreditVerified(creditId, msg.sender, isValid);
    }
    
    function retireCredit(
        uint256 creditId,
        uint256 amount,
        string calldata reason
    ) external override whenNotPaused nonReentrant returns (uint256 certificateId) {
        require(credits[creditId].id != 0, "Credit does not exist");
        require(credits[creditId].isVerified, "Credit not verified");
        require(accountBalances[msg.sender][creditId] >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be positive");
        
        certificateId = _nextCertificateId++;
        
        // Update credit state
        credits[creditId].amount -= amount;
        if (credits[creditId].amount == 0) {
            credits[creditId].isRetired = true;
        }
        
        // Update account balance
        accountBalances[msg.sender][creditId] -= amount;
        
        // Update retired supply
        retiredSupply += amount;
        
        // Create retirement certificate
        retirementCertificates[certificateId] = CarbonStructs.RetirementCertificate({
            id: certificateId,
            creditId: creditId,
            retiree: msg.sender,
            amount: amount,
            retirementReason: reason,
            timestamp: block.timestamp,
            certificateURI: string(abi.encodePacked("https://api.currentdao.io/certificates/", _uint2str(certificateId)))
        });
        
        emit CreditRetired(creditId, msg.sender, amount, reason);
    }
    
    // Trading Functions
    
    function placeBuyOrder(
        uint256 creditId,
        uint256 amount,
        uint256 price,
        uint256 expiresAt
    ) external override whenNotPaused returns (uint256 orderId) {
        require(credits[creditId].id != 0, "Credit does not exist");
        require(credits[creditId].isVerified, "Credit not verified");
        require(amount > 0, "Amount must be positive");
        require(price > 0, "Price must be positive");
        
        (bool isValid, string memory reason) = CarbonLib.validateOrder(amount, price, expiresAt);
        require(isValid, reason);
        
        orderId = _nextOrderId++;
        
        orders[orderId] = CarbonStructs.Order({
            id: orderId,
            trader: msg.sender,
            creditId: creditId,
            amount: amount,
            price: price,
            isBuyOrder: true,
            isActive: true,
            timestamp: block.timestamp,
            expiresAt: expiresAt,
            filledAmount: 0
        });
        
        // Update mappings
        accountOrders[msg.sender].push(orderId);
        creditOrders[creditId].push(orderId);
        marketplaceStats.activeOrders++;
        
        emit OrderPlaced(orderId, msg.sender, creditId, amount, price, true);
    }
    
    function placeSellOrder(
        uint256 creditId,
        uint256 amount,
        uint256 price,
        uint256 expiresAt
    ) external override whenNotPaused returns (uint256 orderId) {
        require(credits[creditId].id != 0, "Credit does not exist");
        require(credits[creditId].isVerified, "Credit not verified");
        require(accountBalances[msg.sender][creditId] >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be positive");
        require(price > 0, "Price must be positive");
        
        (bool isValid, string memory reason) = CarbonLib.validateOrder(amount, price, expiresAt);
        require(isValid, reason);
        
        orderId = _nextOrderId++;
        
        orders[orderId] = CarbonStructs.Order({
            id: orderId,
            trader: msg.sender,
            creditId: creditId,
            amount: amount,
            price: price,
            isBuyOrder: false,
            isActive: true,
            timestamp: block.timestamp,
            expiresAt: expiresAt,
            filledAmount: 0
        });
        
        // Update mappings
        accountOrders[msg.sender].push(orderId);
        creditOrders[creditId].push(orderId);
        marketplaceStats.activeOrders++;
        
        emit OrderPlaced(orderId, msg.sender, creditId, amount, price, false);
    }
    
    function fillOrder(uint256 orderId, uint256 amount) external override whenNotPaused nonReentrant returns (uint256 tradeId) {
        require(orders[orderId].id != 0, "Order does not exist");
        require(orders[orderId].isActive, "Order not active");
        require(orders[orderId].expiresAt == 0 || orders[orderId].expiresAt > block.timestamp, "Order expired");
        require(amount > 0 && amount <= orders[orderId].amount - orders[orderId].filledAmount, "Invalid amount");
        
        CarbonStructs.Order storage order = orders[orderId];
        uint256 price = order.price;
        uint256 creditId = order.creditId;
        
        if (order.isBuyOrder) {
            // Buyer is filling the order (matching with a sell order)
            require(accountBalances[msg.sender][creditId] >= amount, "Insufficient seller balance");
            
            // Calculate and transfer fees
            uint256 fee = CarbonLib.calculateTradingFee(amount, price, tradingFeeBps);
            uint256 totalCost = (amount * price) + fee;
            
            // Execute trade
            _executeTrade(order.trader, msg.sender, creditId, amount, price, fee);
            
        } else {
            // Seller is filling the order (matching with a buy order)
            require(accountBalances[order.trader][creditId] >= amount, "Insufficient buyer balance");
            
            // Calculate and transfer fees
            uint256 fee = CarbonLib.calculateTradingFee(amount, price, tradingFeeBps);
            uint256 totalCost = (amount * price) + fee;
            
            // Execute trade
            _executeTrade(msg.sender, order.trader, creditId, amount, price, fee);
        }
        
        // Update order
        order.filledAmount += amount;
        if (order.filledAmount == order.amount) {
            order.isActive = false;
            marketplaceStats.activeOrders--;
        }
        
        // Create trade record
        tradeId = _nextTradeId++;
        trades[tradeId] = CarbonStructs.Trade({
            id: tradeId,
            buyOrderId: order.isBuyOrder ? orderId : 0,
            sellOrderId: !order.isBuyOrder ? orderId : 0,
            creditId: creditId,
            amount: amount,
            price: price,
            buyer: order.isBuyOrder ? order.trader : msg.sender,
            seller: order.isBuyOrder ? msg.sender : order.trader,
            timestamp: block.timestamp,
            fee: CarbonLib.calculateTradingFee(amount, price, tradingFeeBps)
        });
        
        // Update marketplace stats
        marketplaceStats.totalVolume += amount * price;
        marketplaceStats.totalTrades++;
        marketplaceStats.averagePrice = marketplaceStats.totalVolume / marketplaceStats.totalTrades;
        
        emit OrderFilled(orderId, tradeId, amount, price);
        emit TradeExecuted(tradeId, trades[tradeId].buyer, trades[tradeId].seller, creditId, amount, price);
    }
    
    function cancelOrder(uint256 orderId) external override {
        require(orders[orderId].id != 0, "Order does not exist");
        require(orders[orderId].trader == msg.sender, "Not order owner");
        require(orders[orderId].isActive, "Order not active");
        
        orders[orderId].isActive = false;
        marketplaceStats.activeOrders--;
    }
    
    // Futures Trading Functions
    
    function createFuturesContract(
        uint256 creditId,
        uint256 amount,
        uint256 strikePrice,
        uint256 deliveryDate,
        bool isLong
    ) external override whenNotPaused returns (uint256 contractId) {
        require(credits[creditId].id != 0, "Credit does not exist");
        require(credits[creditId].isVerified, "Credit not verified");
        require(amount > 0, "Amount must be positive");
        require(strikePrice > 0, "Strike price must be positive");
        require(deliveryDate > block.timestamp, "Delivery date in future");
        
        (bool isValid, string memory reason) = CarbonLib.validateFuturesContract(strikePrice, deliveryDate, strikePrice / 10);
        require(isValid, reason);
        
        contractId = _nextFuturesId++;
        
        futuresContracts[contractId] = CarbonStructs.FuturesContract({
            id: contractId,
            creditId: creditId,
            buyer: isLong ? msg.sender : address(0),
            seller: isLong ? address(0) : msg.sender,
            amount: amount,
            strikePrice: strikePrice,
            deliveryDate: deliveryDate,
            marginRequirement: strikePrice / 10, // 10% margin
            isLong: isLong,
            isActive: true,
            timestamp: block.timestamp
        });
        
        emit FuturesContractCreated(contractId, futuresContracts[contractId].buyer, futuresContracts[contractId].seller, amount, strikePrice, deliveryDate);
    }
    
    function settleFuturesContract(uint256 contractId) external override whenNotPaused {
        require(futuresContracts[contractId].id != 0, "Contract does not exist");
        require(futuresContracts[contractId].isActive, "Contract not active");
        require(block.timestamp >= futuresContracts[contractId].deliveryDate, "Delivery date not reached");
        
        CarbonStructs.FuturesContract storage contract_ = futuresContracts[contractId];
        uint256 spotPrice = getSpotPrice(contract_.creditId);
        
        uint256 settlement = CarbonLib.calculateFuturesSettlement(
            contract_.strikePrice,
            spotPrice,
            contract_.amount,
            contract_.isLong
        );
        
        // Transfer settlement amount
        if (settlement > 0) {
            if (contract_.isLong) {
                // Long position receives settlement
                payable(contract_.buyer).transfer(settlement);
            } else {
                // Short position receives settlement
                payable(contract_.seller).transfer(settlement);
            }
        }
        
        contract_.isActive = false;
    }
    
    // Impact Tracking Functions
    
    function updateImpactMetrics(
        uint256 creditId,
        uint256 co2Equivalent,
        uint256 renewableEnergyGenerated,
        uint256 treesPreserved,
        uint256 waterSaved,
        uint256 biodiversityIndex
    ) external override {
        require(credits[creditId].id != 0, "Credit does not exist");
        require(credits[creditId].issuer == msg.sender || verifiers[msg.sender], "Not authorized");
        
        impactMetrics[creditId] = CarbonStructs.ImpactMetrics({
            totalOffset: credits[creditId].amount,
            co2Equivalent: co2Equivalent,
            renewableEnergyGenerated: renewableEnergyGenerated,
            treesPreserved: treesPreserved,
            waterSaved: waterSaved,
            biodiversityIndex: biodiversityIndex,
            lastUpdated: block.timestamp
        });
        
        emit ImpactUpdated(creditId, co2Equivalent, block.timestamp);
    }
    
    // Gas Optimization Functions
    
    function batchExecuteTrades(
        uint256[] calldata orderIds,
        uint256[] calldata amounts
    ) external override whenNotPaused nonReentrant returns (uint256[] memory tradeIds) {
        require(orderIds.length == amounts.length, "Array length mismatch");
        
        tradeIds = new uint256[](orderIds.length);
        
        for (uint256 i = 0; i < orderIds.length; i++) {
            tradeIds[i] = fillOrder(orderIds[i], amounts[i]);
        }
    }
    
    function createGasBundle(
        address[] calldata traders,
        uint256[] calldata creditIds,
        uint256[] calldata amounts,
        uint256[] calldata prices,
        uint256 deadline
    ) external override whenNotPaused returns (uint256 bundleId) {
        require(
            traders.length == creditIds.length &&
            creditIds.length == amounts.length &&
            amounts.length == prices.length,
            "Array length mismatch"
        );
        require(deadline > block.timestamp, "Invalid deadline");
        
        bundleId = _nextBundleId++;
        
        gasBundles[bundleId] = CarbonStructs.GasBundle({
            traders: traders,
            creditIds: creditIds,
            amounts: amounts,
            prices: prices,
            deadline: deadline,
            isExecuted: false
        });
    }
    
    function executeGasBundle(uint256 bundleId) external override whenNotPaused {
        require(gasBundles[bundleId].deadline > block.timestamp, "Bundle expired");
        require(!gasBundles[bundleId].isExecuted, "Bundle already executed");
        
        CarbonStructs.GasBundle storage bundle = gasBundles[bundleId];
        
        // Execute all trades in the bundle
        for (uint256 i = 0; i < bundle.traders.length; i++) {
            // Place and fill orders for each trader
            uint256 orderId = placeBuyOrder(bundle.creditIds[i], bundle.amounts[i], bundle.prices[i], bundle.deadline);
            fillOrder(orderId, bundle.amounts[i]);
        }
        
        bundle.isExecuted = true;
    }
    
    // Admin Functions
    
    function addVerifier(address verifier) external override onlyOwner {
        verifiers[verifier] = true;
    }
    
    function removeVerifier(address verifier) external override onlyOwner {
        verifiers[verifier] = false;
    }
    
    function addSupportedStandard(string calldata standard) external override onlyOwner {
        supportedStandards[standard] = true;
    }
    
    function removeSupportedStandard(string calldata standard) external override onlyOwner {
        supportedStandards[standard] = false;
    }
    
    function setTradingFee(uint256 fee) external override onlyOwner {
        require(fee <= 1000, "Fee too high"); // Max 10%
        tradingFeeBps = fee;
    }
    
    function setVerificationFee(uint256 fee) external override onlyOwner {
        require(fee <= 500, "Fee too high"); // Max 5%
        verificationFeeBps = fee;
    }
    
    function pause() external override onlyOwner {
        _pause();
    }
    
    function unpause() external override onlyOwner {
        _unpause();
    }
    
    function withdrawFees(address to) external override onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(to).transfer(balance);
        }
    }
    
    // View Functions
    
    function getCredit(uint256 creditId) external view override returns (CarbonStructs.CarbonCredit memory) {
        return credits[creditId];
    }
    
    function isVerified(uint256 creditId) external view override returns (bool) {
        return credits[creditId].isVerified;
    }
    
    function getOrder(uint256 orderId) external view override returns (CarbonStructs.Order memory) {
        return orders[orderId];
    }
    
    function getActiveOrders(uint256 creditId) external view override returns (uint256[] memory) {
        uint256[] memory activeOrders = new uint256[](creditOrders[creditId].length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < creditOrders[creditId].length; i++) {
            uint256 orderId = creditOrders[creditId][i];
            if (orders[orderId].isActive) {
                activeOrders[count] = orderId;
                count++;
            }
        }
        
        // Resize array
        assembly {
            mstore(activeOrders, count)
        }
        
        return activeOrders;
    }
    
    function getMarketplaceStats() external view override returns (CarbonStructs.MarketplaceStats memory) {
        return marketplaceStats;
    }
    
    function getSpotPrice(uint256 creditId) public view override returns (uint256) {
        uint256[] memory activeOrders = getActiveOrders(creditId);
        if (activeOrders.length == 0) {
            return 0;
        }
        
        uint256 totalPrice = 0;
        uint256 count = 0;
        
        for (uint256 i = 0; i < activeOrders.length; i++) {
            CarbonStructs.Order memory order = orders[activeOrders[i]];
            if (!order.isBuyOrder) { // Only consider sell orders for spot price
                totalPrice += order.price;
                count++;
            }
        }
        
        return count > 0 ? totalPrice / count : 0;
    }
    
    function getTradingHistory(uint256 creditId) external view override returns (CarbonStructs.Trade[] memory) {
        uint256 count = 0;
        
        // Count trades for this credit
        for (uint256 i = 1; i < _nextTradeId; i++) {
            if (trades[i].creditId == creditId) {
                count++;
            }
        }
        
        CarbonStructs.Trade[] memory creditTrades = new CarbonStructs.Trade[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i < _nextTradeId; i++) {
            if (trades[i].creditId == creditId) {
                creditTrades[index] = trades[i];
                index++;
            }
        }
        
        return creditTrades;
    }
    
    function getFuturesContract(uint256 contractId) external view override returns (CarbonStructs.FuturesContract memory) {
        return futuresContracts[contractId];
    }
    
    function getImpactMetrics(uint256 creditId) external view override returns (CarbonStructs.ImpactMetrics memory) {
        return impactMetrics[creditId];
    }
    
    function getTotalEnvironmentalImpact() external view override returns (CarbonStructs.ImpactMetrics memory) {
        CarbonStructs.ImpactMetrics memory totalImpact;
        
        for (uint256 i = 1; i < _nextCreditId; i++) {
            if (credits[i].id != 0) {
                CarbonStructs.ImpactMetrics memory creditImpact = impactMetrics[i];
                totalImpact.totalOffset += creditImpact.totalOffset;
                totalImpact.co2Equivalent += creditImpact.co2Equivalent;
                totalImpact.renewableEnergyGenerated += creditImpact.renewableEnergyGenerated;
                totalImpact.treesPreserved += creditImpact.treesPreserved;
                totalImpact.waterSaved += creditImpact.waterSaved;
                totalImpact.biodiversityIndex = (totalImpact.biodiversityIndex + creditImpact.biodiversityIndex) / 2;
            }
        }
        
        totalImpact.lastUpdated = block.timestamp;
        return totalImpact;
    }
    
    function isVerifier(address verifier) external view override returns (bool) {
        return verifiers[verifier];
    }
    
    function getVerificationReport(uint256 creditId) external view override returns (CarbonStructs.VerificationReport memory) {
        return verificationReports[creditId];
    }
    
    function checkStandardCompliance(
        uint256 creditId,
        string calldata standard
    ) external view override returns (CarbonStructs.StandardCompliance memory) {
        CarbonStructs.CarbonCredit memory credit = credits[creditId];
        
        return CarbonStructs.StandardCompliance({
            standardName: standard,
            isCompliant: CarbonLib.stringsEqual(credit.standard, standard) && credit.isVerified,
            lastAuditDate: verificationReports[creditId].timestamp,
            auditReportURI: verificationReports[creditId].reportURI,
            rating: verificationReports[creditId].confidence
        });
    }
    
    function generateSustainabilityReport(
        address account,
        uint256 startTime,
        uint256 endTime
    ) external view override returns (string memory) {
        uint256 totalOffset = 0;
        uint256 totalTrades = 0;
        
        for (uint256 i = 0; i < accountCredits[account].length; i++) {
            uint256 creditId = accountCredits[account][i];
            if (credits[creditId].issuedAt >= startTime && credits[creditId].issuedAt <= endTime) {
                totalOffset += credits[creditId].amount;
            }
        }
        
        for (uint256 i = 1; i < _nextTradeId; i++) {
            if ((trades[i].buyer == account || trades[i].seller == account) &&
                trades[i].timestamp >= startTime && trades[i].timestamp <= endTime) {
                totalTrades++;
            }
        }
        
        return string(abi.encodePacked(
            "Sustainability Report for ",
            _address2str(account),
            ": Total Offset: ",
            _uint2str(totalOffset),
            " tonnes, Total Trades: ",
            _uint2str(totalTrades)
        ));
    }
    
    function getAccountCarbonFootprint(address account) external view override returns (uint256) {
        // This would typically integrate with external data sources
        // For now, return a placeholder
        return 0;
    }
    
    function getAccountCarbonOffset(address account) external view override returns (uint256) {
        uint256 totalOffset = 0;
        
        for (uint256 i = 0; i < accountCredits[account].length; i++) {
            uint256 creditId = accountCredits[account][i];
            totalOffset += accountBalances[account][creditId];
        }
        
        return totalOffset;
    }
    
    function getTotalSupply() external view override returns (uint256) {
        return totalSupply;
    }
    
    function getCirculatingSupply() external view override returns (uint256) {
        return totalSupply - retiredSupply;
    }
    
    function getRetiredSupply() external view override returns (uint256) {
        return retiredSupply;
    }
    
    function getAccountCredits(address account) external view override returns (uint256[] memory) {
        return accountCredits[account];
    }
    
    function getAccountBalance(address account, uint256 creditId) external view override returns (uint256) {
        return accountBalances[account][creditId];
    }
    
    // Internal functions
    
    function _executeTrade(
        address buyer,
        address seller,
        uint256 creditId,
        uint256 amount,
        uint256 price,
        uint256 fee
    ) internal {
        // Transfer credits from seller to buyer
        accountBalances[seller][creditId] -= amount;
        accountBalances[buyer][creditId] += amount;
        
        // Update credit ownership
        if (accountBalances[seller][creditId] == 0) {
            // Remove from seller's credit list
            _removeFromAccountCredits(seller, creditId);
        }
        
        bool alreadyOwned = false;
        for (uint256 i = 0; i < accountCredits[buyer].length; i++) {
            if (accountCredits[buyer][i] == creditId) {
                alreadyOwned = true;
                break;
            }
        }
        
        if (!alreadyOwned) {
            accountCredits[buyer].push(creditId);
        }
        
        // Transfer payment (minus fee)
        uint256 paymentAmount = (amount * price) - fee;
        payable(seller).transfer(paymentAmount);
    }
    
    function _removeFromAccountCredits(address account, uint256 creditId) internal {
        uint256 length = accountCredits[account].length;
        for (uint256 i = 0; i < length; i++) {
            if (accountCredits[account][i] == creditId) {
                accountCredits[account][i] = accountCredits[account][length - 1];
                accountCredits[account].pop();
                break;
            }
        }
    }
    
    // Utility functions
    
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
    
    function _address2str(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
    
    // Receive function for ETH transfers
    receive() external payable {}
}
