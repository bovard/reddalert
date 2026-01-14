import { signInWithGoogle } from '../lib/firebase';
import { Bell } from 'lucide-react';
import { useState } from 'react';

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: 'var(--md-background)' }}
    >
      <div className="w-full max-w-sm text-center">
        {/* App Icon */}
        <div
          className="w-28 h-28 rounded-3xl mx-auto flex items-center justify-center mb-8 md-elevation-3"
          style={{ backgroundColor: 'var(--md-primary-container)' }}
        >
          <Bell className="w-14 h-14" style={{ color: 'var(--md-on-primary-container)' }} />
        </div>

        {/* App Name */}
        <h1
          className="text-4xl font-bold mb-4"
          style={{ color: 'var(--md-on-background)' }}
        >
          Reddalert
        </h1>

        {/* Tagline */}
        <p
          className="text-lg mb-16"
          style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}
        >
          Monitor Reddit for Catan discussions
        </p>

        {/* Error message */}
        {error && (
          <div
            className="rounded-2xl text-sm px-5 py-4 mb-8"
            style={{
              backgroundColor: 'var(--md-error-container)',
              color: 'var(--md-on-error-container)',
            }}
          >
            {error}
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full font-medium py-4 px-6 rounded-full flex items-center justify-center gap-3 transition-all md-elevation-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
          style={{
            backgroundColor: 'var(--md-primary)',
            color: 'var(--md-on-primary)',
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        {/* Terms */}
        <p
          className="mt-16 text-sm"
          style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}
        >
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
