import React, { useState } from 'react';
import { ServiceBookingFormData } from '../types';
import { X, Calendar, Wrench, CheckCircle2, Truck, ShieldCheck } from 'lucide-react';

interface ServiceBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitBooking: (booking: ServiceBookingFormData) => void;
}

export const ServiceBookingModal: React.FC<ServiceBookingModalProps> = ({
  isOpen,
  onClose,
  onSubmitBooking,
}) => {
  const [formData, setFormData] = useState<ServiceBookingFormData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    bikeRegNumber: '',
    bikeModel: '',
    currentKm: 12000,
    serviceType: 'Routine Maintenance',
    preferredDate: '2026-10-18',
    preferredTimeSlot: '09:30 AM',
    pickupOption: 'Drop-off at Shop',
    complaints: '',
  });

  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.customerPhone.trim() || !formData.bikeRegNumber.trim()) {
      return;
    }
    onSubmitBooking(formData);
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div>
            <div className="text-xs font-mono text-amber-400">Workshop Appointment</div>
            <h2 className="text-lg font-bold font-display text-neutral-100">
              Schedule Bike Service
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close booking modal"
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {submitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-display text-neutral-100">
                Service Appointment Confirmed!
              </h3>
              <p className="text-xs text-neutral-300 max-w-md mx-auto leading-relaxed">
                Thank you, <strong className="text-white">{formData.customerName}</strong>! Your service slot for <strong className="text-amber-400">{formData.bikeModel || formData.bikeRegNumber}</strong> is booked for <strong className="text-white">{formData.preferredDate}</strong> at <strong className="text-white">{formData.preferredTimeSlot}</strong>.
              </p>
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-400 max-w-xs mx-auto">
                Reference Token: <span className="text-amber-400">SRV-{Math.floor(1000 + Math.random() * 9000)}</span>
              </div>
              <button
                onClick={() => {
                  setSubmitted(false);
                  onClose();
                }}
                className="mt-4 px-6 py-2.5 rounded-lg text-xs font-semibold bg-amber-500 text-neutral-950 hover:bg-amber-400 shadow-sm"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="e.g. Vikram Mehta"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="+91 98200 12345"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-neutral-400 mb-1 font-medium">Reg Number (RC) *</label>
                  <input
                    type="text"
                    required
                    value={formData.bikeRegNumber}
                    onChange={(e) => setFormData({ ...formData, bikeRegNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. MH 12 AB 4589"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-neutral-400 mb-1 font-medium">Bike Model *</label>
                  <input
                    type="text"
                    required
                    value={formData.bikeModel}
                    onChange={(e) => setFormData({ ...formData, bikeModel: e.target.value })}
                    placeholder="e.g. Royal Enfield Classic 350"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-neutral-400 mb-1 font-medium">Approx Odometer (km)</label>
                  <input
                    type="number"
                    value={formData.currentKm}
                    onChange={(e) => setFormData({ ...formData, currentKm: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Service Package</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Routine Maintenance">Periodic Routine Maintenance (Oil & Filters)</option>
                    <option value="Full Engine Tune-Up">Full Engine Tune-Up & Valve Calibration</option>
                    <option value="Brake Overhaul">Brake Pads & Hydraulic Fluid Overhaul</option>
                    <option value="Pre-Purchase Inspection">Pre-Purchase 40-Point Inspection</option>
                    <option value="Crash Repair">Accident Damage & Denting/Painting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Drop-off / Pickup</label>
                  <select
                    value={formData.pickupOption}
                    onChange={(e) => setFormData({ ...formData, pickupOption: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Drop-off at Shop">Direct Drop-off at Workshop (Free)</option>
                    <option value="Doorstep Pickup (+₹250)">Doorstep Pickup Van (+₹250)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Preferred Date</label>
                  <input
                    type="date"
                    required
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Time Slot</label>
                  <select
                    value={formData.preferredTimeSlot}
                    onChange={(e) => setFormData({ ...formData, preferredTimeSlot: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="09:00 AM">09:00 AM - 10:30 AM</option>
                    <option value="11:00 AM">11:00 AM - 12:30 PM</option>
                    <option value="02:00 PM">02:00 PM - 03:30 PM</option>
                    <option value="04:00 PM">04:00 PM - 05:30 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-medium">
                  Specific Complaints or Observations
                </label>
                <textarea
                  rows={2}
                  value={formData.complaints}
                  onChange={(e) => setFormData({ ...formData, complaints: e.target.value })}
                  placeholder="e.g. Engine vibrations above 60kmph, brake squeal, hard gear shifts..."
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm"
              >
                Confirm Workshop Booking
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
