import React, { useState } from 'react';
import { useStore } from '../../../context/StoreContext.tsx';
export const StaffRosterWidget: React.FC = () => {
  const { users, toggleClockIn, setCurrentView } = useStore();
  const [tab, setTab] = useState<'all' | 'manager' | 'staff' | 'driver'>('all');
  const elevatedUsers = users.filter(
    (user) => user.role === 'driver' || user.role === 'manager' || user.role === 'staff'
  );
  const onDutyCount = elevatedUsers.filter(
    (user) => user.shiftStatus === 'clocked_in' || user.shiftStatus === 'on_delivery'
  ).length;

  const filtered = users.filter((u) => {
    if (tab === 'all') return u.role === 'driver' || u.role === 'manager' || u.role === 'staff';
    return u.role === tab;
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e5e2dc] flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1c1c18]">
              Admin-created Staff
            </h3>
          </div>
          <span className="text-xs text-[#817471] font-semibold">{onDutyCount} On Duty</span>
        </div>
        <p className="text-xs text-[#817471] mb-3">
          Real-time shift attendance & live status
        </p>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-3 bg-[#f0eee8] p-1 rounded-xl text-xs">
          <button
            onClick={() => setTab('all')}
            className={`flex-1 py-1 rounded-lg font-bold transition-all ${
              tab === 'all' ? 'bg-white text-[#1c1c18] shadow-xs' : 'text-[#817471]'
            }`}
          >
            All ({elevatedUsers.length})
          </button>
          <button
            onClick={() => setTab('manager')}
            className={`flex-1 py-1 rounded-lg font-bold transition-all ${
              tab === 'manager' ? 'bg-white text-[#1c1c18] shadow-xs' : 'text-[#817471]'
            }`}
          >
            Managers ({users.filter((user) => user.role === 'manager').length})
          </button>
          <button
            onClick={() => setTab('driver')}
            className={`flex-1 py-1 rounded-lg font-bold transition-all ${
              tab === 'driver' ? 'bg-white text-[#1c1c18] shadow-xs' : 'text-[#817471]'
            }`}
          >
            Drivers ({users.filter((user) => user.role === 'driver').length})
          </button>
          <button
            onClick={() => setTab('staff')}
            className={`flex-1 py-1 rounded-lg font-bold transition-all ${
              tab === 'staff' ? 'bg-white text-[#1c1c18] shadow-xs' : 'text-[#817471]'
            }`}
          >
            Staff ({users.filter((user) => user.role === 'staff').length})
          </button>
        </div>

        {/* Roster list */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {filtered.map((user) => {
            const isClockedIn = user.shiftStatus === 'clocked_in' || user.shiftStatus === 'on_delivery';
            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 rounded-xl bg-[#f6f3ed] hover:bg-[#ebe8e2] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#130805] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {getInitials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-[#1c1c18] truncate">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-[#817471] truncate">
                      {user.assignment || user.role}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      user.shiftStatus === 'on_delivery'
                        ? 'bg-[#ab3425]'
                        : isClockedIn
                        ? 'bg-emerald-500'
                        : 'bg-[#817471]'
                    }`}
                    title={user.shiftStatus || 'Clocked out'}
                  />
                  <button
                    onClick={() => toggleClockIn(user.id)}
                    className="text-[10px] font-semibold text-[#817471] hover:text-[#130805] px-1.5 py-0.5 rounded border border-[#d2c3bf]/50 bg-white"
                  >
                    {isClockedIn ? 'Clock Out' : 'Clock In'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#f0eee8] flex justify-between items-center text-xs">
        <span className="text-[#817471]">Discrepancies: 0</span>
        <button
          onClick={() => setCurrentView('manager')}
          className="text-[#ab3425] font-bold hover:underline flex items-center gap-1"
        >
          <span>Manage Schedule</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
