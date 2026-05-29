import React, { useState } from 'react';
import axios from 'axios';

const EventDescriptionForm = ({ onConfigExtracted }) => {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (!description.trim()) {
      setStatus({ type: 'error', message: 'Please describe your event before generating.' });
      return;
    }

    setIsLoading(true);

    try {
      const describeRes = await axios.post('http://localhost:8000/event/describe', { description });

      // If the AI says it's missing fields or failed to parse, just show a red inline error
      if (describeRes.data.status === 'incomplete') {
        const missing = describeRes.data.missing_fields.join(', ');
        setStatus({ type: 'error', message: `AI needs more info or failed to parse: ${missing}. Try adding more details to your prompt.` });
      } else {
        // Success! Save to database.
        await axios.post('http://localhost:8000/event/configure', { description });
        setStatus({ type: 'success', message: '✅ Event configured successfully!' });
        if (onConfigExtracted) onConfigExtracted(describeRes.data.config);
        setDescription(''); 
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to configure the event. Check backend logs.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      
      {/* Helper Guide Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
        <h3 className="text-blue-800 font-bold mb-2 flex items-center">
          <span className="mr-2">💡</span> How to write a great prompt:
        </h3>
        <p className="text-blue-700 text-sm mb-3">To get the best results, make sure your paragraph mentions:</p>
        <ul className="list-disc pl-8 text-blue-700 text-sm space-y-1">
          <li><strong>Stages:</strong> What are the rounds? (e.g., "Registration, Development, and Judging")</li>
          <li><strong>Teams:</strong> How many members? (e.g., "Teams of 4 students")</li>
          <li><strong>Scoring:</strong> What is the max score and rule? (e.g., "Judges score out of 10. Top 5 advance.")</li>
        </ul>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Event Configuration AI</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            rows={5}
            className={`w-full p-4 bg-gray-50 border rounded-lg focus:ring-2 focus:outline-none transition-all resize-y ${
              status.type === 'error' ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
            }`}
            placeholder="e.g., We are hosting a hackathon called InnovateX. Teams must have 4 members. The stages are Registration, Ideation, and Final Pitch. Scoring is out of 10 points..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
          
          {/* Inline Status Message */}
          {status.message && (
            <div className={`p-3 rounded-lg text-sm font-medium ${
              status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
            }`}>
              {status.message}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${
                isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
              }`}
            >
              {isLoading ? 'Processing with AI...' : 'Configure Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventDescriptionForm;