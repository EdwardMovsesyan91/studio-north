export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}
export const slotConflict = () => new ApiError(409, 'SLOT_CONFLICT', 'This time is no longer available. Choose another slot.');
export function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
