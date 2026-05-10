import { useState } from 'react';
import { TaskDocument, Employee } from '../../App';
import { Upload, FileText, Download, Trash2 } from 'lucide-react';

interface DocumentManagerProps {
  documents: TaskDocument[];
  onUpload: (document: TaskDocument) => void;
  onDelete: (documentId: string) => void;
  currentUserId: string;
  canUpload: boolean;
  employees?: Employee[];
  projectId?: string | number; // Added projectId for API calls
}

/**
 * DOCUMENT MANAGER COMPONENT
 * Handles file management for projects including uploading, downloading,
 * and deleting documents. Integrates with backend API for file operations
 * and supports file size validation (max 5MB).
 */

export function DocumentManager({ 
  documents, 
  onUpload, 
  onDelete, 
  currentUserId, 
  canUpload, 
  employees,
  projectId 
}: DocumentManagerProps) {
  const [uploading, setUploading] = useState(false);

  // Handle file upload with size validation and API integration
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    if (!projectId) {
      alert('Project ID is required for upload');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("documents", file);

      const token = localStorage.getItem("token");

      const res = await fetch(`http://localhost:5000/api/projects/${projectId}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      
      // Get the newly uploaded document from the response
      const newDocument = data.documents[0];
      onUpload(newDocument);
      
      // Reset input
      e.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  // Trigger file download by creating temporary anchor element
  const handleDownload = (doc: any) => {
    if (!doc.fileData) {
      alert("File not available");
      return;
    }

    const link = document.createElement("a");
    link.href = doc.fileData;
    link.download = doc.fileName || doc.name || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format file size from bytes to human-readable format
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";

    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
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

      {/* Document List Display */}
      {documents.length === 0 ? (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-300 text-center text-gray-500">
          No documents uploaded
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.documentID || doc.id || doc.fileStoreName || doc.fileName || doc.name}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <FileText className="w-5 h-5 text-gray-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 truncate">{doc.fileName || doc.name || "Unnamed file"}</p>
                  <p className="text-gray-500 text-xs">
                    {formatFileSize(doc.fileSize || doc.size)} • Uploaded {doc.uploadedDate}
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