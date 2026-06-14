import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:8000';

const MentorPortal = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [mentorInfo, setMentorInfo] = useState(null);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [tokenError, setTokenError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Nomination state
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [alreadyNominated, setAlreadyNominated] = useState(false);

  useEffect(() => {
    if (!token) { setTokenError(true); setLoading(false); return; }
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      const payload = JSON.parse(jsonPayload);
      if (payload.role !== 'Mentor') { setTokenError(true); setLoading(false); return; }
      setMentorInfo({ name: payload.name, email: payload.email });
      loadPortal(payload.email);
    } catch (err) {
      console.error("Invalid JWT", err);
      setTokenError(true);
      setLoading(false);
    }
  }, [token]);

  const loadPortal = async (email) => {
    try {
      // Find mentor by email
      const mentorsRes = await axios.get(`${API}/mentors`);
      const mentor = mentorsRes.data.find(m => m.email === email);
      if (!mentor || !mentor.assigned_team_id) {
        setLoading(false);
        return;
      }

      setMentorInfo(prev => ({ ...prev, id: mentor.id }));

      // Get team details
      const teamsRes = await axios.get(`${API}/teams`);
      const assignedTeam = teamsRes.data.find(t => t.id === mentor.assigned_team_id);
      if (assignedTeam) {
        setTeam(assignedTeam);
        setMembers(assignedTeam.members || []);
      }

      // Check if already nominated
      const nominationsRes = await axios.get(`${API}/special-mention`);
      const existing = nominationsRes.data.find(n => n.team_id === mentor.assigned_team_id);
      if (existing) setAlreadyNominated(true);

    } catch (err) {
      console.error("Failed to load mentor portal", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (id) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedMemberIds(members.map(m => m.id));
  const clearAll = () => setSelectedMemberIds([]);

  const handleNominate = async () => {
    if (selectedMemberIds.length === 0) {
      setSubmitStatus('❌ Please select at least one member to nominate.');
      return;
    }
    if (!reason.trim()) {
      setSubmitStatus('❌ Please provide a reason for the nomination.');
      return;
    }

    setSubmitting(true);
    setSubmitStatus('');
    try {
      await axios.post(`${API}/special-mention/nominate`, {
        mentor_id: mentorInfo.id,
        team_id: team.id,
        nominated_member_ids: selectedMemberIds,
        reason: reason.trim()
      });
      setSubmitStatus('✅ Nomination submitted successfully! The committee will review it shortly.');
      setAlreadyNominated(true);
    } catch (err) {
      setSubmitStatus(`❌ ${err.response?.data?.detail || 'Nomination failed.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenError) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="p-8 max-w-xl mx-auto bg-red-50 border border-red-200 rounded-xl text-center text-red-800">
        <h2 className="text-xl font-bold mb-2">Invalid or Missing Access Token</h2>
        <p>A secure magic link is required to access the Mentor Portal.</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-500 font-medium">Loading Mentor Portal...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white px-8 py-5">
        <h2 className="text-xl font-bold">Mentor Portal</h2>
        <p className="text-slate-400 text-sm mt-1">
          Welcome, <span className="text-white font-semibold">{mentorInfo?.name}</span>
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* No team assigned */}
        {!team && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">🧑‍🏫</div>
            <p className="text-slate-600 font-medium">You have not been assigned to a team yet.</p>
            <p className="text-slate-400 text-sm mt-1">Please check back once teams have been formed.</p>
          </div>
        )}

        {/* Team assigned */}
        {team && (
          <>
            {/* Team status card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-800">Your Assigned Team</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  team.is_qualified
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                }`}>
                  {team.is_qualified ? '✅ Qualified' : '❌ Eliminated'}
                </span>
              </div>

              <p className="text-sm mb-4">
                <strong className="text-slate-600">Team Name:</strong>
                <span className="font-bold text-blue-600 ml-2">{team.name}</span>
              </p>

              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="font-medium text-slate-800">{m.name}</span>
                    <span className="text-sm text-slate-500">{m.skill}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Mention Nomination — only show if eliminated */}
            {!team.is_qualified && (
              <div className="bg-white border border-indigo-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-indigo-800 mb-1">⭐ Nominate for Special Mention</h3>
                <p className="text-sm text-slate-500 mb-5">
                  Your team was eliminated but if members had valid reasons (exams, medical, etc), you can nominate them as a wildcard entry to the finals. They will compete separately for a Special Mention Award.
                </p>

                {alreadyNominated ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 font-medium text-sm">
                    ✅ You have already submitted a nomination for this team. The committee is reviewing it.
                  </div>
                ) : (
                  <>
                    {/* Member selection */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-slate-700">Select Members to Nominate</label>
                        <div className="flex gap-2">
                          <button onClick={selectAll} className="text-xs text-indigo-600 hover:underline">Select All</button>
                          <span className="text-slate-300">|</span>
                          <button onClick={clearAll} className="text-xs text-slate-500 hover:underline">Clear</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {members.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => toggleMember(m.id)}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedMemberIds.includes(m.id)
                                ? 'bg-indigo-50 border-indigo-300'
                                : 'bg-slate-50 border-slate-200 hover:border-indigo-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                selectedMemberIds.includes(m.id)
                                  ? 'bg-indigo-600 border-indigo-600'
                                  : 'border-slate-300'
                              }`}>
                                {selectedMemberIds.includes(m.id) && (
                                  <span className="text-white text-xs">✓</span>
                                )}
                              </div>
                              <span className="font-medium text-slate-800">{m.name}</span>
                            </div>
                            <span className="text-sm text-slate-500">{m.skill}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Reason for Nomination
                      </label>
                      <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-vertical text-sm"
                        placeholder="e.g. Two members had university exams during the hackathon and couldn't contribute fully despite their strong technical abilities..."
                      />
                    </div>

                    {/* Submit */}
                    <button
                      onClick={handleNominate}
                      disabled={submitting}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-3 rounded-lg font-bold transition-colors"
                    >
                      {submitting ? 'Submitting...' : '⭐ Submit Special Mention Nomination'}
                    </button>

                    {submitStatus && (
                      <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${
                        submitStatus.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {submitStatus}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Team is qualified — show positive message */}
            {team.is_qualified && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center shadow-sm">
                <div className="text-4xl mb-3">🎉</div>
                <h3 className="text-lg font-bold text-green-800 mb-1">Your team has qualified!</h3>
                <p className="text-sm text-green-700">Keep supporting them through the final round.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MentorPortal;