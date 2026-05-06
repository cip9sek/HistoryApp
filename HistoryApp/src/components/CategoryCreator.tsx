import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { type Category } from '../types/types';
import styles from '../pages/CreateForm.module.css';

interface CategoryCreatorProps {
  onSuccess: (newCategory: Category) => void;
  onCancel: () => void;
}

const CategoryCreator: React.FC<CategoryCreatorProps> = ({ onSuccess, onCancel }) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#bf616a');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!newCatName.trim()) return;
    setIsSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      alert("Must be logged in to create category.");
      setIsSaving(false);
      return;
    }

    const newCat = {
      name: newCatName.trim(),
      color: newCatColor,
      owner_id: userData.user.id
    };

    const { data, error } = await supabase.from('categories').insert(newCat).select().single();
    
    if (error) {
      alert(error.message);
      setIsSaving(false);
    } else if (data) {
      onSuccess(data); // Pass the new category back up!
    }
  };

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#2e3440', padding: '10px', borderRadius: '4px' }}>
      <input 
        className={styles.input} 
        placeholder="Category Name" 
        value={newCatName}
        onChange={(e) => setNewCatName(e.target.value)}
        style={{ flex: 1, marginBottom: 0 }}
        autoFocus
        disabled={isSaving}
      />
      <input 
        type="color" 
        value={newCatColor}
        onChange={(e) => setNewCatColor(e.target.value)}
        style={{ cursor: 'pointer', height: '36px', width: '40px', padding: '0', background: 'none', border: 'none' }}
        disabled={isSaving}
      />
      <button 
        type="button" 
        className={`${styles.submitButton} ${styles.primaryBtn}`} 
        style={{ padding: '8px 12px', minWidth: 'auto' }}
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? '...' : 'Save'}
      </button>
      <button 
        type="button" 
        className={styles.textBtn} 
        onClick={onCancel}
        disabled={isSaving}
      >
        Cancel
      </button>
    </div>
  );
};

export default CategoryCreator;