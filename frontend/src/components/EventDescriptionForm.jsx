import React, { useState } from 'react';
import axios from 'axios';

const EventDescriptionForm = ({ onConfigExtracted }) => {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  
  // State to hold conversational clarification data
  const [clarificationData, setClarificationData] = useState(null); 
  const [answers, setAnswers] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (!description.trim()) {
      setStatus({ type: 'error', message: 'Please describe your event before generating.' });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Send the initial description to the parser
      const describeRes = await axios.post('http://localhost:8000/event/describe', { description });

      if (describeRes.data.status === 'incomplete') {
        setStatus({ type: 'info', message: 'Analyzing missing information...' });
        
        // 2. If incomplete, ask Gemini to generate specific follow-up questions
        const clarifyRes = await axios.post('http://localhost:8000/event/clarify', {
          description: description,
          missing_fields: describeRes.data.missing_fields
        });
        
        setClarificationData({
          message: clarifyRes.data.message,
          questions: clarifyRes.data.questions
        });
        
        // 3. Initialize the answer state for the dynamic form
        const initialAnswers = {};
        clarifyRes.data.questions.forEach(q => { initialAnswers[q.field] = ''; });
        setAnswers(initialAnswers);
        setStatus({ type: '', message: '' }); 

      } else {
        // Success! Complete on the first try. Save configuration.
        await axios.post('http://localhost:8000/event/configure', { description });
        setStatus({ type: 'success', message: '✅ Event configured successfully!' });
        if (onConfigExtracted) onConfigExtracted(describeRes.data.config);
        setDescription(''); 
      }
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Failed to process event description.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClarificationSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: 'info', message: 'Processing your answers and configuring event...' });

    try {
      // 4. Combine original description with answers via the backend
      const resubmitRes = await axios.post('http://localhost:8000/event/clarify/resubmit', {
        original_description: description,
        answers: answers
      });

      const combinedDescription = resubmitRes.data.combined_description;

      // 5. Finalize the configuration with the complete combined description
      const configRes = await axios.post('http://localhost:8000/event/configure', { description: combinedDescription });
      
      setStatus({ type: 'success', message: `✅ Event "${configRes.data.config?.event_name || 'configured'}" successfully from combined details!` });
      
      // 6. Reset UI and trigger parent refresh
      setClarificationData(null);
      setDescription('');
      setAnswers({});
      if (onConfigExtracted) onConfigExtracted(configRes.data.config);

    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Failed to configure event with clarification.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (field, value) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  const cancelClarification = () => {
    setClarificationData(null);
    setAnswers({});
    setStatus({ type: '', message: '' });
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <div className="mb-6 border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Dynamic Event Setup</h2>
        <p className="text-gray-500 text-sm mt-1">
          Describe how you want to run this event. Our AI will map out the pipeline, scoring rules, and team structures automatically.
        </p>
      </div>

      {/* View 1: Initial Description Phase */}
      {!clarificationData ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className={`w-full p-4 h-40 rounded-lg bg-gray-50 border focus:ring-2 focus:outline-none transition-all resize-y ${
              status.type === 'error' ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
            }`}
            placeholder="e.g., We are hosting a hackathon called InnovateX. Teams must have 4 members. The stages are Registration, Ideation, and Final Pitch. Scoring is out of 10 points. Top 10 advance to finals..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
          
          {status.message && (
            <div className={`p-3 rounded-lg text-sm font-medium ${
              status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 
              status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' :
              'bg-blue-50 text-blue-700 border border-blue-100'
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
              {isLoading ? '🤖 AI is analyzing...' : 'Generate Pipeline & Rules'}
            </button>
          </div>
        </form>
      ) : (
        /* View 2: Clarification / Conversational Agent Phase */
        <div className="animate-fade-in">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-md">
            <div className="flex items-start">
              <span className="text-xl mr-3">🤖</span>
              <div>
                <h3 className="text-amber-800 font-bold mb-1">More Information Needed</h3>
                <p className="text-amber-700 text-sm">
                  {clarificationData.message}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleClarificationSubmit} className="space-y-5">
            {clarificationData.questions.map((q, index) => (
              <div key={q.field} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block font-semibold text-gray-800 mb-2">
                  <span className="text-blue-600 mr-2">Q{index + 1}.</span> 
                  {q.question}
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Type your answer here..."
                  value={answers[q.field] || ''}
                  onChange={(e) => handleAnswerChange(q.field, e.target.value)}
                  disabled={isLoading}
                />
              </div>
            ))}

            {status.message && (
              <div className={`p-3 rounded-lg text-sm font-medium ${
                status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
              }`}>
                {status.message}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={cancelClarification}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel & Edit Original
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`px-8 py-2.5 rounded-lg font-semibold text-white transition-colors ${
                  isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
                }`}
              >
                {isLoading ? 'Configuring...' : 'Submit Answers & Finalize'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default EventDescriptionForm;