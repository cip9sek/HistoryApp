import React, { useState } from 'react';
import { MapContainer, TileLayer, FeatureGroup, Marker, GeoJSON } from 'react-leaflet';
import { EditControl } from "react-leaflet-draw";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import styles from './LocationPicker.module.css';

// Fix Leaflet Icons (Leaflet has a known bug with React where default pins disappear)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialGeoJson?: any; 
  onLocationChange: (lat: number | null, lng: number | null, geoJson: any | null) => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ 
  initialLat, 
  initialLng, 
  initialGeoJson, 
  onLocationChange 
}) => {
  const [lat, setLat] = useState<number | null>(initialLat || null);
  const [lng, setLng] = useState<number | null>(initialLng || null);
  const [geoJson, setGeoJson] = useState<any | null>(initialGeoJson || null);

  const handleCreated = (e: any) => {
    const { layerType, layer } = e;

    if (layerType === 'marker') {
      const { lat: newLat, lng: newLng } = layer.getLatLng();
      setLat(newLat);
      setLng(newLng);
      setGeoJson(null); // Clear shape if placing a pin instead
      onLocationChange(newLat, newLng, null);
    } else {
      // It's a Shape (Polygon)
      const newGeoJson = layer.toGeoJSON();
      setLat(null); // Clear pin if drawing a shape
      setLng(null);
      setGeoJson(newGeoJson);
      onLocationChange(null, null, newGeoJson);
    }
  };

  const handleDeleted = () => {
    // Reset everything when the user clicks the delete button
    setLat(null);
    setLng(null);
    setGeoJson(null);
    onLocationChange(null, null, null);
  };

  return (
    <div className={styles.pickerContainer}>
      <MapContainer center={[34, 44]} zoom={5} className={styles.leafletMap}>
        
        {/* 1. Base Map */}
        <TileLayer
          attribution='&copy; CartoDB'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* 2. Drawing Controls */}
        <FeatureGroup>
          <EditControl
            position='topright'
            onCreated={handleCreated}
            onDeleted={handleDeleted}
            draw={{
              rectangle: false,
              circle: false,
              circlemarker: false,
              polyline: false, // Turn off lines, we only want shapes or points
              marker: true,    // Allow Pins
              polygon: {
                allowIntersection: false,
                drawError: { color: '#e1e100', message: 'Lines cannot cross!' },
                shapeOptions: { color: '#bf616a' } // Red borders for drawing
              }
            }}
          />
          
          {/* Show Existing Shape if editing */}
          {geoJson && (
            <GeoJSON 
              data={geoJson} 
              style={() => ({ color: '#bf616a', weight: 2, fillOpacity: 0.3 })}
            />
          )}
        </FeatureGroup>
        
        {/* Show Existing Pin if editing */}
        {lat && lng && <Marker position={[lat, lng]} />}
        
      </MapContainer>
    </div>
  );
};

export default LocationPicker;