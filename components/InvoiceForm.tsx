
import React, { useState, useMemo } from 'react';
import { Trash2, Plus, Send, Loader2, Coins, AlertCircle, Percent, Banknote } from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { User } from 'firebase/auth';
import { GuestUser, InvoiceItem } from '../types';

interface InvoiceFormProps {
  user: User | GuestUser;
  onSuccess: (invoiceId: string, guestData?: any) => void;
}

interface FormItem {
  description: string;
  quantity: string;
  price: string;
}

const PREDEFINED_ITEMS = [
  "TV Unit", "PVC Sheet", "Wall Paneling", "Kitchen Cabinet", "False Ceiling", 
  "Wardrobe", "Study Table", "Shoe Rack", "Modular Kitchen", "Loft", 
  "Crockery Unit", "Pooja Room"
];

const CURRENCIES = [
  { label: 'Rupee (₹)', value: '₹' },
  { label: 'Dollar ($)', value: '$' }
];

const InvoiceForm: React.FC<InvoiceFormProps> = ({ user, onSuccess }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('percentage');
  const [discountValue, setDiscountValue] = useState('0');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<FormItem[]>([{ description: '', quantity: '1', price: '0' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    setItems([...items, { description: '', quantity: '1', price: '0' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof FormItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const totals = useMemo(() => {
    const subTotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0);
    const dVal = Number(discountValue) || 0;
    const discountAmount = discountType === 'percentage' ? (subTotal * (dVal / 100)) : dVal;
    const grandTotal = Math.max(0, subTotal - discountAmount);
    return { subTotal, discountAmount, grandTotal };
  }, [items, discountType, discountValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!customerName || items.some(i => !i.description)) {
      setError("Please fill in customer name and all item descriptions.");
      return;
    }

    setIsSubmitting(true);
    try {
      const isGuest = 'isGuest' in user;
      const formattedItems = items.map(i => ({ 
        description: i.description, 
        quantity: Number(i.quantity), 
        price: Number(i.price),
        total: Number(i.quantity) * Number(i.price)
      }));

      if (isGuest) {
        onSuccess(`guest_${Date.now()}`, {
          customerName,
          customerAddress,
          customerPhone,
          invoiceDate,
          currencySymbol,
          discountType,
          discountValue: Number(discountValue),
          subTotal: totals.subTotal,
          discountAmount: totals.discountAmount,
          items: formattedItems,
          grandTotal: totals.grandTotal
        });
      } else {
        const id = await invoiceService.createInvoice(
          user.uid,
          customerName,
          invoiceDate,
          formattedItems,
          discountType,
          Number(discountValue),
          customerAddress,
          customerPhone,
          currencySymbol
        );
        onSuccess(id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200 no-print">
      <div className="flex justify-between items-start mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Plus className="w-6 h-6" /> New Invoice
        </h2>
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">Currency</label>
          <select 
            value={currencySymbol}
            onChange={(e) => setCurrencySymbol(e.target.value)}
            className="text-sm font-bold border border-gray-300 rounded px-2 py-1 outline-none"
          >
            {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-600 text-red-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <input
              type="text"
              required
              placeholder="Customer Name"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-black outline-none transition"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <textarea
              placeholder="Customer Address"
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-black outline-none transition resize-none"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
            />
            <input
              type="tel"
              placeholder="Customer Phone"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-black outline-none transition"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
          <input
            type="date"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-black outline-none transition h-fit"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-black text-xs font-bold uppercase tracking-widest text-gray-500">
                <th className="py-3 px-2">Description</th>
                <th className="py-3 px-2 w-20 text-center">Qty</th>
                <th className="py-3 px-2 w-32 text-right">Price</th>
                <th className="py-3 px-2 w-32 text-right">Total</th>
                <th className="py-3 px-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, index) => (
                <tr key={index} className="group">
                  <td className="py-3 px-2">
                    <input
                      list="item-suggestions"
                      type="text"
                      placeholder="Enter item name..."
                      required
                      className="w-full bg-transparent border-b border-transparent group-hover:border-gray-200 focus:border-black outline-none transition py-1"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      min="1"
                      className="w-full bg-transparent text-center border-b border-transparent group-hover:border-gray-200 focus:border-black outline-none transition py-1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-transparent text-right border-b border-transparent group-hover:border-gray-200 focus:border-black outline-none transition py-1"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', e.target.value)}
                    />
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-sm">
                    {currencySymbol}{(Number(item.quantity) * Number(item.price)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)} className="text-gray-300 hover:text-red-500 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <datalist id="item-suggestions">
          {PREDEFINED_ITEMS.map(item => <option key={item} value={item} />)}
        </datalist>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
          <div>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded transition text-xs uppercase tracking-widest"
            >
              <Plus className="w-4 h-4" /> Add Line Item
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-gray-500 text-sm font-medium">
              <span>Subtotal</span>
              <span className="font-mono">{currencySymbol}{totals.subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-grow flex items-center bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                <button
                  type="button"
                  onClick={() => setDiscountType('percentage')}
                  className={`p-2 transition ${discountType === 'percentage' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'}`}
                >
                  <Percent className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('fixed')}
                  className={`p-2 transition ${discountType === 'fixed' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'}`}
                >
                  <Banknote className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Discount"
                  className="w-full bg-transparent px-3 py-1 outline-none text-right font-mono text-sm"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
              <div className="w-32 text-right text-red-500 text-sm font-bold font-mono">
                -{currencySymbol}{totals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t-2 border-black">
              <span className="text-sm font-black uppercase tracking-widest">Grand Total</span>
              <span className="text-3xl font-black font-mono">
                {currencySymbol}{totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-black text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-gray-800 disabled:bg-gray-300 transition shadow-xl"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Generate Invoice</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;
