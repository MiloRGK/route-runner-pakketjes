import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
  variant?: 'default' | 'overlay';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  message,
  variant = 'default'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const spinner = (
    <div className={cn(
      'flex items-center justify-center',
      variant === 'overlay' && 'absolute inset-0 bg-white/80 backdrop-blur-sm',
      className
    )}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className={cn(
          'animate-spin text-primary',
          sizeClasses[size]
        )} />
        {message && (
          <span className="text-sm text-gray-600 animate-pulse">
            {message}
          </span>
        )}
      </div>
    </div>
  );

  return spinner;
};

export default LoadingSpinner; 