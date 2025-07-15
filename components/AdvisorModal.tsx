import React from 'react';

interface AdvisorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAsk: (question: string) => void;
    response: string;
    isLoading: boolean;
}

const PREDEFINED_QUESTIONS = [
    "What should I focus on right now?",
    "Analyze my resource production and suggest improvements.",
    "What's the biggest weakness in my empire?",
    "Give me a military strategy based on my current fleet.",
];

const AdvisorModal: React.FC<AdvisorModalProps> = ({ isOpen, onClose, onAsk, response, isLoading }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
            aria-modal="true" 
            role="dialog"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 border-2 border-purple-500 rounded-2xl shadow-2xl max-w-3xl w-full text-left transform transition-all relative flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-purple-700">
                     <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl font-bold"
                        aria-label="Zamknij"
                    >
                        &times;
                    </button>
                    <h2 className="text-3xl font-bold text-purple-300 flex items-center gap-3">
                        <span className="text-4xl">🧠</span>
                        AI Advisor
                    </h2>
                </div>
                
                <div className="flex-grow overflow-y-auto p-6 space-y-4">
                    <div className="bg-gray-900 p-4 rounded-lg min-h-[150px]">
                        <h3 className="font-bold text-lg text-gray-300 mb-2">Response:</h3>
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                                <p className="ml-4 text-gray-400">The AI is thinking...</p>
                            </div>
                        ) : (
                            <p className="text-gray-300 whitespace-pre-wrap">{response || "Ask a question to get advice."}</p>
                        )}
                    </div>

                    <div>
                        <h3 className="font-bold text-lg text-gray-300 mb-2">Ask a common question:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {PREDEFINED_QUESTIONS.map(q => (
                                <button
                                    key={q}
                                    onClick={() => onAsk(q)}
                                    disabled={isLoading}
                                    className="text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-wait"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvisorModal;