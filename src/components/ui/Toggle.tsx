import React from 'react';
import './Toggle.css';

export interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
}

const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  ({ checked, onChange, label, description, className = '', id, ...props }, ref) => {
    const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.checked);
    };

    return (
      <div className={`ui-toggle ${className}`}>
        <label htmlFor={toggleId} className="ui-toggle__label">
          <input
            ref={ref}
            type="checkbox"
            id={toggleId}
            checked={checked}
            onChange={handleChange}
            className="ui-toggle__input"
            {...props}
          />
          <span className="ui-toggle__switch" />
          {(label || description) && (
            <span className="ui-toggle__text">
              {label && <span className="ui-toggle__label-text">{label}</span>}
              {description && (
                <span className="ui-toggle__description">{description}</span>
              )}
            </span>
          )}
        </label>
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export default Toggle;
