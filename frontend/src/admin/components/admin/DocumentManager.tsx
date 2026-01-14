import { useState } from 'react';
import { TaskDocument, Employee } from '../../App';
import { Upload, FileText, Download, Trash2, X } from 'lucide-react';

interface DocumentManagerProps {
  documents: TaskDocument[];
  onUpload: (document: TaskDocument) => void;
  onDelete: (documentId: string) => void;
  currentUserId: string;
  canUpload: boolean;
  employees?: Employee[];
}

export function DocumentManager({ documents, onUpload, onDelete, currentUserId, canUpload, employees }: DocumentManagerProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        
        const newDocument: TaskDocument = {
          documentID: Date.now().toString(),
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedBy: currentUserId,
          uploadedDate: new Date().toISOString().split('T')[0],
          fileData: base64,
        };

        onUpload(newDocument);
        setUploading(false);
        
        // Reset input
        e.target.value = '';
      };

      reader.onerror = () => {
        alert('Error reading file');
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      alert('Error uploading file');
      setUploading(false);
    }
  };

  const handleDownload = (doc: TaskDocument) => {
    const link = document.createElement('a');
    link.href = doc.fileData;
    link.download = doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-gray-900">Documents</h4>
        {canUpload && (
          <label className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload Document'}
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xlsx,.xls,.ppt,.pptx"
            />
          </label>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-300 text-center text-gray-500">
          No documents uploaded
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.documentID}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <FileText className="w-5 h-5 text-gray-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 truncate">{doc.fileName}</p>
                  <p className="text-gray-500 text-xs">
                    {formatFileSize(doc.fileSize)} • Uploaded {doc.uploadedDate}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                {canUpload && (
                  <button
                    onClick={() => onDelete(doc.documentID)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-gray-500 text-xs">
        Supported formats: PDF, Word, Excel, PowerPoint, Images, Text (Max 5MB)
      </p>
    </div>
  );
}