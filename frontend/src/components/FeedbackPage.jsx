import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API = 'https://wisetinnovatex-r4vx.onrender.com';

const FeedbackPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [participantId, setParticipantId] = useState(null);
  const [participantName, setParticipantName] = useState('');
  const [hasMentor, setHasMentor] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const [eventRating, setEventRating] = useState(0);
  const [mentorRating, setMentorRating] = useState(0);
  const [judgingRating, setJudgingRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setTokenError(true); setLoading(false); return; }
    loadParticipant();
  }, [token]);

  const loadParticipant = async () => {
    try {
      // Decode token to get email
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      const payload = JSON.parse(jsonPayload);
      if (payload.role !== 'Participant') { setTokenError(true); setLoading(false); return; }

      const portalRes = await axios.get(`${API}/participant/me/${payload.email}`);
      if (portalRes.data.status === 'not_found') { setTokenError(true); setLoading(false); return; }

      const participant = portalRes.data.participant;
      setParticipantId(participant.id);
      setParticipantName(participant.name);

      // Check if already submitted
      const checkRes = await axios.get(`${API}/feedback/check/${participant.id}`);
      if (checkRes.data.submitted) setSubmitted(true);

      // Check if has mentor
      const teamId = portalRes.data.team?.id;
      if (teamId) {
        const mentorsRes = await axios.get(`${API}/mentors`);
        const assigned = mentorsRes.data.find(m => m.assigned_team_id === teamId);
        if (assigned) setHasMentor(true);
      }
    } catch (err) {
      setTokenError(true);
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ label, value, onChange }) => (
    <div className="mb-6">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{label}</p>
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-3xl transition-transform hover:scale-110 ${
              star <= value ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'
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
      setError(err.response?.data?.detail || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-500 font-medium">Loading...</p>
    </div>
  );

  if (tokenError) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="p-8 max-w-md w-full mx-4 bg-red-50 border border-red-200 rounded-xl text-center">
        <h2 className="text-lg font-bold text-red-800 mb-2">Invalid Link</h2>
        <p className="text-sm text-red-600">This feedback link is invalid or has expired.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="p-8 max-w-md w-full mx-4 bg-green-50 border border-green-200 rounded-xl text-center">
        <div className="text-5xl mb-4">🙏</div>
        <h2 className="text-xl font-bold text-green-800 mb-2">Thank You, {participantName}!</h2>
        <p className="text-sm text-green-700">Your feedback has been submitted. It helps us make future events even better.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-slate-800 text-white p-6 rounded-xl mb-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold mb-1">Share Your Feedback</h1>
          <p className="text-slate-300 text-sm">Hey <strong className="text-white">{participantName}</strong>, how was your experience?</p>
        </div>

        {/* Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <StarRating label="How was the overall event? *" value={eventRating} onChange={setEventRating} />
          <StarRating label="How was the judging process? *" value={judgingRating} onChange={setJudgingRating} />
          {hasMentor && (
            <StarRating label="How was your mentor? *" value={mentorRating} onChange={setMentorRating} />
          )}

          <div className="mb-6">
            <p className="text-sm font-semibold text-slate-700 mb-2">Any additional comments? (optional)</p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="What did you love? What could be better?"
              rows={4}
              className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;