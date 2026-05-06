import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { type Deck } from '../types/types';

export const useDeckById = (deckId: string | undefined) => {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDeck = useCallback(async () => {
    if (!deckId) return; // Guard clause
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('decks')
        .select(`*, cards (*)`) // Fetch cards too
        .eq('id', deckId)
        // 1. Sort the nested cards by sort_order. nullsFirst: false pushes un-sorted cards to the end.
        .order('sort_order', { foreignTable: 'cards', ascending: true, nullsFirst: false })
        // 2. Secondary fallback sort: if sort_order is the same (or both null), sort by when they were created.
        .order('created_at', { foreignTable: 'cards', ascending: true })
        .single();

      if (error) throw error;
      setDeck(data);
    } catch (error) {
      console.error('Error fetching deck:', error);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    fetchDeck();
  }, [fetchDeck]);

  return { deck, loading, refreshDeck: fetchDeck };
};