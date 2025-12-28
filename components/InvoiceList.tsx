import React, { useState } from 'react';
import { Invoice } from '../types';
import { ChevronRight, FileText, Calendar, User, Download, Trash2, Edit2, X, Check, AlertCircle } from 'lucide-react';

interface InvoiceListProps {
  invoices: Invoice[];
  onSelect: (invoice: Invoice) => void;
  onDownload: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onEditInvoiceNumber: (invoice: Invoice, newNumber: string) => void;
  loading: boolean;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ 
  invoices, 
  onSelect, 
  onDownload, 
  onDelete, 
  onEditInvoiceNumber,
  loading 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleEditStart = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(invoice.id);
    setEditValue(invoice.invoiceNumber);
  };

  const handleEditSave = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editValue.trim() && editValue !== invoice.invoiceNumber) {
      onEditInvoiceNumber(invoice, editValue.trim());
    }
    setEditingId(null);
  };

  const handleEditCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditValue('');
  };

  const handleDeleteClick = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(invoice.id);
  };

  const handleDeleteConfirm = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(invoice);
    setDeleteConfirmId(null);
  };

  const handleDeleteCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Fetching your invoices...</p>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No invoices found</h3>
          <p className="text-gray-500">Start by creating your first professional invoice.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoice History</h2>
          <p className="text-gray-600 mt-1">Manage and view your generated invoices</p>
        </div>
        <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold">
          {invoices.length} Invoices
        </div>
      </div>

      <div className="space-y-3">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            onClick={() => onSelect(invoice)}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 grid grid-cols-4 gap-4">
                {/* Invoice Number - Editable */}
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    {editingId === invoice.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="text-sm font-semibold border border-blue-500 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={(e) => handleEditSave(invoice, e)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{invoice.invoiceNumber}</span>
                        <button
                          onClick={(e) => handleEditStart(invoice, e)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Edit Invoice Number"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">{invoice.invoiceDate}</span>
                </div>

                {/* Customer */}
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600 truncate">{invoice.customerName}</span>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Amount</p>
                  <p className="text-sm font-bold text-gray-900">
                    {invoice.currencySymbol || '₹'}{invoice.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(invoice);
                  }}
                  className="p-3 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition"
                  title="Download PDF"
                >
                  <Download className="w-5 h-5" />
                </button>

                {deleteConfirmId === invoice.id ? (
                  <div className="flex items-center gap-1 bg-red-50 rounded-lg p-1">
                    <span className="text-xs text-red-800 px-2">Delete?</span>
                    <button
                      onClick={(e) => handleDeleteConfirm(invoice, e)}
                      className="p-2 text-white bg-red-600 hover:bg-red-700 rounded transition"
                      title="Confirm Delete"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleDeleteCancel}
                      className="p-2 text-gray-600 hover:bg-gray-200 rounded transition"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => handleDeleteClick(invoice, e)}
                    className="p-3 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition"
                    title="Delete Invoice"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}

                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvoiceList;
