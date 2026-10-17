import React, { useState } from 'react';
import { Bike, SparePart, JobCard, CustomerVehicleProfile, JobCardStatus } from '../types';
import {
  calculateAutomatedServiceAlerts,
  calculateStockAging,
  calculateBikeMargin,
  calculateServiceInvoice,
} from '../utils/calculations';
import {
  Wrench,
  AlertTriangle,
  TrendingUp,
  Package,
  Layers,
  Send,
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  DollarSign,
  Search,
  RefreshCw,
  Bell,
  MessageSquare,
  ShieldAlert,
  Calendar,
  UserCheck,
} from 'lucide-react';

interface AdminDashboardProps {
  bikes: Bike[];
  setBikes: React.Dispatch<React.SetStateAction<Bike[]>>;
  spares: SparePart[];
  setSpares: React.Dispatch<React.SetStateAction<SparePart[]>>;
  jobCards: JobCard[];
  setJobCards: React.Dispatch<React.SetStateAction<JobCard[]>>;
  customerProfiles: CustomerVehicleProfile[];
  setCustomerProfiles: React.Dispatch<React.SetStateAction<CustomerVehicleProfile[]>>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  bikes,
  setBikes,
  spares,
  setSpares,
  jobCards,
  setJobCards,
  customerProfiles,
  setCustomerProfiles,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'alerts' | 'workshop' | 'bikes' | 'spares' | 'reports'>('alerts');

  // Notification dispatch state
  const [dispatchModal, setDispatchModal] = useState<{
    customerName: string;
    phone: string;
    bikeModel: string;
    regNumber: string;
    type: 'SERVICE_DUE' | 'INSURANCE_EXPIRY' | 'PRICE_DROP';
    message: string;
  } | null>(null);
  const [dispatchedSuccess, setDispatchedSuccess] = useState<string | null>(null);

  // New Bike Modal State
  const [showAddBikeModal, setShowAddBikeModal] = useState(false);
  const [newBikeMake, setNewBikeMake] = useState('Royal Enfield');
  const [newBikeModel, setNewBikeModel] = useState('');
  const [newBikeYear, setNewBikeYear] = useState(2023);
  const [newBikeReg, setNewBikeReg] = useState('');
  const [newBikeKms, setNewBikeKms] = useState(15000);
  const [newBikePurchase, setNewBikePurchase] = useState(120000);
  const [newBikeRefurb, setNewBikeRefurb] = useState(8000);
  const [newBikeSelling, setNewBikeSelling] = useState(155000);
  const [newBikeCategory, setNewBikeCategory] = useState<'Cruiser' | 'Sport' | 'Scooter' | 'Commuter' | 'Street Naked' | 'Electric'>('Cruiser');

  // New Job Card State
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [newJobCustomer, setNewJobCustomer] = useState('');
  const [newJobPhone, setNewJobPhone] = useState('');
  const [newJobReg, setNewJobReg] = useState('');
  const [newJobBikeModel, setNewJobBikeModel] = useState('');
  const [newJobServiceType, setNewJobServiceType] = useState<'Routine Maintenance' | 'Full Engine Tune-Up' | 'Brake Overhaul' | 'Pre-Purchase Inspection' | 'Crash Repair'>('Routine Maintenance');
  const [newJobTech, setNewJobTech] = useState('Vikram Shinde (Master Tech)');
  const [newJobLabor, setNewJobLabor] = useState(750);
  const [newJobIssue, setNewJobIssue] = useState('');

  // Add Part to Job Card State
  const [selectedJobForPart, setSelectedJobForPart] = useState<string | null>(null);
  const [partToAddId, setPartToAddId] = useState<string>(spares[0]?.id || '');
  const [partToAddQty, setPartToAddQty] = useState<number>(1);

  // Calculated Metrics
  const totalBikesInStock = bikes.filter((b) => b.stockStatus === 'In Showroom' || b.stockStatus === 'Test Ride Booked').length;
  const totalBikeInventoryValue = bikes
    .filter((b) => b.stockStatus !== 'Sold')
    .reduce((sum, b) => sum + b.sellingPrice, 0);

  const activeJobCards = jobCards.filter((jc) => jc.status !== 'DELIVERED');

  const lowStockSpares = spares.filter((s) => s.stockQuantity <= s.reorderLevel);

  // Estimated Total Revenue
  const bikeSalesRevenue = bikes.filter((b) => b.stockStatus === 'Sold').reduce((sum, b) => sum + b.sellingPrice, 0);
  const workshopRevenue = jobCards.reduce((sum, jc) => {
    const partsTotal = jc.partsUsed.reduce((ps, p) => ps + p.unitPrice * p.quantity, 0);
    return sum + partsTotal + jc.laborCharges - jc.discount;
  }, 0);
  const totalShopRevenue = bikeSalesRevenue + workshopRevenue + 45200; // includes online spares sales

  // Calculate Automated Alerts
  const customerServiceAlerts = customerProfiles.map((p) => {
    const alerts = calculateAutomatedServiceAlerts({
      lastServiceDate: p.lastServiceDate,
      currentKm: p.currentKm,
      lastServiceKm: p.lastServiceKm,
      insuranceExpiryDate: p.insuranceExpiryDate,
    });
    return { profile: p, alerts };
  }).filter((item) => item.alerts.serviceDueStatus !== 'NORMAL' || item.alerts.insuranceStatus !== 'VALID');

  const stockAgingAlerts = bikes.map((b) => {
    const aging = calculateStockAging(b.dateAdded);
    return { bike: b, aging };
  }).filter((item) => item.aging.agingCategory === 'SLOW' || item.aging.agingCategory === 'CRITICAL');

  // Handlers
  const handleAdvanceJobStatus = (jobId: string) => {
    const sequence: JobCardStatus[] = [
      'INSPECTION',
      'DISASSEMBLY',
      'SPARES_REPLACED',
      'WASHING',
      'ROAD_TEST',
      'READY',
      'DELIVERED',
    ];

    setJobCards((prev) =>
      prev.map((jc) => {
        if (jc.id !== jobId) return jc;
        const currIdx = sequence.indexOf(jc.status);
        if (currIdx < sequence.length - 1) {
          const nextStatus = sequence[currIdx + 1];
          return {
            ...jc,
            status: nextStatus,
            completedAt: nextStatus === 'DELIVERED' ? new Date().toISOString().slice(0, 16).replace('T', ' ') : jc.completedAt,
            paidStatus: nextStatus === 'DELIVERED' ? 'Paid' : jc.paidStatus,
          };
        }
        return jc;
      })
    );
  };

  const handleAddPartToJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobForPart || !partToAddId) return;

    const partObj = spares.find((s) => s.id === partToAddId);
    if (!partObj) return;

    // Deduct stock from spares inventory
    setSpares((prev) =>
      prev.map((s) => (s.id === partToAddId ? { ...s, stockQuantity: Math.max(0, s.stockQuantity - partToAddQty) } : s))
    );

    // Add part to job card
    setJobCards((prev) =>
      prev.map((jc) => {
        if (jc.id !== selectedJobForPart) return jc;
        const existingIdx = jc.partsUsed.findIndex((p) => p.partId === partToAddId);
        let updatedParts = [...jc.partsUsed];
        if (existingIdx >= 0) {
          updatedParts[existingIdx] = {
            ...updatedParts[existingIdx],
            quantity: updatedParts[existingIdx].quantity + partToAddQty,
          };
        } else {
          updatedParts.push({
            partId: partObj.id,
            name: partObj.name,
            quantity: partToAddQty,
            unitPrice: partObj.sellingPrice,
          });
        }
        return { ...jc, partsUsed: updatedParts };
      })
    );

    setSelectedJobForPart(null);
  };

  const handleRestockSpare = (spareId: string) => {
    setSpares((prev) =>
      prev.map((s) => (s.id === spareId ? { ...s, stockQuantity: s.stockQuantity + 10, inStock: true } : s))
    );
  };

  const handleAddNewBike = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBikeModel.trim() || !newBikeReg.trim()) return;

    const marginData = calculateBikeMargin(newBikePurchase, newBikeRefurb, newBikeSelling);

    const newBike: Bike = {
      id: `bike-${Date.now()}`,
      make: newBikeMake,
      model: newBikeModel,
      year: newBikeYear,
      variant: 'Showroom Certified',
      regNumber: newBikeReg.toUpperCase(),
      engineCc: 250,
      kmsDriven: newBikeKms,
      fuelType: newBikeCategory === 'Electric' ? 'Electric' : 'Petrol',
      category: newBikeCategory,
      ownersCount: 1,
      color: 'Custom Matte',
      purchasePrice: newBikePurchase,
      refurbCost: newBikeRefurb,
      sellingPrice: newBikeSelling,
      stockStatus: 'In Showroom',
      dateAdded: new Date().toISOString().slice(0, 10),
      insuranceValidUntil: '2027-10-15',
      rcStatus: 'Verified & Clear',
      inspectionScore: 39,
      accentColor: '#f59e0b',
      description: `Newly acquired ${newBikeMake} ${newBikeModel}. Inspected and certified by MotoCraft technicians. Clean documentation and warranty.`,
      features: ['Workshop Inspected', '6-Month Engine Warranty', 'Original Paint', 'New Battery Installed'],
      inspectionItems: [
        { name: 'Engine Compression & Leakdown', category: 'Engine & Transmission', status: 'Pass' },
        { name: 'Chassis Alignment', category: 'Chassis & Suspension', status: 'Pass' },
        { name: 'Brake Disc & Pads', category: 'Brakes & Tyres', status: 'Replaced' },
        { name: 'RC Book & Transfer Papers', category: 'Documentation', status: 'Pass' },
      ],
    };

    setBikes([newBike, ...bikes]);
    setShowAddBikeModal(false);
    setNewBikeModel('');
    setNewBikeReg('');
  };

  const handleCreateJobCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobCustomer.trim() || !newJobReg.trim()) return;

    const newCard: JobCard = {
      id: `jc-${Date.now()}`,
      jobNumber: `JC-2026-${Math.floor(105 + Math.random() * 50)}`,
      customerName: newJobCustomer,
      customerPhone: newJobPhone,
      customerEmail: `${newJobCustomer.toLowerCase().replace(/\s+/g, '')}@example.com`,
      bikeRegNumber: newJobReg.toUpperCase(),
      bikeModel: newJobBikeModel || 'Customer 2-Wheeler',
      currentKm: 15000,
      serviceType: newJobServiceType,
      technicianName: newJobTech,
      status: 'INSPECTION',
      reportedIssues: newJobIssue ? [newJobIssue] : ['Routine inspection & fluid check'],
      mechanicNotes: 'Initial check-in completed. Intake photos logged.',
      partsUsed: [],
      laborCharges: newJobLabor,
      discount: 0,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      estimatedDelivery: 'Tomorrow 17:00',
      paidStatus: 'Pending',
    };

    setJobCards([newCard, ...jobCards]);
    setShowAddJobModal(false);
    setNewJobCustomer('');
    setNewJobReg('');
    setNewJobIssue('');
  };

  const openDispatchAlert = (
    name: string,
    phone: string,
    bike: string,
    reg: string,
    type: 'SERVICE_DUE' | 'INSURANCE_EXPIRY' | 'PRICE_DROP',
    reason: string
  ) => {
    let msg = '';
    if (type === 'SERVICE_DUE') {
      msg = `Hi ${name}, your ${bike} (${reg}) is due for scheduled workshop maintenance (${reason}). Book your appointment with MotoCraft today & get a complimentary foam wash!`;
    } else if (type === 'INSURANCE_EXPIRY') {
      msg = `Hi ${name}, notice from MotoCraft: The insurance policy for your ${bike} (${reg}) is expiring soon. Renew at our desk instantly to avoid traffic penalties.`;
    } else {
      msg = `Exclusive Showroom Alert: Special price revision announced on ${bike} (${reg}). Schedule a priority test ride this weekend at MotoCraft!`;
    }

    setDispatchModal({
      customerName: name,
      phone,
      bikeModel: bike,
      regNumber: reg,
      type,
      message: msg,
    });
  };

  const sendSimulatedDispatch = () => {
    if (!dispatchModal) return;
    setDispatchedSuccess(`Automated SMS & WhatsApp dispatch sent to ${dispatchModal.phone}!`);
    setTimeout(() => {
      setDispatchedSuccess(null);
      setDispatchModal(null);
    }, 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Admin Dashboard Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="text-xs font-mono text-amber-400">Workshop & Showroom Operations</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-neutral-100">
            Admin Reporting & Service Center Hub
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddJobModal(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>New Job Card</span>
          </button>
          <button
            onClick={() => setShowAddBikeModal(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bike to Lot</span>
          </button>
        </div>
      </section>

      {/* Top Reporting KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="text-neutral-500">Gross Shop Revenue</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-neutral-100 mt-1">
            <span className="text-amber-400 text-sm">₹</span>
            {totalShopRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+18.4% vs last month</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="text-neutral-500">Bikes in Showroom</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-neutral-100 mt-1">
            {totalBikesInStock} Units
          </div>
          <div className="text-[11px] text-neutral-400 mt-1 font-mono">
            ₹{(totalBikeInventoryValue / 100000).toFixed(1)}L Inventory Lock
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="text-neutral-500">Active Service Bay</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 mt-1">
            {activeJobCards.length} Job Cards
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Avg Turnaround: 4.8 hrs
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="text-neutral-500">Low Spares Alerts</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400 mt-1">
            {lowStockSpares.length} SKUs
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Critical reorder threshold
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 col-span-2 lg:col-span-1">
          <div className="text-neutral-500">Avg Bike Profit Margin</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1">
            18.2%
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Refurb ROI: ₹19,800/unit
          </div>
        </div>
      </section>

      {/* Admin Navigation Tabs */}
      <section className="flex items-center gap-2 overflow-x-auto border-b border-neutral-800 pb-2">
        <button
          onClick={() => setActiveAdminTab('alerts')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeAdminTab === 'alerts'
              ? 'bg-amber-500 text-neutral-950 font-bold'
              : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Automated Service Alerts</span>
          {(customerServiceAlerts.length + stockAgingAlerts.length + lowStockSpares.length) > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
              {customerServiceAlerts.length + stockAgingAlerts.length + lowStockSpares.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveAdminTab('workshop')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeAdminTab === 'workshop'
              ? 'bg-amber-500 text-neutral-950 font-bold'
              : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:text-white'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Job Cards & Bay Pipeline ({activeJobCards.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('bikes')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeAdminTab === 'bikes'
              ? 'bg-amber-500 text-neutral-950 font-bold'
              : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Bike Inventory ({bikes.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('spares')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeAdminTab === 'spares'
              ? 'bg-amber-500 text-neutral-950 font-bold'
              : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Spares Inventory ({spares.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('reports')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeAdminTab === 'reports'
              ? 'bg-amber-500 text-neutral-950 font-bold'
              : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Profit & Financial Reports</span>
        </button>
      </section>

      {/* TAB 1: AUTOMATED SERVICE ALERTS & DISPATCHES */}
      {activeAdminTab === 'alerts' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-neutral-100 font-display flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                <span>Automated Telemetry & Maintenance Alert Queue</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Automated background monitors calculating overdue periodic servicing (3000 km / 90 days threshold), insurance expirations, and lot aging.
              </p>
            </div>

            <div className="text-xs font-mono text-neutral-400">
              Active Trigger Rules: <span className="text-emerald-400">3 Monitors Active</span>
            </div>
          </div>

          {/* Customer Service & Insurance Due Alerts */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Customer Bike Service & Insurance Reminders ({customerServiceAlerts.length})</span>
            </h3>

            <div className="space-y-3">
              {customerServiceAlerts.map(({ profile, alerts }) => (
                <div
                  key={profile.regNumber}
                  className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-100 text-sm font-display">{profile.bikeModel}</span>
                      <span className="font-mono text-neutral-400">({profile.regNumber})</span>
                      {alerts.serviceDueStatus === 'OVERDUE' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                          Service Overdue
                        </span>
                      )}
                      {alerts.insuranceStatus === 'EXPIRED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                          Insurance Expired
                        </span>
                      )}
                      {alerts.insuranceStatus === 'EXPIRING_SOON' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
                          Insurance Expiring
                        </span>
                      )}
                    </div>

                    <div className="text-neutral-400">
                      Owner: <strong className="text-neutral-200">{profile.customerName}</strong> ({profile.customerPhone}) · Current Odometer: <span className="font-mono text-neutral-300">{profile.currentKm} km</span>
                    </div>

                    <div className="text-neutral-300 font-mono text-[11px] pt-0.5">
                      {alerts.serviceAlertReason}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() =>
                        openDispatchAlert(
                          profile.customerName,
                          profile.customerPhone,
                          profile.bikeModel,
                          profile.regNumber,
                          alerts.serviceDueStatus === 'OVERDUE' ? 'SERVICE_DUE' : 'INSURANCE_EXPIRY',
                          alerts.serviceAlertReason
                        )
                      }
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send WhatsApp / SMS Alert</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Showroom Stock Aging Alerts */}
          <div className="space-y-3 pt-4 border-t border-neutral-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Lot Stock Aging & Markdown Alerts ({stockAgingAlerts.length})</span>
            </h3>

            <div className="space-y-3">
              {stockAgingAlerts.map(({ bike, aging }) => (
                <div
                  key={bike.id}
                  className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-100 text-sm font-display">{bike.model}</span>
                      <span className="font-mono text-neutral-400">({bike.regNumber})</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        aging.agingCategory === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}>
                        In Stock {aging.daysInInventory} Days ({aging.agingCategory})
                      </span>
                    </div>

                    <div className="text-neutral-400 mt-1">
                      Purchase: <span className="font-mono">₹{bike.purchasePrice.toLocaleString('en-IN')}</span> · Refurb: <span className="font-mono">₹{bike.refurbCost.toLocaleString('en-IN')}</span> · Listing Price: <span className="font-mono text-amber-400 font-semibold">₹{bike.sellingPrice.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="text-amber-400 text-[11px] mt-1 font-medium">
                      Action: {aging.recommendation}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() =>
                        openDispatchAlert(
                          'Interested Buyer',
                          '+91 Registered Leads',
                          bike.model,
                          bike.regNumber,
                          'PRICE_DROP',
                          'Weekend Clearance Offer'
                        )
                      }
                      className="px-3.5 py-2 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>Promote to Leads</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WORKSHOP JOB CARDS & BAY PIPELINE */}
      {activeAdminTab === 'workshop' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
            <div>
              <h2 className="text-base font-bold text-neutral-100 font-display">
                Workshop Job Cards Pipeline
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Track status progression from intake inspection through parts replacement, washing, and delivery.
              </p>
            </div>
            <button
              onClick={() => setShowAddJobModal(true)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Job Card</span>
            </button>
          </div>

          <div className="space-y-4">
            {jobCards.map((jc) => {
              const invoice = calculateServiceInvoice({
                laborCharges: jc.laborCharges,
                parts: jc.partsUsed,
                taxRatePercent: 18,
                discountAmount: jc.discount,
              });

              return (
                <div
                  key={jc.id}
                  className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4 text-xs"
                >
                  {/* Job Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-amber-400 text-sm">{jc.jobNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-neutral-200 font-semibold">{jc.bikeModel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-neutral-400">{jc.bikeRegNumber}</span>
                      </div>
                      <div className="text-neutral-400">
                        Customer: <strong className="text-neutral-200">{jc.customerName}</strong> ({jc.customerPhone}) · Tech: <strong className="text-neutral-300">{jc.technicianName}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800 uppercase font-semibold">
                        Status: <span className="text-amber-400">{jc.status}</span>
                      </span>

                      {jc.status !== 'DELIVERED' ? (
                        <button
                          onClick={() => handleAdvanceJobStatus(jc.id)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-colors shadow-sm"
                        >
                          <span>Advance Stage</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Delivered & Paid
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Notes & Parts Used */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-neutral-400 font-medium">Technician Log & Issues:</div>
                      <p className="bg-neutral-950 p-3 rounded-lg border border-neutral-850 text-neutral-300 leading-relaxed font-sans">
                        {jc.mechanicNotes}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono">
                        <span>Created: {jc.createdAt}</span>
                        <span aria-hidden="true">·</span>
                        <span>Est Delivery: {jc.estimatedDelivery}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400 font-medium">Parts Billed ({jc.partsUsed.length})</span>
                        <button
                          onClick={() => setSelectedJobForPart(jc.id)}
                          className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Part from Stock
                        </button>
                      </div>

                      <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-850 space-y-1.5 max-h-36 overflow-y-auto font-mono text-[11px]">
                        {jc.partsUsed.length === 0 ? (
                          <div className="text-neutral-500 italic">No spare parts added yet.</div>
                        ) : (
                          jc.partsUsed.map((p, idx) => (
                            <div key={idx} className="flex justify-between text-neutral-300">
                              <span className="truncate max-w-[200px]">{p.name} (x{p.quantity})</span>
                              <span>₹{p.unitPrice * p.quantity}</span>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="flex justify-between font-mono text-xs pt-1">
                        <span className="text-neutral-400">Total Billed (with 18% GST):</span>
                        <span className="font-bold text-amber-400 text-sm">
                          ₹{invoice.grandTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: BIKE INVENTORY MANAGEMENT */}
      {activeAdminTab === 'bikes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
            <div>
              <h2 className="text-base font-bold text-neutral-100 font-display">
                Showroom Two-Wheeler Inventory
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Manage pre-owned bikes, stock aging, refurb expenses, RC title status, and profit margins.
              </p>
            </div>
            <button
              onClick={() => setShowAddBikeModal(true)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vehicle</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-950 text-neutral-400 font-mono">
                  <th className="p-3.5">Vehicle / Make</th>
                  <th className="p-3.5">Reg Number</th>
                  <th className="p-3.5">Year / Kms</th>
                  <th className="p-3.5">Cost Breakdown</th>
                  <th className="p-3.5">Selling Price</th>
                  <th className="p-3.5">Margin</th>
                  <th className="p-3.5">Stock Status</th>
                  <th className="p-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {bikes.map((bike) => {
                  const margin = calculateBikeMargin(bike.purchasePrice, bike.refurbCost, bike.sellingPrice);
                  const aging = calculateStockAging(bike.dateAdded);

                  return (
                    <tr key={bike.id} className="hover:bg-neutral-850/50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-neutral-200">{bike.model}</div>
                        <div className="text-[11px] text-neutral-400">{bike.category} · {bike.color}</div>
                      </td>
                      <td className="p-3.5 font-mono text-neutral-300">
                        {bike.regNumber}
                      </td>
                      <td className="p-3.5 font-mono text-neutral-400">
                        {bike.year} · {bike.kmsDriven.toLocaleString('en-IN')} km
                      </td>
                      <td className="p-3.5 font-mono text-neutral-300">
                        <div>Buy: ₹{bike.purchasePrice.toLocaleString('en-IN')}</div>
                        <div className="text-neutral-500 text-[10px]">Refurb: ₹{bike.refurbCost.toLocaleString('en-IN')}</div>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-neutral-100">
                        ₹{bike.sellingPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="text-emerald-400 font-semibold">₹{margin.grossProfit.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-neutral-400">{margin.marginPercentage}% net</div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          bike.stockStatus === 'In Showroom'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : bike.stockStatus === 'Test Ride Booked'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                        }`}>
                          {bike.stockStatus}
                        </span>
                        <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                          Age: {aging.daysInInventory}d ({aging.agingCategory})
                        </div>
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => {
                            setBikes((prev) =>
                              prev.map((b) => (b.id === bike.id ? { ...b, stockStatus: b.stockStatus === 'Sold' ? 'In Showroom' : 'Sold' } : b))
                            );
                          }}
                          className="px-2.5 py-1 text-[11px] rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium"
                        >
                          {bike.stockStatus === 'Sold' ? 'Re-list' : 'Mark Sold'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SPARES INVENTORY MANAGEMENT */}
      {activeAdminTab === 'spares' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
            <div>
              <h2 className="text-base font-bold text-neutral-100 font-display">
                Spare Parts Inventory & Stockroom
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Track SKU inventory counts, warehouse bay locations, and reorder alerts.
              </p>
            </div>
            <div className="text-xs font-mono text-neutral-400">
              Total SKUs: <span className="text-neutral-100 font-bold">{spares.length}</span> · Low Stock: <span className="text-rose-400 font-bold">{lowStockSpares.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-950 text-neutral-400 font-mono">
                  <th className="p-3.5">SKU & Item Name</th>
                  <th className="p-3.5">Category & Brand</th>
                  <th className="p-3.5">Bay Location</th>
                  <th className="p-3.5">Cost / Price</th>
                  <th className="p-3.5">In Stock Qty</th>
                  <th className="p-3.5">Stock Status</th>
                  <th className="p-3.5">Restock Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {spares.map((spare) => {
                  const isLow = spare.stockQuantity <= spare.reorderLevel;

                  return (
                    <tr key={spare.id} className="hover:bg-neutral-850/50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-neutral-200">{spare.name}</div>
                        <div className="text-[11px] font-mono text-neutral-400">SKU: {spare.sku}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-neutral-200">{spare.brand}</div>
                        <div className="text-[11px] text-neutral-400">{spare.category}</div>
                      </td>
                      <td className="p-3.5 font-mono text-neutral-400">
                        {spare.rackLocation}
                      </td>
                      <td className="p-3.5 font-mono text-neutral-300">
                        <div>Cost: ₹{spare.purchaseCost}</div>
                        <div className="text-amber-400 font-semibold">Sell: ₹{spare.sellingPrice}</div>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-sm">
                        <span className={isLow ? 'text-rose-400' : 'text-neutral-100'}>
                          {spare.stockQuantity} Units
                        </span>
                        <div className="text-[10px] text-neutral-500 font-normal">Min: {spare.reorderLevel}</div>
                      </td>
                      <td className="p-3.5">
                        {spare.stockQuantity === 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
                            Low Stock Alert
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Sufficient
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => handleRestockSpare(spare.id)}
                          className="px-2.5 py-1 text-[11px] rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1 font-medium"
                        >
                          <RefreshCw className="w-3 h-3 text-emerald-400" />
                          <span>+10 Batch</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: FINANCIAL & PROFIT MARGIN REPORTS */}
      {activeAdminTab === 'reports' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
            <h2 className="text-base font-bold text-neutral-100 font-display">
              Financial Breakdown & Unit Economics
            </h2>
            <p className="text-xs text-neutral-400">
              Aggregated sales ledger for pre-owned two-wheeler turnarounds, genuine parts markup, and workshop labor throughput.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="text-xs font-semibold text-neutral-400 font-mono uppercase">
                Revenue Streams Breakdown
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-neutral-300">Bike Sales</span>
                    <span className="font-mono text-neutral-100 font-semibold">₹1,18,000 (62%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-950 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '62%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-neutral-300">Workshop Labor & Invoicing</span>
                    <span className="font-mono text-neutral-100 font-semibold">₹44,500 (23%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-950 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '23%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-neutral-300">Direct Spares & Consumables</span>
                    <span className="font-mono text-neutral-100 font-semibold">₹28,600 (15%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-950 overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: '15%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="text-xs font-semibold text-neutral-400 font-mono uppercase">
                Technician Bay Productivity
              </div>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-neutral-200">Vikram Shinde</div>
                    <div className="text-[11px] text-neutral-500">Master Tech · 18 Jobs Done</div>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">98.5% QC</span>
                </div>

                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-neutral-200">Sanjay Rawat</div>
                    <div className="text-[11px] text-neutral-500">Service Specialist · 14 Jobs Done</div>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">97.0% QC</span>
                </div>

                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-neutral-200">Anand Patel</div>
                    <div className="text-[11px] text-neutral-500">Electrical & Diagnostics · 11 Jobs</div>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">99.1% QC</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="text-xs font-semibold text-neutral-400 font-mono uppercase">
                Fast-Moving Spares Index
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-neutral-850">
                  <span className="text-neutral-300">Motul 7100 10W-50 4T</span>
                  <span className="font-mono text-amber-400">32 Cans Sold</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-neutral-850">
                  <span className="text-neutral-300">Brembo Sintered Brake Pads</span>
                  <span className="font-mono text-amber-400">18 Sets</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-neutral-850">
                  <span className="text-neutral-300">NGK Iridium Spark Plugs</span>
                  <span className="font-mono text-amber-400">24 Units</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-neutral-850">
                  <span className="text-neutral-300">Rolon X-Ring Chain Kits</span>
                  <span className="font-mono text-amber-400">9 Kits</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISPATCH NOTIFICATION MODAL */}
      {dispatchModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <div className="text-xs font-mono text-amber-400">Automated Dispatch Simulator</div>
                <h3 className="text-lg font-bold font-display text-neutral-100">
                  Send Customer Alert
                </h3>
              </div>
              <button
                onClick={() => setDispatchModal(null)}
                className="text-xs px-2.5 py-1 rounded bg-neutral-800 text-neutral-300 hover:text-white"
              >
                Cancel
              </button>
            </div>

            {dispatchedSuccess ? (
              <div className="p-6 text-center space-y-2 bg-neutral-950 rounded-xl border border-emerald-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-neutral-100">{dispatchedSuccess}</div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="space-y-1 font-mono text-neutral-400">
                  <div>Recipient: <strong className="text-neutral-200">{dispatchModal.customerName}</strong></div>
                  <div>Phone: <strong className="text-amber-400">{dispatchModal.phone}</strong></div>
                  <div>Vehicle: <strong className="text-neutral-200">{dispatchModal.bikeModel} ({dispatchModal.regNumber})</strong></div>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">Message Preview (WhatsApp & SMS):</label>
                  <textarea
                    rows={4}
                    value={dispatchModal.message}
                    onChange={(e) => setDispatchModal({ ...dispatchModal, message: e.target.value })}
                    className="w-full p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-amber-500 font-sans leading-relaxed resize-none"
                  />
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-400 text-[11px]">
                  Dispatch routes through MotoCraft automated WhatsApp Business API & SMS Gateway. Delivery verified in real-time.
                </div>

                <button
                  onClick={sendSimulatedDispatch}
                  className="w-full py-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Immediate Automated Notification</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD BIKE MODAL */}
      {showAddBikeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-lg font-bold font-display text-neutral-100">
                Add Pre-Owned Bike to Inventory
              </h3>
              <button
                onClick={() => setShowAddBikeModal(false)}
                className="text-xs px-2.5 py-1 rounded bg-neutral-800 text-neutral-300 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddNewBike} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Make Brand</label>
                  <input
                    type="text"
                    required
                    value={newBikeMake}
                    onChange={(e) => setNewBikeMake(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Model & Trim</label>
                  <input
                    type="text"
                    required
                    value={newBikeModel}
                    onChange={(e) => setNewBikeModel(e.target.value)}
                    placeholder="e.g. Hunter 350 Dapper Ash"
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Year</label>
                  <input
                    type="number"
                    value={newBikeYear}
                    onChange={(e) => setNewBikeYear(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Registration (RC)</label>
                  <input
                    type="text"
                    required
                    value={newBikeReg}
                    onChange={(e) => setNewBikeReg(e.target.value.toUpperCase())}
                    placeholder="e.g. MH 12 PQ 9901"
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Category</label>
                  <select
                    value={newBikeCategory}
                    onChange={(e) => setNewBikeCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100"
                  >
                    <option value="Cruiser">Cruiser</option>
                    <option value="Sport">Sport</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Street Naked">Street Naked</option>
                    <option value="Commuter">Commuter</option>
                    <option value="Electric">Electric</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    value={newBikePurchase}
                    onChange={(e) => setNewBikePurchase(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Refurb Cost (₹)</label>
                  <input
                    type="number"
                    value={newBikeRefurb}
                    onChange={(e) => setNewBikeRefurb(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Target Selling Price (₹)</label>
                  <input
                    type="number"
                    value={newBikeSelling}
                    onChange={(e) => setNewBikeSelling(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex justify-between font-mono text-xs">
                <span>Calculated Gross Margin:</span>
                <span className="text-emerald-400 font-bold">
                  ₹{(newBikeSelling - (newBikePurchase + newBikeRefurb)).toLocaleString('en-IN')} (
                  {((newBikeSelling - (newBikePurchase + newBikeRefurb)) / newBikeSelling * 100).toFixed(1)}%)
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm"
              >
                Add Bike to Showroom Inventory
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE JOB CARD MODAL */}
      {showAddJobModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-lg font-bold font-display text-neutral-100">
                Open Walk-in Service Job Card
              </h3>
              <button
                onClick={() => setShowAddJobModal(false)}
                className="text-xs px-2.5 py-1 rounded bg-neutral-800 text-neutral-300 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateJobCard} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={newJobCustomer}
                    onChange={(e) => setNewJobCustomer(e.target.value)}
                    placeholder="e.g. Anand Deshmukh"
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Customer Phone</label>
                  <input
                    type="tel"
                    required
                    value={newJobPhone}
                    onChange={(e) => setNewJobPhone(e.target.value)}
                    placeholder="+91 98200 55432"
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Bike Reg Number</label>
                  <input
                    type="text"
                    required
                    value={newJobReg}
                    onChange={(e) => setNewJobReg(e.target.value.toUpperCase())}
                    placeholder="e.g. MH 12 AB 4589"
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Bike Model</label>
                  <input
                    type="text"
                    value={newJobBikeModel}
                    onChange={(e) => setNewJobBikeModel(e.target.value)}
                    placeholder="e.g. Royal Enfield Classic 350"
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Service Package</label>
                  <select
                    value={newJobServiceType}
                    onChange={(e) => setNewJobServiceType(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100"
                  >
                    <option value="Routine Maintenance">Routine Maintenance</option>
                    <option value="Full Engine Tune-Up">Full Engine Tune-Up</option>
                    <option value="Brake Overhaul">Brake Overhaul</option>
                    <option value="Pre-Purchase Inspection">Pre-Purchase Inspection</option>
                    <option value="Crash Repair">Crash Repair</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Assign Technician</label>
                  <select
                    value={newJobTech}
                    onChange={(e) => setNewJobTech(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100"
                  >
                    <option value="Vikram Shinde (Master Tech)">Vikram Shinde (Master Tech)</option>
                    <option value="Sanjay Rawat">Sanjay Rawat</option>
                    <option value="Anand Patel">Anand Patel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Customer Reported Complaints</label>
                <textarea
                  rows={2}
                  value={newJobIssue}
                  onChange={(e) => setNewJobIssue(e.target.value)}
                  placeholder="e.g. Hard starting, chain slack, rear brake squeak"
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm"
              >
                Log Intake & Issue Job Card
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD PART TO JOB CARD MODAL */}
      {selectedJobForPart && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold font-display text-neutral-100">
                Add Spare Part to Job Card
              </h3>
              <button
                onClick={() => setSelectedJobForPart(null)}
                className="text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-300 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddPartToJob} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Select Spare Part from Inventory</label>
                <select
                  value={partToAddId}
                  onChange={(e) => setPartToAddId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100"
                >
                  {spares.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.brand}) — ₹{s.sellingPrice} (Stock: {s.stockQuantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={partToAddQty}
                  onChange={(e) => setPartToAddQty(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono"
                />
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-400 text-[11px]">
                Adding this part will automatically deduct {partToAddQty} unit(s) from shop inventory and add it to the final customer invoice.
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm"
              >
                Confirm & Deduct Inventory
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
