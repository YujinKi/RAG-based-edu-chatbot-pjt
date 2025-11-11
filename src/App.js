import './App.css';
import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation/Navigation';
import Footer from './components/Footer/Footer';
import Home from './pages/Home';
import StudyPlan from './pages/StudyPlan';
import DocumentAnalyzer from './pages/DocumentAnalyzer';

function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="App">
      {!isHomePage && <Navigation />}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/study-plan" element={<StudyPlan />} />
          <Route path="/document-analyzer" element={<DocumentAnalyzer />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
