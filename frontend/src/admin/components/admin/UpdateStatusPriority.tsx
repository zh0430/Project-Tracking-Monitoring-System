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
    timeline: project.timelines || []
  });
  const [approved, setApproved] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState<ProjectTimeline>({
    milestoneID: '',
    milestone: '',
    startDate: '',
    endDate: '',
    status: 'Pending',
    updatedDate: new Date().toISOString().split('T')[0],
  });

  const assignedEmployees = Array.isArray(task.assignedToUserID)
    ? employees.filter(e => task.assignedToUserID.includes(e.userID))
    : employees.filter(e => e.userID === task.assignedToUserID);
  const reportedBy = employees.find(e => e.userID === task.reportedByUserID);
  const currentStatus = statuses.find(s => s.statusID === task.statusID);
  const currentPriority = priorities.find(p => p.priorityID === task.priorityID);

  const handleApprove = () => {
    setApproved(true);
  };

  const handleUpdate = () => {
    // If status is changed to completed, set completed date
    const newStatus = statuses.find(s => s.statusID === updatedTask.statusID);
    if (newStatus?.statusName === 'Completed' && !updatedTask.completedDate) {
      updatedTask.completedDate = new Date().toISOString().split('T')[0];
    } else if (newStatus?.statusName !== 'Completed') {
      updatedTask.completedDate = null;
    }
    
    onUpdate(updatedTask);
  };

  const handleAddMilestone = () => {
    if (!newMilestone.milestone || !newMilestone.startDate || !newMilestone.endDate) {
      alert('Please fill in all milestone fields');
      return;
    }

    const milestone: ProjectTimeline = {
      ...newMilestone,
      milestoneID: `m${Date.now()}`,
      updatedDate: new Date().toISOString().split('T')[0],
    };

    setUpdatedTask({
      ...updatedTask,
      timeline: [...(updatedTask.timeline || []), milestone],
    });

    setNewMilestone({
      milestoneID: '',
      milestone: '',
      startDate: '',
      endDate: '',
      status: 'Pending',
      updatedDate: new Date().toISOString().split('T')[0],
    });
    setShowAddMilestone(false);
  };

  const handleUpdateMilestone = (milestoneId: string, field: keyof ProjectTimeline, value: string) => {
    setUpdatedTask({
      ...updatedTask,
      timeline: updatedTask.timeline?.map(m =>
        m.milestoneID === milestoneId
          ? { ...m, [field]: value, updatedDate: new Date().toISOString().split('T')[0] }
          : m
      ),
    });
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    setUpdatedTask({
      ...updatedTask,
      timeline: updatedTask.timeline?.filter(m => m.milestoneID !== milestoneId),
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
          <h2 className="text-gray-900">Update Task Status & Priority</h2>
          <p className="text-gray-600">Review and approve changes to task</p>
        </div>
      </div>

      {/* Task Details Card */}
      <div className="bg-white p-6 rounded-lg border border-gray-300">
        <h3 className="text-gray-900 mb-4">Task Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-600 text-sm mb-1">Task ID</p>
            <p className="text-gray-900">{task.taskID}</p>
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
            <p className="text-gray-900">{task.createdDate}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Due Date</p>
            <p className="text-gray-900">{task.dueDate}</p>
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

      {/* Approval Section */}
      {!approved ? (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-300">
          <h3 className="text-gray-900 mb-2">Approve Update</h3>
          <p className="text-gray-600 mb-4">
            Do you approve updating the status and priority for this task?
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Yes, Approve
            </button>
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              No, Go Back
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white p-6 rounded-lg border border-gray-300">
            <h3 className="text-gray-900 mb-4">Update Task Details</h3>
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
            </div>

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

          {/* Project Timeline Management */}
          <div className="bg-white p-6 rounded-lg border border-gray-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-700" />
                <h3 className="text-gray-900">Project Progress Timeline</h3>
              </div>
              <button
                onClick={() => setShowAddMilestone(!showAddMilestone)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Milestone
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              Add and manage project milestones to track detailed progress. Changes will automatically update in the Gantt chart.
            </p>

            {/* Add New Milestone Form */}
            {showAddMilestone && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-300">
                <h4 className="text-gray-900 mb-3">Add New Milestone</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 mb-2 text-sm">Milestone Name</label>
                    <input
                      type="text"
                      value={newMilestone.milestone}
                      onChange={e => setNewMilestone({ ...newMilestone, milestone: e.target.value })}
                      placeholder="e.g., Initial Research, Design Phase, Testing"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2 text-sm">Start Date</label>
                    <input
                      type="date"
                      value={newMilestone.startDate}
                      onChange={e => setNewMilestone({ ...newMilestone, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2 text-sm">End Date</label>
                    <input
                      type="date"
                      value={newMilestone.endDate}
                      onChange={e => setNewMilestone({ ...newMilestone, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2 text-sm">Status</label>
                    <select
                      value={newMilestone.status}
                      onChange={e => setNewMilestone({ ...newMilestone, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
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
                    onClick={() => setShowAddMilestone(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Existing Milestones */}
            {updatedTask.timeline && updatedTask.timeline.length > 0 ? (
              <div className="space-y-3">
                {updatedTask.timeline.map(milestone => (
                  <div key={milestone.milestoneID} className="p-4 bg-gray-50 rounded-lg border border-gray-300">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={milestone.milestone}
                          onChange={e => handleUpdateMilestone(milestone.milestoneID, 'milestone', e.target.value)}
                          className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                        />
                      </div>
                      <button
                        onClick={() => handleDeleteMilestone(milestone.milestoneID)}
                        className="ml-3 p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Delete Milestone"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-gray-600 text-sm mb-1">Start Date</label>
                        <input
                          type="date"
                          value={milestone.startDate}
                          onChange={e => handleUpdateMilestone(milestone.milestoneID, 'startDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 text-sm mb-1">End Date</label>
                        <input
                          type="date"
                          value={milestone.endDate}
                          onChange={e => handleUpdateMilestone(milestone.milestoneID, 'endDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 text-sm mb-1">Status</label>
                        <select
                          value={milestone.status}
                          onChange={e => handleUpdateMilestone(milestone.milestoneID, 'status', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Last updated: {milestone.updatedDate}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-300">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-1">No milestones added yet</p>
                <p className="text-sm text-gray-500">Click &quot;Add Milestone&quot; to track detailed progress</p>
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
            />
          </div>
        </>
      )}
    </div>
  );
}