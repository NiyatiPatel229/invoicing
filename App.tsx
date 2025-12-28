import React, { useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logout as firebaseLogout } from './firebase';
import Layout from './components/Layout';
import InvoiceForm from './components/InvoiceForm';
import InvoiceList from './components/InvoiceList';
import InvoicePrintTemplate from './components/InvoicePrintTemplate';
import { invoiceService } from './services/invoiceService';
import { Invoice, InvoiceItem, GuestUser } from './types';
import { FileText, LogIn, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

const GUEST_USER: GuestUser = {
  uid: 'guest_session',
  displayName: 'Guest User',
  isGuest: true
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | GuestUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('history');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [guestInvoices, setGuestInvoices] = useState<(Invoice & { items: InvoiceItem[] })[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<(Invoice & { items: InvoiceItem[] }) | null>(null);
  const [autoPrintMode, setAutoPrintMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async (uid: string) => {
    if (uid === 'guest_session') return;
    
    setInvoicesLoading(true);
    try {
      const data = await invoiceService.getInvoices(uid);
      console.log('Fetched invoices:', data); // Debug log
      setInvoices(data);
    } catch (error: any) {
      console.error("Fetch Error:", error);
    } finally {
      setInvoicesLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchInvoices(currentUser.uid);
      } else {
        setUser(prev => (prev && 'isGuest' in prev) ? prev : null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchInvoices]);

  const handleLogin = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle();
      setActiveTab('history');
    } catch (error: any) {
      setAuthError(error.message || "Login failed.");
    }
  };

  const handleGuestLogin = () => {
    setUser(GUEST_USER);
    setActiveTab('create');
  };

  const handleLogout = async () => {
    if (user && 'isGuest' in user) {
      setUser(null);
      setGuestInvoices([]);
    } else {
      await firebaseLogout();
    }
    setSelectedInvoice(null);
  };

  const handleInvoiceSuccess = async (invoiceId: string, guestData?: any) => {
    if (!user) return;

    // Don't auto-print on generation - just show preview
    setAutoPrintMode(false);

    if ('isGuest' in user && guestData) {
      const currentYearShort = new Date().getFullYear().toString().slice(-2);
      const paddedNumber = (guestInvoices.length + 1).toString().padStart(3, '0');
      const invoiceNumber = `BILL/${currentYearShort}/${paddedNumber}`;

      const newInvoice: Invoice & { items: InvoiceItem[] } = {
        id: invoiceId,
        invoiceNumber,
        ...guestData,
        createdAt: new Date(),
        userId: user.uid
      };

      setGuestInvoices([newInvoice, ...guestInvoices]);
      setSelectedInvoice(newInvoice);
    } else if (!('isGuest' in user)) {
      const details = await invoiceService.getInvoiceDetails(invoiceId);
      setSelectedInvoice(details);
      // Refresh the invoices list immediately after creation
      await fetchInvoices(user.uid);
    }
  };

  const handleViewInvoice = async (invoice: Invoice, shouldPrint: boolean = false) => {
    setAutoPrintMode(shouldPrint);
    
    if (user && 'isGuest' in user) {
      const guestInv = guestInvoices.find(i => i.id === invoice.id);
      if (guestInv) setSelectedInvoice(guestInv);
      return;
    }

    setInvoicesLoading(true);
    try {
      const details = await invoiceService.getInvoiceDetails(invoice.id);
      setSelectedInvoice(details);
    } catch (error) {
      alert("Error loading invoice details.");
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleCloseInvoice = () => {
    setSelectedInvoice(null);
    setAutoPrintMode(false);
    // Refresh invoices when closing preview
    if (user && !('isGuest' in user)) {
      fetchInvoices(user.uid);
    }
  };

  const handleTabChange = (tab: 'create' | 'history') => {
    setSelectedInvoice(null);
    setAutoPrintMode(false);
    setActiveTab(tab);
    
    // Fetch invoices when switching to history tab
    if (tab === 'history' && user && !('isGuest' in user)) {
      fetchInvoices(user.uid);
    }
  };
const handleDeleteInvoice = async (invoice: Invoice) => {
  if (!user) return;

  const confirmed = window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`);
  if (!confirmed) return;

  try {
    if ('isGuest' in user) {
      // Delete from guest invoices
      setGuestInvoices(guestInvoices.filter(inv => inv.id !== invoice.id));
    } else {
      // Delete from Firebase
      await invoiceService.deleteInvoice(invoice.id, user.uid);
      await fetchInvoices(user.uid);
    }
  } catch (error: any) {
    alert(error.message || 'Failed to delete invoice');
  }
};

const handleEditInvoiceNumber = async (invoice: Invoice, newNumber: string) => {
  if (!user) return;

  try {
    if ('isGuest' in user) {
      // Update guest invoices
      const existingInvoice = guestInvoices.find(
        inv => inv.invoiceNumber === newNumber && inv.id !== invoice.id
      );
      
      if (existingInvoice) {
        alert('Invoice number already exists. Please use a different number.');
        return;
      }

      setGuestInvoices(guestInvoices.map(inv => 
        inv.id === invoice.id ? { ...inv, invoiceNumber: newNumber } : inv
      ));
    } else {
      // Update in Firebase
      await invoiceService.updateInvoiceNumber(invoice.id, user.uid, newNumber);
      await fetchInvoices(user.uid);
    }
  } catch (error: any) {
    if (error.message === 'Invoice number already exists') {
      alert('This invoice number already exists in your history. Please use a different number.');
    } else {
      alert(error.message || 'Failed to update invoice number');
    }
  }
};

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-gray-900 mb-4 tracking-tight">
              PROINVOICE
            </h1>
            <p className="text-xl text-gray-600 font-medium">FAST.SECURE.CLEAN.</p>
            <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
              The only invoicing tool you need for professional business billing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <ShieldCheck className="w-10 h-10 text-green-600 mb-3" />
              <h3 className="font-semibold text-lg mb-2">Encrypted</h3>
              <p className="text-gray-600 text-sm">Your data is protected with industry-standard encryption.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <FileText className="w-10 h-10 text-blue-600 mb-3" />
              <h3 className="font-semibold text-lg mb-2">Cloud Sync</h3>
              <p className="text-gray-600 text-sm">Access your invoices from anywhere, anytime.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center mb-6">
              <LogIn className="w-8 h-8 text-gray-700 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Login</h2>
            </div>
            <p className="text-center text-gray-600 mb-8">
              Choose your workspace mode to continue.
            </p>

            {authError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 text-sm">{authError}</p>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleLogin}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md"
              >
                Google Workspace
              </button>
              <button
                onClick={handleGuestLogin}
                className="w-full bg-gray-800 text-white py-4 rounded-lg font-semibold hover:bg-gray-900 transition shadow-md"
              >
                Local Guest Session
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout
      user={user}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onLogout={handleLogout}
    >
      {selectedInvoice ? (
        <InvoicePrintTemplate
          invoice={selectedInvoice}
          onClose={handleCloseInvoice}
          autoPrint={autoPrintMode}
        />
      ) : activeTab === 'create' ? (
        <InvoiceForm user={user} onSuccess={handleInvoiceSuccess} />
      ) : (
        <InvoiceList
  invoices={'isGuest' in user ? guestInvoices : invoices}
  onSelect={(inv) => handleViewInvoice(inv, false)}
  onDownload={(inv) => handleViewInvoice(inv, true)}
  onDelete={handleDeleteInvoice}
  onEditInvoiceNumber={handleEditInvoiceNumber}
  loading={invoicesLoading}
/>
      )}
    </Layout>
  );
  
};

export default App;
