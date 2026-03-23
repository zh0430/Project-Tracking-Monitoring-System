import { useState } from 'react';
import { X, Bell, UserPlus, Upload, FileText, Trash2 } from 'lucide-react';
import { Task, Employee, Priority, Status, TaskDocument, ProjectTimeline } from '../../App';

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
  const [documents, setDocuments] = useState<any[]>([]);
  const [timelines, setTimelines] = useState<ProjectTimeline[]>([]);
  const [newTimeline, setNewTimeline] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'To Do',
    priority: 'Not set',
  });
  const [showAddTimeline, setShowAddTimeline] = useState(false);

  const toggleEmployee = (empId: string) => {
    if (selectedEmployees.includes(empId)) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== empId));
    } else {
      setSelectedEmployees([...selectedEmployees, empId]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newDocs = Array.from(files).map(file => ({
      documentID: `doc-${Date.now()}-${Math.random()}`,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadedBy: adminId,
      uploadedDate: new Date().toISOString(),
      fileObject: file // ✅ STORE REAL FILE
    }));

    setDocuments(prev => [...prev, ...newDocs]);
  };

  const handleDeleteDocument = (documentId: string) => {
    setDocuments(documents.filter(d => d.documentID !== documentId));
  };

  const handleAddTimeline = () => {
    if (!newTimeline.title || !newTimeline.startDate || !newTimeline.endDate) {
      alert('Please fill in all timeline fields');
      return;
    }

    const timeline: ProjectTimeline = {
      id: "new-" + Date.now(),
      title: newTimeline.title,
      description: newTimeline.description,
      startDate: newTimeline.startDate,
      endDate: newTimeline.endDate,
      status: newTimeline.status,
      priority: newTimeline.priority || 'Not set',
    };

    setTimelines(prev => [...prev, timeline]);

    setNewTimeline({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'To Do',
      priority: 'Not set',
    });

    setShowAddTimeline(false);
  };

  const handleDeleteTimeline = (id: string) => {
    setTimelines(timelines.filter(t => t.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDateTimeForDisplay = (datetimeString: string) => {
    if (!datetimeString) return '';
    const date = new Date(datetimeString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: ProjectTimeline['status']) => {
    switch (status) {
      case 'Completed':
        return 'bg-gray-200 text-gray-800';
      case 'In Progress':
        return 'bg-gray-800 text-white';
      case 'Revision Required':
        return 'bg-red-100 text-red-800 border border-red-300';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.dueDate || selectedEmployees.length === 0) {
      alert('Please fill in all fields and select at least one employee');
      return;
    }

    // Multi-assign mode check
    if (selectedEmployees.length > 1) {
      console.log("MULTI ASSIGN MODE");
    }

    const token = localStorage.getItem("token");
    
    // Prepare final timelines
    const finalTimelines = [...timelines];
    console.log("TIMELINES SENDING:", finalTimelines);
    
    // Prepare files
    const files = documents.map(doc => doc.fileObject);

    try {
      const formDataToSend = new FormData();

      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("dueDate", formData.dueDate);
      // Send all selected employees as JSON array
      formDataToSend.append("assignedUserId", JSON.stringify(selectedEmployees));
      formDataToSend.append(
        "status",
        statuses.find(s => s.statusID === formData.statusID)?.statusName || 'To Do'
      );
      formDataToSend.append(
        "priority",
        priorities.find(p => p.priorityID === formData.priorityID)?.priorityLevel || 'Not set'
      );

      // Append timelines as JSON
      formDataToSend.append("timelines", JSON.stringify(finalTimelines));

      // Append real files only
      files.forEach(file => {
        if (file) {
          formDataToSend.append("documents", file);
        }
      });

      const response = await fetch("http://localhost:5000/api/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error(`Failed to create project`);
      }

      const newProjectData = await response.json();
      console.log(`Project created successfully for users:`, selectedEmployees);
      
      // Show notification confirmation
      setShowNotification(true);
      setTimeout(() => {
        setShowNotification(false);
        // Just close modal after success
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    }
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
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
              min={new Date().toISOString().slice(0, 16)}
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

          {/* Project Progress Timeline */}
          <div className="border-t border-gray-300 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-gray-900">Project Progress Timeline</h4>
              <button
                type="button"
                onClick={() => setShowAddTimeline(!showAddTimeline)}
                className="px-3 py-1 bg-gray-800 text-white rounded"
              >
                + Add Timeline
              </button>
            </div>

            {/* Add Timeline Form */}
            {showAddTimeline && (
              <div className="bg-gray-50 border p-4 rounded mb-3 space-y-3">
                <input
                  type="text"
                  placeholder="Title"
                  value={newTimeline.title}
                  onChange={(e) => setNewTimeline({ ...newTimeline, title: e.target.value })}
                  className="w-full border p-2 rounded"
                />

                <textarea
                  placeholder="Description"
                  value={newTimeline.description}
                  onChange={(e) => setNewTimeline({ ...newTimeline, description: e.target.value })}
                  className="w-full border p-2 rounded"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="datetime-local"
                    value={newTimeline.startDate}
                    onChange={(e) => setNewTimeline({ ...newTimeline, startDate: e.target.value })}
                    className="border p-2 rounded"
                  />
                  <input
                    type="datetime-local"
                    value={newTimeline.endDate}
                    onChange={(e) => setNewTimeline({ ...newTimeline, endDate: e.target.value })}
                    className="border p-2 rounded"
                  />
                </div>

                <select
                  value={newTimeline.status}
                  onChange={(e) => setNewTimeline({ ...newTimeline, status: e.target.value })}
                  className="w-full border p-2 rounded"
                >
                  <option>To Do</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>Revision Required</option>
                </select>

                {/* Priority dropdown */}
                <select
                  value={newTimeline.priority}
                  onChange={(e) => setNewTimeline({ 
                    ...newTimeline, 
                    priority: e.target.value as 'Not set' | 'Low' | 'Medium' | 'High'
                  })}
                  className="w-full border p-2 rounded"
                >
                  <option value="Not set">Not set</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>

                <div className="flex gap-2">
                  <button onClick={handleAddTimeline} className="bg-gray-800 text-white px-3 py-1 rounded">
                    Add
                  </button>
                  <button onClick={() => setShowAddTimeline(false)} className="border px-3 py-1 rounded">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Timeline List - UPDATED VERSION */}
            {timelines.length === 0 ? (
              <div className="text-gray-500 text-sm">No timeline entries added yet</div>
            ) : (
              <div className="space-y-3">
                {timelines.map((timeline) => (
                  <div
                    key={timeline.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        
                        {/* Title */}
                        <div className="text-gray-900 mb-2">{timeline.title}</div>

                        {/* Description */}
                        {timeline.description && (
                          <div className="text-gray-700 text-sm mb-2 whitespace-pre-wrap">
                            {timeline.description}
                          </div>
                        )}

                        {/* 🔥 Start & End Date */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Start: </span>
                            <span className="text-gray-900">
                              {formatDateTimeForDisplay(timeline.startDate)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">End: </span>
                            <span className="text-gray-900">
                              {formatDateTimeForDisplay(timeline.endDate)}
                            </span>
                          </div>
                        </div>

                        {/* Status + Priority */}
                        <div className="mt-2 flex gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(timeline.status)}`}>
                            {timeline.status}
                          </span>

                          {timeline.priority && timeline.priority !== 'Not set' && (
                            <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 border border-gray-300">
                              Priority: {timeline.priority}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteTimeline(timeline.id)}
                        className="ml-4 p-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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