import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tokens } from '../config/tokens';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/overview');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: tokens.colors.surface.dark,
        padding: tokens.spacing[4],
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: tokens.colors.surface.card,
          borderRadius: tokens.radii.lg,
          boxShadow: tokens.shadows.elevated,
          padding: tokens.spacing[8],
        }}
      >
        {/* Logo/Header */}
        <div style={{ textAlign: 'center', marginBottom: tokens.spacing[8] }}>
          <h1
            style={{
              fontSize: tokens.typography.fontSize['3xl'],
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.primary[600],
              marginBottom: tokens.spacing[2],
            }}
          >
            CMetrics
          </h1>
          <p
            style={{
              fontSize: tokens.typography.fontSize.sm,
              color: tokens.colors.neutral[400],
            }}
          >
            Operational clarity for Course Mentors
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            style={{
              padding: tokens.spacing[3],
              marginBottom: tokens.spacing[4],
              background: tokens.colors.danger[900] + '20',
              border: `1px solid ${tokens.colors.danger[600]}`,
              borderRadius: tokens.radii.md,
              color: tokens.colors.danger[400],
              fontSize: tokens.typography.fontSize.sm,
            }}
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: tokens.spacing[4] }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                marginBottom: tokens.spacing[2],
                fontSize: tokens.typography.fontSize.sm,
                fontWeight: tokens.typography.fontWeight.medium,
                color: tokens.colors.neutral[300],
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: tokens.spacing[3],
                background: tokens.colors.surface.dark,
                border: `1px solid ${tokens.colors.neutral[700]}`,
                borderRadius: tokens.radii.md,
                color: tokens.colors.neutral[100],
                fontSize: tokens.typography.fontSize.base,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = tokens.colors.primary[600];
              }}
              onBlur={(e) => {
                e.target.style.borderColor = tokens.colors.neutral[700];
              }}
            />
          </div>

          <div style={{ marginBottom: tokens.spacing[6] }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                marginBottom: tokens.spacing[2],
                fontSize: tokens.typography.fontSize.sm,
                fontWeight: tokens.typography.fontWeight.medium,
                color: tokens.colors.neutral[300],
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: tokens.spacing[3],
                background: tokens.colors.surface.dark,
                border: `1px solid ${tokens.colors.neutral[700]}`,
                borderRadius: tokens.radii.md,
                color: tokens.colors.neutral[100],
                fontSize: tokens.typography.fontSize.base,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = tokens.colors.primary[600];
              }}
              onBlur={(e) => {
                e.target.style.borderColor = tokens.colors.neutral[700];
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: tokens.spacing[3],
              background: loading ? tokens.colors.neutral[700] : tokens.colors.primary[600],
              color: tokens.colors.neutral[50],
              border: 'none',
              borderRadius: tokens.radii.md,
              fontSize: tokens.typography.fontSize.base,
              fontWeight: tokens.typography.fontWeight.semibold,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = tokens.colors.primary[700];
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = tokens.colors.primary[600];
              }
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Demo Credentials */}
        <div
          style={{
            marginTop: tokens.spacing[6],
            paddingTop: tokens.spacing[6],
            borderTop: `1px solid ${tokens.colors.neutral[800]}`,
          }}
        >
          <p
            style={{
              fontSize: tokens.typography.fontSize.xs,
              color: tokens.colors.neutral[500],
              marginBottom: tokens.spacing[2],
            }}
          >
            Demo Credentials:
          </p>
          <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.neutral[400] }}>
            <p style={{ marginBottom: tokens.spacing[1] }}>
              <strong>Admin:</strong> admin@cmetrics.app / Admin123!
            </p>
            <p style={{ marginBottom: tokens.spacing[1] }}>
              <strong>Leader (Alpha):</strong> kiran@cmetrics.app / Leader123!
            </p>
            <p>
              <strong>Leader (Beta):</strong> aisha@cmetrics.app / Leader123!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
