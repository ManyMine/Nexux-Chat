import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AuthLayout } from './AuthLayout';
import { motion } from 'motion/react';
import { Mail, Lock, Loader2, Globe } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { setupRecaptcha, clearRecaptcha } from '@/src/services/firebaseService';
import { InstallPWA } from '../InstallPWA';
import { useI18n, Language } from '@/src/lib/i18n';
import { AccessibilityMenu } from '../AccessibilityMenu';

const loginSchema = z.object({
  identifier: z.string().min(3, 'Digite seu e-mail, CPF, telefone ou usuário'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginProps {
  onLogin: (values: LoginFormValues) => Promise<void>;
  onSignUpClick: () => void;
  onForgotPasswordClick: () => void;
  onGoogleLogin?: () => Promise<void>;
  onPhoneLogin?: (phoneNumber: string, code: string) => Promise<void>;
  onAnonymousLogin?: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  step?: 'phone' | 'code';
}

export const Login: React.FC<LoginProps> = ({ 
  onLogin, 
  onSignUpClick, 
  onForgotPasswordClick,
  onGoogleLogin,
  onPhoneLogin,
  onAnonymousLogin,
  isLoading,
  error,
  step = 'phone'
}) => {
  const { t, lang, changeLanguage } = useI18n();
  const [isPhoneMode, setIsPhoneMode] = React.useState(false);
  const [phoneStep, setPhoneStep] = React.useState<'phone' | 'code'>(step);
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [verificationCode, setVerificationCode] = React.useState('');

  React.useEffect(() => {
    setPhoneStep(step);
  }, [step]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    }
  });

  React.useEffect(() => {
    if (isPhoneMode && phoneStep === 'phone') {
      // Small delay to ensure the container is in the DOM
      const timer = setTimeout(async () => {
        try {
          await setupRecaptcha('recaptcha-container');
        } catch (err) {
          console.error("Failed to setup reCAPTCHA:", err);
        }
      }, 500);
      
      return () => {
        clearTimeout(timer);
        clearRecaptcha();
      };
    }
  }, [isPhoneMode, phoneStep]);

  if (isPhoneMode) {
    return (
      <AuthLayout 
        title={phoneStep === 'phone' ? "Entrar com Telefone" : "Verificar Código"} 
        subtitle={phoneStep === 'phone' ? "Digite seu número de telefone para receber um código." : "Digite o código de 6 dígitos enviado para seu telefone."}
      >
        <div className="space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-color-danger/10 border border-color-danger/50 text-color-danger p-4 rounded-xl text-sm font-medium"
            >
              {error}
            </motion.div>
          )}

          {phoneStep === 'phone' ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-muted block tracking-widest ml-1">
                Número de Telefone <span className="text-color-danger">*</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  const val = e.target.value;
                  const sanitized = val.replace(/[^\d+]/g, '');
                  setPhoneNumber(sanitized);
                }}
                className="w-full bg-bg-tertiary/50 border border-border-primary/50 rounded-xl py-3 px-4 text-text-secondary focus:ring-2 focus:ring-color-brand focus:bg-bg-tertiary outline-none transition-all shadow-inner"
                placeholder="+55 11 99999-9999"
              />
              <p className="text-text-muted text-[10px] ml-1">Inclua o código do país (ex: +55)</p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-muted block tracking-widest ml-1">
                Código de Verificação <span className="text-color-danger">*</span>
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full bg-bg-tertiary/50 border border-border-primary/50 rounded-xl py-4 px-4 text-text-secondary focus:ring-2 focus:ring-color-brand focus:bg-bg-tertiary outline-none transition-all text-center tracking-[1em] font-black text-xl"
                placeholder="000000"
                maxLength={6}
              />
            </div>
          )}

          <div id="recaptcha-container" className="flex justify-center my-4 overflow-hidden rounded-xl shadow-lg border border-border-primary/30"></div>

          <div className="space-y-4 pt-2">
            <button
              disabled={isLoading || (phoneStep === 'phone' && !phoneNumber) || (phoneStep === 'code' && verificationCode.length < 6)}
              onClick={() => onPhoneLogin?.(phoneNumber, verificationCode)}
              className="w-full bg-gradient-to-r from-color-brand to-color-accent hover:opacity-90 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-color-brand/20 active:scale-[0.98]"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (phoneStep === 'phone' ? "Enviar Código" : "Verificar e Entrar")}
            </button>

            <button
              type="button"
              onClick={() => {
                if (phoneStep === 'code') {
                  setPhoneStep('phone');
                } else {
                  setIsPhoneMode(false);
                }
              }}
              className="w-full text-text-muted hover:text-text-primary text-sm font-medium transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('login')} subtitle="Estamos muito animados em ver você novamente!">
      <div className="absolute top-4 right-4 flex items-center space-x-2 z-50">
        <AccessibilityMenu />
        <div className="relative group">
          <button className="flex items-center space-x-2 bg-bg-secondary hover:bg-bg-tertiary px-3 py-1.5 rounded-md text-text-secondary text-sm transition-colors border border-border-primary">
            <Globe className="w-4 h-4" />
            <span className="uppercase font-bold">{lang}</span>
          </button>
          <div className="absolute right-0 mt-2 w-40 bg-bg-overlay border border-border-primary rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            {(['pt', 'en', 'es', 'ja'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => changeLanguage(l)}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm hover:bg-bg-tertiary transition-colors first:rounded-t-md last:rounded-b-md",
                  lang === l ? "text-color-brand font-bold" : "text-text-secondary"
                )}
              >
                {l === 'pt' ? 'Português' : l === 'en' ? 'English' : l === 'es' ? 'Español' : '日本語'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onLogin)} className="space-y-6">
        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-color-danger/10 border border-color-danger/50 text-color-danger p-4 rounded-2xl text-sm font-medium"
          >
            {error}
          </motion.div>
        )}
        
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-text-muted block tracking-widest ml-1 opacity-70">
            E-mail, CPF, Telefone ou Usuário <span className="text-color-danger">*</span>
          </label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-color-brand transition-all duration-300" />
            <input
              {...register('identifier')}
              type="text"
              className={cn(
                "w-full bg-bg-tertiary/30 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-text-secondary focus:ring-2 focus:ring-color-brand focus:bg-bg-tertiary/60 outline-none transition-all duration-300 shadow-inner placeholder:text-text-muted/50",
                errors.identifier && "ring-2 ring-color-danger"
              )}
              placeholder="E-mail, CPF, Telefone ou @"
            />
          </div>
          {errors.identifier && <p className="text-color-danger text-[10px] mt-1 ml-1 font-bold">{errors.identifier.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-text-muted block tracking-widest ml-1 opacity-70">
            Senha <span className="text-color-danger">*</span>
          </label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-color-brand transition-all duration-300" />
            <input
              {...register('password')}
              type="password"
              className={cn(
                "w-full bg-bg-tertiary/30 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-text-secondary focus:ring-2 focus:ring-color-brand focus:bg-bg-tertiary/60 outline-none transition-all duration-300 shadow-inner placeholder:text-text-muted/50",
                errors.password && "ring-2 ring-color-danger"
              )}
              placeholder="••••••••"
            />
          </div>
          {errors.password && <p className="text-color-danger text-[10px] mt-1 ml-1 font-bold">{errors.password.message}</p>}
          <button
            type="button"
            onClick={onForgotPasswordClick}
            className="text-color-brand hover:text-color-brand-hover text-xs font-bold mt-2 ml-1 transition-colors opacity-80 hover:opacity-100"
          >
            Esqueceu sua senha?
          </button>
        </div>

        <div className="space-y-4 pt-4">
          <button
            disabled={isLoading}
            type="submit"
            className="w-full bg-gradient-to-r from-color-brand via-[#7289da] to-color-accent hover:brightness-110 text-white font-black py-4 rounded-2xl transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-color-brand/20 active:scale-[0.98] text-lg"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Entrar"}
          </button>

          <div className="relative flex items-center justify-center py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <span className="relative px-4 bg-[#313338] text-[10px] font-black uppercase text-text-muted tracking-widest opacity-50">ou continue com</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {onGoogleLogin && (
              <button
                type="button"
                disabled={isLoading}
                onClick={onGoogleLogin}
                className="bg-white/5 hover:bg-white/10 text-text-primary font-bold py-4 rounded-2xl border border-white/5 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
            )}

            {onPhoneLogin && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setIsPhoneMode(true)}
                className="bg-[#34D399]/10 hover:bg-[#34D399]/20 text-[#34D399] font-bold py-4 rounded-2xl border border-[#34D399]/20 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                Telefone
              </button>
            )}
          </div>

          {onAnonymousLogin && (
            <button
              type="button"
              disabled={isLoading}
              onClick={onAnonymousLogin}
              className="w-full bg-bg-secondary hover:bg-bg-tertiary text-text-secondary font-bold py-3 rounded-xl border border-border-primary/50 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
              Explorar como Visitante
            </button>
          )}
        </div>

        <div className="pt-6 text-center">
          <p className="text-text-muted text-sm font-medium opacity-80">
            Precisando de uma conta?{" "}
            <button
              type="button"
              onClick={onSignUpClick}
              className="text-color-brand hover:text-color-brand-hover font-black transition-colors underline underline-offset-4"
            >
              Registre-se agora
            </button>
          </p>
        </div>
        <div className="pt-6 border-t border-white/5">
          <InstallPWA />
        </div>
      </form>
    </AuthLayout>
  );
};
