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
  const [currentRound, setCurrentRound] = useState(null);
  const [finalResults, setFinalResults] = useState(null);
  const [mentor, setMentor] = useState(null);

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

      // Fetch mentor assigned to participant's team
      try {
        const mentorsRes = await axios.get(`${API}/mentors`);
        const teamId = portalRes.data.team?.id;
        if (teamId) {
          const assigned = mentorsRes.data.find(m => m.assigned_team_id === teamId);
          if (assigned) setMentor(assigned);
        }
      } catch (e) {
        console.log("No mentor data available");
      }

      // Fetch current round configuration
      const configRes = await axios.get(`${API}/event/config`);
      if (configRes.data.status === 'found') {
        let scoring = configRes.data.config.scoring;
        if (typeof scoring === 'string') scoring = JSON.parse(scoring);
        const round = scoring?.current_round || 1;
        setCurrentRound(round);

        const confirmKey = `confirmed_part_${participant.id}_round_${round}`;
        if (localStorage.getItem(confirmKey) === 'true') {
          setConfirmed(true);
        } else {
          setConfirmed(false);
        }
      }

      const finalRes = await axios.get(`${API}/scores/finalized`);
      if (finalRes.data.finalized) {
         setFinalResults(finalRes.data.podium);
      }

    } catch (err) {
      setError("Failed to load portal data. Invalid token or server error.");
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await axios.post(`${API}/participant/${data.participant.id}/confirm`);
      setConfirmed(true);
      localStorage.setItem(`confirmed_part_${data.participant.id}_round_${currentRound}`, 'true');
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

  const isEliminated = data.team && data.team.is_qualified === false;
  const myWin = finalResults ? finalResults.find(p => p.team_id === data.team?.id) : null;

  // STATE 1: EVENT FINALIZED AND USER IS A WINNER
  if (finalResults && myWin) return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="bg-gradient-to-br from-amber-400 to-amber-600 text-white p-8 rounded-xl mb-6 shadow-lg text-center border-4 border-amber-300">
          <div className="text-7xl mb-4 animate-bounce">🏆</div>
          <h2 className="text-4xl font-black mb-2 tracking-tight">Congratulations, {data.participant.name}!</h2>
          <p className="text-xl font-medium mb-6">Your team <strong className="text-amber-100">{data.team.name}</strong> emerged victorious!</p>
          <div className="inline-block bg-white text-amber-600 px-8 py-3 rounded-full font-black text-3xl shadow-md">
            {myWin.medal}
          </div>
          <p className="mt-6 text-amber-50 font-medium bg-amber-700/30 inline-block px-4 py-2 rounded-lg">
            Final Cumulative Score: {myWin.final_score.toFixed(2)}
          </p>
        </div>
        <ParticipantProfileForm participant={data.participant} onProfileUpdate={loadPortal} />
      </div>
    </div>
  );

  // STATE 2: EVENT FINALIZED OR USER ELIMINATED
  if ((finalResults && !myWin) || isEliminated) return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="bg-slate-800 text-white p-6 rounded-xl mb-6 shadow-sm">
          <h2 className="text-2xl font-bold mb-1">Hacker Portal</h2>
          <p className="text-slate-300 m-0">Welcome back, <strong className="text-white">{data.participant.name}</strong></p>
        </div>
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-5xl mb-4 grayscale">🏁</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Event Concluded</h3>
          <p className="text-slate-500 mb-4">Your team <strong className="text-slate-700">{data.team?.name}</strong> did not advance to the final podium.</p>
          <p className="text-slate-400 text-sm">We truly appreciate your effort and participation. Keep building and we hope to see you at future events!</p>
        </div>
        <ParticipantProfileForm participant={data.participant} onProfileUpdate={loadPortal} />
      </div>
    </div>
  );

  // STATE 3: ACTIVE COMPETITION
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="bg-slate-800 text-white p-6 rounded-xl mb-6 shadow-sm flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-1">Hacker Portal</h2>
            <p className="text-slate-300 m-0">Welcome back, <strong className="text-white">{data.participant.name}</strong></p>
          </div>
          {currentRound && (
            <div className="bg-blue-600 border border-blue-500 px-4 py-2 rounded-lg text-center shadow-inner">
              <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-0.5">Current Stage</p>
              <p className="text-white font-black text-xl leading-none">Round {currentRound}</p>
            </div>
          )}
        </div>

        {data.progression?.is_qualified && currentRound === 1 && (
          <div className="p-6 rounded-xl mb-8 border shadow-sm bg-blue-50 border-blue-200">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🚀</div>
              <div className="flex-1">
                <h4 className="text-lg font-bold mb-1 text-blue-900">Welcome to the Hackathon!</h4>
                <p className="text-sm mb-0 text-blue-800">Round 1 is currently active. Work with your team to build your project. Judges will begin evaluating soon!</p>
              </div>
            </div>
          </div>
        )}

        {data.progression?.is_qualified && currentRound > 1 && (
          <div className={`p-6 rounded-xl mb-8 border shadow-sm transition-colors ${confirmed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start gap-4">
              <div className="text-3xl">{confirmed ? '✅' : '🎉'}</div>
              <div className="flex-1">
                <h4 className={`text-lg font-bold mb-1 ${confirmed ? 'text-green-800' : 'text-amber-900'}`}>
                  {confirmed ? 'Spot Confirmed!' : `You Advanced to Round ${currentRound}!`}
                </h4>
                <p className={`text-sm mb-4 ${confirmed ? 'text-green-700' : 'text-amber-800'}`}>
                  {confirmed
                    ? "You've successfully confirmed your attendance for the current round. Keep an eye on your email for further instructions."
                    : `Congratulations! Your team made the cut. Please confirm your spot for Round ${currentRound} below.`}
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
            <h4 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Hacker Status</h4>
            <div className="space-y-3">
              <p className="text-sm"><strong className="text-slate-600">Event Phase:</strong> <span className="font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{data.current_stage?.label || 'COMPETITION'}</span></p>
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
                  <div>
                    <ul className="space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                      {data.team_members.map((m, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex justify-between">
                          <span className="font-medium">{m.name}</span>
                          <span className="text-slate-500">{m.skill}</span>
                        </li>
                      ))}
                    </ul>

                    {mentor && (
                      <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <p className="text-sm font-bold text-indigo-800 mb-2">🧑‍🏫 Your Mentor</p>
                        <p className="text-sm text-indigo-700"><strong>Name:</strong> {mentor.name}</p>
                        <p className="text-sm text-indigo-700"><strong>Email:</strong> {mentor.email}</p>
                        {mentor.expertise && <p className="text-sm text-indigo-700"><strong>Expertise:</strong> {mentor.expertise}</p>}
                        {mentor.phone && <p className="text-sm text-indigo-700"><strong>Phone:</strong> {mentor.phone}</p>}
                      </div>
                    )}
                  </div>
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