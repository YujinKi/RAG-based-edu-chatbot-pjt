import './App.css';
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation/Navigation';
import Footer from './components/Footer/Footer';
import StudyPlan from './pages/StudyPlan';
import Chatbot from './pages/Chatbot';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Chatbot />} />
            <Route path="/study-plan" element={<StudyPlan />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
