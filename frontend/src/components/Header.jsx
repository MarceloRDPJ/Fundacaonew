import React from 'react';

const Header = () => {
  return (
    <header className="bg-gray-800 text-white p-4 shadow-md z-10">
      <div className="container mx-auto flex items-center justify-between">
        <h1 className="text-xl font-bold">Assistente de Onboarding</h1>
        {/* User info can go here */}
      </div>
    </header>
  );
};

export default Header;