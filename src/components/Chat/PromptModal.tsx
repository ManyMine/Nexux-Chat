import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  placeholder?: string;
  onConfirm: (value: string | null) => void;
  onCancel: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, title, message, placeholder, onConfirm, onCancel }) => {
  const [value, setValue] = useState('');

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
            <p className="text-text-secondary mb-4">{message}</p>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="w-full p-2 mb-6 bg-bg-primary text-text-primary rounded border border-border-primary"
            />
            <div className="flex justify-end space-x-4">
              <button onClick={onCancel} className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded hover:bg-bg-primary">Cancelar</button>
              <button onClick={() => onConfirm(value)} className="px-4 py-2 bg-color-brand text-white rounded hover:bg-color-brand-hover">Confirmar</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
