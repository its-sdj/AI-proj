import React, { useState } from 'react';
import { Bike, BikeCategory } from '../types';
import { BikeVisual } from './BikeVisual';
import { BikeDetailModal } from './BikeDetailModal';
import { calculateBikeEMI } from '../utils/calculations';
import { ShieldCheck, ArrowUpDown, Search, Sparkles, Filter } from 'lucide-react';

interface BikeCatalogProps {
  bikes: Bike[];
  onBookTestRide: (bike: Bike, date: string, time: string, name: string, phone: string) => void;
  onReserveBike: (bike: Bike, tokenAmount: number) => void;
}

export const BikeCatalog: React.FC<BikeCatalogProps> = ({
  bikes,
  onBookTestRide,
  onReserveBike,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(300000);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'km-asc' | 'year-desc'>('featured');
  const [selectedBikeForModal, setSelectedBikeForModal] = useState<Bike | null>(null);

  const categories: string[] = ['All', 'Cruiser', 'Sport', 'Scooter', 'Street Naked', 'Commuter', 'Electric'];

  const filteredBikes = bikes.filter((b) => {
    if (selectedCategory !== 'All' && b.category !== selectedCategory) return false;
    if (b.sellingPrice > maxPrice) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        b.make.toLowerCase().includes(q) ||
        b.model.toLowerCase().includes(q) ||
        b.regNumber.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'price-asc') return a.sellingPrice - b.sellingPrice;
    if (sortBy === 'price-desc') return b.sellingPrice - a.sellingPrice;
    if (sortBy === 'km-asc') return a.kmsDriven - b.kmsDriven;
    if (sortBy === 'year-desc') return b.year - a.year;
    return 0;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Storefront Hero */}
      <section className="relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 p-6 sm:p-10">
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-900/90 to-transparent z-10 pointer-events-none" />
        <div className="relative z-20 max-w-2xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
            <ShieldCheck className="w-4 h-4" />
            <span>40-Point Workshop Certified · 6-Month Engine Warranty · Clear RC Transfer</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-display text-neutral-100 [text-wrap:balance]">
            Verified Pre-Owned 2-Wheelers
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
            Every motorbike and scooter is inspected, refurbished with genuine spares, and test-calibrated before hitting our floor. Guaranteed clean titles with transparent pricing.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Easy EMI from 10.5% p.a.
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Instant Free Test Rides
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              Doorstep Delivery Available
            </span>
          </div>
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
              {cat} {cat === 'All' ? `(${bikes.length})` : ''}
            </button>
          ))}
        </div>

        {/* Search, Price, Sort bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by make, model, or reg number..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-4 flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5">
            <span className="text-[11px] text-neutral-400 whitespace-nowrap">Max Budget:</span>
            <select
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              aria-label="Filter by maximum price budget"
              className="w-full bg-transparent text-xs text-neutral-100 font-mono focus:outline-none cursor-pointer"
            >
              <option value={75000} className="bg-neutral-900">Up to Rs 75,000</option>
              <option value={125000} className="bg-neutral-900">Up to Rs 1,25,000</option>
              <option value={175000} className="bg-neutral-900">Up to Rs 1,75,000</option>
              <option value={300000} className="bg-neutral-900">Up to Rs 3,00,000 (All)</option>
            </select>
          </div>

          <div className="sm:col-span-3 flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort bikes by price or mileage"
              className="w-full bg-transparent text-xs text-neutral-100 focus:outline-none cursor-pointer"
            >
              <option value="featured" className="bg-neutral-900">Featured</option>
              <option value="price-asc" className="bg-neutral-900">Price: Low to High</option>
              <option value="price-desc" className="bg-neutral-900">Price: High to Low</option>
              <option value="km-asc" className="bg-neutral-900">Lowest Odometer</option>
              <option value="year-desc" className="bg-neutral-900">Newest Year</option>
            </select>
          </div>
        </div>
      </section>

      {/* Bike Cards Grid */}
      {filteredBikes.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="text-neutral-400 text-sm">No vehicles match your selected filters.</div>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
              setMaxPrice(300000);
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBikes.map((bike) => {
            const emi = calculateBikeEMI(bike.sellingPrice, Math.round(bike.sellingPrice * 0.2), 10.5, 24);

            return (
              <div
                key={bike.id}
                className="group flex flex-col rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all overflow-hidden"
              >
                {/* Visual Header */}
                <BikeVisual
                  category={bike.category}
                  model={bike.model}
                  make={bike.make}
                  accentColor={bike.accentColor}
                  className="h-48"
                  badgeText={`${bike.inspectionScore}/40 Pts`}
                />

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Unboxed Metadata with · separator */}
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1 font-mono">
                      <span>{bike.year}</span>
                      <span aria-hidden="true">·</span>
                      <span>{bike.kmsDriven.toLocaleString('en-IN')} km</span>
                      <span aria-hidden="true">·</span>
                      <span>{bike.ownersCount === 1 ? '1st Owner' : `${bike.ownersCount} Owners`}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-neutral-300">{bike.fuelType}</span>
                    </div>

                    <h3 className="text-lg font-bold font-display text-neutral-100 group-hover:text-amber-400 transition-colors">
                      {bike.model}
                    </h3>

                    <div className="mt-1 text-xs text-neutral-400 line-clamp-2">
                      {bike.variant} · {bike.rcStatus}
                    </div>
                  </div>

                  {/* Pricing & EMI strip */}
                  <div className="pt-3 border-t border-neutral-800/80 flex items-end justify-between">
                    <div>
                      <div className="text-[11px] text-neutral-500">Fixed Fair Price</div>
                      <div className="text-xl font-bold font-mono text-neutral-100 flex items-center">
                        <span className="text-amber-400 text-sm mr-0.5">₹</span>
                        {bike.sellingPrice.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-neutral-500">Starting EMI</div>
                      <div className="text-xs font-mono font-semibold text-amber-400">
                        ₹{emi.monthlyEmi.toLocaleString('en-IN')}/mo
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setSelectedBikeForModal(bike)}
                      className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors truncate"
                    >
                      Inspection & EMI
                    </button>
                    <button
                      onClick={() => setSelectedBikeForModal(bike)}
                      className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm truncate"
                    >
                      Book Test Ride
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspection & EMI Modal */}
      <BikeDetailModal
        bike={selectedBikeForModal}
        onClose={() => setSelectedBikeForModal(null)}
        onBookTestRide={onBookTestRide}
        onReserveBike={onReserveBike}
      />
    </div>
  );
};
