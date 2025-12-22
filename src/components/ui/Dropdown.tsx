import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Dropdown.css';

export interface DropdownItem {
  id: string;
  label: string;
  value?: any;
  disabled?: boolean;
}

export interface DropdownProps {
  isOpen: boolean;
  items: DropdownItem[];
  onSelect: (item: DropdownItem) => void;
  onClose?: () => void;
  position?: 'auto' | 'top' | 'bottom';
  triggerRef?: React.RefObject<HTMLElement>;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  isOpen,
  items,
  onSelect,
  onClose,
  position = 'auto',
  triggerRef,
  className = '',
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropDirection, setDropDirection] = useState<'up' | 'down'>('down');

  // Determine if dropdown should open upward or downward
  useEffect(() => {
    if (isOpen && position === 'auto' && triggerRef?.current && dropdownRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const dropdownHeight = dropdownRef.current.offsetHeight;
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      // If not enough space below and more space above, drop up
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropDirection('up');
      } else {
        setDropDirection('down');
      }
    } else if (position === 'top') {
      setDropDirection('up');
    } else {
      setDropDirection('down');
    }
  }, [isOpen, position, triggerRef]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  const handleItemClick = (item: DropdownItem) => {
    if (!item.disabled) {
      onSelect(item);
      onClose?.();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          className={`ui-dropdown ${
            dropDirection === 'up' ? 'ui-dropdown--drop-up' : 'ui-dropdown--drop-down'
          } ${className}`}
          initial={{ opacity: 0, y: dropDirection === 'up' ? 8 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: dropDirection === 'up' ? 8 : -8 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        >
          {items.map((item) => (
            <button
              key={item.id}
              className={`ui-dropdown__item ${item.disabled ? 'ui-dropdown__item--disabled' : ''}`}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
            >
              {item.label}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Dropdown;
