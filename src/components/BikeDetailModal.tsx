import React, { useState } from 'react';
import { Bike } from '../types';
import { calculateBikeEMI } from '../utils/calculations';
import { BikeVisual } from './BikeVisual';
import { X, CheckCircle2, AlertTriangle, RefreshCw, Calendar, ShieldCheck, FileCheck, IndianRupee, Sparkles } from 'lucide-react';

interface BikeDetailModalProps {
  bike: Bike | null;
  onClose: () => void;
  onBookTestRide: (bike: Bike, date: string, time: string, name: string, phone: string) => void;
  onReserveBike: (bike: Bike, tokenAmount: number) => void;
}

export const BikeDetailModal: React.FC<BikeDetailModalProps> = ({
  bike,
  onClose,
  onBookTestRide,
  onReserveBike,
}) => {
  if (!bike) return null;

  // EMI Calculator State
  const [downPayment, setDownPayment] = useState<number>(Math.round(bike.sellingPrice * 0.2));
  const [tenureMonths, setTenureMonths] = useState<number>(24);
  const [annualRate, setAnnualRate] = useState<number>(10.5);

  // Active view tab in modal: Specs, 40-point Inspection, EMI Financing, Book Test Ride
  const [activeTab, setActiveTab] = useState<'overview' | 'inspection' | 'emi' | 'testride'>('overview');

  // Test Ride Form State
  const [rideName, setRideName] = useState('');
  const [ridePhone, setRidePhone] = useState('');
  const [rideDate, setRideDate] = useState('2026-10-18');
  const [rideTime, setRideTime] = useState('11:00 AM');
  const [rideBookedSuccess, setRideBookedSuccess] = useState(false);
  const [reserveSuccess, setReserveSuccess] = useState(false);

  const emiData = calculateBikeEMI(bike.sellingPrice, downPayment, annualRate, tenureMonths);

  const handleTestRideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rideName.trim() || !ridePhone.trim()) return;
    onBookTestRide(bike, rideDate, rideTime, rideName, ridePhone);
    setRideBookedSuccess(true);
  };

  const handleReserve = () => {
    onReserveBike(bike, 2500);
    setReserveSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div>
            <div className="text-xs text-neutral-400 font-mono">
              {bike.make} · {bike.year} · Reg: {bike.regNumber}
            </div>
            <h2 className="text-xl font-bold font-display text-neutral-100">{bike.model}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Visual Banner */}
        <div className="relative">
          <BikeVisual
            category={bike.category}
            model={bike.model}
            make={bike.make}
            accentColor={bike.accentColor}
            className="h-56 sm:h-64"
            badgeText={`${bike.inspectionScore}/40 Verified Points`}
          />
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-neutral-800 bg-neutral-950/50 overflow-x-auto text-sm font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 px-2 whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Vehicle Overview & Specs
          </button>
          <button
            onClick={() => setActiveTab('inspection')}
            className={`pb-3 border-b-2 px-2 whitespace-nowrap transition-colors ${
              activeTab === 'inspection'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            40-Point Inspection ({bike.inspectionScore}/40)
          </button>
          <button
            onClick={() => setActiveTab('emi')}
            className={`pb-3 border-b-2 px-2 whitespace-nowrap transition-colors ${
              activeTab === 'emi'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            EMI Calculator
          </button>
          <button
            onClick={() => setActiveTab('testride')}
            className={`pb-3 border-b-2 px-2 whitespace-nowrap transition-colors ${
              activeTab === 'testride'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Book Test Ride / Reserve
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Pricing & Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <div>
                  <div className="text-xs text-neutral-400">Offer Price (All Inclusive)</div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-neutral-100 flex items-center">
                    <span className="text-amber-400">₹</span>
                    {bike.sellingPrice.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    Estimated EMI: <span className="font-mono text-amber-400">₹{emiData.monthlyEmi.toLocaleString('en-IN')}/mo</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('testride')}
                    className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
                  >
                    Schedule Test Ride
                  </button>
                  <button
                    onClick={handleReserve}
                    disabled={reserveSuccess}
                    className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {reserveSuccess ? 'Reserved for You' : 'Reserve Online (₹2,500)'}
                  </button>
                </div>
              </div>

              {reserveSuccess && (
                <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Bike reserved! We have placed a 48-hour exclusive hold on {bike.model}. Our manager will call you within 2 business hours.
                  </span>
                </div>
              )}

              {/* Description */}
              <p className="text-sm text-neutral-300 leading-relaxed">{bike.description}</p>

              {/* Technical Specifications Grid */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
                  Technical Specifications
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                    <div className="text-neutral-500">Odometer</div>
                    <div className="font-mono text-neutral-100 font-semibold mt-1">
                      {bike.kmsDriven.toLocaleString('en-IN')} km
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                    <div className="text-neutral-500">Engine Capacity</div>
                    <div className="font-mono text-neutral-100 font-semibold mt-1">
                      {bike.engineCc > 0 ? `${bike.engineCc} cc` : 'Electric PMSM'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                    <div className="text-neutral-500">Ownership</div>
                    <div className="font-mono text-neutral-100 font-semibold mt-1">
                      {bike.ownersCount === 1 ? '1st Owner' : `${bike.ownersCount} Owners`}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                    <div className="text-neutral-500">Registration (RC)</div>
                    <div className="font-mono text-neutral-100 font-semibold mt-1 truncate">
                      {bike.regNumber}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                    <div className="text-neutral-500">Fuel Type</div>
                    <div className="text-neutral-100 font-semibold mt-1">{bike.fuelType}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                    <div className="text-neutral-500">Insurance Valid</div>
                    <div className="font-mono text-neutral-100 font-semibold mt-1">
                      {bike.insuranceValidUntil}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                    <div className="text-neutral-500">RC Transfer</div>
                    <div className="text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5" />
                      {bike.rcStatus}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                    <div className="text-neutral-500">Warranty</div>
                    <div className="text-amber-400 font-semibold mt-1 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      6 Months / 5000 km
                    </div>
                  </div>
                </div>
              </div>

              {/* Highlights & Accessories */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Key Features & Add-ons Included
                </h4>
                <div className="flex flex-wrap gap-2">
                  {bike.features.map((feat, idx) => (
                    <span
                      key={idx}
                      className="text-xs text-neutral-300 bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-md"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inspection' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-neutral-400">Quality Assurance Rating</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                    {bike.inspectionScore} / 40 Points Passed
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Inspected by certified master mechanics with laser frame checking and diagnostic scan.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              <div className="space-y-2">
                {bike.inspectionItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <div className="font-medium text-neutral-200">{item.name}</div>
                      <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                        Category: {item.category} {item.note && `· ${item.note}`}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 font-medium">
                      {item.status === 'Pass' && (
                        <span className="text-emerald-400 flex items-center gap-1 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/60">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Passed OEM Spec
                        </span>
                      )}
                      {item.status === 'Replaced' && (
                        <span className="text-sky-400 flex items-center gap-1 bg-sky-950/50 px-2 py-0.5 rounded border border-sky-800/60">
                          <RefreshCw className="w-3.5 h-3.5" />
                          Replaced New
                        </span>
                      )}
                      {item.status === 'Attention' && (
                        <span className="text-amber-400 flex items-center gap-1 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/60">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Attention
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'emi' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="text-xs text-neutral-400">Interactive Two-Wheeler EMI Estimator</div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                    <div className="text-xs text-neutral-400">Monthly EMI</div>
                    <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                      ₹{emiData.monthlyEmi.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-neutral-500">for {tenureMonths} months</div>
                  </div>
                  <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                    <div className="text-xs text-neutral-400">Financed Loan Amount</div>
                    <div className="text-xl font-bold font-mono text-neutral-200 mt-1">
                      ₹{emiData.principal.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-neutral-500">Down Payment: ₹{downPayment.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                    <div className="text-xs text-neutral-400">Total Interest Payable</div>
                    <div className="text-xl font-bold font-mono text-neutral-200 mt-1">
                      ₹{emiData.totalInterest.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-neutral-500">@ {annualRate}% p.a.</div>
                  </div>
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between text-neutral-300 font-medium mb-1.5">
                    <span>Down Payment Amount</span>
                    <span className="font-mono text-amber-400">₹{downPayment.toLocaleString('en-IN')} ({Math.round((downPayment / bike.sellingPrice) * 100)}%)</span>
                  </div>
                  <input
                    type="range"
                    min={Math.round(bike.sellingPrice * 0.1)}
                    max={Math.round(bike.sellingPrice * 0.8)}
                    step={1000}
                    value={downPayment}
                    onChange={(e) => setDownPayment(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-neutral-500 mt-1">
                    <span>Min (10%): ₹{Math.round(bike.sellingPrice * 0.1).toLocaleString('en-IN')}</span>
                    <span>Max (80%): ₹{Math.round(bike.sellingPrice * 0.8).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-neutral-300 font-medium mb-1.5">
                    <span>Loan Tenure (Months)</span>
                    <span className="font-mono text-amber-400">{tenureMonths} Months ({tenureMonths / 12} Years)</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[12, 24, 36, 48].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTenureMonths(m)}
                        className={`py-2 rounded-lg font-mono text-xs border transition-colors ${
                          tenureMonths === m
                            ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400'
                            : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {m} Mos
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-neutral-300 font-medium mb-1.5">
                    <span>Estimated Annual Interest Rate</span>
                    <span className="font-mono text-amber-400">{annualRate}%</span>
                  </div>
                  <input
                    type="range"
                    min={8.5}
                    max={16.0}
                    step={0.5}
                    value={annualRate}
                    onChange={(e) => setAnnualRate(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-400">
                <span className="font-semibold text-neutral-200">Financing Partner Banks:</span> HDFC Bank, ICICI Bank, IDFC First, and Bajaj Finserv. Instant in-shop approval with Aadhar & PAN.
              </div>
            </div>
          )}

          {activeTab === 'testride' && (
            <div className="space-y-4">
              {rideBookedSuccess ? (
                <div className="p-6 text-center space-y-3 bg-neutral-950 border border-emerald-800/80 rounded-xl">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-100">Test Ride Confirmed!</h3>
                  <p className="text-xs text-neutral-300 max-w-md mx-auto">
                    We have scheduled your test ride for <strong className="text-amber-400">{bike.model}</strong> on{' '}
                    <strong className="text-neutral-100">{rideDate}</strong> at{' '}
                    <strong className="text-neutral-100">{rideTime}</strong>. Please bring your valid 2-wheeler Driving License.
                  </p>
                  <button
                    onClick={() => setRideBookedSuccess(false)}
                    className="text-xs text-amber-400 hover:underline pt-2 block mx-auto"
                  >
                    Modify Booking
                  </button>
                </div>
              ) : (
                <form onSubmit={handleTestRideSubmit} className="space-y-4 text-xs">
                  <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300">
                    Schedule a free, zero-obligation 15-minute test ride around our test track. Valid Driving License required.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Your Full Name</label>
                      <input
                        type="text"
                        required
                        value={rideName}
                        onChange={(e) => setRideName(e.target.value)}
                        placeholder="e.g. Arun Kumar"
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Mobile Number</label>
                      <input
                        type="tel"
                        required
                        value={ridePhone}
                        onChange={(e) => setRidePhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Preferred Date</label>
                      <input
                        type="date"
                        required
                        value={rideDate}
                        onChange={(e) => setRideDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-400 mb-1 font-medium">Preferred Time Slot</label>
                      <select
                        value={rideTime}
                        onChange={(e) => setRideTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                      >
                        <option value="10:00 AM">10:00 AM - 11:00 AM</option>
                        <option value="11:30 AM">11:30 AM - 12:30 PM</option>
                        <option value="02:30 PM">02:30 PM - 03:30 PM</option>
                        <option value="04:30 PM">04:30 PM - 05:30 PM</option>
                        <option value="06:00 PM">06:00 PM - 07:00 PM</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm"
                  >
                    Confirm Test Ride Appointment
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
