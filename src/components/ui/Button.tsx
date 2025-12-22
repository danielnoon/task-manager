import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'text' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon, children, className = '', ...props }, ref) => {
    const classes = [
      'ui-button',
      `ui-button--${variant}`,
      `ui-button--${size}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} className={classes} {...props}>
        {icon && <span className="ui-button__icon">{icon}</span>}
        {children && <span className="ui-button__text">{children}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
