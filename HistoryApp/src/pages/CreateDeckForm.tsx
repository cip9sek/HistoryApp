import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import styles from './CreateForm.module.css';

interface CreateDeckFormProps {
  onSuccess: () => void;
}

const CreateDeckForm: React.FC<CreateDeckFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('You must be logged in to create a deck');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('decks')
      .insert([
        {
          name,
          description,
          document_content: documentContent,
          owner_id: user.id
        }
      ]);

    if (error) {
      alert(error.message);
    } else {
      onSuccess();
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className={styles.formContainer}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.title}>Create New Deck</h2>

        <div className={styles.formGroup}>
          <label>Deck Name</label>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g., Biology 101"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Description</label>
          <input
            className={styles.input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional short description"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Document Content (Markdown)</label>
          <textarea
            className={`${styles.textarea} ${styles.textareaMonospace}`}
            value={documentContent}
            onChange={(e) => setDocumentContent(e.target.value)}
            rows={10}
            placeholder="# Paste your notes here..."
          />
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="submit"
            className={`${styles.submitButton} ${styles.primaryBtn}`}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Create Deck'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateDeckForm;