type SubmissionLog = {
    reportId: string;
    body: string;
    jurisdiction: string;
    timestamp: string;
    status: string;
};
export declare class ReportSubmitter {
    private submissionLogs;
    submit(reportId: string, report: string, body: string, jurisdiction: string): Promise<boolean>;
    getSubmissionLogs(reportId?: string): SubmissionLog[];
}
export {};
//# sourceMappingURL=ReportSubmitter.d.ts.map