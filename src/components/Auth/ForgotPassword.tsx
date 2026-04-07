import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AuthLayout } from './AuthLayout';
import { motion } from 'motion/react';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordProps {
  onReset: (values: ForgotPasswordFormValues) => Promise<void>;
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
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  if (success) {
    return (
      <AuthLayout title="E-mail enviado!" subtitle="Verifique sua caixa de entrada para redefinir sua senha.">
        <button
          onClick={onBackToLogin}
          className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center"
        >
          Voltar para o Login
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Esqueceu sua senha?" subtitle="Digite seu e-mail e enviaremos um link para redefinir sua senha.">
      <form onSubmit={handleSubmit(onReset)} className="space-y-6">
        {error && (
          <div className="bg-[#f23f42]/10 border border-[#f23f42]/50 text-[#f23f42] p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-[#b5bac1] block">
            E-mail <span className="text-[#f23f42]">*</span>
          </label>
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
          disabled={isLoading}
          type="submit"
          className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar link"}
        </button>

        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full flex items-center justify-center text-[#b5bac1] hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para o Login
        </button>
      </form>
    </AuthLayout>
  );
};
