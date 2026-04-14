import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, File } from 'lucide-react';

interface ExportDropdownProps {
  onExportExcel: () => void;
  onExportPDF: () => void;
  onExportWord: () => void;
}

/**
 * EXPORT DROPDOWN COMPONENT
 * Reusable dropdown menu providing export options for Excel, PDF, and Word formats.
 * Features include:
 * - Click outside to close functionality
 * - Color-coded icons for each export type
 * - Clean dropdown animation and hover effects
 */

export function ExportDropdown({
  onExportExcel,
  onExportPDF,
  onExportWord,
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside the component
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (exportFn: () => void) => {
    exportFn();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
      >
        <Download className="w-4 h-4" />
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <button
            onClick={() => handleExport(onExportExcel)}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            Export to Excel
          </button>
          <button
            onClick={() => handleExport(onExportPDF)}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
          >
            <FileText className="w-4 h-4 text-red-600" />
            Export to PDF
          </button>
          <button
            onClick={() => handleExport(onExportWord)}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-left"
          >
            <File className="w-4 h-4 text-blue-600" />
            Export to Word
          </button>
        </div>
      )}
    </div>
  );
}