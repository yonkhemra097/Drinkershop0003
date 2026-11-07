import React, { useState } from 'react';
import { useStore } from '../../../context/StoreContext.tsx';
import { AlertTriangle, PlusCircle } from 'lucide-react';

interface InventoryAlertsWidgetProps {
  onOpenInventoryManager?: () => void;
}

export const InventoryAlertsWidget: React.FC<InventoryAlertsWidgetProps> = ({
  onOpenInventoryManager,
}) => {
  const { products, adjustProductStock, setCurrentView } = useStore();
  const [restockingId, setRestockingId] = useState<string | null>(null);

  const lowStockItems = products
    .filter((p) => p.stock <= p.lowStockThreshold)
    .sort((a, b) => a.stock - b.stock);

  const handleQuickRestock = (productId: string, productName: string) => {
    setRestockingId(productId);
    setTimeout(() => {
      adjustProductStock(productId, 12, 'One-Click Quick Restock from Widget', 'Dashboard Manager');
      setRestockingId(null);
    }, 400);
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e5e2dc] flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-base text-[#1c1c18]">
              Inventory Alerts
            </h3>
          </div>
          <span className="bg-[#ffdad6] text-[#ba1a1a] text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {lowStockItems.length} Items
          </span>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="p-6 text-center text-[#817471] bg-[#f6f3ed] rounded-xl text-xs">
            ✨ All items are well-stocked above thresholds!
          </div>
        ) : (
          <div className="space-y-2.5">
            {lowStockItems.slice(0, 4).map((item) => {
              const isCritical = item.stock <= 4;
              return (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl flex items-center justify-between border transition-all ${
                    isCritical
                      ? 'bg-[#ffdad6]/20 border-[#ffdad6]'
                      : 'bg-[#f6f3ed] border-[#e5e2dc]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg bg-cover bg-center shrink-0 border border-[#e5e2dc]"
                      style={{ backgroundImage: `url('${item.image}')` }}
                      role="img"
                      aria-label={item.name}
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#1c1c18] truncate">{item.name}</h4>
                      <span
                        className={`text-[11px] font-semibold block ${
                          isCritical ? 'text-[#ba1a1a]' : 'text-[#755b00]'
                        }`}
                      >
                        {item.stock === 0 ? 'Out of stock' : `Only ${item.stock} left in stock`}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickRestock(item.id, item.name)}
                    disabled={restockingId === item.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                      isCritical
                        ? 'bg-[#ba1a1a] text-white hover:bg-[#93000a] shadow-sm'
                        : 'bg-[#ebe8e2] text-[#1c1c18] hover:bg-[#dcdad4]'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{restockingId === item.id ? 'Adding...' : '+12 Stock'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => {
          if (onOpenInventoryManager) onOpenInventoryManager();
          else setCurrentView('admin');
        }}
        className="w-full mt-4 py-2.5 bg-[#130805] text-white hover:bg-[#2c1e1a] rounded-xl text-xs font-bold transition-colors shadow-sm"
      >
        Manage Full Inventory
      </button>
    </div>
  );
};
