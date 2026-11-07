import React, { useState } from 'react';
import { useStore } from '../../../context/StoreContext.tsx';
import { AlertCircle, CheckCircle, Plus } from 'lucide-react';

export const BottlenecksWidget: React.FC = () => {
  const { bottlenecks, resolveBottleneck, addBottleneck } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStation, setNewStation] = useState('');
  const [newOrderNum, setNewOrderNum] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    addBottleneck({
      station: newStation,
      orderNumber: newOrderNum,
      title: newTitle,
      description: newDesc || 'Reported from Operations Supervision.',
      level: 'warning',
    });
    setNewTitle('');
    setNewDesc('');
    setShowAddForm(false);
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e5e2dc] flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1c1c18]">
              Fulfillment Supervision
            </h3>
            <span className="text-xs text-[#817471] block">
              Real-time bottleneck & delay blockages
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-0.5 bg-[#ffdad6] text-[#ba1a1a] rounded-full text-xs font-bold">
              {bottlenecks.length} Active
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="w-7 h-7 rounded-lg bg-[#f0eee8] hover:bg-[#ebe8e2] text-[#1c1c18] flex items-center justify-center transition-colors"
              title="Add Incident"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showAddForm && (
          <form onSubmit={handleAdd} className="mb-3 p-3 bg-[#f6f3ed] rounded-xl border border-[#e5e2dc] space-y-2 text-xs">
            <div className="font-bold text-[#1c1c18]">Report Store Bottleneck</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="p-1.5 rounded-lg border border-[#d2c3bf] bg-white text-xs"
                placeholder="Station"
                value={newStation}
                onChange={(e) => setNewStation(e.target.value)}
                required
              />
              <input
                className="p-1.5 rounded-lg border border-[#d2c3bf] bg-white text-xs"
                placeholder="Order Number (optional)"
                value={newOrderNum}
                onChange={(e) => setNewOrderNum(e.target.value)}
              />
            </div>
            <input
              className="w-full p-1.5 rounded-lg border border-[#d2c3bf] bg-white text-xs"
              placeholder="Bottleneck title (e.g. Missing seal)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
            />
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-2.5 py-1 text-xs text-[#4f4542] hover:bg-white rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-[#130805] text-white rounded-lg text-xs font-bold"
              >
                Log Alert
              </button>
            </div>
          </form>
        )}

        {bottlenecks.length === 0 ? (
          <div className="p-6 text-center text-[#817471] bg-[#f6f3ed] rounded-xl text-xs flex flex-col items-center gap-2">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
            <span>All fulfillment stations operating smoothly!</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {bottlenecks.map((item) => {
              const borderColor =
                item.level === 'critical'
                  ? 'border-l-[#ab3425]'
                  : item.level === 'warning'
                  ? 'border-l-[#c9a84c]'
                  : 'border-l-[#817471]';

              return (
                <div
                  key={item.id}
                  className={`bg-[#f6f3ed] p-3 rounded-xl border-l-4 ${borderColor} border border-[#e5e2dc] flex flex-col justify-between`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[11px] font-bold text-[#ab3425] uppercase">
                      {item.station}
                    </span>
                        {item.orderNumber && (
                          <span className="text-[10px] text-[#817471] font-mono font-medium">
                            {item.orderNumber}
                          </span>
                        )}
                  </div>
                  <h4 className="text-xs font-bold text-[#1c1c18] mb-1">{item.title}</h4>
                  <p className="text-[11px] text-[#4f4542] line-clamp-2 mb-2">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-[#e5e2dc]/60">
                    <span className="text-[10px] text-[#817471]">{item.timestamp}</span>
                    <button
                      onClick={() => resolveBottleneck(item.id)}
                      className="px-2 py-0.5 bg-white hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-bold text-emerald-700 transition-colors shadow-xs"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
