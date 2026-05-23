import React, { useState } from 'react';

const ClarificationDialog = ({ questions, onSubmitAnswers, onCancel }) => {
  // Store answers as an object where the key is the question index
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Handle typing in the input fields
  const handleAnswerChange = (index, text) => {
    setAnswers((prev) => ({
      ...prev,
      [index]: text,
    }));
    // Clear error if they start typing
    if (error) setError('');
  };

  const handleSubmit = async () => {
    // Enterprise Validation: Ensure all questions have an answer
    const answeredCount = Object.keys(answers).filter((key) => answers[key].trim() !== '').length;
    
    if (answeredCount < questions.length) {
      setError('Please provide an answer for all questions before continuing.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // ---------------------------------------------------------
      // MOCK DELAY: Simulating sending answers back to the backend
      // ---------------------------------------------------------
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Pass the finalized answers back to the parent component
      onSubmitAnswers(answers);
    } catch (err) {
      setError('Failed to submit answers. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If there are no questions, don't render the modal
  if (!questions || questions.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-200 p-6">
          <h3 className="text-xl font-bold text-amber-800 flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            Clarification Needed
          </h3>
          <p className="text-sm text-amber-700 mt-2">
            The AI needs a few more details to accurately configure your event pipeline. Please answer the questions below.
          </p>
        </div>

        {/* Questions Body */}
        <div className="p-6 overflow-y-auto flex-grow space-y-6">
          {questions.map((question, index) => (
            <div key={index} className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
                {index + 1}. {question}
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none transition-all resize-y"
                rows="2"
                placeholder="Type your answer here..."
                value={answers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          ))}
          
          {error && <p className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded-md">{error}</p>}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-100 p-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center ${
              isSubmitting ? 'bg-amber-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isSubmitting ? 'Updating Configuration...' : 'Confirm Answers'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ClarificationDialog;