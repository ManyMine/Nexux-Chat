import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare } from 'lucide-react';
import { APP_NAME } from '@/src/constants';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 font-sans text-text-secondary">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-bg-secondary w-full max-w-[480px] p-8 rounded-lg shadow-2xl border border-border-primary/50"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-color-brand p-3 rounded-2xl mb-4 shadow-lg">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">{title}</h1>
          {subtitle && <p className="text-text-muted text-center">{subtitle}</p>}
        </div>
        {children}
      </motion.div>
    </div>
  );
};
