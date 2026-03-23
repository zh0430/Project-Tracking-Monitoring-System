import { useState } from 'react';
import { Project, TaskDocument, ProjectTimeline } from '../App';
import { ArrowLeft, Trash2, Plus } from 'lucide-react';

interface ProjectSubmissionFormProps {
  onSubmit: (projectData: Omit<Project, 'id' | 'projectId' | 'status' | 'createdAt'>) => void;
  onCancel: () => void;
}

export function ProjectSubmissionForm({ onSubmit, onCancel }: ProjectSubmissionFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Not set' as 'Not set' | 'Low' | 'Medium' | 'High',
    dueDate: '',
  });

  const [errors, setErrors] = useState({
    title: '',
    description: '',
  });

  const [documents, setDocuments] = useState<TaskDocument[]>([]);
  const [timelines, setTimelines] = useState<ProjectTimeline[]>([]);
  const [newTimeline, setNewTimeline] = useState({
    title: '',
    startDate: '',
    endDate: '',
    status: 'To Do' as ProjectTimeline['status'],
    description: '',
    priority: 'Not set',
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
        url: "",
        uploadedAt: new Date().toISOString(),
        file: file
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
      id: "new-" + Date.now(),
      title: newTimeline.title,
      startDate: newTimeline.startDate,
      endDate: newTimeline.endDate,
      status: newTimeline.status,
      description: newTimeline.description || undefined,
      priority: newTimeline.priority,
    };

    setTimelines([...timelines, timeline]);
    setNewTimeline({
      title: '',
      startDate: '',
      endDate: '',
      status: 'To Do',
      description: '',
      priority: 'Not set',
    });
    setShowAddTimeline(false);
  };

  const handleDeleteTimeline = (timelineId: string) => {
    setTimelines(timelines.filter((t) => t.id !== timelineId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('image')) return '🖼️';
    return '📎';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const newErrors = {
      title: formData.title.trim() ? '' : 'Project title is required',
      description: formData.description.trim() ? '' : 'Description is required',
    };

    setErrors(newErrors);

    // If there are errors, don't submit
    if (newErrors.title || newErrors.description) {
      return;
    }

    // Submit the form
    onSubmit({
      title: formData.title,
      description: formData.description,
      priority: formData.priority === 'Not set' ? undefined : formData.priority,
      dueDate: formData.dueDate || undefined,
      documents: documents.length > 0 ? documents : undefined,
      timelines: timelines.length > 0 ? timelines : undefined,
    });

    // Reset form
    setFormData({
      title: '',
      description: '',
      priority: 'Not set',
      dueDate: '',
    });
    setDocuments([]);
    setTimelines([]);
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

  // Helper function to format date for display
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

  return (
    <div>
      <button
        onClick={onCancel}
        className="flex items-center gap-2 mb-6 text-gray-700 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </button>

      <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-3xl">
        <h2 className="text-gray-900 mb-6">Create New Project</h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Project Title */}
            <div>
              <label htmlFor="title" className="block text-gray-900 mb-2">
                Project Title <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full px-4 py-2 border ${
                  errors.title ? 'border-red-600' : 'border-gray-300'
                } rounded focus:outline-none focus:ring-2 focus:ring-gray-400`}
                placeholder="Enter project title"
              />
              {errors.title && (
                <p className="text-red-600 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-gray-900 mb-2">
                Description <span className="text-red-600">*</span>
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className={`w-full px-4 py-2 border ${
                  errors.description ? 'border-red-600' : 'border-gray-300'
                } rounded focus:outline-none focus:ring-2 focus:ring-gray-400 min-h-[120px]`}
                placeholder="Describe the project in detail"
              />
              {errors.description && (
                <p className="text-red-600 text-sm mt-1">{errors.description}</p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="priority" className="block text-gray-900 mb-2">
                Priority
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as 'Not set' | 'Low' | 'Medium' | 'High',
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
              >
                <option value="Not set">Not set</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="dueDate" className="block text-gray-900 mb-2">
                Due Date
              </label>
              <input
                type="datetime-local"
                id="dueDate"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            {/* Project Progress Timeline */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-gray-900">Project Progress Timeline</h4>
                <button
                  type="button"
                  onClick={() => setShowAddTimeline(!showAddTimeline)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Timeline
                </button>
              </div>

              {/* Add Timeline Form */}
              {showAddTimeline && (
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
                        type="datetime-local"
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
                        type="datetime-local"
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
                    {/* Priority dropdown */}
                    <div className="col-span-2">
                      <label className="block text-gray-700 mb-2">Priority</label>
                      <select
                        value={newTimeline.priority}
                        onChange={(e) =>
                          setNewTimeline({
                            ...newTimeline,
                            priority: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                      >
                        <option value="Not set">Not set</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    {/* Description field */}
                    <div className="col-span-2">
                      <label className="block text-gray-700 mb-2">Description</label>
                      <textarea
                        value={newTimeline.description}
                        onChange={(e) =>
                          setNewTimeline({ ...newTimeline, description: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 min-h-[80px]"
                        placeholder="Enter timeline description"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={handleAddTimeline}
                      className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddTimeline(false);
                        setNewTimeline({
                          title: '',
                          startDate: '',
                          endDate: '',
                          status: 'To Do',
                          description: '',
                          priority: 'Not set',
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
                  <p className="text-gray-500 text-sm">No timeline entries added yet</p>
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
                          <div className="text-gray-900 mb-2">{timeline.title}</div>
                          
                          {/* Description display */}
                          {timeline.description && (
                            <div className="text-gray-700 text-sm mb-2 whitespace-pre-wrap">
                              {timeline.description}
                            </div>
                          )}
                          
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
                          <div className="mt-2 flex gap-2">
                            <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusColor(timeline.status)}`}>
                              {timeline.status}
                            </span>
                            {timeline.priority && timeline.priority !== 'Not set' && (
                              <span className="inline-block px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 border border-gray-300">
                                Priority: {timeline.priority}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTimeline(timeline.id)}
                          className="ml-4 p-2 text-red-600 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* File Upload */}
            <div>
              <label htmlFor="files" className="block text-gray-900 mb-2">
                Upload Files
              </label>
              <input
                type="file"
                id="files"
                multiple
                onChange={handleFileUpload}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            {/* Uploaded Documents */}
            {documents.length > 0 && (
              <div className="mt-4">
                <h3 className="text-gray-900 mb-2">Uploaded Documents</h3>
                <ul className="space-y-2">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-2">
                      <span className="text-gray-500">{getFileIcon(doc.type)}</span>
                      <a
                        href={doc.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-900 hover:text-gray-700 transition-colors"
                      >
                        {doc.name}
                      </a>
                      <span className="text-gray-500">
                        ({formatFileSize(doc.size)})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="ml-2 text-red-600 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 mt-8">
            <button
              type="submit"
              className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Submit Project
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}