export type ComplianceMode = 'supplements_us' | 'none';

export interface AnswerPackGenerateOptions {
  complianceMode: ComplianceMode;
  questionCount: number;
}

export interface AnswerPackPublishOptions extends AnswerPackGenerateOptions {
  dryRun: boolean;
}
