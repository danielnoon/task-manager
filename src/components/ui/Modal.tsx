import { useEffect, type ReactNode, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Modal.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="ui-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="ui-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="ui-modal__header">
                <h2>{title}</h2>
                <button
                  className="ui-modal__close"
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>
            )}

            <div className="ui-modal__body">{children}</div>

            {footer && <div className="ui-modal__footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
