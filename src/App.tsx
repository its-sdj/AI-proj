import React, { useState } from 'react';
import { Header, ActiveTab } from './components/Header';
import { BikeCatalog } from './components/BikeCatalog';
import { SparesCatalog } from './components/SparesCatalog';
import { ServiceTracker } from './components/ServiceTracker';
import { ServiceBookingModal } from './components/ServiceBookingModal';
import { CartDrawer } from './components/CartDrawer';
import { AdminDashboard } from './components/AdminDashboard';
import {
  INITIAL_BIKES,
  INITIAL_SPARES,
  INITIAL_JOB_CARDS,
  INITIAL_CUSTOMER_PROFILES,
} from './data/mockData';
import { Bike, SparePart, JobCard, CustomerVehicleProfile, CartItem, ServiceBookingFormData } from './types';
import { calculateAutomatedServiceAlerts, calculateStockAging } from './utils/calculations';
import { Phone, MapPin, Clock, ShieldCheck, Wrench, Sparkles, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('bikes');
  const [bikes, setBikes] = useState<Bike[]>(INITIAL_BIKES);
  const [spares, setSpares] = useState<SparePart[]>(INITIAL_SPARES);
  const [jobCards, setJobCards] = useState<JobCard[]>(INITIAL_JOB_CARDS);
  const [customerProfiles, setCustomerProfiles] = useState<CustomerVehicleProfile[]>(INITIAL_CUSTOMER_PROFILES);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { part: INITIAL_SPARES[0], quantity: 1 },
  ]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Service Booking Modal State
  const [isServiceBookingOpen, setIsServiceBookingOpen] = useState(false);

  // Toast banner for user feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Cart operations
  const handleAddToCart = (part: SparePart) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.part.id === part.id);
      if (existing) {
        return prev.map((i) =>
          i.part.id === part.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { part, quantity: 1 }];
    });
    showToast(`Added ${part.name} to your shopping bag.`);
  };

  const handleUpdateCartQuantity = (partId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.part.id === partId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (partId: string) => {
    setCartItems((prev) => prev.filter((i) => i.part.id !== partId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Bike actions
  const handleBookTestRide = (bike: Bike, date: string, time: string, name: string, phone: string) => {
    setBikes((prev) =>
      prev.map((b) => (b.id === bike.id ? { ...b, stockStatus: 'Test Ride Booked' } : b))
    );
    showToast(`Test ride for ${bike.model} confirmed on ${date} at ${time}. Confirmation sent to ${phone}.`);
  };

  const handleReserveBike = (bike: Bike, tokenAmount: number) => {
    setBikes((prev) =>
      prev.map((b) => (b.id === bike.id ? { ...b, stockStatus: 'Test Ride Booked' } : b))
    );
    showToast(`Vehicle ${bike.model} reserved with token ₹${tokenAmount.toLocaleString('en-IN')}. 48-hour hold placed!`);
  };

  // Customer submits a new service booking
  const handleNewServiceBooking = (formData: ServiceBookingFormData) => {
    const newJob: JobCard = {
      id: `jc-${Date.now()}`,
      jobNumber: `JC-2026-${Math.floor(110 + Math.random() * 50)}`,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail || 'customer@example.com',
      bikeRegNumber: formData.bikeRegNumber.toUpperCase(),
      bikeModel: formData.bikeModel || 'Customer 2-Wheeler',
      currentKm: formData.currentKm,
      serviceType: formData.serviceType as any,
      technicianName: 'Vikram Shinde (Master Tech)',
      status: 'INSPECTION',
      reportedIssues: formData.complaints ? [formData.complaints] : ['Scheduled routine servicing'],
      mechanicNotes: 'Vehicle intake appointment registered. Bay slot reserved.',
      partsUsed: [],
      laborCharges: 650,
      discount: 0,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      estimatedDelivery: `${formData.preferredDate} ${formData.preferredTimeSlot}`,
      paidStatus: 'Pending',
    };

    setJobCards((prev) => [newJob, ...prev]);

    // Check if profile exists, otherwise create one
    const existing = customerProfiles.find(
      (p) => p.regNumber.toUpperCase() === formData.bikeRegNumber.toUpperCase()
    );
    if (!existing) {
      const newProfile: CustomerVehicleProfile = {
        regNumber: formData.bikeRegNumber.toUpperCase(),
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail || 'customer@example.com',
        bikeMake: formData.bikeModel.split(' ')[0] || 'Motorcycle',
        bikeModel: formData.bikeModel,
        year: 2023,
        currentKm: formData.currentKm,
        lastServiceDate: '2026-06-01',
        lastServiceKm: Math.max(0, formData.currentKm - 3200),
        insuranceExpiryDate: '2027-04-15',
        activeJobCardId: newJob.id,
        pastServices: [],
      };
      setCustomerProfiles((prev) => [newProfile, ...prev]);
    }

    showToast(`Service appointment booked for ${formData.bikeRegNumber} on ${formData.preferredDate}.`);
  };

  // Calculate alert count for admin header indicator
  const unreadAlertCount =
    customerProfiles.filter((p) => {
      const res = calculateAutomatedServiceAlerts({
        lastServiceDate: p.lastServiceDate,
        currentKm: p.currentKm,
        lastServiceKm: p.lastServiceKm,
        insuranceExpiryDate: p.insuranceExpiryDate,
      });
      return res.serviceDueStatus !== 'NORMAL' || res.insuranceStatus !== 'VALID';
    }).length +
    bikes.filter((b) => {
      const aging = calculateStockAging(b.dateAdded);
      return aging.agingCategory === 'SLOW' || aging.agingCategory === 'CRITICAL';
    }).length +
    spares.filter((s) => s.stockQuantity <= s.reorderLevel).length;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-xl bg-neutral-900 border border-amber-500/50 shadow-2xl flex items-center gap-3 text-xs text-neutral-100 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="font-medium leading-relaxed">{toastMessage}</div>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cartItems.reduce((s, i) => s + i.quantity, 0)}
        openCart={() => setIsCartOpen(true)}
        unreadAlertCount={unreadAlertCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'bikes' && (
          <BikeCatalog
            bikes={bikes}
            onBookTestRide={handleBookTestRide}
            onReserveBike={handleReserveBike}
          />
        )}

        {activeTab === 'spares' && (
          <SparesCatalog
            spares={spares}
            onAddToCart={handleAddToCart}
            cartItemIds={new Set(cartItems.map((i) => i.part.id))}
          />
        )}

        {activeTab === 'track' && (
          <ServiceTracker
            customerProfiles={customerProfiles}
            jobCards={jobCards}
            onBookServiceClick={() => setIsServiceBookingOpen(true)}
          />
        )}

        {activeTab === 'book' && (
          <div className="max-w-2xl mx-auto py-8">
            <div className="mb-6 text-center space-y-1">
              <div className="text-xs font-mono text-amber-400">Workshop Intake Desk</div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-neutral-100">
                Book 2-Wheeler Service & Inspection
              </h1>
              <p className="text-xs text-neutral-400">
                Choose routine maintenance, engine tuning, brake overhaul or pre-purchase checkup.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
              <ServiceBookingModal
                isOpen={true}
                onClose={() => setActiveTab('track')}
                onSubmitBooking={(data) => {
                  handleNewServiceBooking(data);
                  setActiveTab('track');
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            bikes={bikes}
            setBikes={setBikes}
            spares={spares}
            setSpares={setSpares}
            jobCards={jobCards}
            setJobCards={setJobCards}
            customerProfiles={customerProfiles}
            setCustomerProfiles={setCustomerProfiles}
          />
        )}
      </main>

      {/* Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
      />

      {/* Booking Modal Overlay when triggered from Tracker or button */}
      <ServiceBookingModal
        isOpen={isServiceBookingOpen}
        onClose={() => setIsServiceBookingOpen(false)}
        onSubmitBooking={handleNewServiceBooking}
      />

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-950 mt-16 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="text-lg font-bold font-display text-neutral-100 flex items-center gap-1.5">
              <span>MotoCraft Motors & Workshop</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Authorized pre-owned two-wheeler showroom and multi-brand service center. Certified 40-point vehicle inspections and genuine OEM spare parts.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-300 font-mono">
              Workshop Bays
            </div>
            <div className="flex items-start gap-2 text-neutral-400">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Plot 42, Automobile Hub, Old Pune-Mumbai Highway, Wakad, Pune, 411057</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-400 pt-1">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Mon - Sun: 08:30 AM – 08:00 PM</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-300 font-mono">
              Direct Contact
            </div>
            <div className="flex items-center gap-2 text-neutral-400">
              <Phone className="w-4 h-4 text-amber-400 shrink-0" />
              <span>+91 98231 00042 / +91 020 6712 3456</span>
            </div>
            <div className="text-neutral-400 pt-1">
              WhatsApp Support: +91 98231 00043
            </div>
            <div className="text-neutral-500 font-mono text-[11px]">
              GSTIN: 27AABCM9102K1Z9
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-300 font-mono">
              Workshop Assurances
            </div>
            <div className="space-y-1 text-neutral-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>6 Months / 5,000 km Warranty</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Guaranteed RC Transfer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                <span>OEM Certified Mechanics</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-900 py-4 text-center text-neutral-600 font-mono text-[11px]">
          © {new Date().getFullYear()} MotoCraft 2-Wheeler Motors & Service Hub. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
