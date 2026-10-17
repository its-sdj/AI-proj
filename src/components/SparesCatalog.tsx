import React, { useState } from 'react';
import { SparePart } from '../types';
import { Search, ShoppingBag, Check, Shield, Star, Wrench } from 'lucide-react';

interface SparesCatalogProps {
  spares: SparePart[];
  onAddToCart: (part: SparePart) => void;
  cartItemIds: Set<string>;
}

export const SparesCatalog: React.FC<SparesCatalogProps> = ({
  spares,
  onAddToCart,
  cartItemIds,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [bikeFilter, setBikeFilter] = useState<string>('All');
  const [inStockOnly, setInStockOnly] = useState(false);

  const categories = [
    'All',
    'Fluids & Lubricants',
    'Brakes & Suspension',
    'Engine & Transmission',
    'Electricals & Battery',
    'Body & Lighting',
    'Tyres & Wheels',
  ];

  const bikeModels = [
    'All',
    'Royal Enfield Classic 350',
    'Yamaha R15 V4',
    'Honda Activa 6G',
    'KTM Duke 250',
    'TVS Apache RTR 160',
    'Ather 450X',
  ];

  const filteredSpares = spares.filter((part) => {
    if (selectedCategory !== 'All' && part.category !== selectedCategory) return false;
    if (inStockOnly && part.stockQuantity <= 0) return false;

    if (bikeFilter !== 'All') {
      const isCompat = part.compatibleBikes.some((b) =>
        b.toLowerCase().includes(bikeFilter.toLowerCase())
      );
      if (!isCompat) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        part.name.toLowerCase().includes(q) ||
        part.sku.toLowerCase().includes(q) ||
        part.brand.toLowerCase().includes(q) ||
        part.compatibleBikes.some((b) => b.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <section className="relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 p-6 sm:p-10">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
            <Wrench className="w-4 h-4" />
            <span>100% Genuine OEM & Performance Spares · Free Workshop Counter Pickup</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-neutral-100">
            Bike Spare Parts & Consumables
          </h1>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Certified replacement parts, Motul synthetic oils, Brembo brake pads, Rolon X-ring chains, and Amaron batteries with manufacturer warranty and guaranteed bike fitment.
          </p>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Compatibility Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parts by name, SKU, or brand..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-4 flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5">
            <span className="text-[11px] text-neutral-400 whitespace-nowrap">Bike Model:</span>
            <select
              value={bikeFilter}
              onChange={(e) => setBikeFilter(e.target.value)}
              aria-label="Filter parts by compatible bike model"
              className="w-full bg-transparent text-xs text-neutral-100 focus:outline-none cursor-pointer"
            >
              {bikeModels.map((m) => (
                <option key={m} value={m} className="bg-neutral-900">
                  {m === 'All' ? 'All Bike Models' : m}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-3 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5">
            <label className="text-xs text-neutral-300 flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>In Stock Only</span>
            </label>
          </div>
        </div>
      </section>

      {/* Spares Grid */}
      {filteredSpares.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="text-neutral-400 text-sm">No spare parts match your current search criteria.</div>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
              setBikeFilter('All');
              setInStockOnly(false);
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSpares.map((part) => {
            const isAdded = cartItemIds.has(part.id);
            const isLowStock = part.stockQuantity > 0 && part.stockQuantity <= part.reorderLevel;

            return (
              <div
                key={part.id}
                className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 flex flex-col justify-between hover:border-neutral-700 transition-all space-y-4"
              >
                <div>
                  {/* Metadata line with · separator */}
                  <div className="flex items-center justify-between text-xs text-neutral-400 font-mono mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-semibold">{part.brand}</span>
                      <span aria-hidden="true">·</span>
                      <span>SKU: {part.sku}</span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span className="font-semibold">{part.rating}</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-neutral-100 font-display line-clamp-2">
                    {part.name}
                  </h3>

                  <p className="text-xs text-neutral-400 line-clamp-2 mt-2 leading-relaxed">
                    {part.description}
                  </p>

                  {/* Compatibility tag list */}
                  <div className="mt-3">
                    <div className="text-[10px] uppercase font-mono text-neutral-500 mb-1">
                      Compatible 2-Wheelers:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {part.compatibleBikes.slice(0, 3).map((cb, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] bg-neutral-950 text-neutral-300 border border-neutral-800/80 px-2 py-0.5 rounded"
                        >
                          {cb}
                        </span>
                      ))}
                      {part.compatibleBikes.length > 3 && (
                        <span className="text-[11px] text-neutral-500 self-center">
                          +{part.compatibleBikes.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pricing & Add to Cart action */}
                <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold font-mono text-neutral-100">
                      <span className="text-amber-400 text-sm">₹</span>
                      {part.sellingPrice.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] font-mono mt-0.5">
                      {part.stockQuantity <= 0 ? (
                        <span className="text-rose-400 font-medium">Out of Stock</span>
                      ) : isLowStock ? (
                        <span className="text-amber-400 font-medium">Only {part.stockQuantity} left</span>
                      ) : (
                        <span className="text-emerald-400 font-medium">In Stock ({part.stockQuantity})</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onAddToCart(part)}
                    disabled={part.stockQuantity <= 0}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                      isAdded
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>In Bag</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Add to Bag</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
