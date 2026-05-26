import React, { useState } from 'react';
import axios from 'axios';
import ClarificationDialog from './ClarificationDialog';

const EventDescriptionForm = ({ onConfigExtracted }) => {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showClarification, setShowClarification] = useState(false);
  const [clarificationQuestions, setClarificationQuestions] = useState([]);
  const [missingFields, setMissingFields] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('Please provide a description of your event before submitting.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Send description to Gemini to parse
      const describeRes = await axios.post('http://localhost:8000/event/describe', {
        description: description
      });

      if (describeRes.data.status === 'incomplete') {
        // 2. If incomplete, ask Gemini to generate specific follow-up questions
        setMissingFields(describeRes.data.missing_fields);
        const clarifyRes = await axios.post('http://localhost:8000/event/clarify', {
          description: description,
          missing_fields: describeRes.data.missing_fields
        });

        // Extract just the question text for the dialog
        const questions = clarifyRes.data.questions.map(q => q.question);
        setClarificationQuestions(questions);
        setShowClarification(true);
      } else {
        // 3. If complete, save it to the database
        await axios.post('http://localhost:8000/event/configure', {
          description: description
        });
        alert("Event configured successfully!");
        if (onConfigExtracted) onConfigExtracted(describeRes.data.config);
        setDescription(''); // Clear form on success
      }
    } catch (err) {
      setError('Failed to process the event configuration. Please ensure the backend is running.');
      console.error("API Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClarificationSubmit = async (answers) => {
    setIsLoading(true);
    try {
      // Map array of answers back to the missing fields
      const answersDict = {};
      missingFields.forEach((field, index) => {
        answersDict[field] = answers[index];
      });

      // 4. Combine original description with answers
      const resubmitRes = await axios.post('http://localhost:8000/event/clarify/resubmit', {
        original_description: description,
        answers: answersDict
      });

      // 5. Save the newly combined description to the database
      const newDescription = resubmitRes.data.combined_description;
      setDescription(newDescription);
      
      await axios.post('http://localhost:8000/event/configure', {
        description: newDescription
      });
      
      setShowClarification(false);
      alert("Event configured successfully with your clarifications!");
      if (onConfigExtracted) onConfigExtracted();
    } catch (err) {
      setError('Failed to submit clarifications.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100 mt-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Configure New Event</h2>
        <p className="text-sm text-gray-500">
          Describe your event format in plain English. Include details about stages, team sizes, and scoring. 
          Our AI will automatically configure the pipeline for you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="event-description" className="sr-only">Event Description</label>
          <textarea
            id="event-description"
            rows={6}
            className={`w-full p-4 border rounded-lg focus:ring-2 focus:outline-none transition-all resize-y ${
              error ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
            }`}
            placeholder="e.g., We are hosting a 48-hour hackathon. Teams must have 2-4 members. The stages are Registration, Ideation, and Final Pitch. Scoring is based on 50% technical and 50% design..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
          {error && <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className={`px-6 py-2.5 rounded-lg font-medium text-white transition-all flex items-center justify-center min-w-[140px] ${
              isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {isLoading ? 'Processing with AI...' : 'Generate Pipeline'}
          </button>
        </div>
      </form>

      {showClarification && (
        <ClarificationDialog 
          questions={clarificationQuestions}
          onSubmitAnswers={handleClarificationSubmit}
          onCancel={() => setShowClarification(false)}
        />
      )}
    </div>
  );
};

export default EventDescriptionForm;