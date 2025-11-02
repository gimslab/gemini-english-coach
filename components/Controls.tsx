
import React from 'react';

interface ControlsProps {
  isConversationStarted: boolean;
  isListening: boolean;
  onToggleConversation: () => void;
}

const Controls: React.FC<ControlsProps> = ({ isConversationStarted, isListening, onToggleConversation }) => {
  return (
    <div className="bg-gray-900/80 backdrop-blur-sm p-4 border-t border-gray-700 flex flex-col items-center justify-center">
      <button
        onClick={onToggleConversation}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
          isConversationStarted ? 'bg-red-500 hover:bg-red-600 focus:ring-red-400' : 'bg-purple-500 hover:bg-purple-600 focus:ring-purple-400'
        } ${isListening ? 'animate-pulse-deep' : ''}`}
        aria-label={isConversationStarted ? 'Stop conversation' : 'Start conversation'}
      >
        {isConversationStarted ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
      <p className={`mt-3 text-sm transition-opacity duration-300 ${isConversationStarted ? 'opacity-100' : 'opacity-0'} ${isListening ? 'text-green-400' : 'text-gray-400'}`}>
        {isListening ? 'Listening...' : 'Session active'}
      </p>
    </div>
  );
};

export default Controls;
