let activePoint: string | undefined;

export function setFinanceFailurePoint(point?: string): void {
  if (process.env.NODE_ENV !== 'test' && point) throw new Error('Finance failure injection is test-only');
  activePoint = point;
}

export function financeCheckpoint(point: string): void {
  if (process.env.NODE_ENV === 'test' && activePoint === point) throw new Error(`Injected finance failure: ${point}`);
}
