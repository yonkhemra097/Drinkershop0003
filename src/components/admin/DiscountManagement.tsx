import React, { useState } from 'react';
import { Tag, Trash2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext.tsx';
import { formatCurrency } from '../../utils/formatCurrency.ts';

export const DiscountManagement: React.FC = () => {
  const { currentUser, discounts, createDiscount, deleteDiscount, showToast, settings } = useStore();
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('');

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
    return (
      <section className="rounded-2xl border border-[#e5e2dc] bg-white p-6 text-center">
        <h2 className="font-bold text-lg text-[#1c1c18]">Discount management access required</h2>
      </section>
    );
  }

  const handleCreateDiscount = (event: React.FormEvent) => {
    event.preventDefault();
    const result = createDiscount({
      code,
      description,
      type,
      value: Number(value),
    });
    if (!result.success) {
      showToast(result.error || 'Could not create the discount.', 'error');
      return;
    }
    setCode('');
    setDescription('');
    setType('percent');
    setValue('');
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[#e5e2dc] bg-white p-5">
      <div>
        <div className="flex items-center gap-2 text-[#ab3425]">
          <Tag className="h-4 w-4" />
          <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-bold text-[#1c1c18]">
            Discount Codes
          </h2>
        </div>
        <p className="mt-1 text-xs text-[#817471]">
          Admins and managers can create discount codes available to customers at checkout.
        </p>
      </div>

      <form onSubmit={handleCreateDiscount} className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          required
          maxLength={20}
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Code (e.g. WELCOME10)"
          className="rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] p-2.5 text-xs font-mono uppercase"
        />
        <input
          required
          maxLength={120}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Customer-facing description"
          className="rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] p-2.5 text-xs"
        />
        <select
          value={type}
          onChange={(event) => setType(event.target.value as 'percent' | 'fixed')}
          className="rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] p-2.5 text-xs font-semibold"
        >
          <option value="percent">Percentage off</option>
          <option value="fixed">Fixed amount off</option>
        </select>
        <div className="flex gap-2">
          <input
            required
            type="number"
            min="0.01"
            max={type === 'percent' ? 100 : undefined}
            step="0.01"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={type === 'percent' ? 'Percent (e.g. 10)' : 'Amount in USD (e.g. 5.00)'}
            className="min-w-0 flex-1 rounded-xl border border-[#d2c3bf] bg-[#fcf9f3] p-2.5 text-xs"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#ab3425] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#8a1c10]"
          >
            Create
          </button>
        </div>
      </form>

      <div className="divide-y divide-[#f0eee8] rounded-xl border border-[#e5e2dc]">
        {discounts.length === 0 ? (
          <p className="p-4 text-xs text-[#817471]">No custom discounts created yet.</p>
        ) : (
          discounts.map((discount) => (
            <div key={discount.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[#ffdad4] px-2 py-0.5 font-mono text-xs font-bold text-[#8a1c10]">
                    {discount.code}
                  </span>
                  <span className="text-xs font-semibold text-[#1c1c18]">
                    {discount.type === 'percent'
                      ? `${discount.value}% off`
                      : `${formatCurrency(discount.value, settings)} off`}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#4f4542]">{discount.description}</p>
                <p className="mt-0.5 text-[10px] text-[#817471]">Created by {discount.createdBy}</p>
              </div>
              <button
                type="button"
                onClick={() => deleteDiscount(discount.id)}
                aria-label={`Delete ${discount.code} discount`}
                className="shrink-0 rounded-lg p-2 text-[#817471] hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
