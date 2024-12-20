import React from 'react';
import { ScrollText, Users, Calendar, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="bg-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <ScrollText className="h-8 w-8" />
              <span className="font-bold text-xl">Jewish Network State</span>
            </Link>
          </div>
          
          <nav className="flex space-x-8">
            <Link to="/" className="flex items-center space-x-1 hover:text-blue-200">
              <Home className="h-5 w-5" />
              <span>Home</span>
            </Link>
            <Link to="/community" className="flex items-center space-x-1 hover:text-blue-200">
              <Users className="h-5 w-5" />
              <span>Community</span>
            </Link>
            <Link to="/events" className="flex items-center space-x-1 hover:text-blue-200">
              <Calendar className="h-5 w-5" />
              <span>Events</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}