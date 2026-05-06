import React from 'react';
import { Link } from 'react-router-dom';
import { type Deck } from '../types/types';
import styles from './DeckListView.module.css';

interface DeckListViewProps {
  decks: Deck[];
}

// A vibrant subset of the Nord color palette to break up the grey
const NORD_ACCENTS = [
  '#88c0d0', // Light Blue
  '#a3be8c', // Green
  '#ebcb8b', // Yellow
  '#d08770', // Orange
  '#b48ead', // Purple
  '#81a1c1'  // Darker Blue
];

const DeckListView: React.FC<DeckListViewProps> = ({ decks }) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Your Decks</h2>

      {decks.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No decks found. Time to create one!</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {decks.map((deck, index) => {
            // Assign a recurring color based on the card's position in the array
            const accentColor = NORD_ACCENTS[index % NORD_ACCENTS.length];

            return (
              <Link
                key={deck.id}
                to={`/deck/${deck.id}`}
                className={styles.cardLink}
              >
                <article 
                  className={styles.card}
                  // Inject the specific color into the CSS variables for this card
                  style={{ '--accent-color': accentColor } as React.CSSProperties}
                >
                  <h3>{deck.name}</h3>

                  {deck.description && (
                    <p className={styles.description}>
                      {deck.description}
                    </p>
                  )}

                  <div className={styles.countBadge}>
                    {deck.cards?.length || 0} cards
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeckListView;