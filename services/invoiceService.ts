import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  runTransaction,
  Timestamp,
  where,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Invoice, InvoiceItem, InvoiceCounter } from '../types';

const INVOICES_COLLECTION = 'invoices';
const COUNTERS_COLLECTION = 'counters';
const ITEMS_SUBCOLLECTION = 'items';

export const invoiceService = {
  async createInvoice(
    userId: string,
    customerName: string,
    invoiceDate: string,
    items: Omit<InvoiceItem, 'id'>[],
    discountType: 'fixed' | 'percentage',
    discountValue: number,
    customerAddress?: string,
    customerPhone?: string,
    currencySymbol: string = '₹'
  ): Promise<string> {
    const calculatedItems = items.map(item => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      price: Number(item.price) || 0,
      total: (Number(item.quantity) || 0) * (Number(item.price) || 0)
    }));

    const subTotal = calculatedItems.reduce((acc, curr) => acc + curr.total, 0);
    const discountAmount = discountType === 'percentage'
      ? (subTotal * (discountValue / 100))
      : discountValue;
    const grandTotal = Math.max(0, subTotal - discountAmount);

    try {
      return await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, COUNTERS_COLLECTION, 'invoices');
        const counterDoc = await transaction.get(counterRef);
        let nextNumber = 1;

        if (counterDoc.exists()) {
          const data = counterDoc.data() as InvoiceCounter;
          nextNumber = (Number(data.lastInvoiceNumber) || 0) + 1;
        }

        const currentYearShort = new Date().getFullYear().toString().slice(-2);
        const paddedNumber = nextNumber.toString().padStart(3, '0');
        const invoiceNumber = `BILL/${currentYearShort}/${paddedNumber}`;

        const newInvoiceRef = doc(collection(db, INVOICES_COLLECTION));

        transaction.set(newInvoiceRef, {
          invoiceNumber,
          invoiceDate,
          customerName: customerName || 'Unknown Customer',
          customerAddress: customerAddress || '',
          customerPhone: customerPhone || '',
          currencySymbol,
          subTotal,
          discountType,
          discountValue,
          discountAmount,
          grandTotal,
          createdAt: Timestamp.now(),
          userId
        });

        calculatedItems.forEach((item) => {
          const itemRef = doc(collection(newInvoiceRef, ITEMS_SUBCOLLECTION));
          transaction.set(itemRef, item);
        });

        transaction.set(counterRef, { lastInvoiceNumber: nextNumber });

        console.log('Invoice created successfully:', newInvoiceRef.id, 'for userId:', userId);
        return newInvoiceRef.id;
      });
    } catch (error) {
      console.error("Firestore Transaction Failed:", error);
      throw error;
    }
  },

  async getInvoices(userId: string): Promise<Invoice[]> {
    console.log('Fetching invoices for userId:', userId);
    
    try {
      const q = query(
        collection(db, INVOICES_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const invoices = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Invoice));
      
      console.log('Fetched invoices count:', invoices.length);
      return invoices;
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.error('🔴 FIRESTORE INDEX REQUIRED!');
        console.log('Attempting fallback query without ordering...');
        
        try {
          const fallbackQuery = query(
            collection(db, INVOICES_COLLECTION),
            where('userId', '==', userId)
          );
          const fallbackSnapshot = await getDocs(fallbackQuery);
          const fallbackInvoices = fallbackSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          } as Invoice));
          
          fallbackInvoices.sort((a, b) => {
            const aTime = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
            const bTime = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
            return bTime - aTime;
          });
          
          return fallbackInvoices;
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
        }
      }
      
      throw error;
    }
  },

  async getInvoiceDetails(invoiceId: string): Promise<Invoice & { items: InvoiceItem[] }> {
    console.log('Fetching invoice details for:', invoiceId);
    
    const invoiceDoc = await getDoc(doc(db, INVOICES_COLLECTION, invoiceId));
    if (!invoiceDoc.exists()) {
      throw new Error("Invoice not found");
    }

    const itemsSnapshot = await getDocs(
      collection(db, INVOICES_COLLECTION, invoiceId, ITEMS_SUBCOLLECTION)
    );
    const items = itemsSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as InvoiceItem));

    return {
      id: invoiceDoc.id,
      ...invoiceDoc.data(),
      items
    } as Invoice & { items: InvoiceItem[] };
  },

  async deleteInvoice(invoiceId: string, userId: string): Promise<void> {
    try {
      const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
      const invoiceDoc = await getDoc(invoiceRef);

      if (!invoiceDoc.exists()) {
        throw new Error("Invoice not found");
      }

      // Verify ownership
      if (invoiceDoc.data().userId !== userId) {
        throw new Error("Unauthorized to delete this invoice");
      }

      // Delete all items in the subcollection
      const itemsSnapshot = await getDocs(
        collection(db, INVOICES_COLLECTION, invoiceId, ITEMS_SUBCOLLECTION)
      );
      
      const deletePromises = itemsSnapshot.docs.map(itemDoc => 
        deleteDoc(doc(db, INVOICES_COLLECTION, invoiceId, ITEMS_SUBCOLLECTION, itemDoc.id))
      );
      await Promise.all(deletePromises);

      // Delete the invoice document
      await deleteDoc(invoiceRef);
      
      console.log('Invoice deleted successfully:', invoiceId);
    } catch (error) {
      console.error("Error deleting invoice:", error);
      throw error;
    }
  },

  async updateInvoiceNumber(invoiceId: string, userId: string, newInvoiceNumber: string): Promise<void> {
    try {
      const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
      const invoiceDoc = await getDoc(invoiceRef);

      if (!invoiceDoc.exists()) {
        throw new Error("Invoice not found");
      }

      // Verify ownership
      if (invoiceDoc.data().userId !== userId) {
        throw new Error("Unauthorized to edit this invoice");
      }

      // Check if the new invoice number already exists for this user
      const q = query(
        collection(db, INVOICES_COLLECTION),
        where('userId', '==', userId),
        where('invoiceNumber', '==', newInvoiceNumber)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty && querySnapshot.docs[0].id !== invoiceId) {
        throw new Error("Invoice number already exists");
      }

      // Update the invoice number
      await updateDoc(invoiceRef, {
        invoiceNumber: newInvoiceNumber
      });

      console.log('Invoice number updated successfully:', invoiceId, newInvoiceNumber);
    } catch (error) {
      console.error("Error updating invoice number:", error);
      throw error;
    }
  },

  async checkInvoiceNumberExists(userId: string, invoiceNumber: string, excludeInvoiceId?: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, INVOICES_COLLECTION),
        where('userId', '==', userId),
        where('invoiceNumber', '==', invoiceNumber)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return false;
      
      // If excludeInvoiceId is provided, check if the found invoice is different
      if (excludeInvoiceId) {
        return querySnapshot.docs[0].id !== excludeInvoiceId;
      }
      
      return true;
    } catch (error) {
      console.error("Error checking invoice number:", error);
      return false;
    }
  }
};
