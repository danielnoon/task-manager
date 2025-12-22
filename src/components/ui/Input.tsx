import React from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'large' | 'command';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'default', className = '', ...props }, ref) => {
    const classes = [
      'ui-input',
      `ui-input--${variant}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return <input ref={ref} className={classes} {...props} />;
  }
);

Input.displayName = 'Input';

export default Input;
