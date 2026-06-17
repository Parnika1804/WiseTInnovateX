import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

const ParticipantTable = ({ refreshTrigger }) => {
  const [participants, setParticipants] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    fetchParticipants();
  }, [refreshTrigger]);

  const fetchParticipants = async () => {
    try {
      const res = await axios.get(`${API}/roster`);
      setParticipants(res.data);
    } catch (error) {
      console.error("Failed to fetch roster", error);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name} from the roster?`)) return;

    setLoadingId(id);

    try {
      await axios.delete(`${API}/roster/${id}`);
      fetchParticipants();
    } catch (error) {
      alert("Failed to delete participant.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleClearAll = async () => {
    if (
      !window.confirm(
        "Are you sure you want to clear the entire roster? This cannot be undone."
      )
    )
      return;

    try {
      await axios.delete(`${API}/roster/clear`);
      fetchParticipants();
    } catch (error) {
      alert("Failed to clear roster.");
    }
  };

  if (participants.length === 0) {
    return (
      <div
        className="
          text-center
          p-8
          rounded-2xl

          bg-slate-50
          dark:bg-slate-900

          border
          border-dashed
          border-slate-200
          dark:border-slate-700
        "
      >
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          No participants uploaded yet. Upload a CSV to populate the roster.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Active Roster ({participants.length})
        </h3>

        <button
          onClick={handleClearAll}
          className="
            text-sm
            px-4
            py-2

            text-red-600
            dark:text-red-400

            hover:bg-red-50
            dark:hover:bg-red-950/30

            border
            border-red-200
            dark:border-red-800

            rounded-xl
            font-semibold
            transition-all
          "
        >
          Clear All
        </button>
      </div>

      {/* Table Container */}
      <div
        className="
          overflow-x-auto

          bg-white/80
          dark:bg-slate-900/80

          backdrop-blur-md

          border
          border-slate-200
          dark:border-slate-800

          rounded-2xl

          shadow-sm
        "
      >
        <table
          className="
            w-full
            text-left
            border-collapse

            bg-transparent

            text-slate-900
            dark:text-slate-100
          "
        >
          <thead>
            <tr
              className="
                bg-slate-50
                dark:bg-slate-800/50

                border-b
                border-slate-200
                dark:border-slate-700
              "
            >
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Hacker
              </th>

              <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Skill Track
              </th>

              <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Institution
              </th>

              <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Experience
              </th>

              <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {participants.map((p) => (
              <tr
                key={p.id}
                className="
                  hover:bg-slate-50
                  dark:hover:bg-slate-800/50

                  transition-colors
                "
              >
                {/* Participant */}
                <td className="p-4">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {p.name}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {p.email}
                  </div>
                </td>

                {/* Skill */}
                <td className="p-4">
                  <span
                    className="
                      inline-flex
                      items-center
                      px-3
                      py-1

                      rounded-full
                      text-xs
                      font-semibold

                      bg-blue-50
                      dark:bg-blue-950/40

                      text-blue-700
                      dark:text-blue-300

                      border
                      border-blue-200
                      dark:border-blue-800
                    "
                  >
                    {p.skill}
                  </span>
                </td>

                {/* Institution */}
                <td className="p-4">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {p.institution || 'N/A'}
                  </div>
                </td>

                {/* Experience */}
                <td className="p-4">
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    {p.experience_level ? (
                      <span className="font-medium">
                        {p.experience_level}
                      </span>
                    ) : (
                      <span className="italic text-slate-400 dark:text-slate-500">
                        Level Not Provided
                      </span>
                    )}
                  </div>

                  <div className="text-xs mt-1 font-medium text-slate-500 dark:text-slate-400">
                    {p.prior_hackathons} Prior Hackathon
                    {p.prior_hackathons !== 1 && 's'}
                  </div>
                </td>

                {/* Actions */}
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    disabled={loadingId === p.id}
                    className="
                      text-xs
                      px-4
                      py-2

                      text-slate-600
                      dark:text-slate-300

                      hover:text-red-600
                      dark:hover:text-red-400

                      hover:bg-red-50
                      dark:hover:bg-red-950/30

                      border
                      border-slate-200
                      dark:border-slate-700

                      hover:border-red-200
                      dark:hover:border-red-800

                      rounded-lg
                      font-semibold

                      transition-all
                      duration-200

                      disabled:opacity-50
                    "
                  >
                    {loadingId === p.id ? 'Removing...' : 'Remove'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ParticipantTable;