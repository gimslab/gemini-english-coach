import React, { useRef, useEffect } from 'react';
import { TranscriptEntry, TranscriptRole } from '../types';

interface ConversationViewProps {
  transcripts: TranscriptEntry[];
  onSpeak: (text: string) => void;
  isConversationActive: boolean;
}

const ConversationView: React.FC<ConversationViewProps> = ({ transcripts, onSpeak, isConversationActive }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {transcripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <h2 className="text-xl font-semibold">Start the conversation</h2>
          <p className="mt-2 max-w-md">Press the microphone button below to begin your English coaching session. Speak in Korean for translations or in English for feedback.</p>
        </div>
      ) : (
        transcripts.map((entry) => (
          <div key={entry.id} className={`flex ${entry.role === TranscriptRole.USER ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start max-w-lg lg:max-w-2xl ${entry.role === TranscriptRole.USER ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${entry.role === TranscriptRole.USER ? 'bg-blue-500' : 'bg-purple-500'}`}>
                    {entry.role === TranscriptRole.USER ? 'You' : 'AI'}
                </div>
                <div className={`relative group px-4 py-3 rounded-2xl ${entry.role === TranscriptRole.USER ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>
                    <p className="text-white whitespace-pre-wrap">{entry.text}</p>
                    {entry.role === TranscriptRole.MODEL && (
                        <button
                        onClick={() => onSpeak(entry.text)}
                        disabled={isConversationActive}
                        className="absolute -top-3 -right-3 w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 disabled:opacity-25 disabled:cursor-not-allowed hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        aria-label="Read message aloud"
                        title={isConversationActive ? "Stop conversation to play audio" : "Read message aloud"}
                        >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        </button>
                    )}
                </div>
            </div>
          </div>
        ))
      )}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default ConversationView;
