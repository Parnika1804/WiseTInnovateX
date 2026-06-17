import React, { useState } from 'react';
import axios from 'axios';
import { notifyEmailDraft } from '../hooks/useEmailDraftNotifier';

const CreateJudge = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleCreateJudge = async (e) => {
    e.preventDefault();

    setLoading(true);

    setStatus({
      message: 'Generating magic link and dispatching email...',
      type: 'info',
    });

    try {
      const res = await axios.post(
        'http://localhost:8000/auth/create-judge',
        {
          name,
          email,
        }
      );

      setStatus({
        message:
          '✅ Judge invited! Magic link emailed successfully.',
        type: 'success',
      });

      const count =
        res.data?.judge_invite_emails_drafted || 1;

      notifyEmailDraft(count);

      setName('');
      setEmail('');
    } catch (error) {
      console.error(error);

      const detail =
        error.response?.data?.detail ||
        'Failed to invite judge. Check backend logs.';

      setStatus({
        message: `❌ ${detail}`,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        bg-white/80
        dark:bg-slate-900/80

        backdrop-blur-md

        border
        border-slate-200
        dark:border-slate-800

        rounded-2xl

        shadow-sm

        p-6
        mb-6
      "
    >
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
        Invite a Judge
      </h3>

      <p className="text-slate-500 dark:text-slate-400 mb-5 text-sm">
        Enter the evaluator's details. They will receive a secure
        magic link granting access to evaluate{' '}
        <strong>all teams</strong>.
      </p>

      <form
        onSubmit={handleCreateJudge}
        className="space-y-4 max-w-md"
      >
        {/* Judge Name */}
        <div>
          <label
            className="
              block
              text-sm
              font-medium

              text-slate-700
              dark:text-slate-300

              mb-2
            "
          >
            Judge Name
          </label>

          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Dr. Alan Turing"
            className="
              w-full
              p-3

              bg-white
              dark:bg-slate-800

              text-slate-900
              dark:text-slate-100

              border
              border-slate-200
              dark:border-slate-700

              rounded-xl

              focus:ring-2
              focus:ring-blue-500

              focus:border-blue-500

              outline-none

              transition-all
            "
          />
        </div>

        {/* Email */}
        <div>
          <label
            className="
              block
              text-sm
              font-medium

              text-slate-700
              dark:text-slate-300

              mb-2
            "
          >
            Email Address
          </label>

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="judge@university.edu"
            className="
              w-full
              p-3

              bg-white
              dark:bg-slate-800

              text-slate-900
              dark:text-slate-100

              border
              border-slate-200
              dark:border-slate-700

              rounded-xl

              focus:ring-2
              focus:ring-blue-500

              focus:border-blue-500

              outline-none

              transition-all
            "
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="
            w-full

            bg-blue-600
            hover:bg-blue-700

            text-white

            py-3

            rounded-xl

            font-semibold

            transition-all

            disabled:bg-blue-400
            disabled:cursor-not-allowed
          "
        >
          {loading
            ? 'Dispatching...'
            : 'Generate & Send Magic Link'}
        </button>

        {/* Status */}
        {status.message && (
          <div
            className={`
              p-4
              rounded-xl
              text-sm
              font-medium
              mt-2
              border

              ${
                status.type === 'error'
                  ? `
                    bg-red-50
                    dark:bg-red-950/30

                    text-red-700
                    dark:text-red-300

                    border-red-200
                    dark:border-red-900
                  `
                  : status.type === 'success'
                  ? `
                    bg-green-50
                    dark:bg-green-950/30

                    text-green-700
                    dark:text-green-300

                    border-green-200
                    dark:border-green-900
                  `
                  : `
                    bg-blue-50
                    dark:bg-blue-950/30

                    text-blue-700
                    dark:text-blue-300

                    border-blue-200
                    dark:border-blue-900
                  `
              }
            `}
          >
            {status.message}
          </div>
        )}
      </form>
    </div>
  );
};

export default CreateJudge;