import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="bg-bg-secondary p-6 rounded-lg shadow-xl max-w-md w-full"
          >
            <h2 className="text-lg font-bold text-text-primary mb-2">{title}</h2>
            <p className="text-text-secondary mb-6">{message}</p>
            <div className="flex justify-end space-x-4">
              <button onClick={onCancel} className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded hover:bg-bg-primary">Cancelar</button>
              <button onClick={onConfirm} className="px-4 py-2 bg-color-brand text-white rounded hover:bg-color-brand-hover">Confirmar</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
