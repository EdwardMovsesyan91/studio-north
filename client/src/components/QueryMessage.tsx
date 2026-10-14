export function QueryMessage({
  pending,
  error,
  onRetry,
}: {
  pending: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  if (pending)
    return (
      <p role="status" className="type-body py-8 text-secondary">
        Loading from Studio North…
      </p>
    );
  if (error)
    return (
      <div role="alert" className="py-8">
        <p>{error.message}</p>
        <button
          type="button"
          className="button mt-4"
          data-variant="secondary"
          onClick={onRetry}
        >
          Try again
        </button>
      </div>
    );
  return null;
}
