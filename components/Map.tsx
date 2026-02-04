
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { UserLocation } from '../types';

interface MapProps {
  users: UserLocation[];
  currentUser: UserLocation | null;
}

const Map: React.FC<MapProps> = ({ users, currentUser }) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map-container').setView([0, 0], 2);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Update markers
    users.forEach((user) => {
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style="background-color: ${user.color}">
              <span class="text-xs font-bold text-white">${user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div class="absolute -top-8 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap border border-white/20">
              ${user.name}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      if (markersRef.current[user.id]) {
        markersRef.current[user.id].setLatLng([user.lat, user.lng]);
        markersRef.current[user.id].setIcon(icon);
      } else {
        const marker = L.marker([user.lat, user.lng], { icon }).addTo(map);
        markersRef.current[user.id] = marker;
      }
    });

    // Remove old markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!users.find((u) => u.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Auto-center on current user initially
    if (currentUser && map.getZoom() < 5) {
      map.setView([currentUser.lat, currentUser.lng], 13);
    }

  }, [users, currentUser]);

  return <div id="map-container" className="h-full w-full" />;
};

export default Map;
