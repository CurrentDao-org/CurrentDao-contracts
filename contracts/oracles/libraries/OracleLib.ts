/**
 * Oracle Library
 * Provides utility functions for oracle network operations
 */

import {
  OracleNode,
  DataRequest,
  OracleResponse,
  DataValidation,
  ReputationMetrics,
  FailoverConfig,
  OracleIncentive,
  DataQuality,
  NetworkMetrics,
  DataSource,
  AggregationRule,
  OracleStake,
  SlashingCondition,
  OracleNetworkConfig,
  HealthCheck,
  DataSubscription,
  OracleGovernance,
  CrossChainData,
  OracleAudit,
  RequestStatus,
  AggregationMethod,
  DataType,
  IncentiveType,
  SlashingSeverity,
  GovernanceType,
  AuditType,
  ResponseRecord
} from '../structures/OracleStructs';

export class OracleLib {
  // Constants
  private static readonly BASIS_POINTS = 10000;
  private static readonly MAX_REPUTATION_SCORE = 1000;
  private static readonly MIN_REPUTATION_SCORE = 0;
  private static readonly DEFAULT_HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private static readonly MAX_RESPONSE_TIME = 30000; // 30 seconds
  private static readonly CONFIDENCE_THRESHOLD = 0.8;
  
  /**
   * Validate oracle node registration
   */
  static validateNodeRegistration(
    endpoint: string,
    stakeAmount: bigint,
    dataSources: string[],
    commissionRate: number,
    minResponseTime: number,
    config: OracleNetworkConfig
  ): boolean {
    if (!endpoint || endpoint.trim().length === 0) {
      return false;
    }
    
    if (stakeAmount < config.minStakeAmount) {
      return false;
    }
    
    if (!dataSources || dataSources.length === 0) {
      return false;
    }
    
    if (commissionRate < 0 || commissionRate > 10000) { // Max 100%
      return false;
    }
    
    if (minResponseTime <= 0 || minResponseTime > OracleLib.MAX_RESPONSE_TIME) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Calculate reputation score
   */
  static calculateReputationScore(
    accuracy: number,
    reliability: number,
    speed: number,
    honesty: number
  ): number {
    // Weighted average of different factors
    const weights = {
      accuracy: 0.4,
      reliability: 0.3,
      speed: 0.2,
      honesty: 0.1
    };
    
    const score = 
      accuracy * weights.accuracy +
      reliability * weights.reliability +
      speed * weights.speed +
      honesty * weights.honesty;
    
    return Math.min(Math.max(score * 10, 0), OracleLib.MAX_REPUTATION_SCORE); // Scale to 0-1000
  }
  
  /**
   * Aggregate responses using specified method
   */
  static aggregateResponses(
    responses: OracleResponse[],
    method: AggregationMethod,
    weights?: { nodeId: string; weight: number }[]
  ): any {
    if (responses.length === 0) {
      throw new Error('No responses to aggregate');
    }
    
    switch (method) {
      case AggregationMethod.MEDIAN:
        return this.calculateMedian(responses);
      
      case AggregationMethod.WEIGHTED_AVERAGE:
        return this.calculateWeightedAverage(responses, weights);
      
      case AggregationMethod.MAJORITY_VOTE:
        return this.calculateMajorityVote(responses);
      
      case AggregationMethod.TRIMMED_MEAN:
        return this.calculateTrimmedMean(responses);
      
      case AggregationMethod.EXPONENTIAL_WEIGHTED:
        return this.calculateExponentialWeighted(responses);
      
      case AggregationMethod.REPUTATION_WEIGHTED:
        return this.calculateReputationWeighted(responses);
      
      default:
        throw new Error('Unsupported aggregation method');
    }
  }
  
  /**
   * Calculate median of response values
   */
  private static calculateMedian(responses: OracleResponse[]): any {
    const values = responses.map(r => this.extractNumericValue(r.data)).filter(v => v !== null);
    if (values.length === 0) return null;
    
    values.sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    
    return values.length % 2 === 0 
      ? (values[mid - 1] + values[mid]) / 2 
      : values[mid];
  }
  
  /**
   * Calculate weighted average
   */
  private static calculateWeightedAverage(
    responses: OracleResponse[],
    weights?: { nodeId: string; weight: number }[]
  ): any {
    if (!weights || weights.length === 0) {
      return this.calculateSimpleAverage(responses);
    }
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const response of responses) {
      const weight = weights.find(w => w.nodeId === response.nodeId)?.weight || 1;
      const value = this.extractNumericValue(response.data);
      
      if (value !== null) {
        weightedSum += value * weight;
        totalWeight += weight;
      }
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : null;
  }
  
  /**
   * Calculate majority vote
   */
  private static calculateMajorityVote(responses: OracleResponse[]): any {
    const votes = new Map<string, number>();
    
    for (const response of responses) {
      const value = JSON.stringify(response.data);
      votes.set(value, (votes.get(value) || 0) + 1);
    }
    
    let maxVotes = 0;
    let majorityValue = null;
    
    for (const [value, count] of votes) {
      if (count > maxVotes) {
        maxVotes = count;
        majorityValue = JSON.parse(value);
      }
    }
    
    return majorityValue;
  }
  
  /**
   * Calculate trimmed mean
   */
  private static calculateTrimmedMean(responses: OracleResponse[]): any {
    const values = responses.map(r => this.extractNumericValue(r.data)).filter(v => v !== null);
    if (values.length <= 2) return this.calculateSimpleAverage(responses);
    
    values.sort((a, b) => a - b);
    const trimCount = Math.floor(values.length * 0.1); // Trim 10% from each end
    
    const trimmedValues = values.slice(trimCount, values.length - trimCount);
    const sum = trimmedValues.reduce((acc, val) => acc + val, 0);
    
    return sum / trimmedValues.length;
  }
  
  /**
   * Calculate exponential weighted average
   */
  private static calculateExponentialWeighted(responses: OracleResponse[]): any {
    const alpha = 0.3; // Smoothing factor
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < responses.length; i++) {
      const weight = Math.pow(alpha, i);
      const value = this.extractNumericValue(responses[i].data);
      
      if (value !== null) {
        weightedSum += value * weight;
        totalWeight += weight;
      }
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : null;
  }
  
  /**
   * Calculate reputation weighted average
   */
  private static calculateReputationWeighted(responses: OracleResponse[]): any {
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const response of responses) {
      const weight = response.reputationWeight;
      const value = this.extractNumericValue(response.data);
      
      if (value !== null) {
        weightedSum += value * weight;
        totalWeight += weight;
      }
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : null;
  }
  
  /**
   * Calculate simple average
   */
  private static calculateSimpleAverage(responses: OracleResponse[]): any {
    const values = responses.map(r => this.extractNumericValue(r.data)).filter(v => v !== null);
    if (values.length === 0) return null;
    
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }
  
  /**
   * Extract numeric value from response data
   */
  private static extractNumericValue(data: any): number | null {
    if (typeof data === 'number') {
      return data;
    }
    
    if (typeof data === 'string') {
      const parsed = parseFloat(data);
      return isNaN(parsed) ? null : parsed;
    }
    
    if (typeof data === 'object' && data !== null) {
      // Look for common numeric fields
      for (const key of ['value', 'price', 'amount', 'rate', 'number']) {
        if (key in data && typeof data[key] === 'number') {
          return data[key];
        }
      }
    }
    
    return null;
  }
  
  /**
   * Validate response signature
   */
  static validateResponseSignature(
    response: OracleResponse,
    nodePublicKey: string
  ): boolean {
    // Simplified signature validation
    // In reality, this would use cryptographic verification
    return !!(response.signature && response.signature.length > 0);
  }
  
  /**
   * Calculate data quality score
   */
  static calculateDataQuality(
    responses: OracleResponse[],
    validations: DataValidation[]
  ): DataQuality {
    const freshness = this.calculateFreshness(responses);
    const completeness = this.calculateCompleteness(responses);
    const consistency = this.calculateConsistency(responses);
    const accuracy = this.calculateAccuracy(validations);
    
    const overallQuality = (freshness + completeness + consistency + accuracy) / 4;
    
    return {
      requestId: responses[0]?.requestId || '',
      qualityScore: overallQuality,
      freshness,
      completeness,
      consistency,
      accuracy,
      timestamp: BigInt(Date.now())
    };
  }
  
  /**
   * Calculate data freshness score
   */
  private static calculateFreshness(responses: OracleResponse[]): number {
    if (responses.length === 0) return 0;
    
    const now = BigInt(Date.now());
    const maxAge = 300000n; // 5 minutes in milliseconds
    
    let totalFreshness = 0;
    for (const response of responses) {
      const age = now - response.timestamp;
      const freshness = age > maxAge ? 0 : Number((maxAge - age) * 1000n / maxAge) / 1000;
      totalFreshness += freshness;
    }
    
    return totalFreshness / responses.length;
  }
  
  /**
   * Calculate data completeness score
   */
  private static calculateCompleteness(responses: OracleResponse[]): number {
    if (responses.length === 0) return 0;
    
    let totalCompleteness = 0;
    for (const response of responses) {
      let completeness = 1;
      
      // Check if data is null or undefined
      if (response.data === null || response.data === undefined) {
        completeness = 0;
      }
      // Check if data is empty object or array
      else if (typeof response.data === 'object' && Object.keys(response.data).length === 0) {
        completeness = 0.5;
      }
      
      totalCompleteness += completeness;
    }
    
    return totalCompleteness / responses.length;
  }
  
  /**
   * Calculate data consistency score
   */
  private static calculateConsistency(responses: OracleResponse[]): number {
    if (responses.length <= 1) return 1;
    
    const values = responses.map(r => JSON.stringify(r.data));
    const uniqueValues = new Set(values);
    
    // Perfect consistency if all values are the same
    if (uniqueValues.size === 1) return 1;
    
    // Calculate consistency based on similarity
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        const similarity = this.calculateStringSimilarity(values[i], values[j]);
        totalSimilarity += similarity;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }
  
  /**
   * Calculate string similarity (simple implementation)
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  /**
   * Calculate Levenshtein distance
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * Calculate accuracy score from validations
   */
  private static calculateAccuracy(validations: DataValidation[]): number {
    if (validations.length === 0) return 0.5; // Default accuracy
    
    let totalAccuracy = 0;
    for (const validation of validations) {
      totalAccuracy += validation.isValid ? validation.confidence : 0;
    }
    
    return totalAccuracy / validations.length;
  }
  
  /**
   * Perform health check on node
   */
  static performHealthCheck(node: OracleNode): HealthCheck {
    const now = BigInt(Date.now());
    const lastCheckDiff = Number(now - node.lastResponseTime);
    
    const isHealthy = 
      node.isActive &&
      lastCheckDiff < 300000 && // Last response within 5 minutes
      node.reputationScore > 500; // Good reputation
    
    const issues: string[] = [];
    
    if (!node.isActive) {
      issues.push('Node is not active');
    }
    
    if (lastCheckDiff > 300000) {
      issues.push('Node has not responded recently');
    }
    
    if (node.reputationScore <= 500) {
      issues.push('Node has low reputation score');
    }
    
    if (node.totalResponses > 0) {
      const successRate = node.successfulResponses / node.totalResponses;
      if (successRate < 0.9) {
        issues.push('Node has low success rate');
      }
    }
    
    return {
      nodeId: node.nodeId,
      lastCheck: now,
      responseTime: lastCheckDiff,
      successRate: node.totalResponses > 0 ? node.successfulResponses / node.totalResponses : 0,
      isHealthy,
      issues
    };
  }
  
  /**
   * Calculate network metrics
   */
  static calculateNetworkMetrics(
    nodes: OracleNode[],
    requests: DataRequest[],
    config: OracleNetworkConfig
  ): NetworkMetrics {
    const activeNodes = nodes.filter(node => node.isActive);
    const completedRequests = requests.filter(req => req.status === RequestStatus.COMPLETED);
    
    const totalStaked = nodes.reduce((sum, node) => sum + node.stakeAmount, 0n);
    
    let totalResponseTime = 0;
    let responseCount = 0;
    
    for (const request of completedRequests) {
      for (const response of request.responses) {
        totalResponseTime += response.responseTime;
        responseCount++;
      }
    }
    
    const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
    
    const networkHealth = this.calculateNetworkHealth(activeNodes, config);
    
    const dataQualityScore = this.calculateAverageDataQuality(completedRequests);
    
    const rewardsDistributed = completedRequests.reduce((sum, req) => sum + req.bounty, 0n);
    
    return {
      totalNodes: nodes.length,
      activeNodes: activeNodes.length,
      totalRequests: requests.length,
      successfulRequests: completedRequests.length,
      averageResponseTime,
      networkHealth,
      dataQualityScore,
      totalStaked,
      rewardsDistributed
    };
  }
  
  /**
   * Calculate network health score
   */
  private static calculateNetworkHealth(activeNodes: OracleNode[], config: OracleNetworkConfig): number {
    if (activeNodes.length === 0) return 0;
    
    const targetNodes = Math.min(config.maxNodes, 50); // Target minimum nodes
    const nodeRatio = Math.min(activeNodes.length / targetNodes, 1);
    
    const avgReputation = activeNodes.reduce((sum, node) => sum + node.reputationScore, 0) / activeNodes.length;
    const reputationScore = avgReputation / OracleLib.MAX_REPUTATION_SCORE;
    
    const healthyNodes = activeNodes.filter(node => 
      node.reputationScore > config.minReputationScore
    ).length;
    const healthRatio = healthyNodes / activeNodes.length;
    
    return (nodeRatio * 0.4 + reputationScore * 0.3 + healthRatio * 0.3) * 100;
  }
  
  /**
   * Calculate average data quality
   */
  private static calculateAverageDataQuality(requests: DataRequest[]): number {
    if (requests.length === 0) return 0;
    
    let totalQuality = 0;
    let qualityCount = 0;
    
    for (const request of requests) {
      if (request.responses.length > 0) {
        // Simplified quality calculation
        const quality = Math.min(request.responses.length / 3, 1) * 100;
        totalQuality += quality;
        qualityCount++;
      }
    }
    
    return qualityCount > 0 ? totalQuality / qualityCount : 0;
  }
  
  /**
   * Validate failover configuration
   */
  static validateFailoverConfig(config: FailoverConfig): boolean {
    if (!config.primaryNodes || config.primaryNodes.length === 0) {
      return false;
    }
    
    if (!config.backupNodes || config.backupNodes.length === 0) {
      return false;
    }
    
    if (config.failoverThreshold <= 0 || config.failoverThreshold > 100) {
      return false;
    }
    
    if (config.recoveryThreshold <= 0 || config.recoveryThreshold > 100) {
      return false;
    }
    
    if (config.maxFailures <= 0) {
      return false;
    }
    
    if (config.healthCheckInterval <= 0) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Determine if failover should be triggered
   */
  static shouldTriggerFailover(
    healthChecks: HealthCheck[],
    config: FailoverConfig
  ): boolean {
    const unhealthyNodes = healthChecks.filter(check => !check.isHealthy);
    const unhealthyRatio = unhealthyNodes.length / healthChecks.length;
    
    return unhealthyRatio >= config.failoverThreshold / 100;
  }
  
  /**
   * Calculate incentive amount
   */
  static calculateIncentiveAmount(
    type: IncentiveType,
    baseAmount: bigint,
    performance: number
  ): bigint {
    let multiplier = 1;
    
    switch (type) {
      case IncentiveType.RESPONSE_BOUNTY:
        multiplier = 1;
        break;
      case IncentiveType.ACCURACY_BONUS:
        multiplier = 0.5 + (performance / 2); // 0.5x to 1.5x based on accuracy
        break;
      case IncentiveType.SPEED_BONUS:
        multiplier = Math.max(0.5, 2 - (performance / 1000)); // Faster = higher bonus
        break;
      case IncentiveType.AVAILABILITY_BONUS:
        multiplier = performance; // Direct performance multiplier
        break;
      case IncentiveType.STAKING_REWARD:
        multiplier = 0.1; // 10% of base amount
        break;
      case IncentiveType.DISCOVERY_REWARD:
        multiplier = 2; // 2x bonus for discovery
        break;
    }
    
    return (baseAmount * BigInt(Math.floor(multiplier * 1000))) / 1000n;
  }
  
  /**
   * Validate cross-chain data
   */
  static validateCrossChainData(data: CrossChainData): boolean {
    if (!data.chainId || data.chainId.trim().length === 0) {
      return false;
    }
    
    if (data.blockNumber <= 0n) {
      return false;
    }
    
    if (data.timestamp <= 0n) {
      return false;
    }
    
    if (data.confirmations < 1) {
      return false;
    }
    
    if (data.data === null || data.data === undefined) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Generate unique request ID
   */
  static generateRequestId(requester: string, timestamp: bigint): string {
    const combined = requester + timestamp.toString() + Math.random().toString();
    return '0x' + Buffer.from(combined).toString('hex').slice(0, 64);
  }
  
  /**
   * Generate unique node ID
   */
  static generateNodeId(operator: string, endpoint: string): string {
    const combined = operator + endpoint + Date.now().toString();
    return '0x' + Buffer.from(combined).toString('hex').slice(0, 64);
  }
  
  /**
   * Check if request has timed out
   */
  static isRequestTimedOut(request: DataRequest): boolean {
    const now = BigInt(Date.now());
    return request.timeout < now;
  }
  
  /**
   * Check if minimum responses are met
   */
  static hasMinResponses(request: DataRequest): boolean {
    return request.responses.length >= request.minResponses;
  }
  
  /**
   * Check if maximum responses are reached
   */
  static hasMaxResponses(request: DataRequest): boolean {
    return request.responses.length >= request.maxResponses;
  }
}
