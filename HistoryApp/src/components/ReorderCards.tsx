import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { type Flashcard } from '../types/types';
import styles from './ReorderCards.module.css';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableCardItem = ({ 
  card, 
  index, 
  onManualChange,
  onCardClick,
  isViewOnly 
}: { 
  card: Flashcard; 
  index: number; 
  onManualChange: (id: string, newPosition: number) => void;
  onCardClick: (id: string) => void;
  isViewOnly: boolean; 
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  
  const [inputValue, setInputValue] = useState((index + 1).toString());

  useEffect(() => { setInputValue((index + 1).toString()); }, [index]);

  const handleBlurOrEnter = () => {
    let newPos = parseInt(inputValue, 10);
    if (isNaN(newPos) || newPos < 1) newPos = 1;
    onManualChange(card.id, newPos);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.3)' : 'none',
  };

  let dateString = '';
  if (card.start_year !== undefined && card.start_year !== null) {
    dateString += card.start_year;
    if (card.end_year !== undefined && card.end_year !== null && card.end_year !== card.start_year) {
      dateString += ` - ${card.end_year}`;
    }
  }

return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`${styles.cardRow} ${isDragging ? styles.dragging : ''} ${isViewOnly ? styles.viewModeRow : ''}`}
    >
      
      {/* 1. Drag Handle (Hidden in View Mode) */}
      {!isViewOnly && (
        <div className={styles.dragHandle} {...attributes} {...listeners} aria-label="Drag to reorder">
          <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor">
            <circle cx="4" cy="4" r="1.5" />
            <circle cx="4" cy="10" r="1.5" />
            <circle cx="4" cy="16" r="1.5" />
            <circle cx="10" cy="4" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="10" cy="16" r="1.5" />
          </svg>
        </div>
      )}

      {/* 2. NEW: Static Number (Only in View Mode) */}
      {isViewOnly && (
        <div className={styles.staticIndex}>
          {index + 1}.
        </div>
      )}
      
      {/* 3. Card Title and Dates */}
      <div 
        className={styles.cardInfo} 
        onClick={() => onCardClick(card.id)}
        title="Click to view card"
      >
        <span className={styles.cardTitle}>{card.title || card.front}</span>
        {dateString && <span className={styles.cardDates}>({dateString})</span>}
      </div>

      {/* 4. Number Input (Hidden in View Mode) */}
      {!isViewOnly && (
        <div className={styles.orderInputWrapper}>
          <input 
            type="number"
            min="1"
            className={styles.orderInput}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlurOrEnter}
            onKeyDown={(e) => e.key === 'Enter' && handleBlurOrEnter()}
          />
        </div>
      )}
    </div>
  );
};

// 2. Update the main component props
interface ReorderCardsProps {
  initialCards: Flashcard[];
  onClose: () => void;
  onSaveSuccess: () => void;
  onCardClick?: (cardId: string) => void;
  isViewOnly?: boolean; // NEW
}

const ReorderCards: React.FC<ReorderCardsProps> = ({ initialCards, onClose, onSaveSuccess, onCardClick, isViewOnly = false }) => {
  const [items, setItems] = useState<Flashcard[]>(() => 
    [...initialCards].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  );
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), 
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }), 
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleManualChange = (id: string, newDisplayPosition: number) => {
    setItems((items) => {
      const oldIndex = items.findIndex((item) => item.id === id);
      let newIndex = newDisplayPosition - 1; 
      
      if (newIndex < 0) newIndex = 0;
      if (newIndex >= items.length) newIndex = items.length - 1;

      if (oldIndex === newIndex) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  // Modified to optionally skip closing logic if we are navigating away instead
  const saveOrderToDatabase = async (isNavigating: boolean = false) => {
    setIsSaving(true);
    
    const updates = items.map((card, index) => ({
      ...card, 
      sort_order: index + 1, 
    }));

    const { error } = await supabase
      .from('cards')
      .upsert(updates, { onConflict: 'id' });

    setIsSaving(false);
    
    if (error) {
      alert('Failed to save order: ' + error.message);
      return false; // Return failure state
    } else {
      if (!isNavigating) {
        onSaveSuccess(); 
      }
      return true; // Return success state
    }
  };

 const handleCardInteraction = async (cardId: string) => {
    if (isViewOnly) {
      // If we are just looking at the Table of Contents, skip saving and just navigate!
      if (onCardClick) onCardClick(cardId);
    } else {
      // If we are actively reordering (Edit Mode), save the order first
      const success = await saveOrderToDatabase(true);
      if (success && onCardClick) {
        onCardClick(cardId);
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {/* Change title based on mode */}
        <h3>{isViewOnly ? 'Table of Contents' : 'Reorder Cards'}</h3>
        <button onClick={onClose} className={styles.closeBtn}>Close</button>
      </div>
      
      <p className={styles.instructions}>
        {isViewOnly 
          ? "Click a card to jump directly to it." 
          : "Drag the handle to move, type a number, or click a card to view it."}
      </p>

      <div className={styles.listContainer}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={isViewOnly ? undefined : handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((card, index) => (
              <SortableCardItem 
                key={card.id} 
                card={card} 
                index={index} 
                onManualChange={handleManualChange} 
                onCardClick={handleCardInteraction} 
                isViewOnly={isViewOnly} // Pass it down
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Hide the save button entirely if we are in view mode */}
      {!isViewOnly && (
        <div className={styles.footer}>
          <button onClick={() => saveOrderToDatabase(false)} disabled={isSaving} className={styles.saveBtn}>
            {isSaving ? 'Saving...' : 'Save New Order'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReorderCards;