import React, { useState } from 'react';
import { CartItem } from '../types';
import { X, Trash2, Plus, Minus, CheckCircle2, ShoppingBag, Truck, Store } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (partId: string, delta: number) => void;
  onRemoveItem: (partId: string) => void;
  onClearCart: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  const [deliveryMode, setDeliveryMode] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI'>('UPI');
  const [orderConfirmed, setOrderConfirmed] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.part.sellingPrice * item.quantity, 0);
  const shippingFee = deliveryMode === 'PICKUP' || subtotal >= 1500 || subtotal === 0 ? 0 : 99;
  const grandTotal = subtotal + shippingFee;

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) return;

    const orderId = `MC-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    setOrderConfirmed(orderId);
    onClearCart();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-neutral-900 border-l border-neutral-800 h-full flex flex-col justify-between shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-neutral-100 font-display">Genuine Spares Cart</h2>
            <span className="text-xs font-mono text-neutral-400">({items.length} items)</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart drawer"
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {orderConfirmed ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold font-display text-neutral-100">Order Confirmed!</h3>
              <p className="text-xs text-neutral-400">Order Reference ID</p>
              <div className="text-base font-mono font-bold text-amber-400 bg-neutral-950 border border-neutral-800 py-2 px-4 rounded-lg inline-block">
                {orderConfirmed}
              </div>
              <p className="text-xs text-neutral-300 max-w-xs mx-auto leading-relaxed">
                Thank you, {customerName}! We have dispatched order confirmation to {customerPhone}.
                {deliveryMode === 'PICKUP'
                  ? ' Your spare parts will be ready at the workshop counter in 30 minutes.'
                  : ' Estimated delivery in 24-48 business hours.'}
              </p>
              <button
                onClick={() => {
                  setOrderConfirmed(null);
                  onClose();
                }}
                className="mt-4 px-6 py-2.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700"
              >
                Continue Shopping
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="text-sm text-neutral-300">Your shopping bag is empty.</p>
              <p className="text-xs text-neutral-500">
                Browse our workshop catalog for OEM oils, brake pads, chain kits, and accessories.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Itemized List */}
              <div className="space-y-3">
                {items.map(({ part, quantity }) => (
                  <div
                    key={part.id}
                    className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono text-neutral-400">{part.brand} · SKU: {part.sku}</div>
                      <div className="font-semibold text-neutral-200 truncate mt-0.5">{part.name}</div>
                      <div className="font-mono text-amber-400 font-bold mt-1">
                        ₹{part.sellingPrice.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        onClick={() => onRemoveItem(part.id)}
                        aria-label={`Remove ${part.name}`}
                        className="text-neutral-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex items-center border border-neutral-700 rounded-md overflow-hidden bg-neutral-900">
                        <button
                          onClick={() => onUpdateQuantity(part.id, -1)}
                          aria-label="Decrease quantity"
                          className="px-2 py-1 text-neutral-300 hover:bg-neutral-800"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono text-xs font-semibold text-neutral-100">
                          {quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(part.id, 1)}
                          disabled={quantity >= part.stockQuantity}
                          aria-label="Increase quantity"
                          className="px-2 py-1 text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Option Toggle */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-neutral-300 mb-2">Fulfillment Method</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('DELIVERY')}
                    className={`p-2.5 rounded-lg border flex items-center justify-center gap-2 transition-colors ${
                      deliveryMode === 'DELIVERY'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-semibold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>Courier Delivery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('PICKUP')}
                    className={`p-2.5 rounded-lg border flex items-center justify-center gap-2 transition-colors ${
                      deliveryMode === 'PICKUP'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-semibold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    <span>Shop Pickup (Free)</span>
                  </button>
                </div>
              </div>

              {/* Customer Details Form */}
              <form id="checkout-form" onSubmit={handleCheckout} className="space-y-3 pt-2 text-xs">
                <div>
                  <label className="block text-neutral-400 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ramesh Patil"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Mobile Number (for SMS & OTP)</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98201 12345"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {deliveryMode === 'DELIVERY' && (
                  <div>
                    <label className="block text-neutral-400 mb-1">Shipping Address & Pin Code</label>
                    <textarea
                      required
                      rows={2}
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Street, locality, city and postal pin code"
                      className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-neutral-400 mb-1">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('UPI')}
                      className={`p-2 rounded-lg border text-center transition-colors ${
                        paymentMethod === 'UPI'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-semibold'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      Instant UPI / QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('COD')}
                      className={`p-2 rounded-lg border text-center transition-colors ${
                        paymentMethod === 'COD'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-semibold'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      Cash on Delivery
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer with Subtotal & Place Order */}
        {!orderConfirmed && items.length > 0 && (
          <div className="p-5 border-t border-neutral-800 bg-neutral-950 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Subtotal</span>
                <span className="font-mono text-neutral-200">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Shipping</span>
                <span className="font-mono text-neutral-200">
                  {shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}
                </span>
              </div>
              {subtotal < 1500 && deliveryMode === 'DELIVERY' && (
                <div className="text-[11px] text-amber-400">
                  Add ₹{(1500 - subtotal).toLocaleString('en-IN')} more for free courier delivery
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-neutral-100 pt-2 border-t border-neutral-800">
                <span>Total Amount</span>
                <span className="font-mono text-amber-400 text-base">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              className="w-full py-3 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm"
            >
              Place Order · ₹{grandTotal.toLocaleString('en-IN')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
