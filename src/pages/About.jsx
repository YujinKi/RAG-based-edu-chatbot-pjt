import React from 'react';

function About() {
  return (
    <div className="page-container">
      <h1>About Us</h1>
      <p>Welcome to Study Helper - your companion for better learning.</p>
      <div className="content-section">
        <h2>Our Mission</h2>
        <p>
          We aim to provide students with effective tools and resources
          to enhance their learning experience and achieve their academic goals.
        </p>
      </div>
      <div className="content-section">
        <h2>Features</h2>
        <ul>
          <li>Simple and intuitive interface</li>
          <li>Organized study materials</li>
          <li>Easy to use and navigate</li>
          <li>Accessible anywhere, anytime</li>
        </ul>
      </div>
    </div>
  );
}

export default About;
