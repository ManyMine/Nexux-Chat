import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AuthLayout } from './AuthLayout';
import { motion } from 'motion/react';
import { Mail, Lock, Loader2, Globe } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { setupRecaptcha, clearRecaptcha } from '@/src/services/firebaseService';
import { useI18n, Language } from '@/src/lib/i18n';

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
            <div className="bg-color-danger/10 border border-color-danger/50 text-color-danger p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {phoneStep === 'phone' ? (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-text-muted block">
                Número de Telefone <span className="text-color-danger">*</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  const val = e.target.value;
                  // Allow only digits and +
                  const sanitized = val.replace(/[^\d+]/g, '');
                  setPhoneNumber(sanitized);
                }}
                className="w-full bg-bg-tertiary border-none rounded-md py-2.5 px-4 text-text-secondary focus:ring-2 focus:ring-color-brand outline-none transition-all"
                placeholder="+55 11 99999-9999"
              />
              <p className="text-text-muted text-[10px]">Inclua o código do país (ex: +55)</p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-text-muted block">
                Código de Verificação <span className="text-color-danger">*</span>
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full bg-bg-tertiary border-none rounded-md py-2.5 px-4 text-text-secondary focus:ring-2 focus:ring-color-brand outline-none transition-all text-center tracking-[1em] font-bold"
                placeholder="000000"
                maxLength={6}
              />
            </div>
          )}

          <div id="recaptcha-container" className="flex justify-center my-4 overflow-hidden rounded-md"></div>

          <div className="space-y-3">
            <button
              disabled={isLoading || (phoneStep === 'phone' && !phoneNumber) || (phoneStep === 'code' && verificationCode.length < 6)}
              onClick={() => onPhoneLogin?.(phoneNumber, verificationCode)}
              className="w-full bg-color-brand hover:bg-color-brand-hover text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (phoneStep === 'phone' ? "Enviar Código" : "Verificar e Entrar")}
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
      <div className="absolute top-4 right-4 group">
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

      <form onSubmit={handleSubmit(onLogin)} className="space-y-6">
        {error && (
          <div className="bg-color-danger/10 border border-color-danger/50 text-color-danger p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-text-muted block">
            E-mail, CPF, Telefone ou Usuário <span className="text-color-danger">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              {...register('identifier')}
              type="text"
              className={cn(
                "w-full bg-bg-tertiary border-none rounded-md py-2.5 pl-10 pr-4 text-text-secondary focus:ring-2 focus:ring-color-brand outline-none transition-all",
                errors.identifier && "ring-2 ring-color-danger"
              )}
              placeholder="E-mail, CPF, Telefone ou @"
            />
          </div>
          {errors.identifier && <p className="text-color-danger text-xs mt-1">{errors.identifier.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-text-muted block">
            Senha <span className="text-color-danger">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              {...register('password')}
              type="password"
              className={cn(
                "w-full bg-bg-tertiary border-none rounded-md py-2.5 pl-10 pr-4 text-text-secondary focus:ring-2 focus:ring-color-brand outline-none transition-all",
                errors.password && "ring-2 ring-color-danger"
              )}
              placeholder="••••••••"
            />
          </div>
          {errors.password && <p className="text-color-danger text-xs mt-1">{errors.password.message}</p>}
          <button
            type="button"
            onClick={onForgotPasswordClick}
            className="text-color-brand hover:underline mt-1 block"
          >
            Esqueceu sua senha?
          </button>
        </div>

        <div className="space-y-3">
          <button
            disabled={isLoading}
            type="submit"
            className="w-full bg-color-brand hover:bg-color-brand-hover text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar"}
          </button>

          {onGoogleLogin && (
            <button
              type="button"
              disabled={isLoading}
              onClick={onGoogleLogin}
              className="w-full bg-bg-primary hover:bg-bg-tertiary text-text-primary font-bold py-3 rounded-md border border-border-primary transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Entrar com Google
            </button>
          )}

          {onPhoneLogin && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setIsPhoneMode(true)}
              className="w-full bg-[#34D399] hover:bg-[#10B981] text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Entrar com Telefone
            </button>
          )}

          {onAnonymousLogin && (
            <button
              type="button"
              disabled={isLoading}
              onClick={onAnonymousLogin}
              className="w-full bg-bg-secondary hover:bg-bg-tertiary text-text-secondary font-bold py-3 rounded-md border border-border-primary transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
              Explorar como Visitante (30 min)
            </button>
          )}
        </div>

        <p className="text-text-muted text-sm mt-4">
          Precisando de uma conta?{" "}
          <button
            type="button"
            onClick={onSignUpClick}
            className="text-color-brand hover:underline"
          >
            Registre-se
          </button>
        </p>
      </form>
    </AuthLayout>
  );
};
