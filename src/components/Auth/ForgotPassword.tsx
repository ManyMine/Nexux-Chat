import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AuthLayout } from './AuthLayout';
import { motion } from 'motion/react';
import { Mail, Loader2, ArrowLeft, ShieldQuestion, Lock, Send, UserCog } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { getUserByEmail, verifySecurityAnswer } from '@/src/services/firebaseService';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
  securityAnswer: z.string().optional(),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordProps {
  onReset: (values: { email: string }) => Promise<void>;
  onBackToLogin: () => void;
  isLoading?: boolean;
  error?: string | null;
  success?: boolean;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ 
  onReset, 
  onBackToLogin, 
  isLoading,
  error,
  success
}) => {
  const [step, setStep] = React.useState<'email' | 'choice' | 'security'>('email');
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [securityError, setSecurityError] = React.useState<string | null>(null);
  const [isVerifying, setIsVerifying] = React.useState(false);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
      securityAnswer: ''
    }
  });

  const handleEmailSubmit = async (data: ForgotPasswordFormValues) => {
    setIsVerifying(true);
    setSecurityError(null);
    try {
      const profile = await getUserByEmail(data.email);
      if (!profile) {
        setSecurityError("E-mail não encontrado em nossa base de dados.");
        return;
      }
      setUserProfile(profile);
      setStep('choice');
    } catch (err) {
      setSecurityError("Ocorreu um erro ao buscar seu usuário. Tente novamente.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSecuritySubmit = async (data: ForgotPasswordFormValues) => {
    if (!data.securityAnswer) return;
    setIsVerifying(true);
    setSecurityError(null);
    try {
      const isValid = await verifySecurityAnswer(data.email, data.securityAnswer);
      if (isValid) {
        await onReset({ email: data.email });
      } else {
        setSecurityError("A resposta da pergunta de segurança está incorreta.");
      }
    } catch (err) {
      setSecurityError("Erro ao verificar resposta. Tente novamente.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleContactAdmin = () => {
    // Obfuscated email link
    const user = 'belepuff';
    const domain = 'gmail.com';
    window.location.href = `mailto:${user}@${domain}?subject=Recuperação de Conta - Noton Nexus`;
  };

  if (success) {
    return (
      <AuthLayout title="Tudo pronto!" subtitle="Verifique sua caixa de entrada.">
        <div className="space-y-6">
          <div className="bg-color-success/10 border border-color-success/20 p-6 rounded-2xl text-center">
            <div className="w-16 h-16 bg-color-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-color-success" />
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">
              Enviamos um link de redefinição para <span className="font-bold text-text-primary">{getValues('email')}</span>. 
              Siga as instruções no e-mail para criar uma nova senha.
            </p>
          </div>
          <button
            onClick={onBackToLogin}
            className="w-full bg-bg-tertiary hover:bg-bg-overlay text-text-primary font-bold py-4 rounded-2xl transition-all flex items-center justify-center shadow-lg"
          >
            Voltar para o Login
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title={step === 'email' ? "Recuperar Acesso" : step === 'choice' ? "Escolha o Método" : "Segurança"} 
      subtitle={step === 'email' ? "Informe seu e-mail para localizarmos sua conta." : step === 'choice' ? "Como você prefere recuperar sua senha?" : "Responda à pergunta de segurança configurada."}
    >
      <div className="space-y-6">
        {(error || securityError) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-color-danger/10 border border-color-danger/20 text-color-danger p-4 rounded-2xl text-sm font-medium"
          >
            {error || securityError}
          </motion.div>
        )}

        {step === 'email' && (
          <form onSubmit={handleSubmit(handleEmailSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-text-muted tracking-widest ml-1">E-mail de Cadastro</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-text-muted group-focus-within:text-color-brand transition-colors" />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-text-primary placeholder:text-text-muted/50 focus:ring-2 focus:ring-color-brand/50 focus:border-color-brand outline-none transition-all",
                    errors.email && "border-color-danger ring-2 ring-color-danger/20"
                  )}
                  placeholder="seu@email.com"
                />
              </div>
              {errors.email && <p className="text-color-danger text-xs font-bold mt-1 ml-1">{errors.email.message}</p>}
            </div>
            <button
              disabled={isVerifying}
              type="submit"
              className="w-full bg-gradient-to-r from-color-brand to-color-accent hover:brightness-110 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center shadow-lg shadow-color-brand/20 disabled:opacity-50"
            >
              {isVerifying ? <Loader2 className="w-6 h-6 animate-spin" /> : "Buscar Conta"}
            </button>
          </form>
        )}

        {step === 'choice' && (
          <div className="space-y-6">
            <div className="flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/10 mb-2">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-16 h-16 rounded-full mb-3 border-2 border-color-brand object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-color-brand/20 flex items-center justify-center mb-3 border-2 border-color-brand">
                  <span className="text-2xl font-bold text-color-brand">{userProfile?.displayName?.charAt(0)}</span>
                </div>
              )}
              <h4 className="font-bold text-text-primary">{userProfile?.displayName}</h4>
              <p className="text-xs text-text-muted">{userProfile?.email}</p>
            </div>

            <div className="space-y-4">
              <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onReset({ email: getValues('email') })}
              className="w-full bg-white/5 hover:bg-white/10 text-text-primary p-5 rounded-2xl border border-white/10 flex items-center space-x-4 transition-all group"
            >
              <div className="bg-color-brand/20 p-3 rounded-xl group-hover:bg-color-brand transition-colors">
                <Send className="w-6 h-6 text-color-brand group-hover:text-white" />
              </div>
              <div className="text-left">
                <p className="font-black text-sm tracking-tight">Enviar Link por E-mail</p>
                <p className="text-xs text-text-muted font-medium">Link funcional de redefinição</p>
              </div>
            </motion.button>

            {userProfile?.securityQuestion && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep('security')}
                className="w-full bg-white/5 hover:bg-white/10 text-text-primary p-5 rounded-2xl border border-white/10 flex items-center space-x-4 transition-all group"
              >
                <div className="bg-color-success/20 p-3 rounded-xl group-hover:bg-color-success transition-colors">
                  <ShieldQuestion className="w-6 h-6 text-color-success group-hover:text-white" />
                </div>
                <div className="text-left">
                  <p className="font-black text-sm tracking-tight">Pergunta de Segurança</p>
                  <p className="text-xs text-text-muted font-medium">Recuperar via resposta secreta</p>
                </div>
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleContactAdmin}
              className="w-full bg-white/5 hover:bg-white/10 text-text-primary p-5 rounded-2xl border border-white/10 flex items-center space-x-4 transition-all group"
            >
              <div className="bg-color-accent/20 p-3 rounded-xl group-hover:bg-color-accent transition-colors">
                <UserCog className="w-6 h-6 text-color-accent group-hover:text-white" />
              </div>
              <div className="text-left">
                <p className="font-black text-sm tracking-tight">Contatar Administrador</p>
                <p className="text-xs text-text-muted font-medium">Suporte direto via e-mail</p>
              </div>
            </motion.button>
          </div>
        </div>
      )}

        {step === 'security' && (
          <form onSubmit={handleSubmit(handleSecuritySubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-2">Sua Pergunta de Segurança:</p>
                <p className="text-text-primary font-bold text-lg leading-tight">{userProfile.securityQuestion}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-text-muted tracking-widest ml-1">Sua Resposta</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-text-muted group-focus-within:text-color-brand transition-colors" />
                  </div>
                  <input
                    {...register('securityAnswer')}
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-text-primary placeholder:text-text-muted/50 focus:ring-2 focus:ring-color-brand/50 focus:border-color-brand outline-none transition-all"
                    placeholder="Digite sua resposta secreta"
                  />
                </div>
              </div>
            </div>
            <button
              disabled={isVerifying}
              type="submit"
              className="w-full bg-color-success hover:brightness-110 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center shadow-lg shadow-color-success/20 disabled:opacity-50"
            >
              {isVerifying ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verificar Resposta"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={step === 'email' ? onBackToLogin : () => setStep('email')}
          className="w-full flex items-center justify-center text-text-muted hover:text-text-primary text-sm font-bold transition-colors py-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 'email' ? "Voltar para o Login" : "Voltar para Busca"}
        </button>
      </div>
    </AuthLayout>
  );
};
