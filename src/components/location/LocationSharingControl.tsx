import React, { useCallback, useEffect, useRef, useState } from 'react';
import { onDisconnect, ref, remove, set, type DatabaseReference } from 'firebase/database';
import { MapPin } from 'lucide-react';
import { useStore } from '../../context/StoreContext.tsx';
import { getStoreRealtimeDatabase } from '../../utils/realtimeDatabase.ts';
import { translate } from '../../utils/translations.ts';

const LOCATION_REFRESH_MS = 20_000;
const LOCATION_TTL_MS = 60_000;

export const LocationSharingControl: React.FC = () => {
  const { currentUser, showToast, languagePreference } = useStore();
  const t = (text: string) => translate(text, languagePreference);
  const [isSharing, setIsSharing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const watchId = useRef<number | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const locationReference = useRef<DatabaseReference | null>(null);
  const latestPosition = useRef<GeolocationPosition | null>(null);

  const stopSharing = useCallback(async () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (refreshTimer.current !== null) {
      window.clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    }
    latestPosition.current = null;
    const activeReference = locationReference.current;
    locationReference.current = null;
    setIsSharing(false);
    if (activeReference) {
      try {
        await onDisconnect(activeReference).cancel();
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Could not cancel location cleanup.', 'error');
      }
      try {
        await remove(activeReference);
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Could not stop location sharing.', 'error');
      }
    }
  }, [showToast]);

  useEffect(() => {
    setIsSharing(false);
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      if (refreshTimer.current !== null) window.clearInterval(refreshTimer.current);
      if (locationReference.current) {
        void remove(locationReference.current).catch((error: unknown) => {
          showToast(error instanceof Error ? error.message : 'Could not remove the shared location.', 'error');
        });
      }
      watchId.current = null;
      refreshTimer.current = null;
      locationReference.current = null;
    };
  }, [currentUser?.firebaseUid, currentUser?.id, showToast]);

  const startSharing = async () => {
    if (!currentUser) return;
    if (!navigator.geolocation) {
      showToast(t('Live location is not available in this browser.'), 'error');
      return;
    }

    setIsStarting(true);
    try {
      const uid = currentUser.firebaseUid || currentUser.id;
      const database = getStoreRealtimeDatabase();
      const activeReference = ref(database, `liveLocations/${uid}`);
      await onDisconnect(activeReference).remove();
      locationReference.current = activeReference;

      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          if (locationReference.current !== activeReference) return;
          latestPosition.current = position;
          setIsSharing(true);
          const timestamp = Date.now();
          void set(activeReference, {
            name: currentUser.name.slice(0, 100),
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            updatedAt: timestamp,
            expiresAt: timestamp + LOCATION_TTL_MS,
          }).catch((error: unknown) => {
            showToast(error instanceof Error ? error.message : 'Could not share your location.', 'error');
            void stopSharing();
          });
        },
        (error) => {
          const message = error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Allow location access in your browser settings and try again.'
            : error.message || 'Could not determine your location. Check your device location settings and try again.';
          showToast(t(message), 'error');
          void stopSharing();
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
      );
      setIsSharing(true);

      refreshTimer.current = window.setInterval(() => {
        const position = latestPosition.current;
        if (!position || locationReference.current !== activeReference) return;
        const timestamp = Date.now();
        void set(locationReference.current, {
          name: currentUser.name.slice(0, 100),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          updatedAt: timestamp,
          expiresAt: timestamp + LOCATION_TTL_MS,
        }).catch((error: unknown) => {
          showToast(error instanceof Error ? error.message : 'Could not refresh your shared location.', 'error');
          void stopSharing();
        });
      }, LOCATION_REFRESH_MS);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not start location sharing.', 'error');
      await stopSharing();
    } finally {
      setIsStarting(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="rounded-xl border border-[#e5e2dc] bg-[#fcf9f3] p-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0 text-[#ab3425]" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#1c1c18]">{t('Live location sharing')}</p>
          <p className="mt-0.5 text-[11px] text-[#817471]">
            {isSharing
              ? t('Your location is visible to admins while sharing is on.')
              : t('Your location is private unless you turn sharing on.')}
          </p>
        </div>
        <button
          type="button"
          disabled={isStarting}
          aria-pressed={isSharing}
          onClick={() => void (isSharing ? stopSharing() : startSharing())}
          className={`rounded-lg px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50 ${
            isSharing ? 'bg-zinc-600 hover:bg-zinc-700' : 'bg-[#ab3425] hover:bg-[#8a1c10]'
          }`}
        >
          {isStarting ? t('Starting…') : isSharing ? t('Stop sharing') : t('Share location')}
        </button>
      </div>
      <p className="mt-2 text-[10px] text-[#817471]">
        {t('Coordinates are refreshed while enabled and removed when you stop sharing or disconnect.')}
      </p>
    </div>
  );
};
