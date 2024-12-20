import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Header } from './components/navigation/Header';
import { Hero } from './components/home/Hero';
import { Features } from './components/home/Features';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main>
          <Hero />
          <Features />
        </main>
      </div>
    </Router>
  );
}

export default App;