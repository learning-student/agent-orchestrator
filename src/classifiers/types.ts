export interface ClassificationResult {
  labels: string[];
  scores: number[];
  prob_label_is_true: number;
}

export interface ClassifierOptions {
  multi_label?: boolean;
  hypothesis_template?: string;
} 