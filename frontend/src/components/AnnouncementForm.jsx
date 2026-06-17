import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

const AnnouncementForm = ({ onSent }) => {
  const [announcement, setAnnouncement] = useState('');
  const [sendTo, setSendTo] = useState('all');
  const [teams, setTeams] = useState([]);
  const [customSubject, setCustomSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get(`${API}/teams`)
      .then((res) => setTeams(res.data))
      .catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!announcement.trim())
      return alert('Please type an announcement.');

    setIsSending(true);
    setResult(null);
    setError(null);

    try {
      const payload = {
        announcement: announcement.trim(),
        send_to: sendTo,
        custom_subject: customSubject.trim() || null,
      };

      const res = await axios.post(
        `${API}/comms/announce`,
        payload
      );

      setResult(res.data);

      setAnnouncement('');
      setCustomSubject('');
      setSendTo('all');

      if (onSent) onSent();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Failed to send announcement.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const approvedTeams = teams.filter(
    (t) => t.status === 'APPROVED'
  );

  return (
    <div
      className="
        bg-white/80
        dark:bg-slate-900/80

        backdrop-blur-md

        border
        border-orange-200
        dark:border-orange-900

        rounded-2xl

        shadow-sm

        p-6

        mb-6
      "
    >
      {/* Header */}
      <h3 className="text-xl font-bold text-orange-700 dark:text-orange-400 mb-1">
         Send Announcement
      </h3>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Type a short update — AI will draft the full email and
        send it instantly.
      </p>

      <div className="flex flex-col gap-4">
        {/* Announcement */}
        <textarea
          placeholder='e.g. "Venue changed to Room 201 in Block B" or "Round 2 starts tomorrow at 10 AM"'
          value={announcement}
          onChange={(e) =>
            setAnnouncement(e.target.value)
          }
          rows={4}
          className="
            w-full

            p-3

            bg-white
            dark:bg-slate-800

            text-slate-900
            dark:text-slate-100

            border
            border-orange-200
            dark:border-orange-900

            rounded-xl

            resize-y

            focus:outline-none
            focus:ring-2
            focus:ring-orange-500

            transition-all
          "
        />

        {/* Subject */}
        <input
          type="text"
          placeholder="Custom subject line (optional — AI will generate one if blank)"
          value={customSubject}
          onChange={(e) =>
            setCustomSubject(e.target.value)
          }
          className="
            w-full

            p-3

            bg-white
            dark:bg-slate-800

            text-slate-900
            dark:text-slate-100

            border
            border-orange-200
            dark:border-orange-900

            rounded-xl

            focus:outline-none
            focus:ring-2
            focus:ring-orange-500

            transition-all
          "
        />

        {/* Recipients */}
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
            Send to:
          </span>

          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
            <input
              type="radio"
              value="all"
              checked={sendTo === 'all'}
              onChange={() => setSendTo('all')}
            />
            All Participants
          </label>

          {approvedTeams.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="radio"
                value="team"
                checked={sendTo.startsWith('team:')}
                onChange={() =>
                  setSendTo(
                    `team:${approvedTeams[0]?.id || ''}`
                  )
                }
              />

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Specific Team:
              </span>

              <select
                value={
                  sendTo.startsWith('team:')
                    ? sendTo
                    : ''
                }
                onChange={(e) =>
                  setSendTo(e.target.value)
                }
                disabled={!sendTo.startsWith('team:')}
                className="
                  px-3
                  py-2

                  bg-white
                  dark:bg-slate-800

                  text-slate-900
                  dark:text-slate-100

                  border
                  border-slate-200
                  dark:border-slate-700

                  rounded-lg

                  text-sm
                "
              >
                {approvedTeams.map((t) => (
                  <option
                    key={t.id}
                    value={`team:${t.id}`}
                  >
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={
            isSending || !announcement.trim()
          }
          className="
            px-5
            py-3

            bg-orange-600
            hover:bg-orange-700

            disabled:bg-slate-400
            disabled:cursor-not-allowed

            text-white

            rounded-xl

            font-semibold

            transition-all

            self-start
          "
        >
          {isSending
            ? ' Sending...'
            : ' Draft & Send Now'}
        </button>
      </div>

      {/* Success */}
      {result && (
        <div
          className="
            mt-5

            p-4

            rounded-xl

            bg-green-50
            dark:bg-green-950/30

            border
            border-green-200
            dark:border-green-900
          "
        >
          <p className="font-semibold text-green-700 dark:text-green-300 mb-2">
            ✅ Announcement sent! ({result.sent}
            delivered
            {result.failed > 0
              ? `, ${result.failed} failed`
              : ''}
            )
          </p>

          <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
            <strong>Subject:</strong>{' '}
            {result.subject}
          </p>

          <p className="text-xs italic text-slate-500 dark:text-slate-400">
            {result.body_preview}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="
            mt-5

            p-4

            rounded-xl

            bg-red-50
            dark:bg-red-950/30

            border
            border-red-200
            dark:border-red-900

            text-red-700
            dark:text-red-300

            text-sm
          "
        >
          ❌ {error}
        </div>
      )}
    </div>
  );
};

export default AnnouncementForm;
