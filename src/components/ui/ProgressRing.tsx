import React from 'react';
import './ProgressRing.css';

export interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  color?: 'accent' | 'success' | 'warning' | 'error';
  className?: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max = 100,
  size = 100,
  strokeWidth = 6,
  showLabel = true,
  color = 'accent',
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`ui-progress-ring ${className}`} style={{ width: size, height: size }}>
      <svg className="ui-progress-ring__svg" width={size} height={size}>
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-accent-hover)" />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          className="ui-progress-ring__bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          className={`ui-progress-ring__fill ui-progress-ring__fill--${color}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>

      {showLabel && (
        <div className="ui-progress-ring__content">
          <span className="ui-progress-ring__value">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  );
};

export default ProgressRing;
