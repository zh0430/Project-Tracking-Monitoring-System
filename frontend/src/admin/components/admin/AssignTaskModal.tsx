import { useState } from 'react';
import { X, Bell, UserPlus, Upload, FileText, Trash2 } from 'lucide-react';
import { Task, Employee, Priority, Status, TaskDocument } from '../../App';

interface AssignTaskModalProps {
  employeeId?: string; // Optional - if not provided, can select multiple employees
  employees: Employee[];
  priorities: Priority[];
  statuses: Status[];
  adminId: string;
  onClose: () => void;
  onAssign: (task: Task) => void;
}

export function AssignTaskModal({
  employeeId,
  employees,
  priorities,
  statuses,
  adminId,
  onClose,
  onAssign,
}: AssignTaskModalProps) {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(
    employeeId ? [employeeId] : []
  );
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priorityID: priorities[0]?.priorityID || '',
    statusID: statuses[0]?.statusID || '',
    dueDate: '',
  });
  const [showNotification, setShowNotification] = useState(false);
  const [documents, setDocuments] = useState<TaskDocument[]>([]);

  const toggleEmployee = (empId: string) => {
    if (selectedEmployees.includes(empId)) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== empId));
    } else {
      setSelectedEmployees([...selectedEmployees, empId]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const document: TaskDocument = {
          documentID: `doc${Date.now()}-${Math.random()}`,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedBy: adminId,
          uploadedDate: new Date().toISOString().split('T')[0],
          fileData: event.target?.result as string,
        };
        setDocuments(prev => [...prev, document]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteDocument = (documentId: string) => {
    setDocuments(documents.filter(d => d.documentID !== documentId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.dueDate || selectedEmployees.length === 0) {
      alert('Please fill in all fields and select at least one employee');
      return;
    }

    const newTask: Task = {
      taskID: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      assignedToUserID: selectedEmployees.length === 1 ? selectedEmployees[0] : selectedEmployees,
      reportedByUserID: adminId,
      statusID: formData.statusID,
      priorityID: formData.priorityID,
      createdDate: new Date().toISOString().split('T')[0],
      dueDate: formData.dueDate,
      completedDate: null,
      documents: documents,
      timeline: [],
    };

    onAssign(newTask);
    
    // Show notification confirmation
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-300">
          <div>
            <h2 className="text-gray-900">Assign New Project</h2>
            <p className="text-gray-600 text-sm mt-1">Assign to: {employeeId ? employees.find(e => e.userID === employeeId)?.name : 'Multiple Employees'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">
              Project Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter project title"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">
              Description <span className="text-red-600">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter project description"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">
                Priority <span className="text-red-600">*</span>
              </label>
              <select
                value={formData.priorityID}
                onChange={(e) => setFormData({ ...formData, priorityID: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                {priorities.map(priority => (
                  <option key={priority.priorityID} value={priority.priorityID}>
                    {priority.priorityLevel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">
                Initial Status <span className="text-red-600">*</span>
              </label>
              <select
                value={formData.statusID}
                onChange={(e) => setFormData({ ...formData, statusID: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                {statuses.map(status => (
                  <option key={status.statusID} value={status.statusID}>
                    {status.statusName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">
              Due Date <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Employee Selection */}
          <div>
            <label className="flex items-center gap-2 text-gray-700 mb-2">
              <UserPlus className="w-4 h-4" />
              Assign to Team Members <span className="text-red-600">*</span>
            </label>
            <div className="border border-gray-300 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
              {employees.map(emp => (
                <label
                  key={emp.userID}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(emp.userID)}
                    onChange={() => toggleEmployee(emp.userID)}
                    className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <div className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center text-sm">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-gray-900 text-sm">{emp.name}</p>
                    <p className="text-gray-600 text-xs">{emp.email}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-gray-600 text-sm mt-2">
              {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Document Upload */}
          <div>
            <label className="block text-gray-700 mb-2">
              <Upload className="w-4 h-4 inline mr-1" />
              Upload Documents (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                type="file"
                onChange={handleFileUpload}
                multiple
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-gray-600 text-sm">Click to upload files</span>
                <span className="text-gray-500 text-xs">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG</span>
              </label>
            </div>

            {/* Uploaded Documents List */}
            {documents.length > 0 && (
              <div className="mt-3 space-y-2">
                {documents.map(doc => (
                  <div key={doc.documentID} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-300">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 text-sm truncate">{doc.fileName}</p>
                        <p className="text-gray-600 text-xs">{formatFileSize(doc.fileSize)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.documentID)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notification Info */}
          <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg border border-gray-300">
            <Bell className="w-5 h-5 text-gray-600" />
            <p className="text-gray-700 text-sm">
              Selected employees will be notified when this project is assigned
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Assign Project & Notify
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Notification Success Message */}
        {showNotification && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
            <Bell className="w-5 h-5" />
            <span>Project assigned and notification sent!</span>
          </div>
        )}
      </div>
    </div>
  );
}