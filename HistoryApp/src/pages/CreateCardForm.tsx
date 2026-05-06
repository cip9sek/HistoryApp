import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import CardForm from '../components/CardForm';
import styles from './CreateForm.module.css'; // Import for the title style

interface CreateCardFormProps {
  onSuccess: () => void;
}

const CreateCardForm: React.FC<CreateCardFormProps> = ({ onSuccess }) => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCreate = async (formData: any) => {
    if (!deckId) return;
    setLoading(true);

    const { error } = await supabase
      .from('cards')
      .insert([{ ...formData, deck_id: deckId }]);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      onSuccess();
      navigate(`/deck/${deckId}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <h2 className={styles.title}>Add New Flashcard</h2>
      <CardForm onSubmit={handleCreate} isLoading={loading} />
    </div>
  );
};

export default CreateCardForm;