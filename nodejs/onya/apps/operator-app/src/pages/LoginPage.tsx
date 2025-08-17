import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    await login(data.email, data.password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">O</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-secondary-900">
            Onya Operator Dashboard
          </h2>
          <p className="mt-2 text-sm text-secondary-600">
            Sign in to manage customer conversations
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Input
              {...register('email')}
              type="email"
              label="Email address"
              placeholder="operator@company.com"
              icon={<Mail />}
              error={errors.email?.message}
              autoComplete="email"
              autoFocus
            />

            <div className="relative">
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="Enter your password"
                icon={<Lock />}
                error={errors.password?.message}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-secondary-400 hover:text-secondary-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full"
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-secondary-500">
              Having trouble accessing your account?{' '}
              <a href="#" className="text-primary-600 hover:text-primary-500">
                Contact your administrator
              </a>
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-secondary-400">
            © 2024 Onya Customer Service Platform
          </p>
        </div>
      </div>
    </div>
  );
};