import React, { useState, useEffect } from 'react';
import styles from '../pages/CreateForm.module.css';
import LocationPicker from './LocationPicker';
import { supabase } from '../lib/supabaseClient'; // Make sure this path is correct!
import { type Flashcard, type Category } from '../types/types';
import CategoryCreator from './CategoryCreator';

interface CardFormProps {
  initialData?: Flashcard;
  onSubmit: (data: Omit<Flashcard, 'id' | 'deck_id'>) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const CardForm: React.FC<CardFormProps> = ({ initialData, onSubmit, onCancel, isLoading = false }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [front, setFront] = useState(initialData?.front || '');
  const [back, setBack] = useState(initialData?.back || '');
  const [cardText, setCardText] = useState(initialData?.cardText || '');
  
  const [startYear, setStartYear] = useState<number | ''>(initialData?.start_year ?? '');
  const [endYear, setEndYear] = useState<number | ''>(initialData?.end_year ?? '');
  
  const [lat, setLat] = useState<number | null>(initialData?.location_lat || null);
  const [lng, setLng] = useState<number | null>(initialData?.location_lng || null);
  const [geoJson, setGeoJson] = useState<any | null>(initialData?.location_geo_json || null);

  //Category states
  const [categoryId, setCategoryId] = useState<string>(initialData?.category_id || '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  //Fetch categories when the form loads
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (data && !error) {
        setCategories(data);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setFront(initialData.front);
      setBack(initialData.back);
      setCardText(initialData.cardText || '');
      setStartYear(initialData.start_year ?? '');
      setEndYear(initialData.end_year ?? '');
      setLat(initialData.location_lat || null);
      setLng(initialData.location_lng || null);
      setGeoJson(initialData.location_geo_json || null);
      setCategoryId(initialData.category_id || ''); // Set initial category
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title: title || undefined,
      front,
      back,
      cardText,
      start_year: startYear === '' ? undefined : startYear,
      end_year: endYear === '' ? undefined : endYear,
      location_lat: lat || undefined,
      location_lng: lng || undefined,
      location_geo_json: geoJson,
      category_id: categoryId === '' ? null : categoryId,
    });
  };

  return (
    <div className={styles.formContainer}>
      <form className={styles.form} onSubmit={handleSubmit}>
        
        {/* Title */}
        <div className={styles.formGroup}>
          <label>Short Title (For Map/Timeline)</label>
          <input 
            className={styles.input} 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="e.g., Spanish Civil War"
          />
        </div>

        {/* Category Dropdown & Creator */}
        <div className={styles.formGroup}>
          <label>Category (Color on Timeline/Map)</label>
          
          {isCreatingCategory ? (
            <CategoryCreator 
              onCancel={() => setIsCreatingCategory(false)}
              onSuccess={(newCat) => {
                setCategories([...categories, newCat]); // Add it to the list
                setCategoryId(newCat.id); // Auto-select it
                setIsCreatingCategory(false); // Close the creator
              }}
            />
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <select 
                className={styles.input} 
                value={categoryId} 
                onChange={(e) => setCategoryId(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">-- No Category (Default Color) --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button 
                type="button" 
                className={styles.submitButton} 
                style={{ padding: '0 15px', minWidth: 'auto', background: '#4c566a', color: 'white' }}
                onClick={() => setIsCreatingCategory(true)}
              >
                + New
              </button>
            </div>
          )}
        </div>

        {/* Front */}
        <div className={styles.formGroup}>
          <label>Front (Question)</label>
          <input 
            className={styles.input} 
            value={front} 
            onChange={(e) => setFront(e.target.value)} 
            required 
          />
        </div>

        {/* Back */}
        <div className={styles.formGroup}>
          <label>Back (Answer)</label>
          <textarea 
            className={styles.textarea}
            value={back} 
            onChange={(e) => setBack(e.target.value)} 
            required 
            rows={3}
          />
        </div>

        {/* Notes */}
        <div className={styles.formGroup}>
          <label>Notes</label>
          <textarea 
            className={styles.textarea}
            value={cardText} 
            onChange={(e) => setCardText(e.target.value)} 
            rows={3}
          />
        </div>

        {/* Timeline Row */}
        <div className={styles.row}>
          <div className={styles.col}>
            <div className={styles.formGroup}>
              <label>Start Year</label>
              <input 
                type="number" 
                className={styles.input}
                value={startYear} 
                onChange={e => setStartYear(e.target.value ? Number(e.target.value) : '')} 
              />
            </div>
          </div>
          <div className={styles.col}>
            <div className={styles.formGroup}>
              <label>End Year</label>
              <input 
                type="number" 
                className={styles.input}
                value={endYear} 
                onChange={e => setEndYear(e.target.value ? Number(e.target.value) : '')} 
              />
            </div>
          </div>
        </div>

        {/* Map */}
        <div className={styles.formGroup}>
          <label>Location</label>
          <LocationPicker 
            initialLat={lat || undefined}
            initialLng={lng || undefined}
            initialGeoJson={geoJson}
            onLocationChange={(newLat, newLng, newGeo) => {
              setLat(newLat);
              setLng(newLng);
              setGeoJson(newGeo);
            }} 
          />
          <button 
            type="button" 
            onClick={() => { setLat(null); setLng(null); setGeoJson(null); }}
            className={styles.clearBtn}
          >
            (Clear Location)
          </button>
        </div>

        {/* Actions */}
        <div className={styles.buttonGroup}>
          {onCancel && (
            <button 
              type="button" 
              onClick={onCancel} 
              className={`${styles.submitButton} ${styles.dangerBtn}`}
            >
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            disabled={isLoading} 
            className={`${styles.submitButton} ${styles.primaryBtn}`}
          >
            {isLoading ? 'Saving...' : 'Save Card'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CardForm;