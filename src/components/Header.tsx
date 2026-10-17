import React from 'react';
import { ShoppingBag, Wrench, Menu, X, ShieldCheck } from 'lucide-react';

export type ActiveTab = 'bikes' | 'spares' | 'track' | 'book' | 'admin';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  cartCount: number;
  openCart: () => void;
  unreadAlertCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  openCart,
  unreadAlertCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navLinks: { id: ActiveTab; label: string }[] = [
    { id: 'bikes', label: 'Buy Bikes' },
    { id: 'spares', label: 'Buy Spares' },
    { id: 'track', label: 'Track Service' },
    { id: 'book', label: 'Book Service' },
    { id: 'admin', label: 'Admin Portal' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => {
            setActiveTab('bikes');
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-2.5 text-left text-neutral-100 hover:opacity-90 transition-opacity shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center font-black text-lg tracking-tighter">
            MC
          </div>
          <span className="text-xl font-bold font-display tracking-tight text-neutral-100 whitespace-nowrap">
            MotoCraft<span className="text-amber-500">.</span>
          </span>
        </button>

        {/* Zone 2: 4–5 single-line clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`transition-colors whitespace-nowrap py-1 relative ${
                  isActive
                    ? 'text-amber-400 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {link.label}
                {link.id === 'admin' && unreadAlertCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-mono rounded bg-rose-950 text-rose-300 border border-rose-800/80">
                    {unreadAlertCount}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-amber-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary action & Cart */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Cart Icon Button */}
          <button
            onClick={openCart}
            aria-label={`Shopping Cart with ${cartCount} items`}
            className="relative p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-neutral-950 font-bold text-xs rounded-full flex items-center justify-center shadow-sm">
                {cartCount}
              </span>
            )}
          </button>

          {/* Quick switch button between Customer & Workshop Admin */}
          <button
            onClick={() => setActiveTab(activeTab === 'admin' ? 'bikes' : 'admin')}
            className={`hidden sm:flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
              activeTab === 'admin'
                ? 'bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800'
                : 'bg-amber-500 border-amber-400 text-neutral-950 hover:bg-amber-400 shadow-sm'
            }`}
          >
            {activeTab === 'admin' ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Customer View</span>
              </>
            ) : (
              <>
                <Wrench className="w-4 h-4 text-neutral-950" />
                <span>Shop Admin</span>
              </>
            )}
          </button>

          {/* Mobile menu hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            className="md:hidden p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-neutral-950 border-b border-neutral-800 px-4 pt-3 pb-5 space-y-2">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                setActiveTab(link.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between ${
                activeTab === link.id
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-neutral-300 hover:bg-neutral-900'
              }`}
            >
              <span>{link.label}</span>
              {link.id === 'admin' && unreadAlertCount > 0 && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                  {unreadAlertCount} Alerts
                </span>
              )}
            </button>
          ))}

          <div className="pt-2 border-t border-neutral-800/80">
            <button
              onClick={() => {
                setActiveTab(activeTab === 'admin' ? 'bikes' : 'admin');
                setMobileMenuOpen(false);
              }}
              className="w-full py-2.5 px-3 text-center text-xs font-semibold rounded-lg bg-neutral-900 text-neutral-200 border border-neutral-700 hover:bg-neutral-800"
            >
              {activeTab === 'admin' ? 'Switch to Customer View' : 'Open Shop Admin Dashboard'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
