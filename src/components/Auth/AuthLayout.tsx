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
    <div className="min-h-screen bg-[#313338] flex items-center justify-center p-4 font-sans text-[#dbdee1]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#313338] md:bg-[#313338] w-full max-w-[480px] p-8 rounded-lg shadow-2xl border border-[#1e1f22]/50"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#5865f2] p-3 rounded-2xl mb-4 shadow-lg">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
          {subtitle && <p className="text-[#b5bac1] text-center">{subtitle}</p>}
        </div>
        {children}
      </motion.div>
    </div>
  );
};
