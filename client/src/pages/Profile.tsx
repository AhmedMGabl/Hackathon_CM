import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const { user, logout } = useAuth();
  const [calendlyUrl, setCalendlyUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      // Get current user's calendly URL
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success && result.data) {
        setCalendlyUrl(result.data.calendlyUrl || '');
      }
    } catch (error) {
      console.error('Failed to load profile', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendlyUrl }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        setMessage({ type: 'error', text: result.error?.message || 'Failed to update profile' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <p className="text-slate-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">CMetrics</h1>
            <p className="text-sm text-slate-400">Profile Settings</p>
          </div>
          <div className="flex gap-4 items-center">
            <span className="text-slate-300 text-sm">{user?.firstName} {user?.lastName} ({user?.role})</span>
            <button onClick={logout} className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg text-sm hover:bg-slate-600">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-slate-100 mb-2">Profile Settings</h2>
          <p className="text-slate-400">Manage your account settings and preferences</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}`}>
            <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>{message.text}</p>
          </div>
        )}

        {/* Account Information */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Account Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">First Name</label>
              <div className="px-3 py-2 bg-slate-700 rounded-md text-slate-300">{user?.firstName}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Last Name</label>
              <div className="px-3 py-2 bg-slate-700 rounded-md text-slate-300">{user?.lastName}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
              <div className="px-3 py-2 bg-slate-700 rounded-md text-slate-300">{user?.email}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Role</label>
              <div className="px-3 py-2 bg-slate-700 rounded-md text-slate-300">{user?.role}</div>
            </div>
          </div>
        </div>

        {/* Calendly Settings */}
        {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'LEADER') && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Meeting Scheduling</h3>
            <p className="text-sm text-slate-400 mb-4">
              Add your Calendly booking link to enable email invites with meeting scheduling
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Calendly URL
              </label>
              <input
                type="url"
                value={calendlyUrl}
                onChange={(e) => setCalendlyUrl(e.target.value)}
                placeholder="https://calendly.com/your-name/30min"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Your Calendly booking link will be included in meeting invitation emails sent to mentors
              </p>
            </div>

            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">How to get your Calendly link:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to calendly.com and sign in</li>
                    <li>Create an event type (e.g., "30 Minute Meeting")</li>
                    <li>Copy your event link (looks like: calendly.com/your-name/30min)</li>
                    <li>Paste it here</li>
                  </ol>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Back Button */}
        <div className="flex justify-start">
          <button
            onClick={() => window.location.href = '/overview'}
            className="px-6 py-3 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
