import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { useEditMode } from '../contexts/EditModeContext'; 
import { Library, Eye, Edit3, Plus, LogOut, LogIn, Sun, Moon } from 'lucide-react';
import styles from './Header.module.css';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  session: Session | null;
}

const Header: React.FC<HeaderProps> = ({ session }) => {
  const navigate = useNavigate();
  const { isEditMode, toggleEditMode } = useEditMode(); 
  const { theme, toggleTheme } = useTheme();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        HistoryApp
      </Link>

      <nav className={styles.nav}>
        <Link to="/" className={styles.navLink}>
          <Library className={styles.icon} size={18} />
          <span className={styles.navText}>All Decks</span>
        </Link>

        <button onClick={toggleTheme} className={`${styles.navLink} ${styles.themeToggle}`} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className={styles.icon} size={18} /> : <Moon className={styles.icon} size={18} />}
          <span className={styles.navText}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {session ? (
          <>
            <button 
              onClick={toggleEditMode} 
              className={`${styles.modeToggle} ${isEditMode ? styles.editActive : styles.viewActive}`}
            >
              {isEditMode ? <Edit3 className={styles.icon} size={18} /> : <Eye className={styles.icon} size={18} />}
              <span className={styles.navText}>{isEditMode ? 'Edit Mode' : 'View Mode'}</span>
            </button>

            <Link to="/new-deck" className={`${styles.navLink} ${styles.primaryBtn}`}>
              <Plus className={styles.icon} size={18} />
              <span className={styles.navText}>Create Deck</span>
            </Link>
            
            <button onClick={handleLogout} className={`${styles.navLink} ${styles.logoutBtn}`}>
              <LogOut className={styles.icon} size={18} />
              <span className={styles.navText}>Log Out</span>
            </button>
          </>
        ) : (
          <Link to="/login" className={`${styles.navLink} ${styles.primaryBtn}`}>
            <LogIn className={styles.icon} size={18} />
            <span className={styles.navText}>Login</span>
          </Link>
        )}
      </nav>
    </header>
  );
};

export default Header;