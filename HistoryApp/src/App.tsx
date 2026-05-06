import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { useDecks } from './hooks/useDecks';
import { EditModeProvider } from './contexts/EditModeContext'; // NEW IMPORT
import { ThemeProvider } from './contexts/ThemeContext';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import Login from './pages/Login';
import DeckView from './pages/DeckView';
import DeckListView from './pages/DeckListView';
import CreateDeckForm from './pages/CreateDeckForm';
import CreateCardForm from './pages/CreateCardForm';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const { decks, loading, refreshData } = useDecks();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    // NEW: Wrap the entire app inside the Provider
    <ThemeProvider>
    <EditModeProvider>
      <div className='app-container'>
        <Header session={session} />

        <main>
          {loading ? (
            <div className='loading-state'>Loading database...</div>
          ) : (
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<DeckListView decks={decks} />} />
              <Route path="/deck/:deckId" element={<DeckView />} />
              <Route path="/login" element={<Login />} />

              {/* Protected Routes (Protection disabled for testing) */}
              <Route 
                path="/new-deck" 
                element={<CreateDeckForm onSuccess={refreshData} />} 
              />
              <Route
                path="/deck/:deckId/new-card"
                element={<CreateCardForm onSuccess={refreshData} />}
              />
            </Routes>
          )}
        </main>

        <Footer />
      </div>
    </EditModeProvider>
    </ThemeProvider>
  );
}

export default App;