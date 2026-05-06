import React, { useState } from 'react';
import { type Flashcard as FlashcardType } from '../types/types';
import styles from './Flashcard.module.css';

interface FlashcardProps {
  card: FlashcardType;
}

// Automatically scales text based on character count
const calculateFontSize = (text: string | undefined, type: 'title' | 'body') => {
  if (!text) return '1em';
  const len = text.length;
  
  if (type === 'title') {
    if (len < 20) return '1.75em';
    if (len < 60) return '1.4em';
    if (len < 120) return '1.1em';
    return '0.9em'; // Very long titles
  } else {
    // Body text (cardText)
    if (len < 50) return '1.1em';
    if (len < 150) return '0.95em';
    if (len < 300) return '0.85em';
    return '0.75em'; // Very long descriptions
  }
};

const Flashcard: React.FC<FlashcardProps> = ({ card }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleFlip();
    }
  };

  return (
    <div 
      className={styles.scene} 
      onClick={handleFlip} 
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isFlipped}
    >
      <div className={`${styles.card} ${isFlipped ? styles.isFlipped : ''}`}>
        
        {/* --- FRONT FACE --- */}
        <div className={`${styles.face} ${styles.faceFront}`}>
          <div className={styles.content}>
            <div 
              className={styles.frontText}
              style={{ fontSize: calculateFontSize(card.front, 'title') }}
            >
              {card.front}
            </div>
          </div>
          <div className={styles.hint}>
            (Click or Space to flip)
          </div>
        </div>

        {/* --- BACK FACE --- */}
        <div className={`${styles.face} ${styles.faceBack}`}>
          <div className={styles.content}>
            <div 
              className={styles.backText}
              style={{ fontSize: calculateFontSize(card.back, 'title') }}
            >
              {card.back}
            </div>
            {card.cardText && (
              <div 
                className={styles.cardText}
                style={{ fontSize: calculateFontSize(card.cardText, 'body') }}
              >
                {card.cardText}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Flashcard;