import { useState } from 'react';
import { Project, TaskDocument, ProjectTimeline } from '../App';
import { X, Upload, FileText, Trash2, Download, Plus } from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface ProjectDetailModalProps {
  project: Project;
  onClose: () => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
  readOnly?: boolean;
}

// Helper function to format date for datetime-local input
const formatForInput = (date?: string) => {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Helper function to format date for display
const formatDisplayDate = (date?: string) => {
  if (!date) return 'No deadline';
  const d = new Date(date);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const getFileIcon = (type?: string) => {
  if (!type) return '📎';

  if (type.includes('pdf')) return '📄';
  if (type.includes('word') || type.includes('document')) return '📝';
  if (type.includes('image')) return '🖼️';
  return '📎';
};

export function ProjectDetailModal({
  project,
  onClose,
  onUpdateProject,
  onDeleteProject,
  readOnly = false,
}: ProjectDetailModalProps) {
  const isLocked =
    project.status === 'Completed' &&
    project.approvalStatus === 'Approved';

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    title: project.title,
    description: project.description,
    priority: project.priority || '',
    dueDate: formatForInput(project.dueDate),
    estimatedEffort: project.estimatedEffort || '',
    status: project.status,
  });
  const [documents, setDocuments] = useState<TaskDocument[]>(project.documents || []);
  const [timelines, setTimelines] = useState<ProjectTimeline[]>(project.timelines || []);
  const [newTimeline, setNewTimeline] = useState({
    title: '',
    startDate: '',
    endDate: '',
    status: 'To Do' as ProjectTimeline['status'],
    priority: '' as 'Low' | 'Medium' | 'High' | '',
    description: '',
  });
  const [showAddTimeline, setShowAddTimeline] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newDocuments: TaskDocument[] = [];

    Array.from(files).forEach((file) => {
      const document: TaskDocument = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        type: file.type,
        size: file.size,
        url: "",          // 🚫 DO NOT USE BLOB
        uploadedAt: new Date().toISOString(),
        file: file        // ✅ STORE REAL FILE
      };

      newDocuments.push(document);
    });

    setDocuments([...documents, ...newDocuments]);
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments(documents.filter((doc) => doc.id !== docId));
  };

  const handleAddTimeline = () => {
    if (!newTimeline.title || !newTimeline.startDate || !newTimeline.endDate) {
      alert('Please fill in all timeline fields');
      return;
    }

    const timeline: ProjectTimeline = {
      id: Date.now().toString(),
      title: newTimeline.title,
      startDate: newTimeline.startDate,
      endDate: newTimeline.endDate,
      status: newTimeline.status,
      priority: newTimeline.priority || undefined,
      description: newTimeline.description || undefined,
    };

    setTimelines([...timelines, timeline]);
    setNewTimeline({
      title: '',
      startDate: '',
      endDate: '',
      status: 'To Do',
      priority: '',
      description: '',
    });
    setShowAddTimeline(false);
  };

  const handleDeleteTimeline = (timelineId: string) => {
    setTimelines(timelines.filter((t) => t.id !== timelineId));
  };

  const handleUpdateTimeline = (timelineId: string, updates: Partial<ProjectTimeline>) => {
    setTimelines(timelines.map(t => t.id === timelineId ? { ...t, ...updates } : t));
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

  const handleSave = () => {
    onUpdateProject(project.id, {
      title: formData.title,
      description: formData.description,
      priority: formData.priority as Project['priority'],
      dueDate: formData.dueDate || undefined,
      estimatedEffort: formData.estimatedEffort || undefined,
      status: formData.status,
      documents: documents,
      timelines: timelines,
    });
    onClose();
  };

  const handleDelete = () => {
    if (project.status === 'Completed') {
      alert('Completed projects cannot be deleted.');
      return;
    }

    onDeleteProject(project.id);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h3 className="text-gray-900">Project Details</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Locked Message */}
          {isLocked && (
            <div className="mx-6 mt-6 p-4 bg-green-100 text-green-800 rounded border border-green-200">
              This project is approved and locked from editing.
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Project ID */}
            <div>
              <label className="block text-gray-700 mb-2">Project ID</label>
              <div className="text-gray-900">{project.projectId}</div>
            </div>

            {/* Project Title */}
            <div>
              <label className="block text-gray-700 mb-2">Project Title</label>
              {isEditing && !readOnly && !isLocked ? (
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              ) : (
                <div className="text-gray-900">{project.title}</div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-gray-700 mb-2">Description</label>
              {isEditing && !readOnly && !isLocked ? (
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 min-h-[100px]"
                />
              ) : (
                <div className="text-gray-900">{project.description}</div>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-gray-700 mb-2">Priority</label>
              {isEditing && !readOnly && !isLocked ? (
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                >
                  <option value="">Not set</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              ) : (
                <div className="text-gray-900">{project.priority || 'Not set'}</div>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-gray-700 mb-2">Due Date</label>
              {isEditing && !readOnly && !isLocked ? (
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              ) : (
                <div className="text-gray-900">{formatDisplayDate(project.dueDate)}</div>
              )}
            </div>

            {/* Estimated Effort */}
            <div>
              <label className="block text-gray-700 mb-2">Estimated Effort</label>
              {isEditing && !readOnly && !isLocked ? (
                <input
                  type="text"
                  value={formData.estimatedEffort}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedEffort: e.target.value })
                  }
                  placeholder="e.g., 4 hours, 2 days"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              ) : (
                <div className="text-gray-900">
                  {project.estimatedEffort || 'Not specified'}
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-gray-700 mb-2">Status</label>
              {isEditing && !readOnly && !isLocked ? (
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as Project['status'],
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Revision Required">Revision Required</option>
                </select>
              ) : (
                <div className="text-gray-900">{project.status}</div>
              )}
            </div>

            {/* Created Date */}
            <div>
              <label className="block text-gray-700 mb-2">Created Date</label>
              <div className="text-gray-900">{formatDisplayDate(project.createdAt)}</div>
            </div>

            {/* Project Progress Timeline Section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-gray-900">Project Progress Timeline</h4>
                {isEditing && !readOnly && !isLocked && (
                  <button
                    onClick={() => setShowAddTimeline(!showAddTimeline)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Timeline
                  </button>
                )}
              </div>

              {/* Add Timeline Form */}
              {showAddTimeline && isEditing && !readOnly && !isLocked && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-gray-700 mb-2">Title</label>
                      <input
                        type="text"
                        value={newTimeline.title}
                        onChange={(e) =>
                          setNewTimeline({ ...newTimeline, title: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                        placeholder="e.g., Phase 1: Planning"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={newTimeline.startDate}
                        onChange={(e) =>
                          setNewTimeline({ ...newTimeline, startDate: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={newTimeline.endDate}
                        onChange={(e) =>
                          setNewTimeline({ ...newTimeline, endDate: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-gray-700 mb-2">Status</label>
                      <select
                        value={newTimeline.status}
                        onChange={(e) =>
                          setNewTimeline({
                            ...newTimeline,
                            status: e.target.value as ProjectTimeline['status'],
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Revision Required">Revision Required</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-gray-700 mb-2">Priority</label>
                      <select
                        value={newTimeline.priority}
                        onChange={(e) =>
                          setNewTimeline({
                            ...newTimeline,
                            priority: e.target.value as 'Low' | 'Medium' | 'High' | '',
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                      >
                        <option value="">Not set</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-gray-700 mb-2">Description</label>
                      <textarea
                        value={newTimeline.description}
                        onChange={(e) =>
                          setNewTimeline({ ...newTimeline, description: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 min-h-[100px]"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleAddTimeline}
                      className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddTimeline(false);
                        setNewTimeline({
                          title: '',
                          startDate: '',
                          endDate: '',
                          status: 'To Do',
                          priority: '',
                          description: '',
                        });
                      }}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Timeline List */}
              {timelines.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-500 text-sm">No timeline entries</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {timelines.map((timeline) => (
                    <div
                      key={timeline.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {isEditing && !readOnly && !isLocked ? (
                            <input
                              type="text"
                              value={timeline.title}
                              onChange={(e) =>
                                handleUpdateTimeline(timeline.id, { title: e.target.value })
                              }
                              className="w-full px-3 py-1 border border-gray-300 rounded text-gray-900 mb-2"
                            />
                          ) : (
                            <div className="text-gray-900 mb-2">{timeline.title}</div>
                          )}
                          
                          {/* Priority Display */}
                          <div className="mb-2">
                            <span className="text-gray-600 text-sm">Priority: </span>
                            {isEditing && !readOnly && !isLocked ? (
                              <select
                                value={timeline.priority || ''}
                                onChange={(e) =>
                                  handleUpdateTimeline(timeline.id, {
                                    priority: e.target.value as 'Low' | 'Medium' | 'High' | undefined,
                                  })
                                }
                                className="px-2 py-1 border border-gray-300 rounded bg-white text-sm"
                              >
                                <option value="">Not set</option>
                                <option value="Low">4 - Low</option>
                                <option value="Medium">2 - Medium</option>
                                <option value="High">1 - High</option>
                              </select>
                            ) : (
                              <span className={`text-sm ${
                                timeline.priority === 'High' ? 'text-red-600' :
                                timeline.priority === 'Medium' ? 'text-gray-700' :
                                timeline.priority === 'Low' ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                {timeline.priority === 'High' ? '1 - High' :
                                 timeline.priority === 'Medium' ? '2 - Medium' :
                                 timeline.priority === 'Low' ? '4 - Low' : 'Not set'}
                              </span>
                            )}
                          </div>

                          {/* Description Display */}
                          {(timeline.description || (isEditing && !readOnly && !isLocked)) && (
                            <div className="mb-2">
                              <span className="text-gray-600 text-sm">Description: </span>
                              {isEditing && !readOnly && !isLocked ? (
                                <textarea
                                  value={timeline.description || ''}
                                  onChange={(e) =>
                                    handleUpdateTimeline(timeline.id, { description: e.target.value })
                                  }
                                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm min-h-[60px]"
                                />
                              ) : timeline.description ? (
                                <div className="text-gray-900 text-sm mt-1 whitespace-pre-wrap">{timeline.description}</div>
                              ) : null}
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Start: </span>
                              {isEditing && !readOnly && !isLocked ? (
                                <input
                                  type="date"
                                  value={timeline.startDate}
                                  onChange={(e) =>
                                    handleUpdateTimeline(timeline.id, { startDate: e.target.value })
                                  }
                                  className="px-2 py-1 border border-gray-300 rounded text-gray-900"
                                />
                              ) : (
                                <span className="text-gray-900">{timeline.startDate}</span>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-600">End: </span>
                              {isEditing && !readOnly && !isLocked ? (
                                <input
                                  type="date"
                                  value={timeline.endDate}
                                  onChange={(e) =>
                                    handleUpdateTimeline(timeline.id, { endDate: e.target.value })
                                  }
                                  className="px-2 py-1 border border-gray-300 rounded text-gray-900"
                                />
                              ) : (
                                <span className="text-gray-900">{timeline.endDate}</span>
                              )}
                            </div>
                            <div>
                              {isEditing && !readOnly && !isLocked ? (
                                <select
                                  value={timeline.status}
                                  onChange={(e) =>
                                    handleUpdateTimeline(timeline.id, {
                                      status: e.target.value as ProjectTimeline['status'],
                                    })
                                  }
                                  className="px-2 py-1 border border-gray-300 rounded bg-white text-sm"
                                >
                                  <option value="To Do">To Do</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Completed">Completed</option>
                                  <option value="Revision Required">Revision Required</option>
                                </select>
                              ) : (
                                <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusColor(timeline.status)}`}>
                                  {timeline.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isEditing && !readOnly && !isLocked && (
                          <button
                            onClick={() => handleDeleteTimeline(timeline.id)}
                            className="ml-4 p-2 text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document Upload Section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-gray-900">Documents</label>
                {isEditing && !readOnly && !isLocked && (
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Upload Files
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {documents.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No documents uploaded</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl">{getFileIcon(doc.type)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-gray-900 truncate">{doc.name}</div>
                          <div className="text-gray-500 text-sm">
                            {formatFileSize(doc.size)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {doc.url && !doc.url.startsWith('blob:') ? (
                          <button
                            onClick={() => {
                              if (doc.file) {
                                const tempUrl = URL.createObjectURL(doc.file);
                                const a = document.createElement('a');
                                a.href = tempUrl;
                                a.download = doc.name;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(tempUrl);
                              } else {
                                window.open(doc.url, '_blank');
                              }
                            }}
                            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        ) : !doc.file ? (
                          <span className="text-xs text-red-500 px-2" title="File no longer available">
                            ⚠️ Lost
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              const tempUrl = URL.createObjectURL(doc.file!);
                              const a = document.createElement('a');
                              a.href = tempUrl;
                              a.download = doc.name;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(tempUrl);
                            }}
                            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {isEditing && !readOnly && !isLocked && (
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0">
            {!readOnly && project.status !== 'Completed' && !isLocked && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Delete Project
              </button>
            )}
            {readOnly && <div></div>}
            <div className="flex gap-3">
              {isEditing && !readOnly && !isLocked ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        title: project.title,
                        description: project.description,
                        priority: project.priority || '',
                        dueDate: formatForInput(project.dueDate),
                        estimatedEffort: project.estimatedEffort || '',
                        status: project.status,
                      });
                      setDocuments(project.documents || []);
                      setTimelines(project.timelines || []);
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  {!readOnly && !isLocked && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
                    >
                      Edit Project
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <DeleteConfirmModal
          taskTitle={project.title}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}