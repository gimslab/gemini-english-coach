
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-4 px-6 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-700">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
          Gemini English Coach
        </h1>
        <div className="text-sm text-gray-400">For Korean Speakers</div>
      </div>
    </header>
  );
};

export default Header;
