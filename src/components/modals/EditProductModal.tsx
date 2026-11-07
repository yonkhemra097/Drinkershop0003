import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext.tsx';
import type { Product } from '../../types/index.ts';
import { X, Save, Trash2, Image as ImageIcon } from 'lucide-react';

interface EditProductModalProps {
  isOpen: boolean;
  product: Product | null; // null if creating new
  onClose: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  product,
  onClose,
}) => {
  const { addProduct, updateProduct, deleteProduct, categories } = useStore();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Soft Drinks');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(3.49);
  const [costPrice, setCostPrice] = useState(1.5);
  const [stock, setStock] = useState(20);
  const [lowStockThreshold, setLowStockThreshold] = useState(8);
  const [image, setImage] = useState('');
  const [status, setStatus] = useState<Product['status']>('active');

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setCategory(product.category);
      setDescription(product.description);
      setPrice(product.price);
      setCostPrice(product.costPrice);
      setStock(product.stock);
      setLowStockThreshold(product.lowStockThreshold);
      setImage(product.image);
      setStatus(product.status);
    } else {
      setName('');
      setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setCategory('Soft Drinks');
      setDescription('');
      setPrice(3.99);
      setCostPrice(1.5);
      setStock(24);
      setLowStockThreshold(8);
      setImage('https://lh3.googleusercontent.com/aida-public/AB6AXuCtIYv5wJXt4LHWyNANmFtz9RvNYM_xhLWOYMO5RSykgn5IP_ilH0qbpRaz8XhFtUl2aT28BtSRXte2G3s8cItHWtSyKZmhc6bjB_o032mqxPiQ242WsPuP4m_svTctDA04MC3IhVfIOtzAMoz4DQicQEzguYGcp4CrygfghG34l_oQaHpKMUFFRy6ed_PDzhrqCwELiysXVykKS--uBPK26lPi5I_e1wApXu1S2FbxeSIi46MELvA4Lw');
      setStatus('active');
    }
  }, [product]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (product) {
      updateProduct(product.id, {
        name,
        sku,
        category,
        description,
        price: Number(price),
        costPrice: Number(costPrice),
        stock: Number(stock),
        lowStockThreshold: Number(lowStockThreshold),
        image,
        status,
      });
    } else {
      addProduct({
        name,
        sku,
        category,
        description,
        price: Number(price),
        costPrice: Number(costPrice),
        stock: Number(stock),
        lowStockThreshold: Number(lowStockThreshold),
        image,
        imageAlt: name,
        status,
        rating: 5.0,
        reviewCount: 1,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (product && confirm(`Delete "${product.name}"?`)) {
      deleteProduct(product.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#fcf9f3] rounded-3xl max-w-lg w-full p-6 relative shadow-2xl border border-[#e5e2dc] my-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#817471] hover:text-[#1c1c18]"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-xl text-[#1c1c18] mb-1">
          {product ? 'Edit Product Details' : 'Add New Artisan Product'}
        </h3>
        <p className="text-xs text-[#817471] mb-5">
          Configure catalog listing, pricing, stock alerts, and visual assets.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#4f4542] font-semibold mb-1">Product Name</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs focus:outline-none focus:border-[#ab3425]"
              />
            </div>
            <div>
              <label className="block text-[#4f4542] font-semibold mb-1">SKU Code</label>
              <input
                required
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs font-mono focus:outline-none focus:border-[#ab3425]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#4f4542] font-semibold mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs focus:outline-none focus:border-[#ab3425]"
              >
                {categories.filter(c => c.name !== 'All Items').map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#4f4542] font-semibold mb-1">Catalog Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs focus:outline-none focus:border-[#ab3425]"
              >
                <option value="active">Active (Visible)</option>
                <option value="low_stock">Low Stock Flag</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="hidden">Hidden from Shop</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-[#4f4542] font-semibold mb-1">Selling Price (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full p-2 rounded-xl border border-[#d2c3bf] bg-white text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[#4f4542] font-semibold mb-1">Cost Price (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="w-full p-2 rounded-xl border border-[#d2c3bf] bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[#4f4542] font-semibold mb-1">Stock Qty</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="w-full p-2 rounded-xl border border-[#d2c3bf] bg-white text-xs font-bold text-[#ab3425]"
              />
            </div>
            <div>
              <label className="block text-[#4f4542] font-semibold mb-1">Low Alert &le;</label>
              <input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                className="w-full p-2 rounded-xl border border-[#d2c3bf] bg-white text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#4f4542] font-semibold mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#d2c3bf] bg-white text-xs focus:outline-none focus:border-[#ab3425]"
            />
          </div>

          <div>
            <label className="block text-[#4f4542] font-semibold mb-1">Image URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="flex-1 p-2 rounded-xl border border-[#d2c3bf] bg-white text-xs font-mono"
              />
              {image && (
                <div
                  className="w-10 h-10 rounded-lg bg-cover bg-center shrink-0 border border-[#e5e2dc]"
                  style={{ backgroundImage: `url('${image}')` }}
                />
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#e5e2dc] flex items-center justify-between">
            {product ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-xl font-bold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#f0eee8] hover:bg-[#ebe8e2] text-[#1c1c18] font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#130805] hover:bg-[#2c1e1a] text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Save Product</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
