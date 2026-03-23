import { useState } from 'react';
import { Task, Status, Priority, Employee, TaskDocument, ProjectTimeline, Project } from '../../App';
import { ArrowLeft, Plus, Trash2, Calendar } from 'lucide-react';
import { DocumentManager } from './DocumentManager';

interface UpdateStatusPriorityProps {
  task: Task;
  project: Project;
  statuses: Status[];
  priorities: Priority[];
  employees: Employee[];
  onUpdate: (task: Task) => void;
  onCancel: () => void;
}

const formatDisplayDate = (date?: string) => {
  if (!date) return 'No deadline';

  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatForInput = (dateString?: string) => {
  if (!dateString) return '';

  const date = new Date(dateString);

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);

  return localDate.toISOString().slice(0, 16);
};

export function UpdateStatusPriority({
  task,
  project,
  statuses,
  priorities,
  employees,
  onUpdate,
  onCancel,
}: UpdateStatusPriorityProps) {
  const [updatedTask, setUpdatedTask] = useState<Task>({
    ...task,
    documents: project.documents || [],
    timeline: project.timelines ?? []
  });
  const [newMilestone, setNewMilestone] = useState<Partial<ProjectTimeline>>({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'To Do',
    priority: 'Not set'
  });

  const assignedEmployees = Array.isArray(task.assignedToUserID)
    ? employees.filter(e => task.assignedToUserID.includes(e.userID))
    : employees.filter(e => e.userID === task.assignedToUserID);
  const reportedBy = employees.find(e => e.userID === task.reportedByUserID);
  const currentStatus = statuses.find(s => s.statusID === task.statusID);
  const currentPriority = priorities.find(p => p.priorityID === task.priorityID);

  const handleUpdate = () => {
    // If status is changed to completed, set completed date
    const newStatus = statuses.find(s => s.statusID === updatedTask.statusID);
    if (newStatus?.statusName === 'Completed' && !updatedTask.completedDate) {
      updatedTask.completedDate = new Date().toISOString().split('T')[0];
    } else if (newStatus?.statusName !== 'Completed') {
      updatedTask.completedDate = null;
    }
    
    const selectedStatus = statuses.find(s => s.statusID === updatedTask.statusID);
    const selectedPriority = priorities.find(p => p.priorityID === updatedTask.priorityID);

    onUpdate({
      ...updatedTask,
      status: selectedStatus?.statusName,
      priority: selectedPriority?.priorityLevel,
      timelines: updatedTask.timeline, // rename here
    });
  };

  const handleAddMilestone = () => {
    if (!newMilestone.title || !newMilestone.startDate || !newMilestone.endDate) {
      alert("Please fill all required fields");
      return;
    }

    const tempMilestone = {
      id: `temp-${Date.now()}`, // temporary ID
      title: newMilestone.title,
      description: newMilestone.description || "",
      startDate: newMilestone.startDate,
      endDate: newMilestone.endDate,
      status: newMilestone.status || "To Do",
      priority: newMilestone.priority || "Not set"
    };

    setUpdatedTask({
      ...updatedTask,
      timeline: [...(updatedTask.timeline || []), tempMilestone]
    });

    setNewMilestone({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'To Do',
      priority: 'Not set'
    });
  };

  const handleUpdateMilestone = (milestoneId: string, field: keyof ProjectTimeline, value: string) => {
    setUpdatedTask({
      ...updatedTask,
      timeline: updatedTask.timeline?.map(m =>
        m.id === milestoneId ? { ...m, [field]: value } : m
      )
    });
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    setUpdatedTask({
      ...updatedTask,
      timeline: updatedTask.timeline?.filter(m => m.id !== milestoneId)
    });
  };

  const handleUploadDocument = (document: TaskDocument) => {
    setUpdatedTask({
      ...updatedTask,
      documents: [...updatedTask.documents, document],
    });
  };

  const handleDeleteDocument = (documentId: string) => {
    setUpdatedTask({
      ...updatedTask,
      documents: updatedTask.documents.filter(d => d.documentID !== documentId),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h2 className="text-gray-900">Update Project Status & Priority</h2>
          <p className="text-gray-600">Review and approve changes to project</p>
        </div>
      </div>

      {/* Project Details Card */}
      <div className="bg-white p-6 rounded-lg border border-gray-300">
        <h3 className="text-gray-900 mb-4">Project Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-600 text-sm mb-1">Project ID</p>
            <p className="text-gray-900">{project.id}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Title</p>
            <p className="text-gray-900">{task.title}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-gray-600 text-sm mb-1">Description</p>
            <p className="text-gray-900">{task.description}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Assigned To</p>
            <div className="space-y-1">
              {assignedEmployees.map(emp => (
                <p key={emp.userID} className="text-gray-900">{emp.name}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Reported By</p>
            <p className="text-gray-900">{reportedBy?.name || 'Admin'}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Created Date</p>
            <p className="text-gray-900">{formatDisplayDate(task.createdDate)}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Due Date</p>
            <p className="text-gray-900">{formatDisplayDate(task.dueDate)}</p>
          </div>
        </div>

        {/* Show existing documents uploaded by user */}
        {project.documents && project.documents.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-300">
            <h4 className="text-gray-900 mb-3">Documents Uploaded by User</h4>
            <DocumentManager
              documents={project.documents}
              onUpload={() => {}}
              onDelete={() => {}}
              currentUserId="admin1"
              canUpload={false}
              employees={employees}
              projectId={project.id}
            />
          </div>
        )}
      </div>

      {/* Current Status */}
      <div className="bg-white p-6 rounded-lg border border-gray-300">
        <h3 className="text-gray-900 mb-4">Current Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-gray-600 text-sm mb-2">Status</p>
            <div className="px-4 py-2 bg-gray-100 rounded-lg border border-gray-300">
              <p className="text-gray-900">{currentStatus?.statusName}</p>
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-2">Priority</p>
            <div className={`px-4 py-2 rounded-lg border ${
              currentPriority?.priorityLevel === 'High'
                ? 'bg-red-100 border-red-300 text-red-700'
                : currentPriority?.priorityLevel === 'Medium'
                ? 'bg-gray-200 border-gray-400 text-gray-700'
                : 'bg-gray-100 border-gray-300 text-gray-600'
            }`}>
              <p>{currentPriority?.priorityLevel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Timeline Management */}
      <div className="bg-white p-6 rounded-lg border border-gray-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-700" />
            <h3 className="text-gray-900">Project Progress Timeline</h3>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4">
          Add and manage project milestones to track detailed progress. Changes will automatically update in the Gantt chart.
        </p>

        {/* Add New Milestone Form - Always Visible */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-300">
          <h4 className="text-gray-900 mb-3">Add New Milestone</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-gray-700 mb-2 text-sm">Milestone Title *</label>
              <input
                type="text"
                value={newMilestone.title || ''}
                onChange={e => setNewMilestone({ ...newMilestone, title: e.target.value })}
                placeholder="e.g., Initial Research, Design Phase, Testing"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-700 mb-2 text-sm">Description</label>
              <textarea
                value={newMilestone.description || ''}
                onChange={e => setNewMilestone({ ...newMilestone, description: e.target.value })}
                placeholder="Describe this milestone..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2 text-sm">Start Date *</label>
              <input
                type="datetime-local"
                value={newMilestone.startDate || ''}
                onChange={e => setNewMilestone({ ...newMilestone, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2 text-sm">End Date *</label>
              <input
                type="datetime-local"
                value={newMilestone.endDate || ''}
                onChange={e => setNewMilestone({ ...newMilestone, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2 text-sm">Status</label>
              <select
                value={newMilestone.status || 'To Do'}
                onChange={e => setNewMilestone({ ...newMilestone, status: e.target.value as 'To Do' | 'In Progress' | 'Completed' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2 text-sm">Priority</label>
              <select
                value={newMilestone.priority || 'Not set'}
                onChange={e => setNewMilestone({ 
                  ...newMilestone, 
                  priority: e.target.value as 'Not set' | 'Low' | 'Medium' | 'High' 
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="Not set">Not set</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAddMilestone}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Add Milestone
            </button>
            <button
              onClick={() => {
                setNewMilestone({
                  title: '',
                  description: '',
                  startDate: '',
                  endDate: '',
                  status: 'To Do',
                  priority: 'Not set'
                });
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Clear Form
            </button>
          </div>
        </div>

        {/* Existing Milestones */}
        {updatedTask.timeline && updatedTask.timeline.length > 0 ? (
          <div className="space-y-3">
            {updatedTask.timeline.map(milestone => (
              <div key={milestone.id} className="p-4 bg-gray-50 rounded-lg border border-gray-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={milestone.title}
                      onChange={e => handleUpdateMilestone(milestone.id, 'title', e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 font-medium"
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteMilestone(milestone.id)}
                    className="ml-3 p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                    title="Delete Milestone"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Description field */}
                <div className="mb-3">
                  <textarea
                    value={milestone.description || ''}
                    onChange={e => handleUpdateMilestone(milestone.id, 'description', e.target.value)}
                    placeholder="Description..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Start Date</label>
                    <input
                      type="datetime-local"
                      value={formatForInput(milestone.startDate)}
                      onChange={e => handleUpdateMilestone(milestone.id, 'startDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">End Date</label>
                    <input
                      type="datetime-local"
                      value={formatForInput(milestone.endDate)}
                      onChange={e => handleUpdateMilestone(milestone.id, 'endDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Status</label>
                    <select
                      value={milestone.status}
                      onChange={e => handleUpdateMilestone(milestone.id, 'status', e.target.value as 'To Do' | 'In Progress' | 'Completed')}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Priority</label>
                    <select
                      value={milestone.priority || 'Not set'}
                      onChange={e => handleUpdateMilestone(
                        milestone.id, 
                        'priority', 
                        e.target.value as 'Not set' | 'Low' | 'Medium' | 'High'
                      )}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    >
                      <option value="Not set">Not set</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-300">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-1">No milestones added yet</p>
            <p className="text-sm text-gray-500">Use the form above to add your first milestone</p>
          </div>
        )}
      </div>

      {/* Document Management */}
      <div className="bg-white p-6 rounded-lg border border-gray-300">
        <DocumentManager
          documents={updatedTask.documents}
          onUpload={handleUploadDocument}
          onDelete={handleDeleteDocument}
          currentUserId="admin1"
          canUpload={true}
          employees={employees}
          projectId={project.id}
        />
      </div>

      {/* Update Project Details */}
      <div className="bg-white p-6 rounded-lg border border-gray-300">
        <h3 className="text-gray-900 mb-4">Update Project Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-gray-700 mb-2">
              Status
            </label>
            <select
              value={updatedTask.statusID}
              onChange={e => setUpdatedTask({ ...updatedTask, statusID: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {statuses.map(status => (
                <option key={status.statusID} value={status.statusID}>
                  {status.statusName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={updatedTask.priorityID}
              onChange={e => setUpdatedTask({ ...updatedTask, priorityID: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
              Due Date
            </label>
            <input
              type="datetime-local"
              value={formatForInput(updatedTask.dueDate)}
              onChange={e =>
                setUpdatedTask({ ...updatedTask, dueDate: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleUpdate}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Save Changes
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}