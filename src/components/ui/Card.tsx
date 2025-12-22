import React from 'react';
import './Card.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'elevated';
  hover?: boolean;
  border?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      hover = false,
      border = true,
      padding = 'md',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const classes = [
      'ui-card',
      `ui-card--${variant}`,
      `ui-card--padding-${padding}`,
      hover && 'ui-card--hover',
      !border && 'ui-card--no-border',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
