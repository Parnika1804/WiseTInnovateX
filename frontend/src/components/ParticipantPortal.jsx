import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import ParticipantProfileForm from './ParticipantProfileForm';
import { useAuth } from './AuthContext';

const API = 'http://localhost:8000';

const ParticipantPortal = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { login } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No access token provided. Please check your email for the magic link.");
      return;
    }
    loadPortal();
  }, [token]);

  const loadPortal = async () => {
    try {
      const meRes = await axios.get(`${API}/auth/me?token=${token}`);
      const { id, name, email, role } = meRes.data;

      login({ token, user: { id, name, email, role } });

      const portalRes = await axios.get(`${API}/participant/me/${email}`);

      if (portalRes.data.status === 'not_found') {
        setError("No participant profile found for your account.");
        return;
      }

      const participant = portalRes.data.participant;
      if (participant?.registration_status === 'pending') {
        setError("Your registration is pending committee approval. Please check back later.");
        return;
      }

      setData(portalRes.data);
    } catch (err) {
      setError("Failed to load portal data. Invalid token or server error.");
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await axios.post(`${API}/participant/${data.participant.id}/confirm`);
      setConfirmed(true);
    } catch (err) {
      alert("Failed to confirm progression.");
    } finally {
      setConfirming(false);
    }
  };

  if (error) return (
    <div className="p-8 max-w-xl mx-auto mt-10 bg-red-50 border border-red-200 rounded-xl text-center text-red-800 shadow-sm">
      <p className="font-semibold">{error}</p>
    </div>
  );

  if (!data) return <div className="p-8 text-center text-gray-500 font-medium mt-10">Loading Secure Portal...</div>;

  // Eliminated state — team exists but is not qualified
  const isEliminated = data.team && data.team.is_qualified === false;

  if (isEliminated) return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="bg-slate-800 text-white p-6 rounded-xl mb-6 shadow-sm">
          <h2 className="text-2xl font-bold mb-1">Hacker Portal</h2>
          <p className="text-slate-300 m-0">Welcome back, <strong className="text-white">{data.participant.name}</strong></p>
        </div>

        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-5xl mb-4">🏁</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Thank You for Participating!</h3>
          <p className="text-slate-500 mb-4">Your team <strong className="text-slate-700">{data.team.name}</strong> did not advance to the next round.</p>
          <p className="text-slate-400 text-sm">We truly appreciate your effort and participation in <strong>{data.current_stage?.label || 'this event'}</strong>. Keep building and we hope to see you at future events!</p>
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs text-slate-400">Questions? Reach out to the event committee.</p>
          </div>
        </div>

        <ParticipantProfileForm participant={data.participant} onProfileUpdate={loadPortal} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="bg-slate-800 text-white p-6 rounded-xl mb-6 shadow-sm">
          <h2 className="text-2xl font-bold mb-1">Hacker Portal</h2>
          <p className="text-slate-300 m-0">Welcome back, <strong className="text-white">{data.participant.name}</strong></p>
        </div>

        {data.progression?.is_qualified && (
          <div className={`p-6 rounded-xl mb-8 border shadow-sm transition-colors ${confirmed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start gap-4">
              <div className="text-3xl">{confirmed ? '✅' : '🎉'}</div>
              <div className="flex-1">
                <h4 className={`text-lg font-bold mb-1 ${confirmed ? 'text-green-800' : 'text-amber-900'}`}>
                  {confirmed ? 'Spot Confirmed!' : 'You Advanced to the Next Round!'}
                </h4>
                <p className={`text-sm mb-4 ${confirmed ? 'text-green-700' : 'text-amber-800'}`}>
                  {confirmed
                    ? "You've successfully confirmed your attendance for the next round. Keep an eye on your email for further instructions."
                    : data.progression.message}
                </p>

                {!confirmed && (
                  <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50"
                  >
                    {confirming ? 'Confirming...' : 'Accept & Confirm Spot'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Current Status</h4>
            <div className="space-y-3">
              <p className="text-sm"><strong className="text-slate-600">Stage:</strong> <span className="font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{data.current_stage?.label || 'INTAKE'}</span></p>
              <p className="text-sm"><strong className="text-slate-600">Skill Track:</strong> <span className="font-medium">{data.participant.skill}</span></p>
              <p className="text-sm"><strong className="text-slate-600">Institution:</strong> <span className="font-medium">{data.participant.institution || 'N/A'}</span></p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">My Team</h4>
            {data.team ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm m-0">
                    <strong className="text-slate-600">Team Name:</strong>
                    <span className="font-bold text-blue-600 ml-2">{data.team.name}</span>
                  </p>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    data.team.status === 'APPROVED' ? 'bg-green-100 text-green-800 border-green-200' :
                    data.team.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200' :
                    'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                    {data.team.status}
                  </span>
                </div>

                {data.team.status === 'REJECTED' ? (
                  <div className="mt-4 p-4 bg-red-50 text-red-700 text-sm border border-red-200 rounded-lg">
                    <strong>Notice:</strong> Your proposed team formation was reviewed and rejected by the committee. Please await re-assignment or further instructions.
                  </div>
                ) : (
                  <ul className="space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    {data.team_members.map((m, idx) => (
                      <li key={idx} className="text-sm text-slate-700 flex justify-between">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-slate-500">{m.skill}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="text-center p-6 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-sm text-slate-500 italic">You have not been assigned to a team yet. Teams will be formed once the Registration stage closes.</p>
              </div>
            )}
          </div>
        </div>

        <ParticipantProfileForm participant={data.participant} onProfileUpdate={loadPortal} />
      </div>
    </div>
  );
};

export default ParticipantPortal;