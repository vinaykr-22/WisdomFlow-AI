import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this content.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`p-6 rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 text-center flex flex-col items-center justify-center gap-2.5 ${className}`}
    >
      <div className="w-9 h-9 rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-1">
        <AlertCircle size={18} />
      </div>

      <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-200">{title}</h4>
      <p className="text-xs text-rose-700 dark:text-rose-400 max-w-sm leading-relaxed">{message}</p>

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RotateCcw size={14} />}
          className="mt-2 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100/50"
        >
          Try again
        </Button>
      )}
    </div>
  );
}
