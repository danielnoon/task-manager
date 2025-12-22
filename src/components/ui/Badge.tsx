import React from 'react';
import './Badge.css';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'success' | 'error' | 'warning';
  size?: 'sm' | 'md';
  children?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', className = '', children, ...props }, ref) => {
    const classes = [
      'ui-badge',
      `ui-badge--${variant}`,
      `ui-badge--${size}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span ref={ref} className={classes} {...props}>
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
