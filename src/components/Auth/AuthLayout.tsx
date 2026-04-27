import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare } from 'lucide-react';
import { APP_NAME } from '@/src/constants';
import { useAccessibility } from '../../contexts/AccessibilityContext';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  const { settings } = useAccessibility();
  
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 font-sans text-text-secondary relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 100, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -left-24 w-96 h-96 bg-color-brand/10 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -120, 0],
            x: [0, -80, 0],
            y: [0, 100, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-color-accent/10 rounded-full blur-3xl"
        />
      </div>

      {settings.autismTheme && (
        <div className="absolute inset-0 z-0 opacity-20">
          <img 
            src="https://estimated-peach-vlbu9z5ryi.edgeone.app/copilot_image_1776130502581.jpeg" 
            alt="Autism Theme Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className="bg-bg-secondary/40 backdrop-blur-2xl w-full max-w-[480px] p-8 md:p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="bg-bg-tertiary p-6 rounded-full mb-6 shadow-2xl shadow-black/30 flex items-center justify-center overflow-hidden"
          >
            <img 
              src="https://files.catbox.moe/2ljohq.png" 
              alt="Logo" 
              className="w-28 h-28 object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <h1 className="text-4xl font-black text-text-primary mb-3 tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">{title}</h1>
          {subtitle && <p className="text-text-muted text-center font-medium text-lg opacity-80">{subtitle}</p>}
        </div>
        {children}
      </motion.div>
    </div>
  );
};
