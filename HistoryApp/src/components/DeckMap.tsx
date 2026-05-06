import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, LayersControl, useMapEvents } from 'react-leaflet';
import { supabase } from '../lib/supabaseClient'; 
import { type Flashcard, type Category } from '../types/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './DeckMap.module.css';

// --- Helper: Create Custom Icon ---
const createPushpinIcon = (color: string) => {
  return L.divIcon({
    className: styles.customPushpin,
    html: `
      <div class="${styles.pinContainer}">
        <div class="${styles.pinHead}" style="background: radial-gradient(circle at 30% 30%, #ffffff, ${color});"></div>
        <div class="${styles.pinStick}"></div>
        <div class="${styles.pinShadow}"></div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -35]
  });
};

// --- Helper: Auto Zoom ---
const AutoZoomHandler = () => {
  useMapEvents({
    baselayerchange: (e: L.LayersControlEvent) => {
      if (e.name === "Physical (Default)" && e.target.getZoom() > 8) {
        e.target.setZoom(8);
      }
    }
  });
  return null;
};

// --- High-Performance Dynamic Blur ---
const DynamicBlurHandler = () => {
  const map = useMapEvents({
    zoom: () => {
      const zoom = map.getZoom();
      
      // --- OPTIMIZED CONTROLS ---
      const minBlur = 2;        // 0px blur when zoomed out (crisp and exact)
      const maxBlur = 30;       // 15px max (Keeps the browser rendering smoothly)
      const startZoomLevel = 3; // Starts getting fuzzy at zoom 4 (country/continent level)
      const blurSpeed = 3;    // Smoothly adds 2.5px of blur per zoom level
      
      // Calculate: (Zoom - 4) * 2.5
      // e.g., Zoom 4 = 0px blur. Zoom 8 = 10px blur. Zoom 10+ = 15px blur.
      let calculatedBlur = (zoom - startZoomLevel) * blurSpeed;
      
      const finalBlur = Math.max(minBlur, Math.min(maxBlur, calculatedBlur));
      
      map.getContainer().style.setProperty('--dynamic-blur', `${finalBlur}px`);
    }
  });

  // Set initial blur on mount (uses the same math as above)
  useEffect(() => {
    const zoom = map.getZoom();
    const finalBlur = Math.max(0, Math.min(15, (zoom - 4) * 2.5));
    map.getContainer().style.setProperty('--dynamic-blur', `${finalBlur}px`);
  }, [map]);

  return null;
};

interface DeckMapProps {
  cards: Flashcard[];
}

const DeckMap: React.FC<DeckMapProps> = ({ cards }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [highVisibility, setHighVisibility] = useState(false); 

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  const catDict = useMemo(() => new Map(categories.map(c => [c.id, c.color])), [categories]);

  const getCardColor = (card: Flashcard) => {
    if (card.category_id && catDict.has(card.category_id)) {
      return catDict.get(card.category_id)!;
    }
    return '#bf616a'; 
  };

  const validCards = cards.filter(c => 
    (typeof c.location_lat === 'number' && typeof c.location_lng === 'number') || 
    c.location_geo_json
  );

  if (validCards.length === 0) {
    return <div className={styles.emptyMap}>No locations mapped.</div>;
  }

  return (
    <div className={styles.mapContainer}>
      
      {/* ... */}
      <button 
        className={`${styles.visibilityToggle} ${highVisibility ? styles.active : ''}`}
        onClick={() => setHighVisibility(!highVisibility)}
        title="Toggle region highlight"
      >
        Highlight {highVisibility ? 'ON' : 'OFF'}
      </button>
      {/* ... */}

      <MapContainer center={[48, 14]} zoom={4} className={styles.leafletMap}>
        <AutoZoomHandler />
      
        <DynamicBlurHandler />

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Physical (Default)">
            <TileLayer
              attribution='Tiles &copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}"
              maxNativeZoom={8}
              maxZoom={18} 
            />
          </LayersControl.BaseLayer>

          {/* <LayersControl.BaseLayer name="Nature (Artistic)">
            <TileLayer
              attribution='&copy; Stadia Maps'
              url="https://tiles.stadiamaps.com/tiles/stamen_terrain_background/{z}/{x}/{y}{r}.png"
            />
          </LayersControl.BaseLayer> */}

          <LayersControl.BaseLayer name="Modern (Reference)">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {validCards.map(card => {
          const cardColor = getCardColor(card);

          if (card.location_geo_json) {
            return (
              <GeoJSON 
                key={`geo-${card.id}`} 
                data={card.location_geo_json} 
                pathOptions={{ className: styles.fuzzyArea }}
                style={() => ({ 
                  color: cardColor,
                  weight: highVisibility ? 6 : 1,            
                  fillColor: cardColor,
                  fillOpacity: highVisibility ? 0.1 : 0.4      
                })}
              >
                <Popup><strong>{card.title || card.front}</strong> (Region)</Popup>
              </GeoJSON>
            );
          }
          
          if (typeof card.location_lat === 'number' && typeof card.location_lng === 'number') {
            return (
              <Marker 
                key={`pin-${card.id}`} 
                position={[card.location_lat, card.location_lng]}
                icon={createPushpinIcon(cardColor)} 
              >
                <Popup><strong>{card.title || card.front}</strong></Popup>
              </Marker>
            );
          }
          return null;
        })}
      </MapContainer>
    </div>
  );
};

export default DeckMap;