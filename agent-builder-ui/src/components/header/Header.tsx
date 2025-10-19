import React from 'react';
import { UserMenu } from './UserMenu';

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-gray-900">Agent Builder</h1>
      </div>
      
      <div className="flex items-center">
        <UserMenu />
      </div>
    </header>
  );
}