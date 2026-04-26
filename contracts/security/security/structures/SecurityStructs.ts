export type Address = string;

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface Vulnerability {
  id: string;
  contract: string;
  type: string;
  severity: Severity;
  description: string;
  detectedAt: number;
  resolved: boolean;
}

export interface SecurityReport {
  id: string;
  score: number; // 0 - 100
  vulnerabilities: Vulnerability[];
  timestamp: number;
}

export interface SecurityConfig {
  minScoreThreshold: number;
  scanners: string[]; // external tools
  alertThreshold: Severity;
}