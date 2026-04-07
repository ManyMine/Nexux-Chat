import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AuthLayout } from './AuthLayout';
import { motion } from 'motion/react';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const signUpSchema = z.object({
  email: z.string().email('Email inválido'),
  displayName: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

interface SignUpProps {
  onSignUp: (values: SignUpFormValues) => Promise<void>;
  onLoginClick: () => void;
  onGoogleLogin?: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export const SignUp: React.FC<SignUpProps> = ({ 
  onSignUp, 
  onLoginClick, 
  onGoogleLogin,
  isLoading,
  error 
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  return (
    <AuthLayout title="Criar uma conta" subtitle="Junte-se à nossa comunidade hoje!">
      <form onSubmit={handleSubmit(onSignUp)} className="space-y-6">
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

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-[#b5bac1] block">
            Nome de exibição <span className="text-[#f23f42]">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#80848e]" />
            <input
              {...register('displayName')}
              type="text"
              className={cn(
                "w-full bg-[#1e1f22] border-none rounded-md py-2.5 pl-10 pr-4 text-[#dbdee1] focus:ring-2 focus:ring-[#5865f2] outline-none transition-all",
                errors.displayName && "ring-2 ring-[#f23f42]"
              )}
              placeholder="Como quer ser chamado?"
            />
          </div>
          {errors.displayName && <p className="text-[#f23f42] text-xs mt-1">{errors.displayName.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-[#b5bac1] block">
            Senha <span className="text-[#f23f42]">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#80848e]" />
            <input
              {...register('password')}
              type="password"
              className={cn(
                "w-full bg-[#1e1f22] border-none rounded-md py-2.5 pl-10 pr-4 text-[#dbdee1] focus:ring-2 focus:ring-[#5865f2] outline-none transition-all",
                errors.password && "ring-2 ring-[#f23f42]"
              )}
              placeholder="••••••••"
            />
          </div>
          {errors.password && <p className="text-[#f23f42] text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-[#b5bac1] block">
            Confirmar Senha <span className="text-[#f23f42]">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#80848e]" />
            <input
              {...register('confirmPassword')}
              type="password"
              className={cn(
                "w-full bg-[#1e1f22] border-none rounded-md py-2.5 pl-10 pr-4 text-[#dbdee1] focus:ring-2 focus:ring-[#5865f2] outline-none transition-all",
                errors.confirmPassword && "ring-2 ring-[#f23f42]"
              )}
              placeholder="••••••••"
            />
          </div>
          {errors.confirmPassword && <p className="text-[#f23f42] text-xs mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <div className="space-y-3">
          <button
            disabled={isLoading}
            type="submit"
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Registrar"}
          </button>

          {onGoogleLogin && (
            <button
              type="button"
              disabled={isLoading}
              onClick={onGoogleLogin}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-3 rounded-md transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Registrar com Google
            </button>
          )}
        </div>

        <p className="text-[#949ba4] text-sm mt-4">
          Já tem uma conta?{" "}
          <button
            type="button"
            onClick={onLoginClick}
            className="text-[#00a8fc] hover:underline"
          >
            Entrar
          </button>
        </p>
      </form>
    </AuthLayout>
  );
};
