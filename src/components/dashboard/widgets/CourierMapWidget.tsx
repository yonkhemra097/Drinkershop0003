import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { useStore } from '../../../context/StoreContext.tsx';

export const CourierMapWidget: React.FC = () => {
  const { settings } = useStore();
  const mapUrl = settings.address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed`
    : '';

  return (
    <section className="flex h-full flex-col rounded-2xl border border-[#e5e2dc] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffe08f] text-[#755b00]">
          <Navigation className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-base font-bold text-[#1c1c18]">
            Store Location
          </h2>
          <p className="text-xs text-[#817471]">
            {settings.address || 'Add the store address in Settings to show its map.'}
          </p>
        </div>
      </div>

      {mapUrl ? (
        <iframe
          title="Store location map"
          src={mapUrl}
          className="min-h-64 w-full flex-1 rounded-2xl border border-[#d2c3bf]/50"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="flex min-h-64 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#d2c3bf] bg-[#f6f3ed] text-center">
          <MapPin className="h-8 w-8 text-[#ab3425]" />
          <p className="max-w-xs text-sm font-semibold text-[#4f4542]">
            Store address is not configured yet.
          </p>
        </div>
      )}
    </section>
  );
};
