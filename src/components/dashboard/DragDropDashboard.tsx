import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import type { DashboardWidget, Order } from '../../types/index.ts';
import {
  GripVertical,
  Plus,
  RotateCcw,
  Download,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Trash2,
  Layers,
} from 'lucide-react';
import { KpiStatsWidget } from './widgets/KpiStatsWidget.tsx';
import { RevenueChartWidget } from './widgets/RevenueChartWidget.tsx';
import { TopSellersWidget } from './widgets/TopSellersWidget.tsx';
import { LiveOrdersWidget } from './widgets/LiveOrdersWidget.tsx';
import { InventoryAlertsWidget } from './widgets/InventoryAlertsWidget.tsx';
import { CourierMapWidget } from './widgets/CourierMapWidget.tsx';
import { BottlenecksWidget } from './widgets/BottlenecksWidget.tsx';
import { StaffRosterWidget } from './widgets/StaffRosterWidget.tsx';
import { HourlyFulfillmentWidget } from './widgets/HourlyFulfillmentWidget.tsx';

interface DragDropDashboardProps {
  onEditOrder?: (order: Order) => void;
  onOpenInventoryManager?: () => void;
}

export const DragDropDashboard: React.FC<DragDropDashboardProps> = ({
  onEditOrder,
  onOpenInventoryManager,
}) => {
  const {
    dashboardWidgets,
    reorderWidgets,
    toggleWidgetVisibility,
    updateWidgetColSpan,
    resetDashboardLayout,
    showToast,
  } = useStore();

  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);
  const [showWidgetDrawer, setShowWidgetDrawer] = useState<boolean>(false);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedWidgetId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverWidgetId !== id) {
      setDragOverWidgetId(id);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, id: string) => {
    if (dragOverWidgetId === id) {
      setDragOverWidgetId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedWidgetId;
    if (sourceId && sourceId !== targetId) {
      reorderWidgets(sourceId, targetId);
      showToast('Widget layout reordered!', 'info');
    }
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleDragEnd = () => {
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  const renderWidgetContent = (widget: DashboardWidget) => {
    switch (widget.type) {
      case 'kpi_stats':
        return <KpiStatsWidget />;
      case 'sales_chart':
        return <RevenueChartWidget />;
      case 'top_sellers':
        return <TopSellersWidget onViewAllProducts={onOpenInventoryManager} />;
      case 'live_orders':
        return <LiveOrdersWidget onEditOrder={onEditOrder} />;
      case 'inventory_alerts':
        return <InventoryAlertsWidget onOpenInventoryManager={onOpenInventoryManager} />;
      case 'courier_map':
        return <CourierMapWidget />;
      case 'bottlenecks':
        return <BottlenecksWidget />;
      case 'staff_roster':
        return <StaffRosterWidget />;
      case 'fulfillment_flow':
        return <HourlyFulfillmentWidget />;
      default:
        return null;
    }
  };

  const visibleWidgets = dashboardWidgets
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="w-full">
      {/* Top Banner & Dashboard Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#ab3425] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#ab3425] animate-ping" />
            <span>Interactive Drag & Drop Operations Hub</span>
          </div>
          <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-2xl sm:text-3xl text-[#1c1c18]">
            Real-Time Visualization & Management
          </h1>
          <p className="text-xs sm:text-sm text-[#817471] mt-0.5">
            Grab any widget header <GripVertical className="inline w-3.5 h-3.5" /> to reposition, resize, or customize your operational command center.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowWidgetDrawer(!showWidgetDrawer)}
            className="px-3 py-2 rounded-xl bg-white hover:bg-[#f6f3ed] border border-[#d2c3bf] text-[#1c1c18] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Layers className="w-4 h-4 text-[#817471]" />
            <span>Widgets ({dashboardWidgets.filter((w) => w.visible).length}/{dashboardWidgets.length})</span>
          </button>

          <button
            onClick={resetDashboardLayout}
            title="Reset layout to default order"
            className="p-2 rounded-xl bg-white hover:bg-[#f6f3ed] border border-[#d2c3bf] text-[#4f4542] hover:text-[#1c1c18] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => showToast('Full operational snapshot exported as PDF summary.')}
            className="px-3 py-2 rounded-xl bg-[#130805] hover:bg-[#2c1e1a] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Widget Manager Drawer / Panel */}
      {showWidgetDrawer && (
        <div className="mb-6 p-4 bg-white rounded-2xl border-2 border-[#ffdad4] shadow-md animate-fade-in">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#f0eee8]">
            <div>
              <h3 className="font-bold text-sm text-[#1c1c18]">Dashboard Widget Library</h3>
              <p className="text-xs text-[#817471]">
                Toggle widgets on/off to customize your real-time monitoring view.
              </p>
            </div>
            <button
              onClick={() => setShowWidgetDrawer(false)}
              className="text-xs font-bold text-[#817471] hover:text-[#1c1c18] px-2 py-1 rounded-lg"
            >
              Done
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {dashboardWidgets.map((w) => (
              <div
                key={w.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                  w.visible
                    ? 'bg-[#fcf9f3] border-[#ab3425]/40 text-[#130805]'
                    : 'bg-[#f6f3ed] border-[#e5e2dc] text-[#817471] opacity-75'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold truncate">{w.title}</div>
                  <div className="text-[10px] text-[#817471] capitalize">
                    Span: {w.colSpan} col{w.colSpan > 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  onClick={() => toggleWidgetVisibility(w.id)}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                    w.visible
                      ? 'bg-[#ab3425] text-white'
                      : 'bg-[#e5e2dc] text-[#4f4542] hover:bg-[#dcdad4]'
                  }`}
                  title={w.visible ? 'Hide from dashboard' : 'Show on dashboard'}
                >
                  {w.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Draggable Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleWidgets.map((widget) => {
          const isDragging = draggedWidgetId === widget.id;
          const isOver = dragOverWidgetId === widget.id && draggedWidgetId !== widget.id;

          const colSpanClass =
            widget.colSpan === 3
              ? 'md:col-span-2 lg:col-span-3'
              : widget.colSpan === 2
              ? 'md:col-span-2'
              : 'col-span-1';

          return (
            <div
              key={widget.id}
              draggable
              onDragStart={(e) => handleDragStart(e, widget.id)}
              onDragOver={(e) => handleDragOver(e, widget.id)}
              onDragLeave={(e) => handleDragLeave(e, widget.id)}
              onDrop={(e) => handleDrop(e, widget.id)}
              onDragEnd={handleDragEnd}
              className={`${colSpanClass} transition-all duration-200 relative group ${
                isDragging ? 'opacity-40 scale-[0.98]' : 'opacity-100'
              } ${isOver ? 'ring-2 ring-[#ab3425] scale-[1.01] rounded-2xl shadow-xl' : ''}`}
            >
              {/* Drag Handle Bar & Widget Quick Controls */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#f0eee8] rounded-t-2xl border-t border-x border-[#e5e2dc] text-[#817471] select-none cursor-grab active:cursor-grabbing hover:bg-[#ebe8e2] transition-colors">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#4f4542]">
                  <GripVertical className="w-4 h-4 text-[#817471] group-hover:text-[#ab3425] transition-colors" />
                  <span className="truncate">{widget.title}</span>
                </div>

                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  {/* Resize Button (toggle 1, 2, 3 cols) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextSpan = widget.colSpan === 3 ? 1 : ((widget.colSpan + 1) as 1 | 2 | 3);
                      updateWidgetColSpan(widget.id, nextSpan);
                    }}
                    title={`Change grid width (current: ${widget.colSpan} cols)`}
                    className="p-1 hover:text-[#130805] rounded"
                  >
                    {widget.colSpan === 3 ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Hide Widget Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWidgetVisibility(widget.id);
                    }}
                    title="Hide widget from view"
                    className="p-1 hover:text-[#ab3425] rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Widget Body */}
              <div className="rounded-b-2xl overflow-hidden">
                {renderWidgetContent(widget)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
