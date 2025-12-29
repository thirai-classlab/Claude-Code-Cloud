'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Clear errors on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Basic validation
    if (!email.trim()) {
      setLocalError('Please enter your email address');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setLocalError('Please enter a password');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await register(email, password, displayName.trim() || undefined);
      router.push('/');
    } catch {
      // Error is handled by the store
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-primary p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-500" />
          <h1 className="text-2xl font-semibold text-text-primary">Claude Code</h1>
        </div>

        {/* Register Form */}
        <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6">
          <h2 className="text-lg font-medium text-text-primary mb-6 text-center">
            Create your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-secondary"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isLoading}
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-lg',
                  'bg-bg-tertiary border border-border',
                  'text-text-primary placeholder:text-text-tertiary',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors duration-fast'
                )}
              />
            </div>

            {/* Display Name Field (Optional) */}
            <div className="space-y-2">
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-text-secondary"
              >
                Display Name
                <span className="text-text-tertiary ml-1">(optional)</span>
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
                autoComplete="name"
                disabled={isLoading}
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-lg',
                  'bg-bg-tertiary border border-border',
                  'text-text-primary placeholder:text-text-tertiary',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors duration-fast'
                )}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-secondary"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                disabled={isLoading}
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-lg',
                  'bg-bg-tertiary border border-border',
                  'text-text-primary placeholder:text-text-tertiary',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors duration-fast'
                )}
              />
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-text-secondary"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={isLoading}
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-lg',
                  'bg-bg-tertiary border border-border',
                  'text-text-primary placeholder:text-text-tertiary',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors duration-fast'
                )}
              />
            </div>

            {/* Error Message */}
            {displayError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{displayError}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full py-2.5 px-4 rounded-lg font-medium',
                'bg-accent text-white',
                'hover:bg-accent-hover',
                'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-fast'
              )}
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-6 border-t border-border-subtle text-center">
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-accent hover:text-accent-hover transition-colors duration-fast"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-text-tertiary">
          Web-based coding assistant powered by Claude
        </p>
      </div>
    </div>
  );
}
