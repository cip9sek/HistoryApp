import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';
import { supabase } from '../lib/supabaseClient';
import { useDeckById } from '../hooks/useDeckById';
import { useEditMode } from '../contexts/EditModeContext';

// Icons
import { Layers, BookOpen, Clock, Map as MapIcon, Plus, ArrowUpDown, Trash2, Edit3, Check, X } from 'lucide-react';

// Components
import Flashcard from '../components/Flashcard';
import Timeline from '../components/Timeline';
import CardForm from '../components/CardForm';
import ReorderCards from '../components/ReorderCards';

// Lazy load the map
const DeckMap = React.lazy(() => import('../components/DeckMap'));

// Styles
import styles from './DeckView.module.css';

const DeckView: React.FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { deck, loading, refreshDeck } = useDeckById(deckId);

  // Pull in global edit mode
  const { isEditMode } = useEditMode();

  // User & View State
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'cards' | 'document' | 'timeline' | 'map'>('cards');

  // Edit State
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [docText, setDocText] = useState('');
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [isReorderingCards, setIsReorderingCards] = useState(false);
  
  // Title Edit State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState('');

  const [targetCardId, setTargetCardId] = useState<string | null>(null);

  // Ref to target the flashcard for the spacebar click simulation
  const flashcardContainerRef = useRef<HTMLDivElement>(null);

  const cards = deck?.cards || [];
  const currentCard = cards[currentIndex];

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        if (user.email === 'chladmatyas@gmail.com') setIsAdmin(true);
      }
    });
  }, []);

  useEffect(() => {
    if (deck) {
      setDocText(deck.document_content || '');
      setTitleText(deck.name || '');
    }
  }, [deck]);

  useEffect(() => {
    if (currentIndex >= cards.length && cards.length > 0) {
      setCurrentIndex(cards.length - 1);
    }
  }, [cards.length, currentIndex]);

  useEffect(() => {
    if (targetCardId && cards.length > 0) {
      const idx = cards.findIndex(c => c.id === targetCardId);
      if (idx !== -1) {
        setCurrentIndex(idx);
        setTargetCardId(null);
      }
    }
  }, [cards, targetCardId]);

  // --- Handlers ---
  const handleSaveTitle = async () => {
    if (!deckId || !titleText.trim()) return;
    const { error } = await supabase.from('decks').update({ name: titleText.trim() }).eq('id', deckId);
    if (error) alert(error.message);
    else { 
      await refreshDeck(); 
      setIsEditingTitle(false); 
    }
  };

  const handleSaveDoc = async () => {
    if (!deckId) return;
    const { error } = await supabase.from('decks').update({ document_content: docText }).eq('id', deckId);
    if (error) alert(error.message);
    else { await refreshDeck(); setIsEditingDoc(false); }
  };

  const handleDeleteCard = async () => {
    if (!currentCard || !window.confirm("Delete this card? This cannot be undone.")) return;
    const { error } = await supabase.from('cards').delete().eq('id', currentCard.id);
    if (error) alert(error.message);
    else { await refreshDeck(); if (currentIndex > 0) setCurrentIndex(prev => prev - 1); }
  };

  const handleDeleteDeck = async () => {
    if (!deck || !window.confirm(`Delete deck "${deck.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('decks').delete().eq('id', deckId);
    if (error) alert(error.message);
    else navigate('/');
  };

  const goToNext = () => setCurrentIndex(i => (i < cards.length - 1 ? i + 1 : 0));
  const goToPrev = () => setCurrentIndex(i => (i > 0 ? i - 1 : cards.length - 1));

  // --- Global Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'cards' || isEditingCard || isEditingDoc || isReorderingCards || isEditingTitle) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (flashcardContainerRef.current) {
          const cardElement = flashcardContainerRef.current.firstElementChild as HTMLElement;
          if (cardElement) {
            cardElement.click();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, isEditingCard, isEditingDoc, isReorderingCards, isEditingTitle, cards.length]);

  if (loading) return <div className={styles.loading}>Loading Deck...</div>;
  if (!deck) return <div className={styles.error}>Deck not found!</div>;

  const canEdit = isAdmin || (currentUserId !== null && deck.owner_id === currentUserId);
  const showEditControls = canEdit && isEditMode;

  return (
    <div className={styles.container}>

      {/* HEADER & CONTROLS */}
      <header className={styles.header}>
        
        {/* EDITABLE TITLE SECTION */}
        <div className={styles.titleContainer}>
          {isEditingTitle ? (
            <div className={styles.titleEditWrapper}>
              <input 
                className={styles.titleInput}
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setTitleText(deck.name); // Revert changes
                    setIsEditingTitle(false);
                  }
                }}
              />
              <button onClick={handleSaveTitle} className={styles.titleActionBtn} title="Save">
                <Check size={20} />
              </button>
              <button 
                onClick={() => { setTitleText(deck.name); setIsEditingTitle(false); }} 
                className={`${styles.titleActionBtn} ${styles.titleCancelBtn}`} 
                title="Cancel"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div 
              className={`${styles.titleWrapper} ${showEditControls ? styles.titleEditable : ''}`}
              onClick={() => showEditControls && setIsEditingTitle(true)}
              title={showEditControls ? "Click to edit title" : ""}
            >
              <h2 className={styles.deckTitle}>{deck.name}</h2>
              {showEditControls && <Edit3 size={18} className={styles.titleEditIcon} />}
            </div>
          )}
        </div>

        <div className={styles.controlsScrollWrapper}>
          <div className={styles.controls}>

            {/* EDIT ACTIONS (Only visible to admin/owner in edit mode) */}
            {showEditControls && (
              <div className={styles.actionGroup}>
                <Link to={`/deck/${deckId}/new-card`} className={`${styles.btn} ${styles.btnAdd}`}>
                  <Plus size={18} className={styles.mobileIcon} />
                  <span className={styles.desktopText}>+ Add Card</span>
                </Link>

                <button onClick={handleDeleteDeck} className={`${styles.btn} ${styles.btnDelete}`}>
                  <Trash2 size={18} className={styles.mobileIcon} />
                  <span className={styles.desktopText}>Delete Deck</span>
                </button>
              </div>
            )}

            {/* VIEW MODES & ORDER (Segmented Control - 5 Items) */}
            <div className={styles.viewGroup}>
              <button
                onClick={() => { setViewMode('cards'); setIsReorderingCards(false); }}
                className={`${styles.btn} ${styles.btnCard} ${viewMode === 'cards' && !isReorderingCards ? styles.active : ''}`}
                title="Practice Cards"
              >
                <Layers size={18} className={styles.mobileIcon} />
                <span className={styles.desktopText}>Cards</span>
              </button>

              <button
                onClick={() => { setViewMode('cards'); setIsReorderingCards(true); }}
                className={`${styles.btn} ${styles.btnCard} ${isReorderingCards ? styles.active : ''}`}
                title="Card List / Order"
              >
                <ArrowUpDown size={18} className={styles.mobileIcon} />
                <span className={styles.desktopText}>Order</span>
              </button>

              <button
                onClick={() => { setViewMode('document'); setIsReorderingCards(false); }}
                className={`${styles.btn} ${viewMode === 'document' ? styles.btnDocActive : styles.btnDoc}`}
                title="Read Document"
              >
                <BookOpen size={18} className={styles.mobileIcon} />
                <span className={styles.desktopText}>Document</span>
              </button>

              <button
                onClick={() => { setViewMode('timeline'); setIsReorderingCards(false); }}
                className={`${styles.btn} ${styles.btnTimeline} ${viewMode === 'timeline' ? styles.active : ''}`}
                title="Timeline"
              >
                <Clock size={18} className={styles.mobileIcon} />
                <span className={styles.desktopText}>Timeline</span>
              </button>

              <button
                onClick={() => { setViewMode('map'); setIsReorderingCards(false); }}
                className={`${styles.btn} ${styles.btnMap} ${viewMode === 'map' ? styles.active : ''}`}
                title="Map"
              >
                <MapIcon size={18} className={styles.mobileIcon} />
                <span className={styles.desktopText}>Map</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className={styles.mainContent}>

        {/* 1. DOCUMENT VIEW (Constrained Width) */}
        {viewMode === 'document' && (
          <div className={styles.contentConstrained}>
            <div className={styles.documentWrapper}>
              {isEditingDoc ? (
                <div className={styles.editContainer}>
                  <textarea className={styles.docEditor} value={docText} onChange={(e) => setDocText(e.target.value)} />
                  <div className={styles.editActions}>
                    <button onClick={() => setIsEditingDoc(false)} className={`${styles.btn} ${styles.btnCancel}`}>Cancel</button>
                    <button onClick={handleSaveDoc} className={`${styles.btn} ${styles.btnSave}`}>Save</button>
                  </div>
                </div>
              ) : (
                <div className={styles.markdownView}>
                  {showEditControls && <button onClick={() => setIsEditingDoc(true)} className={styles.editIconBtn}>✏️ Edit</button>}
                  {deck.document_content ? <Markdown>{deck.document_content}</Markdown> : <p className={styles.emptyText}>No document text yet.</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. MAP VIEW (Full Width) */}
        {viewMode === 'map' && (
          <Suspense fallback={<div className={styles.loading}>Loading Map...</div>}>
            <div className={styles.fullSpaceWrapper}>
              <DeckMap cards={cards} />
            </div>
          </Suspense>
        )}

        {/* 3. TIMELINE VIEW (Full Width) */}
        {viewMode === 'timeline' && (
          <div className={styles.fullSpaceWrapper}>
            <Timeline cards={cards} />
          </div>
        )}

        {/* 4. CARDS VIEW (Constrained Width) */}
        {viewMode === 'cards' && (
          <div className={styles.contentConstrained}>
            {isReorderingCards ? (
              <ReorderCards
                initialCards={cards}
                isViewOnly={!showEditControls}
                onClose={() => setIsReorderingCards(false)}
                onSaveSuccess={async () => {
                  await refreshDeck();
                  setIsReorderingCards(false);
                  setCurrentIndex(0);
                }}
                onCardClick={async (cardId) => {
                  await refreshDeck();
                  setTargetCardId(cardId);
                  setIsReorderingCards(false);
                }}
              />
            ) : cards.length === 0 ? (
              <p className={styles.emptyText}>This deck has no cards yet.</p>
            ) : isEditingCard ? (
              <div className={styles.cardFormWrapper}>
                <CardForm
                  initialData={currentCard}
                  onCancel={() => setIsEditingCard(false)}
                  onSubmit={async (formData) => {
                    const { error } = await supabase.from('cards').update(formData).eq('id', currentCard.id);
                    if (error) alert(error.message);
                    else { await refreshDeck(); setIsEditingCard(false); }
                  }}
                />
              </div>
            ) : (
              <>
                <div className={styles.flashcardContainer} ref={flashcardContainerRef}>
                  <Flashcard key={currentCard.id} card={currentCard} />
                </div>
                {showEditControls && (
                  <div className={styles.cardActions}>
                    <button onClick={() => setIsEditingCard(true)} className={styles.textBtn}> Edit Card</button>
                    <button onClick={handleDeleteCard} className={`${styles.textBtn} ${styles.dangerText}`}>Delete</button>
                  </div>
                )}
                <div className={styles.cardNav}>
                  <button onClick={goToPrev} className={styles.navBtn}>Previous</button>
                  <span className={styles.cardCounter}>{currentIndex + 1} / {cards.length}</span>
                  <button onClick={goToNext} className={styles.navBtn}>Next</button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default DeckView;