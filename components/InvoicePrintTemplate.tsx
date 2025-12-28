import React, { useEffect, useRef, useState } from 'react';
import { Invoice, InvoiceItem } from '../types';
import { X, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface InvoicePrintTemplateProps {
  invoice: Invoice & { items: InvoiceItem[] };
  onClose: () => void;
  autoPrint?: boolean;
}

const InvoicePrintTemplate: React.FC<InvoicePrintTemplateProps> = ({
  invoice,
  onClose,
  autoPrint = false
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const hasAutoDownloaded = useRef(false);
  const symbol = invoice.currencySymbol || '₹';
  
  // Check if there's any discount
  const hasDiscount = invoice.discountAmount > 0;

  const handleDownloadPDF = async () => {
    if (!printRef.current || isDownloading) return;
    
    setIsDownloading(true);
    try {
      const element = printRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Invoice_${invoice.invoiceNumber.replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (autoPrint && !hasAutoDownloaded.current) {
      hasAutoDownloaded.current = true;
      const timer = setTimeout(() => {
        handleDownloadPDF();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const handleClose = () => {
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Action Bar */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-800">Invoice Preview</h2>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF
                </>
              )}
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div ref={printRef} className="p-8 bg-white">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-200">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">INVOICE</h1>
              <p className="text-gray-600">#{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Kitchen Gallery.</h2>
              <p className="text-sm text-gray-600">Opp. Dutt Mandir, Nr. Vallabhnagar</p>
              <p className="text-sm text-gray-600">Police station, Pij Road</p>
              <p className="text-sm text-gray-600">Nadiad-387002</p>
            </div>
          </div>

          {/* Customer & Date Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To:</h3>
              <p className="text-lg font-semibold text-gray-900">{invoice.customerName}</p>
              {invoice.customerAddress && (
                <p className="text-sm text-gray-600 mt-1">{invoice.customerAddress}</p>
              )}
              {invoice.customerPhone && (
                <p className="text-sm text-gray-600 mt-1">{invoice.customerPhone}</p>
              )}
            </div>
            <div className="text-right">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Invoice Date:</h3>
              <p className="text-lg font-semibold text-gray-900">{invoice.invoiceDate}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Qty</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Unit Price</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3 px-4 text-gray-800">{item.description}</td>
                    <td className="py-3 px-4 text-center text-gray-800">{item.quantity}</td>
                    <td className="py-3 px-4 text-right text-gray-800">
                      {symbol}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-800 font-semibold">
                      {symbol}{item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mb-8">
            <div className="w-80">
              {/* Only show subtotal if there's a discount */}
              {hasDiscount && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-semibold text-gray-900">
                    {symbol}{invoice.subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              
              {/* Only show discount line if there's an actual discount */}
              {hasDiscount && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-700">
                    Discount ({invoice.discountType === 'percentage' ? `${invoice.discountValue}%` : 'Fixed'}):
                  </span>
                  <span className="font-semibold text-red-600">
                    -{symbol}{invoice.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between py-3 bg-gray-100 px-4 rounded-lg mt-2">
                <span className="text-lg font-bold text-gray-900">
                  {hasDiscount ? 'Grand Total:' : 'Total:'}
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {symbol}{invoice.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="border-t-2 border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Terms & Conditions:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Cheque/Draft should be in favour of Kitchen Gallary.</li>
              <li>• Unit one time sold not taken back.</li>
              <li>• Subject to Nadiad Jurisdiction.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrintTemplate;
