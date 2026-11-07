import React, { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { onValue, ref } from 'firebase/database';
import type { LatLngBoundsExpression } from 'leaflet';
import { MapPin, RefreshCw } from 'lucide-react';
import { useStore } from '../../context/StoreContext.tsx';
import { getStoreRealtimeDatabase } from '../../utils/realtimeDatabase.ts';
import { translate } from '../../utils/translations.ts';
import 'leaflet/dist/leaflet.css';

interface LiveLocation {
  name: string;
  latitude: number;
  longitude: number;
  updatedAt: number;
  expiresAt: number;
}

const DEFAULT_CENTER: [number, number] = [11.5564, 104.9282];

const FitLocations: React.FC<{ points: LiveLocation[] }> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 14);
    } else if (points.length > 1) {
      const bounds: LatLngBoundsExpression = points.map(
        ({ latitude, longitude }) => [latitude, longitude]
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, points]);

  return null;
};

export const AdminLocationsMap: React.FC = () => {
  const { currentUser, showToast, languagePreference } = useStore();
  const t = (text: string, values?: Record<string, string | number>) =>
    translate(text, languagePreference, values);
  const [rawLocations, setRawLocations] = useState<Record<string, LiveLocation>>({});
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    try {
      const locationsReference = ref(getStoreRealtimeDatabase(), 'liveLocations');
      return onValue(
        locationsReference,
        (snapshot) => {
          setRawLocations((snapshot.val() || {}) as Record<string, LiveLocation>);
          setError(null);
        },
        (firebaseError) => {
          setError(firebaseError.message);
          showToast(`Could not load live locations: ${firebaseError.message}`, 'error');
        }
      );
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Could not connect to Realtime Database.';
      setError(message);
      showToast(message, 'error');
    }
  }, [currentUser?.role, showToast]);

  const locations = useMemo(() => {
    return Object.entries(rawLocations)
      .filter(([, location]) =>
        Number.isFinite(location?.latitude) &&
        Number.isFinite(location?.longitude) &&
        Number.isFinite(location?.expiresAt) &&
        location.expiresAt > now
      )
      .map(([uid, location]) => ({ ...location, uid }));
  }, [now, rawLocations]);

  if (currentUser?.role !== 'admin') {
    return <p className="rounded-xl bg-white p-4 text-sm text-[#817471]">{t('Administrator access is required.')}</p>;
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e5e2dc] bg-white p-4">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-[#ab3425]" />
          <div>
            <h2 className="font-bold text-lg text-[#1c1c18]">{t('Opt-in live user locations')}</h2>
            <p className="text-xs text-[#817471]">
              {t('Only currently sharing users appear here. Locations expire after one minute without an update.')}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[#f0eee8] px-3 py-1 text-xs font-bold text-[#4f4542]">
          {t('{count} sharing', { count: locations.length })}
        </span>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          Realtime Database error: {error}
        </p>
      )}

      <div className="h-[min(65vh,620px)] min-h-80 overflow-hidden rounded-2xl border border-[#e5e2dc] bg-white">
        <MapContainer center={DEFAULT_CENTER} zoom={6} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitLocations points={locations} />
          {locations.map((location) => (
            <CircleMarker
              key={location.uid}
              center={[location.latitude, location.longitude]}
              radius={9}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#ab3425', fillOpacity: 0.95 }}
            >
              <Popup>
                <strong>{location.name || 'Signed-in user'}</strong>
                <br />
                {t('Updated {time}', { time: new Date(location.updatedAt).toLocaleTimeString() })}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {locations.length === 0 && !error && (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-[#d2c3bf] bg-white p-4 text-sm text-[#817471]">
          <RefreshCw className="h-4 w-4" />
          {t('No users are sharing their location right now.')}
        </p>
      )}
    </section>
  );
};
