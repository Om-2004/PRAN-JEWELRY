import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './SplashScreen.css';

function SplashScreen() {
  const navigate = useNavigate();
  const soundRef = useRef(null);

  useEffect(() => {
    // Initialize sound
    soundRef.current = new Audio('/cha-ching.mp3');
    soundRef.current.volume = 1.0; // Full volume

    // Play sound (with error handling)
    const playSound = async () => {
      try {
        await soundRef.current.play();
      } catch (err) {
        console.log("Autoplay blocked. User must interact first:", err);
      }
    };

    playSound();

    // Redirect after 5 seconds + CLEANUP SOUND
    const timer = setTimeout(() => {
      soundRef.current.pause();
      soundRef.current = null; // Destroy sound object
      navigate('/');
    }, 5000);

    return () => {
      clearTimeout(timer);
      soundRef.current?.pause(); // Emergency cleanup
    };
  }, [navigate]);

  return (
    <div className="splash-overlay">
      <div className="splash-content">
        <img 
          src="/Logo.png" 
          alt="P.R.A.N Jewellery" 
          className="splash-logo" 
        />
      </div>
    </div>
  );
}

export default SplashScreen;