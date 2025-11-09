import React from 'react';

function Home() {
  return (
    <div className="page-container">
      <div className="hero-section">
        <h1>Welcome to Study Helper</h1>
        <p className="hero-subtitle">Your personal learning companion</p>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <h3>📚 Organize</h3>
          <p>Keep your study materials organized and accessible</p>
        </div>

        <div className="feature-card">
          <h3>⏰ Schedule</h3>
          <p>Plan your study sessions effectively</p>
        </div>

        <div className="feature-card">
          <h3>📊 Track</h3>
          <p>Monitor your progress and achievements</p>
        </div>

        <div className="feature-card">
          <h3>🎯 Focus</h3>
          <p>Stay focused on your learning goals</p>
        </div>
      </div>

      <div className="cta-section">
        <h2>Ready to get started?</h2>
        <p>Explore the app and discover how we can help you succeed!</p>
      </div>
    </div>
  );
}

export default Home;


