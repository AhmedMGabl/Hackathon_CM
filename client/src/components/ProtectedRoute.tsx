import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tokens } from '../config/tokens';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
};

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireSuperAdmin = false,
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: tokens.colors.surface.dark,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: `4px solid ${tokens.colors.neutral[800]}`,
              borderTop: `4px solid ${tokens.colors.primary[600]}`,
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ color: tokens.colors.neutral[400], fontSize: tokens.typography.fontSize.sm }}>
            Loading...
          </p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const needsSuperAdmin = requireSuperAdmin && !isSuperAdmin;
  const needsAdmin = !needsSuperAdmin && requireAdmin && !isAdmin;

  if (needsSuperAdmin || needsAdmin) {
    const message = needsSuperAdmin
      ? 'Super admin privileges required.'
      : 'Admin privileges required.';

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
            maxWidth: '400px',
            textAlign: 'center',
            padding: tokens.spacing[8],
            background: tokens.colors.surface.card,
            borderRadius: tokens.radii.lg,
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 24px',
              background: tokens.colors.danger[900] + '20',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '32px', color: tokens.colors.danger[600] }}>⚠️</span>
          </div>
          <h2
            style={{
              fontSize: tokens.typography.fontSize['2xl'],
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.neutral[100],
              marginBottom: tokens.spacing[2],
            }}
          >
            Access Denied
          </h2>
          <p style={{ color: tokens.colors.neutral[400], marginBottom: tokens.spacing[6] }}>
            You don&apos;t have permission to access this page. {message}
          </p>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
              background: tokens.colors.primary[600],
              color: tokens.colors.neutral[50],
              border: 'none',
              borderRadius: tokens.radii.md,
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.semibold,
              cursor: 'pointer',
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
