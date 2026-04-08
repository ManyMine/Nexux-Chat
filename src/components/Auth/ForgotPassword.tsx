import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AuthLayout } from './AuthLayout';
import { motion } from 'motion/react';
import { Mail, Loader2, ArrowLeft, ShieldQuestion, Lock, Send } from 'lucide-react';
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
  });

  const handleEmailSubmit = async (data: ForgotPasswordFormValues) => {
    setIsVerifying(true);
    setSecurityError(null);
    try {
      const profile = await getUserByEmail(data.email);
      if (!profile) {
        setSecurityError("E-mail não encontrado.");
        return;
      }
      setUserProfile(profile);
      setStep('choice');
    } catch (err) {
      setSecurityError("Erro ao buscar usuário.");
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
        alert("Resposta correta! Um link de redefinição foi enviado para o seu e-mail como medida de segurança adicional.");
        await onReset({ email: data.email });
      } else {
        setSecurityError("Resposta incorreta.");
      }
    } catch (err) {
      setSecurityError("Erro ao verificar resposta.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="E-mail enviado!" subtitle="Verifique sua caixa de entrada para redefinir sua senha.">
        <div className="space-y-4">
          <p className="text-[#dbdee1] text-center text-sm">
            Enviamos as instruções para o e-mail informado.
          </p>
          <button
            onClick={onBackToLogin}
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center"
          >
            Voltar para o Login
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title={step === 'email' ? "Esqueceu sua senha?" : step === 'choice' ? "Como deseja recuperar?" : "Pergunta de Segurança"} 
      subtitle={step === 'email' ? "Digite seu e-mail para começar." : step === 'choice' ? "Escolha um método de recuperação." : "Responda à pergunta que você configurou."}
    >
      <div className="space-y-6">
        {(error || securityError) && (
          <div className="bg-[#f23f42]/10 border border-[#f23f42]/50 text-[#f23f42] p-3 rounded-md text-sm">
            {error || securityError}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleSubmit(handleEmailSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-[#b5bac1] block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#80848e]" />
                <input
                  {...register('email')}
                  type="email"
                  className={cn(
                    "w-full bg-[#1e1f22] border-none rounded-md py-2.5 pl-10 pr-4 text-[#dbdee1] focus:ring-2 focus:ring-[#5865f2] outline-none transition-all",
                    errors.email && "ring-2 ring-[#f23f42]"
                  )}
                  placeholder="exemplo@email.com"
                />
              </div>
              {errors.email && <p className="text-[#f23f42] text-xs mt-1">{errors.email.message}</p>}
            </div>
            <button
              disabled={isVerifying}
              type="submit"
              className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continuar"}
            </button>
          </form>
        )}

        {step === 'choice' && (
          <div className="space-y-3">
            <button
              onClick={() => onReset({ email: getValues('email') })}
              className="w-full bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] p-4 rounded-md border border-[#1e1f22] flex items-center space-x-4 transition-all group"
            >
              <div className="bg-[#5865f2] p-2 rounded-full group-hover:scale-110 transition-transform">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Enviar E-mail</p>
                <p className="text-xs text-[#949ba4]">Receba um link de redefinição</p>
              </div>
            </button>

            {userProfile?.securityQuestion ? (
              <button
                onClick={() => setStep('security')}
                className="w-full bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] p-4 rounded-md border border-[#1e1f22] flex items-center space-x-4 transition-all group"
              >
                <div className="bg-[#23a559] p-2 rounded-full group-hover:scale-110 transition-transform">
                  <ShieldQuestion className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Pergunta de Segurança</p>
                  <p className="text-xs text-[#949ba4]">Responda para recuperar</p>
                </div>
              </button>
            ) : (
              <div className="p-3 bg-[#1e1f22] rounded-md border border-dashed border-[#3f4147]">
                <p className="text-[10px] text-[#949ba4] text-center italic">
                  Pergunta de segurança não configurada para esta conta.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 'security' && (
          <form onSubmit={handleSubmit(handleSecuritySubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-[#1e1f22] rounded-md border border-[#3f4147]">
                <p className="text-xs text-[#b5bac1] uppercase font-bold mb-1">Sua Pergunta:</p>
                <p className="text-[#dbdee1] font-medium">{userProfile.securityQuestion}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-[#b5bac1] block">Sua Resposta</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#80848e]" />
                  <input
                    {...register('securityAnswer')}
                    type="text"
                    className="w-full bg-[#1e1f22] border-none rounded-md py-2.5 pl-10 pr-4 text-[#dbdee1] focus:ring-2 focus:ring-[#5865f2] outline-none transition-all"
                    placeholder="Digite sua resposta"
                  />
                </div>
              </div>
            </div>
            <button
              disabled={isVerifying}
              type="submit"
              className="w-full bg-[#23a559] hover:bg-[#1f8f4c] text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verificar Resposta"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={step === 'email' ? onBackToLogin : () => setStep('email')}
          className="w-full flex items-center justify-center text-[#b5bac1] hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 'email' ? "Voltar para o Login" : "Voltar"}
        </button>
      </div>
    </AuthLayout>
  );
};
