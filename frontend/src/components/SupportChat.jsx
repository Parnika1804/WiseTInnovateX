import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const SupportChat = ({ participantContext, supportEmail }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([{ role: 'ai', text: 'Hi! I am your Event Support Assistant. How can I help you today?' }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showFallback, setShowFallback] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsLoading(true);
        setShowFallback(false);

        // Build the context string based on what the portal passed in
        const contextStr = `
        Event Context:
        - Current Stage: ${participantContext.stage || 'Not defined'}
        - Participant Name: ${participantContext.name || 'Not defined'}
        - Team Name: ${participantContext.teamName || 'Not assigned yet'}
        - Team Members: ${participantContext.teamMembers ? participantContext.teamMembers.map(m => m.name).join(', ') : 'Not assigned yet'}
        - Mentor Name: ${participantContext.mentorName || 'Not assigned yet'}
        - Mentor Email: ${participantContext.mentorEmail || 'Not assigned yet'}
        - Fallback Support Email: ${supportEmail}
        `;

        const systemPrompt = `You are a helpful, concise AI support assistant for a hackathon participant. 
        You have access to their specific event context below. 
        Answer their questions based ONLY on this context. 
        If they ask something outside this context (like to take an action, edit data, or ask about other teams), politely tell them you cannot do that and they should contact the support email: ${supportEmail}.
        Keep your answers short and friendly.
        
        ${contextStr}`;

        try {
            // Using your existing backend proxy to Gemini or Groq (assuming you have a generic chat endpoint or you can hit Gemini directly if you have the API key exposed, though backend is safer).
            // For this implementation, I am directly calling the Gemini API endpoint you likely have in your backend.
            // If you don't have a specific chat endpoint, you will need to add a quick POST route in FastAPI to handle this payload.
            const res = await axios.post('http://localhost:8000/ai/chat', {
                system_prompt: systemPrompt,
                message: userMessage
            });

            setMessages(prev => [...prev, { role: 'ai', text: res.data.reply }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I am having trouble connecting right now. Please try again or use the support email.' }]);
        } finally {
            setIsLoading(false);
            setShowFallback(true);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-80 sm:w-96 h-[500px] flex flex-col mb-4 border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
                    
                    {/* Header */}
                    <div className="bg-slate-800 dark:bg-slate-950 p-4 border-b border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🤖</span>
                            <div>
                                <h3 className="text-white font-bold text-sm">Event Support</h3>
                                <p className="text-slate-300 text-xs">AI Assistant</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    {/* Message Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 p-3 rounded-2xl rounded-bl-none text-sm shadow-sm flex gap-1">
                                    <span className="animate-bounce">.</span><span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span><span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Fallback Button (Shows after AI replies) */}
                    {showFallback && !isLoading && (
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                            <a 
                                href={`mailto:${supportEmail}?subject=Support Request - ${participantContext.name}`}
                                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 transition-colors"
                            >
                                Still need help? Email Human Support
                            </a>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask a question..."
                            className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-transparent dark:border-slate-700"
                        />
                        <button 
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center transition-colors disabled:opacity-50"
                        >
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'} absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl hover:-translate-y-1 transition-all duration-300 border-4 border-white dark:border-slate-950`}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
            </button>
        </div>
    );
};

export default SupportChat;