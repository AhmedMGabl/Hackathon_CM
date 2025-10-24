import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mentorApi } from '../lib/api';

interface MeetingPrep {
  mentorId: string;
  mentorName: string;
  summary: string;
  missedTargets: string[];
  talkingPoints: string[];
  actionItems: string[];
  strengths: string[];
}

export default function MeetingAlerts() {
  const { user, logout } = useAuth();
  const [mentors, setMentors] = useState<any[]>([]);
  const [selectedMentors, setSelectedMentors] = useState<Set<string>>(new Set());
  const [scoreThreshold, setScoreThreshold] = useState(60);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [createdMeetingId, setCreatedMeetingId] = useState<string | null>(null);
  const [prepResults, setPrepResults] = useState<MeetingPrep[] | null>(null);
  const [emailResults, setEmailResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMentors();
  }, []);

  const loadMentors = async () => {
    try {
      setLoading(true);
      const response = await mentorApi.list({ limit: 100, sortBy: 'weightedScore', sortOrder: 'asc' });
      setMentors(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load mentors');
    } finally {
      setLoading(false);
    }
  };

  const filteredMentors = mentors.filter(m => {
    const score = m.weightedScore || 0;
    return score < scoreThreshold;
  });

  const toggleMentor = (mentorId: string) => {
    const newSelected = new Set(selectedMentors);
    if (newSelected.has(mentorId)) {
      newSelected.delete(mentorId);
    } else {
      newSelected.add(mentorId);
    }
    setSelectedMentors(newSelected);
  };

  const selectAll = () => {
    const allIds = filteredMentors.map(m => m.id);
    setSelectedMentors(new Set(allIds));
  };

  const clearAll = () => {
    setSelectedMentors(new Set());
  };

  const handleCreateMeeting = async () => {
    if (selectedMentors.size === 0) {
      setError('Please select at least one mentor');
      return;
    }

    if (!meetingTitle.trim()) {
      setError('Please enter a meeting title');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: meetingTitle,
          scoreThreshold,
          mentorIds: Array.from(selectedMentors),
          scheduledDate: scheduledDate || undefined,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Extract AI prep results and save meeting ID
        const preps = result.data.aiInsights || [];
        setPrepResults(preps);
        setCreatedMeetingId(result.data.id);
      } else {
        setError(result.error?.message || 'Failed to create meeting');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create meeting');
    } finally {
      setCreating(false);
    }
  };

  const exportToText = () => {
    if (!prepResults) return;

    let text = `# ${meetingTitle}\n\n`;
    text += `Date: ${scheduledDate || 'Not scheduled'}\n`;
    text += `Attendees: ${prepResults.length}\n`;
    text += `Score Threshold: <${scoreThreshold}%\n\n`;
    text += `---\n\n`;

    prepResults.forEach((prep, idx) => {
      text += `## ${idx + 1}. ${prep.mentorName}\n\n`;
      text += `### Summary\n${prep.summary}\n\n`;

      if (prep.missedTargets.length > 0) {
        text += `### Missed Targets\n`;
        prep.missedTargets.forEach(t => text += `- ${t}\n`);
        text += `\n`;
      }

      if (prep.talkingPoints.length > 0) {
        text += `### Talking Points\n`;
        prep.talkingPoints.forEach(p => text += `- ${p}\n`);
        text += `\n`;
      }

      if (prep.actionItems.length > 0) {
        text += `### Action Items\n`;
        prep.actionItems.forEach(a => text += `- ${a}\n`);
        text += `\n`;
      }

      if (prep.strengths.length > 0) {
        text += `### Strengths\n`;
        prep.strengths.forEach(s => text += `- ${s}\n`);
        text += `\n`;
      }

      text += `---\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-prep-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendEmails = async () => {
    if (!createdMeetingId) {
      setError('No meeting ID found');
      return;
    }

    setSendingEmails(true);
    setError(null);

    try {
      const response = await fetch(`/api/meetings/${createdMeetingId}/send-invites`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (result.success && result.data) {
        setEmailResults(result.data);
      } else {
        setError(result.error?.message || 'Failed to send emails');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send emails');
    } finally {
      setSendingEmails(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <p className="text-slate-400">Loading mentors...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-200">CMetrics</h1>
            <p className="text-sm text-slate-400">Meeting Prep</p>
          </div>
          <div className="flex gap-4 items-center">
            <span className="text-slate-300 text-sm">{user?.firstName} {user?.lastName} ({user?.role})</span>
            <button onClick={logout} className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg text-sm hover:bg-slate-600">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {!prepResults ? (
          <>
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-slate-100 mb-2">Schedule Performance Meetings</h2>
              <p className="text-slate-400">Select underperforming mentors and generate AI-powered meeting prep materials</p>
            </div>

            {/* Configuration */}
            <div className="bg-slate-800 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Meeting Configuration</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Meeting Title</label>
                  <input
                    type="text"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="e.g., Q1 Performance Review"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Score Threshold: <span className="text-slate-300 font-bold">{scoreThreshold}%</span>
                  </label>
                  <input
                    type="range"
                    value={scoreThreshold}
                    onChange={(e) => setScoreThreshold(parseInt(e.target.value))}
                    min="0"
                    max="100"
                    step="5"
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0%</span>
                    <span>Show mentors below this score</span>
                    <span>100%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Scheduled Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Mentor Selection */}
            <div className="bg-slate-800 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-100">
                  Select Mentors ({filteredMentors.length} below {scoreThreshold}%)
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="px-3 py-1 text-sm bg-slate-600 text-white rounded hover:bg-slate-700"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearAll}
                    className="px-3 py-1 text-sm bg-slate-600 text-slate-200 rounded hover:bg-slate-500"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredMentors.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No mentors below threshold</p>
                ) : (
                  filteredMentors.map(mentor => (
                    <label
                      key={mentor.id}
                      className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg hover:bg-slate-600 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMentors.has(mentor.id)}
                        onChange={() => toggleMentor(mentor.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-slate-100">{mentor.firstName} {mentor.lastName}</span>
                          <div className="flex gap-3 text-sm">
                            <span className="text-slate-400">Score: <span className="text-amber-400">{(mentor.weightedScore || 0).toFixed(1)}%</span></span>
                            <span className="text-slate-400">Targets: <span className="text-amber-400">{mentor.targetsHit}/4</span></span>
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          CC: {(mentor.avgCcPct || 0).toFixed(1)}% | SC: {(mentor.avgScPct || 0).toFixed(1)}% | UP: {(mentor.avgUpPct || 0).toFixed(1)}% | Fixed: {(mentor.avgFixedPct || 0).toFixed(1)}%
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Create Button */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => window.location.href = '/overview'}
                className="px-6 py-3 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMeeting}
                disabled={creating || selectedMentors.size === 0}
                className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Generating Prep Materials...' : `Create Meeting (${selectedMentors.size} selected)`}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Prep Results */}
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">{meetingTitle}</h2>
                <p className="text-slate-400">Meeting prep for {prepResults.length} mentors</p>
              </div>
              <div className="flex gap-3">
                {!emailResults && (
                  <button
                    onClick={handleSendEmails}
                    disabled={sendingEmails}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sendingEmails ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending Emails...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Send Email Invites
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={exportToText}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Export as Text
                </button>
                <button
                  onClick={() => {
                    setPrepResults(null);
                    setEmailResults(null);
                    setCreatedMeetingId(null);
                  }}
                  className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600"
                >
                  Create Another
                </button>
              </div>
            </div>

            {/* Email Results */}
            {emailResults && (
              <div className="bg-green-900/20 border border-green-700 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-green-400">Email Invites Sent!</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-slate-800 rounded p-3">
                    <div className="text-2xl font-bold text-slate-100">{emailResults.sent}</div>
                    <div className="text-sm text-slate-400">Sent Successfully</div>
                  </div>
                  <div className="bg-slate-800 rounded p-3">
                    <div className="text-2xl font-bold text-slate-100">{emailResults.failed}</div>
                    <div className="text-sm text-slate-400">Failed</div>
                  </div>
                  <div className="bg-slate-800 rounded p-3">
                    <div className="text-2xl font-bold text-slate-100">{emailResults.total}</div>
                    <div className="text-sm text-slate-400">Total</div>
                  </div>
                </div>
                {emailResults.results && emailResults.results.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-300">Email Status:</p>
                    {emailResults.results.map((result: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {result.success ? (
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                          {result.mentorName}
                        </span>
                        {result.error && <span className="text-slate-500">({result.error})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {prepResults.map((prep, idx) => (
              <div key={prep.mentorId} className="bg-slate-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-slate-100 mb-4">{idx + 1}. {prep.mentorName}</h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">SUMMARY</h4>
                    <p className="text-slate-300">{prep.summary}</p>
                  </div>

                  {prep.missedTargets.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-red-400 mb-2">MISSED TARGETS</h4>
                      <ul className="list-disc list-inside space-y-1 text-slate-300">
                        {prep.missedTargets.map((target, i) => (
                          <li key={i}>{target}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {prep.talkingPoints.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-amber-400 mb-2">TALKING POINTS</h4>
                      <ul className="list-disc list-inside space-y-1 text-slate-300">
                        {prep.talkingPoints.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {prep.actionItems.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-green-400 mb-2">ACTION ITEMS</h4>
                      <ul className="list-disc list-inside space-y-1 text-slate-300">
                        {prep.actionItems.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {prep.strengths.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 mb-2">STRENGTHS</h4>
                      <ul className="list-disc list-inside space-y-1 text-slate-300">
                        {prep.strengths.map((strength, i) => (
                          <li key={i}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
