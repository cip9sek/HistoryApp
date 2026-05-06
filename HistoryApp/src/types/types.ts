export interface Category {
  id: string;
  name: string;
  color: string;
  owner_id: string;
}

export interface Flashcard {
  id: string; 
  title?: string;
  front: string; 
  back: string; 
  cardText?: string; 
  start_year?: number; 
  end_year?: number;   
  location_lat?: number;
  location_lng?: number;
  location_geo_json?: any;
  sort_order?: number;
  category_id?: string | null;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  document_content?: string;
  owner_id: string; 
  cards?: Flashcard[];
  category_id?: string | null;
}