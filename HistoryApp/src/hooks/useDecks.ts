import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { type Deck } from '../types/types';

export const useDecks = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // We use useCallback so this function doesn't get re-created every render
  // This is important if you pass it to dependency arrays later.
  const fetchDecks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('decks')
        .select(`
          *,
          cards (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching decks:', error);
        setError(error.message);
      } else {
        setDecks(data || []);
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Automatically fetch on mount
  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  return { 
    decks, 
    loading, 
    error, 
    refreshData: fetchDecks // We expose fetchDecks as 'refreshData'
  };
};