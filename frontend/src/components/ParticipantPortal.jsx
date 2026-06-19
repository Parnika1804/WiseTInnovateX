import SupportChat from './SupportChat';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import ParticipantProfileForm from './ParticipantProfileForm';
import { useAuth } from './AuthContext';
import { useTheme } from '../ThemeContext';

const API = 'http://localhost:8000';

const FeedbackForm = ({ participantId, hasMentor }) => {
  const [submitted, setSubmitted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [eventRating, setEventRating] = useState(0);
  const [mentorRating, setMentorRating] = useState(0);
  const [judgingRating, setJudgingRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkSubmitted = async () => {
      try {
        const res = await axios.get(`${API}/feedback/check/${participantId}`);
        setSubmitted(res.data.submitted);
      } catch (e) {
      } finally {
        setChecking(false);
      }
    };
    checkSubmitted();
  }, [participantId]);

  const StarRating = ({ label, value, onChange }) => (
    <div className="mb-4">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{label}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl transition-transform hover:scale-110 ${
              star <= value ? 'text-amber-400 dark:text-amber-500' : 'text-slate-200 dark:text-slate-700'
            }`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );

  const handleSubmit = async () => {
    if (!eventRating || !judgingRating) {
      setError('Please rate the event and judging before submitting.');
      return;
    }
    if (hasMentor && !mentorRating) {
      setError('Please rate your mentor before submitting.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await axios.post(`${API}/feedback/submit`, {
        participant_id: participantId,
        event_rating: eventRating,
        mentor_rating: hasMentor ? mentorRating : null,
        judging_rating: judgingRating,
        comment: comment.trim() || null,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) return null;

  if (submitted) return (
    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-6 mt-6 text-center transition-colors duration-300">
      <h4 className="text-lg font-bold text-green-800 dark:text-green-300 mb-1">Thank You for Your Feedback.</h4>
      <p className="text-sm text-green-700 dark:text-green-400">Your responses help us make future events even better.</p>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mt-6 shadow-sm transition-colors duration-300">
      <div className="flex items-center gap-3 mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">Share Your Feedback</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">Help us improve future events.</p>
        </div>
      </div>

      <StarRating label="How was the overall event? *" value={eventRating} onChange={setEventRating} />
      <StarRating label="How was the judging process? *" value={judgingRating} onChange={setJudgingRating} />
      {hasMentor && (
        <StarRating label="How was your mentor? *" value={mentorRating} onChange={setMentorRating} />
      )}

      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Any additional comments? (optional)</p>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="What did you love? What could be better?"
          rows={3}
          className="w-full bg-transparent dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 transition-colors"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </div>
  );
};

const JudgeFeedback = ({ teamId }) => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await axios.get(`${API}/scores/team-feedback/${teamId}`);
        setFeedback(res.data.feedback || []);
      } catch (e) {
        console.log("No judge feedback available");
      } finally {
        setLoading(false);
      }
    };
    fetchFeedback();
  }, [teamId]);

  if (loading) return null;
  if (!feedback.length) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mt-6 shadow-sm transition-colors duration-300">
      <div className="flex items-center gap-3 mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">Judge Feedback on Your Project</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">Here is what the judges thought about your team's work.</p>
        </div>
      </div>
      <div className="space-y-4">
        {feedback.map((f, idx) => (
          <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-lg p-4 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Judge · Round {f.round_number}</p>
              <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full font-semibold">
                Score: {f.score}
              </span>
            </div>
            {f.notes ? (
              <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{f.notes}"</p>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">No written feedback provided for this round.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ParticipantPortal = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [currentRound, setCurrentRound] = useState(null);
  const [finalResults, setFinalResults] = useState(null);
  const [mentor, setMentor] = useState(null);
  const [specialMention, setSpecialMention] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("No access token provided. Please check your email for the link.");
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

      try {
        const mentorsRes = await axios.get(`${API}/mentors`);
        const teamId = portalRes.data.team?.id;
        if (teamId) {
          const assigned = mentorsRes.data.find(m => m.assigned_team_id === teamId);
          if (assigned) setMentor(assigned);
        }
      } catch (e) {
      }

      try {
        const smRes = await axios.get(`${API}/special-mention`);
        const teamId = portalRes.data.team?.id;
        if (teamId && smRes.data) {
          const myMention = smRes.data.find(sm =>
            sm.team_id === teamId &&
            sm.nominated_member_ids?.includes(participant.id)
          );
          if (myMention) setSpecialMention(myMention);
        }
      } catch (e) {
      }

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
    <div className="p-8 max-w-xl mx-auto mt-10 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-center text-red-800 dark:text-red-300 shadow-sm transition-colors duration-300">
      <p className="font-semibold">{error}</p>
    </div>
  );

  if (!data) return <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-medium mt-10 transition-colors duration-300">Loading Secure Portal...</div>;

  const isEliminated = data.team && data.team.is_qualified === false;
  const myWin = finalResults ? finalResults.find(p => p.team_id === data.team?.id) : null;

  const SpecialMentionCard = () => {
    if (!specialMention) return null;

    const statusConfig = {
      PENDING: {
        bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800',
        title: 'Special Mention Nomination Pending',
        body: 'Your mentor has nominated you for a Special Mention. The committee is reviewing this nomination — you will be notified once a decision is made.',
        badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
        badgeText: 'Under Review',
        titleColor: 'text-slate-800 dark:text-slate-200',
        bodyColor: 'text-slate-600 dark:text-slate-400'
      },
      APPROVED: {
        bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800',
        title: 'You\'ve Been Granted Special Mention!',
        body: 'The committee has approved your mentor\'s nomination. You will compete in the final round as a Special Mention entry alongside the qualified finalists.',
        badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700',
        badgeText: 'Approved — Final Round Entry',
        titleColor: 'text-slate-800 dark:text-slate-200',
        bodyColor: 'text-slate-600 dark:text-slate-400'
      },
      REJECTED: {
        bg: 'bg-slate-50 dark:bg-slate-800/50', border: 'border-slate-200 dark:border-slate-700',
        title: 'Special Mention Not Approved',
        body: 'Your mentor\'s nomination was reviewed but could not be approved this time. Thank you for your effort and participation.',
        badge: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600',
        badgeText: 'Not Approved',
        titleColor: 'text-slate-800 dark:text-slate-200',
        bodyColor: 'text-slate-600 dark:text-slate-400'
      },
    };

    const cfg = statusConfig[specialMention.status] || statusConfig.PENDING;

    return (
      <div className={`p-6 rounded-xl border shadow-sm mb-6 ${cfg.bg} ${cfg.border} transition-colors duration-300`}>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className={`text-base font-bold ${cfg.titleColor}`}>{cfg.title}</h4>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.badge}`}>
                {cfg.badgeText}
              </span>
            </div>
            <p className={`text-sm mb-0 ${cfg.bodyColor}`}>{cfg.body}</p>
            {specialMention.reason && (
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 italic">
                Mentor's reason: "{specialMention.reason}"
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const TopHeader = () => (
    <div className="bg-slate-800 dark:bg-slate-900 text-white p-6 rounded-xl mb-6 shadow-sm flex justify-between items-center transition-colors duration-300">
      <div>
        <h2 className="text-2xl font-bold mb-1">Hacker Portal</h2>
        <p className="text-slate-300 m-0">Welcome back, <strong className="text-white">{data.participant.name}</strong></p>
      </div>
      <div className="flex items-center gap-4">
        {currentRound && !finalResults && !isEliminated && (
          <div className="bg-blue-600 dark:bg-blue-800 border border-blue-500 dark:border-blue-700 px-4 py-2 rounded-lg text-center shadow-inner hidden sm:block">
            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-0.5">Current Stage</p>
            <p className="text-white font-black text-xl leading-none">Round {currentRound}</p>
          </div>
        )}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Dark Mode"
          className="p-2 text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-xl transition-all duration-200 border border-slate-600 shadow-sm"
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );

  // 1. WINNER SCREEN
  if (finalResults && myWin) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <TopHeader />
        <div className="bg-gradient-to-br from-amber-400 to-amber-600 dark:from-amber-600 dark:to-amber-800 text-white p-8 rounded-xl mb-6 shadow-lg text-center border-4 border-amber-300 dark:border-amber-700">
          <h2 className="text-4xl font-black mb-2 tracking-tight">Status: Winner, {data.participant.name}</h2>
          <p className="text-xl font-medium mb-6">Your team <strong className="text-amber-100 dark:text-amber-200">{data.team.name}</strong> emerged victorious.</p>
          <div className="inline-block bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-500 px-8 py-3 rounded-full font-black text-3xl shadow-md">
            {myWin.medal}
          </div>
          <p className="mt-6 text-amber-50 font-medium bg-amber-700/30 inline-block px-4 py-2 rounded-lg">
            Final Cumulative Score: {myWin.final_score.toFixed(2)}
          </p>
        </div>

        {data.team && <JudgeFeedback teamId={data.team.id} />}
        <FeedbackForm participantId={data.participant.id} hasMentor={!!mentor} />
        <div className="mt-6">
          <ParticipantProfileForm participant={data.participant} onProfileUpdate={loadPortal} />
        </div>
      </div>

      <SupportChat 
        supportEmail="wisetinnovatex@gmail.com"
        participantContext={{
          name: data.participant.name,
          stage: data.current_stage?.label,
          teamName: data.team?.name,
          teamMembers: data.team_members,
          mentorName: mentor?.name,
          mentorEmail: mentor?.email
        }}
      />
    </div>
  );

  // 2. ELIMINATED / EVENT CONCLUDED SCREEN
  if ((finalResults && !myWin) || isEliminated) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <TopHeader />
        <SpecialMentionCard />

        {specialMention?.status !== 'APPROVED' && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-center transition-colors duration-300">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Event Concluded</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">Your team <strong className="text-slate-700 dark:text-slate-300">{data.team?.name}</strong> did not advance to the final podium.</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm">We appreciate your effort and participation. Keep building and we hope to see you at future events.</p>
          </div>
        )}

        {specialMention?.status === 'APPROVED' && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm text-center transition-colors duration-300">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Status: Finalist</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">As a Special Mention wildcard entry, your team <strong className="text-slate-700 dark:text-slate-300">{data.team?.name}</strong> will compete in the final round.</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm">Judges will evaluate your work separately.</p>
          </div>
        )}

        {finalResults && (
          <>
            {data.team && <JudgeFeedback teamId={data.team.id} />}
            <FeedbackForm participantId={data.participant.id} hasMentor={!!mentor} />
          </>
        )}

        <div className="mt-6">
          <ParticipantProfileForm participant={data.participant} onProfileUpdate={loadPortal} />
        </div>
      </div>

      <SupportChat 
        supportEmail="wisetinnovatex@gmail.com"
        participantContext={{
          name: data.participant.name,
          stage: data.current_stage?.label,
          teamName: data.team?.name,
          teamMembers: data.team_members,
          mentorName: mentor?.name,
          mentorEmail: mentor?.email
        }}
      />
    </div>
  );

  // 3. ACTIVE COMPETITION SCREEN
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <TopHeader />
        <SpecialMentionCard />

        {data.progression?.is_qualified && currentRound === 1 && (
          <div className="p-6 rounded-xl mb-8 border shadow-sm bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 transition-colors duration-300">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h4 className="text-lg font-bold mb-1 text-blue-900 dark:text-blue-300">Welcome to the Hackathon</h4>
                <p className="text-sm mb-0 text-blue-800 dark:text-blue-400">Round 1 is currently active. Work with your team to build your project. Judges will begin evaluating soon.</p>
              </div>
            </div>
          </div>
        )}

        {data.progression?.is_qualified && currentRound > 1 && (
          <div className={`p-6 rounded-xl mb-8 border shadow-sm transition-colors duration-300 ${confirmed ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'}`}>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h4 className={`text-lg font-bold mb-1 ${confirmed ? 'text-green-800 dark:text-green-300' : 'text-amber-900 dark:text-amber-300'}`}>
                  {confirmed ? 'Spot Confirmed' : `Status: Advanced to Round ${currentRound}`}
                </h4>
                <p className={`text-sm mb-4 ${confirmed ? 'text-green-700 dark:text-green-400' : 'text-amber-800 dark:text-amber-400'}`}>
                  {confirmed
                    ? "You have successfully confirmed your attendance for the current round. Monitor your email for further instructions."
                    : `Your team made the cut. Please confirm your spot for Round ${currentRound} below.`}
                </p>
                {!confirmed && (
                  <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50"
                  >
                    {confirming ? 'Confirming...' : 'Accept & Confirm Spot'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Hacker Status</h4>
            <div className="space-y-3">
              <p className="text-sm"><strong className="text-slate-600 dark:text-slate-400">Event Phase:</strong> <span className="font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded border border-transparent dark:border-blue-800">{data.current_stage?.label || 'COMPETITION'}</span></p>
              <p className="text-sm text-slate-700 dark:text-slate-300"><strong className="text-slate-600 dark:text-slate-400">Skill Track:</strong> <span className="font-medium">{data.participant.skill}</span></p>
              <p className="text-sm text-slate-700 dark:text-slate-300"><strong className="text-slate-600 dark:text-slate-400">Institution:</strong> <span className="font-medium">{data.participant.institution || 'N/A'}</span></p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">My Team</h4>
            {data.team ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm m-0">
                    <strong className="text-slate-600 dark:text-slate-400">Team Name:</strong>
                    <span className="font-bold text-blue-600 dark:text-blue-400 ml-2">{data.team.name}</span>
                  </p>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    data.team.status === 'APPROVED' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800' :
                    data.team.status === 'REJECTED' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800' :
                    'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  }`}>
                    {data.team.status}
                  </span>
                </div>

                {data.team.status === 'REJECTED' ? (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm border border-red-200 dark:border-red-800 rounded-lg">
                    <strong>Notice:</strong> Your proposed team formation was reviewed and rejected by the committee. Please await re-assignment or further instructions.
                  </div>
                ) : (
                  <div>
                    <ul className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                      {data.team_members.map((m, idx) => (
                        <li key={idx} className="text-sm text-slate-700 dark:text-slate-200 flex justify-between">
                          <span className="font-medium">{m.name}</span>
                          <span className="text-slate-500 dark:text-slate-400">{m.skill}</span>
                        </li>
                      ))}
                    </ul>

                    {mentor && (
                      <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                        <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-2">Your Mentor</p>
                        <p className="text-sm text-indigo-700 dark:text-indigo-400"><strong>Name:</strong> {mentor.name}</p>
                        <p className="text-sm text-indigo-700 dark:text-indigo-400"><strong>Email:</strong> {mentor.email}</p>
                        {mentor.expertise && <p className="text-sm text-indigo-700 dark:text-indigo-400"><strong>Expertise:</strong> {mentor.expertise}</p>}
                        {mentor.phone && <p className="text-sm text-indigo-700 dark:text-indigo-400"><strong>Phone:</strong> {mentor.phone}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">You have not been assigned to a team yet. Teams will be formed once the Registration stage closes.</p>
              </div>
            )}
          </div>
        </div>

        <ParticipantProfileForm participant={data.participant} onProfileUpdate={loadPortal} />
      </div>

      <SupportChat 
        supportEmail="wisetinnovatex@gmail.com"
        participantContext={{
          name: data.participant.name,
          stage: data.current_stage?.label,
          teamName: data.team?.name,
          teamMembers: data.team_members,
          mentorName: mentor?.name,
          mentorEmail: mentor?.email
        }}
      />
    </div>
  );
};

export default ParticipantPortal;