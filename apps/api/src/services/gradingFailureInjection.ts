let activePoint: string | undefined;

export function setGradingFailurePoint(point?: string): void {
  if (process.env.NODE_ENV !== 'test' && point) throw new Error('Grading failure injection is test-only');
  activePoint = point;
}

export function gradingCheckpoint(point: string): void {
  if (process.env.NODE_ENV === 'test' && activePoint === point) throw new Error(`Injected grading failure: ${point}`);
}
