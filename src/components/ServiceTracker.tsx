import React, { useState } from 'react';
import { CustomerVehicleProfile, JobCard, JobCardStatus } from '../types';
import { calculateAutomatedServiceAlerts } from '../utils/calculations';
import {
  Search,
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  User,
  ShieldAlert,
  ChevronRight,
  PlusCircle,
  Printer,
  Sparkles,
  Phone,
} from 'lucide-react';

interface ServiceTrackerProps {
  customerProfiles: CustomerVehicleProfile[];
  jobCards: JobCard[];
  onBookServiceClick: () => void;
}

export const ServiceTracker: React.FC<ServiceTrackerProps> = ({
  customerProfiles,
  jobCards,
  onBookServiceClick,
}) => {
  const [selectedReg, setSelectedReg] = useState<string>('MH 12 AB 4589');
  const [searchInput, setSearchInput] = useState('');
  const [viewInvoice, setViewInvoice] = useState<any | null>(null);

  // Find selected vehicle profile
  const profile = customerProfiles.find(
    (p) => p.regNumber.toUpperCase() === selectedReg.toUpperCase()
  ) || customerProfiles[0];

  // Active Job Card
  const activeJobCard = jobCards.find(
    (jc) => jc.bikeRegNumber.toUpperCase() === profile.regNumber.toUpperCase() && jc.status !== 'DELIVERED'
  );

  // Automated Service Alerts for this vehicle
  const alerts = calculateAutomatedServiceAlerts({
    lastServiceDate: profile.lastServiceDate,
    currentKm: profile.currentKm,
    lastServiceKm: profile.lastServiceKm,
    insuranceExpiryDate: profile.insuranceExpiryDate,
  });

  const pipelineStages: { key: JobCardStatus; label: string; desc: string }[] = [
    { key: 'INSPECTION', label: '1. Check-in & Inspection', desc: '40-point intake checklist & diagnostic scan' },
    { key: 'DISASSEMBLY', label: '2. Disassembly', desc: 'Stripping components & component degreasing' },
    { key: 'SPARES_REPLACED', label: '3. Parts Replacement', desc: 'Fitting genuine spares & fresh fluids' },
    { key: 'WASHING', label: '4. Foam Wash & Detailing', desc: 'Pressure jet wash & chain hydrophobic coat' },
    { key: 'ROAD_TEST', label: '5. Road Test & QC', desc: 'Dynamic road test by master technician' },
    { key: 'READY', label: '6. Ready for Delivery', desc: 'Vehicle sanitized & invoice ready' },
  ];

  const getStageIndex = (status: JobCardStatus) => {
    return pipelineStages.findIndex((s) => s.key === status);
  };

  const currentStageIndex = activeJobCard ? getStageIndex(activeJobCard.status) : -1;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const found = customerProfiles.find(
      (p) =>
        p.regNumber.toLowerCase().includes(searchInput.toLowerCase()) ||
        p.customerPhone.includes(searchInput)
    );
    if (found) {
      setSelectedReg(found.regNumber);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Banner & Registration Lookup Bar */}
      <section className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-amber-400">Customer Service Portal</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-neutral-100 mt-1">
              Live Bike Service & History Tracker
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Check live status of your bike in our service bay, inspect mechanic diagnostic logs, and access past invoices.
            </p>
          </div>

          <button
            onClick={onBookServiceClick}
            className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center gap-2 transition-colors shrink-0 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Book New Service</span>
          </button>
        </div>

        {/* Lookup presets & Search */}
        <div className="pt-2 border-t border-neutral-800/80 space-y-3">
          <div className="text-xs text-neutral-400 font-medium">Select or search vehicle registration number:</div>
          <div className="flex flex-wrap items-center gap-2">
            {customerProfiles.map((p) => (
              <button
                key={p.regNumber}
                onClick={() => setSelectedReg(p.regNumber)}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs border transition-colors ${
                  selectedReg === p.regNumber
                    ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {p.regNumber} ({p.bikeMake})
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="max-w-md flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by registration (e.g. MH 12 AB 4589) or phone..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 text-neutral-200 border border-neutral-700 hover:bg-neutral-700"
            >
              Lookup
            </button>
          </form>
        </div>
      </section>

      {/* Vehicle Summary Header & Automated Alerts */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vehicle Info Card */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="text-xs text-neutral-400 font-mono">Registered Vehicle</div>
          <div className="text-lg font-bold font-display text-neutral-100">{profile.bikeModel}</div>
          <div className="text-xs text-neutral-400 space-y-1">
            <div className="flex justify-between">
              <span>Plate:</span>
              <span className="font-mono text-neutral-200 font-semibold">{profile.regNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Odometer:</span>
              <span className="font-mono text-neutral-200">{profile.currentKm.toLocaleString('en-IN')} km</span>
            </div>
            <div className="flex justify-between">
              <span>Owner:</span>
              <span className="text-neutral-200">{profile.customerName}</span>
            </div>
          </div>
        </div>

        {/* Automated Service Alert Card */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-neutral-400 font-mono">Service Due Monitor</div>
            {alerts.serviceDueStatus === 'OVERDUE' && (
              <span className="text-[11px] font-mono text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/80">
                Overdue
              </span>
            )}
            {alerts.serviceDueStatus === 'UPCOMING' && (
              <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80">
                Due Soon
              </span>
            )}
            {alerts.serviceDueStatus === 'NORMAL' && (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
                In Good Standing
              </span>
            )}
          </div>

          <div className="text-xs text-neutral-300">
            {alerts.serviceAlertReason}
          </div>

          <div className="text-[11px] text-neutral-400 pt-1 font-mono">
            Last serviced on {profile.lastServiceDate} @ {profile.lastServiceKm.toLocaleString('en-IN')} km
          </div>
        </div>

        {/* Insurance Validity Card */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-neutral-400 font-mono">Insurance Validity</div>
            {alerts.insuranceStatus === 'EXPIRED' && (
              <span className="text-[11px] font-mono text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/80">
                Policy Expired!
              </span>
            )}
            {alerts.insuranceStatus === 'EXPIRING_SOON' && (
              <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80">
                Expiring in {alerts.daysToInsuranceExpiry} days
              </span>
            )}
            {alerts.insuranceStatus === 'VALID' && (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
                Valid Policy
              </span>
            )}
          </div>

          <div className="text-sm font-mono font-semibold text-neutral-200">
            Valid until {profile.insuranceExpiryDate}
          </div>

          <div className="text-[11px] text-neutral-400">
            Renew cashless two-wheeler insurance at our workshop desk with instant policy delivery.
          </div>
        </div>
      </section>

      {/* Live Service Bay Tracker (If active job card exists) */}
      {activeJobCard ? (
        <section className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Job Card: {activeJobCard.jobNumber} · In Progress</span>
              </div>
              <h2 className="text-xl font-bold font-display text-neutral-100 mt-1">
                {activeJobCard.serviceType}
              </h2>
            </div>

            <div className="text-xs sm:text-right space-y-0.5 font-mono text-neutral-400">
              <div>Technician: <span className="text-neutral-200 font-semibold">{activeJobCard.technicianName}</span></div>
              <div>Est. Delivery: <span className="text-amber-400 font-semibold">{activeJobCard.estimatedDelivery}</span></div>
            </div>
          </div>

          {/* 6-Stage Progress Stepper */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {pipelineStages.map((stage, idx) => {
                const isPassed = currentStageIndex > idx;
                const isCurrent = currentStageIndex === idx;

                return (
                  <div
                    key={stage.key}
                    className={`p-3.5 rounded-xl border text-xs transition-all ${
                      isCurrent
                        ? 'bg-amber-500/10 border-amber-500 text-neutral-100 shadow-md'
                        : isPassed
                        ? 'bg-neutral-950 border-emerald-800/70 text-neutral-300'
                        : 'bg-neutral-950/40 border-neutral-800/60 text-neutral-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-wider">
                        Stage {idx + 1}
                      </span>
                      {isPassed && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {isCurrent && <Clock className="w-4 h-4 text-amber-400 animate-spin" />}
                    </div>
                    <div className="font-semibold">{stage.label}</div>
                    <div className="text-[10px] text-neutral-400 mt-1 leading-snug line-clamp-2">
                      {stage.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mechanic Notes & Parts Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Mechanic Diagnostic Notes */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="text-xs font-semibold text-neutral-300 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>Master Mechanic Progress Report</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed font-sans bg-neutral-900 p-3 rounded-lg border border-neutral-800/60">
                "{activeJobCard.mechanicNotes}"
              </p>

              <div>
                <div className="text-[11px] uppercase font-mono text-neutral-500 mb-1.5">
                  Reported Issues Checked:
                </div>
                <div className="space-y-1">
                  {activeJobCard.reportedIssues.map((issue, idx) => (
                    <div key={idx} className="text-xs text-neutral-300 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Parts Replaced & Bill Estimation */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span>Parts & Consumables Added</span>
                <span className="font-mono text-amber-400 font-bold">
                  {activeJobCard.partsUsed.length} Spares
                </span>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {activeJobCard.partsUsed.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-xs py-1.5 border-b border-neutral-850"
                  >
                    <div>
                      <div className="text-neutral-200 font-medium">{p.name}</div>
                      <div className="text-[11px] text-neutral-400 font-mono">Qty: {p.quantity}</div>
                    </div>
                    <div className="font-mono text-neutral-300">
                      ₹{(p.unitPrice * p.quantity).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-neutral-800 space-y-1 text-xs font-mono">
                <div className="flex justify-between text-neutral-400">
                  <span>Labor & Calibration</span>
                  <span>₹{activeJobCard.laborCharges}</span>
                </div>
                {activeJobCard.discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Loyalty Discount</span>
                    <span>-₹{activeJobCard.discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-neutral-100 pt-1.5 border-t border-neutral-800">
                  <span>Estimated Total (Incl. GST)</span>
                  <span className="text-amber-400">
                    ₹
                    {(
                      activeJobCard.partsUsed.reduce((s, i) => s + i.unitPrice * i.quantity, 0) +
                      activeJobCard.laborCharges -
                      activeJobCard.discount
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="p-8 rounded-2xl bg-neutral-900 border border-neutral-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-neutral-100 font-display">No Active Service In Progress</h2>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            Vehicle {profile.regNumber} currently has no pending jobs. Your bike is road-ready!
          </p>
          <button
            onClick={onBookServiceClick}
            className="mt-2 px-5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm inline-flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Book Next Service Slot</span>
          </button>
        </section>
      )}

      {/* Past Service History & Invoices */}
      <section className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-amber-400">Digital Service Passbook</div>
            <h2 className="text-xl font-bold font-display text-neutral-100 mt-0.5">
              Verified Maintenance History
            </h2>
          </div>
          <div className="text-xs font-mono text-neutral-400">
            {profile.pastServices.length} Records Verified
          </div>
        </div>

        <div className="space-y-4">
          {profile.pastServices.map((record) => (
            <div
              key={record.serviceId}
              className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all space-y-3 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-850 pb-3">
                <div>
                  <div className="flex items-center gap-2 font-mono text-neutral-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{record.date}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-neutral-200 font-semibold">{record.kmReading.toLocaleString('en-IN')} km</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-400 font-semibold">Inv #{record.invoiceNumber}</span>
                  </div>
                  <div className="text-sm font-bold text-neutral-100 font-display mt-1">
                    {record.serviceType}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] text-neutral-500">Total Billed</div>
                    <div className="text-base font-bold font-mono text-neutral-100">
                      ₹{record.totalAmount.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <button
                    onClick={() => setViewInvoice(record)}
                    className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                    aria-label={`View Invoice ${record.invoiceNumber}`}
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Work Done & Parts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="text-[11px] font-mono text-neutral-500 uppercase mb-1">
                    Operations Conducted:
                  </div>
                  <ul className="space-y-1">
                    {record.keyWorkDone.map((w, idx) => (
                      <li key={idx} className="text-neutral-300 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-400" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-[11px] font-mono text-neutral-500 uppercase mb-1">
                    Parts & Lubricants Replaced:
                  </div>
                  <ul className="space-y-1">
                    {record.partsReplaced.map((part, idx) => (
                      <li key={idx} className="text-neutral-300 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-sky-400" />
                        <span>{part}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 text-[11px] font-mono text-neutral-400 border-t border-neutral-900 flex justify-between items-center">
                <span>Inspected & Signed by: {record.technician}</span>
                <span>Next Routine Check: {record.nextServiceDueDate} (~{record.nextServiceDueKm.toLocaleString('en-IN')} km)</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Invoice Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <div className="text-xs font-mono text-amber-400">Workshop Tax Invoice</div>
                <div className="text-lg font-bold font-display text-neutral-100">
                  #{viewInvoice.invoiceNumber}
                </div>
              </div>
              <button
                onClick={() => setViewInvoice(null)}
                className="text-xs px-2.5 py-1 rounded bg-neutral-800 text-neutral-300 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-neutral-400">
                <span>Vehicle:</span>
                <span className="text-neutral-200">{profile.bikeModel} ({profile.regNumber})</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Date:</span>
                <span className="text-neutral-200">{viewInvoice.date}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Odometer:</span>
                <span className="text-neutral-200">{viewInvoice.kmReading.toLocaleString('en-IN')} km</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Lead Technician:</span>
                <span className="text-neutral-200">{viewInvoice.technician}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 text-xs">
              <div className="font-semibold text-neutral-300 mb-2">Itemized Work & Spares:</div>
              <div className="space-y-1.5">
                {viewInvoice.partsReplaced.map((item: string, i: number) => (
                  <div key={i} className="flex justify-between text-neutral-300">
                    <span>{item}</span>
                    <span className="font-mono text-neutral-400">Included</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-800 flex justify-between items-center text-sm font-bold">
                <span className="text-neutral-100">Total Billed & Paid</span>
                <span className="font-mono text-amber-400 text-base">
                  ₹{viewInvoice.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="pt-2 text-center text-[11px] text-neutral-500">
              MotoCraft Workshop & Motors · GSTIN: 27AABCM9102K1Z9 · Verified Authentic Service Record
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
