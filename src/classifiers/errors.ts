export class ClassifierNotInitializedError extends Error {
  constructor() {
    super('Classifier has not been initialized');
    this.name = 'ClassifierNotInitializedError';
  }
}

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
} 