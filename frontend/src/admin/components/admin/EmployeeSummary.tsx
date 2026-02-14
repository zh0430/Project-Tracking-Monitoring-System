import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, Employee, Status, Priority, Role, TaskDocument } from '../../App';
import { Calendar, Clock, Filter, Download, Trash2, Eye, Upload, FileText, X } from 'lucide-react';
import { DocumentManager } from './DocumentManager';
import { exportEmployeeTasksToExcel } from '../../utils/excelExport';
import { ProjectGanttChart } from './ProjectGanttChart';

interface EmployeeSummaryProps {
  employees: Employee[];
  tasks: Task[];
  statuses: Status[];
  priorities: Priority[];
  roles: Role[];
  onApproveUpdate: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (task: Task) => void;
  currentUserId: string;
}

export function EmployeeSummary({
  employees,
  tasks,
  statuses,
  priorities,
  roles,
  onApproveUpdate,
  onDeleteTask,
  onUpdateTask,
  currentUserId,
}: EmployeeSummaryProps) {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDueDate, setFilterDueDate] = useState<string>('');
  const [filterSearchText, setFilterSearchText] = useState<string>('');
  const [viewMode, setViewMode] = useState<'active' | 'historical'>('active');
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<Task | null>(null);
  const [selectedTaskForGantt, setSelectedTaskForGantt] = useState<Task | null>(null);

  useEffect(() => {
    if (employees.length === 0) return;

    if (!employeeId) {
      navigate(`/admin/summary/${employees[0].userID}`, { replace: true });
      return;
    }

    const exists = employees.some(e => e.userID === employeeId);
    if (!exists) {
      navigate(`/admin/summary/${employees[0].userID}`, { replace: true });
    }
  }, [employeeId, employees, navigate]);

  // Find selected employee based on URL parameter, default to first employee if not found
  const selectedEmployee = employeeId 
    ? employees.find(e => e.userID === employeeId)
    : employees[0];

  if (employees.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-300">
        Loading employee summary...
      </div>
    );
  }

  if (!selectedEmployee) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-300">
        Employee not found.
      </div>
    );
  }

  // Filter tasks for the selected employee using employeeId from URL
  const employeeTasks = tasks.filter(t => {
    if (Array.isArray(t.assignedToUserID)) {
      return t.assignedToUserID.includes(employeeId as string);
    }
    return t.assignedToUserID === employeeId;
  });
  
  const filteredTasks = employeeTasks.filter(task => {
    const status = statuses.find(s => s.statusID === task.statusID);
    const isCompleted = status?.statusName === 'Completed';
    
    // View mode filter - for historical, only show completed
    if (viewMode === 'historical' && !isCompleted) return false;
    // For active mode, show all tasks (including completed)
    
    // Search text filter (task ID or title)
    if (filterSearchText) {
      const searchLower = filterSearchText.toLowerCase();
      const matchesId = task.taskID.toLowerCase().includes(searchLower);
      const matchesTitle = task.title.toLowerCase().includes(searchLower);
      if (!matchesId && !matchesTitle) return false;
    }
    
    // Due date filter
    if (filterDueDate && task.dueDate !== filterDueDate) return false;
    
    // Status filter
    if (filterStatus !== 'all' && task.statusID !== filterStatus) return false;
    
    // Priority filter
    if (filterPriority !== 'all' && task.priorityID !== filterPriority) return false;
    
    return true;
  });

  const toDoTasks = filteredTasks.filter(t => {
    const status = statuses.find(s => s.statusID === t.statusID);
    return status?.statusName === 'To Do';
  });

  const inProgressTasks = filteredTasks.filter(t => {
    const status = statuses.find(s => s.statusID === t.statusID);
    return status?.statusName === 'In Progress';
  });

  const completedTasks = filteredTasks.filter(t => {
    const status = statuses.find(s => s.statusID === t.statusID);
    return status?.statusName === 'Completed';
  });

  const revisionRequiredTasks = filteredTasks.filter(t => {
    const status = statuses.find(s => s.statusID === t.statusID);
    return status?.statusName === 'Revision Required';
  });

  const role = roles.find(r => r.roleID === selectedEmployee.roleID);

  const handleExport = async () => {
    await exportEmployeeTasksToExcel(
      selectedEmployee,
      tasks,
      statuses,
      priorities
    );
  };

  const handleEmployeeChange = (newEmployeeId: string) => {
    navigate(`/admin/summary/${newEmployeeId}`);
  };

  return (
    <div className="space-y-6">
      {/* Employee Selector */}
      <div className="bg-white p-6 rounded-lg border border-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-800 text-white rounded-full flex items-center justify-center text-xl">
              {selectedEmployee.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-gray-900">{selectedEmployee.name}</h2>
              <p className="text-gray-600">{role?.roleName}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedEmployee.userID}
              onChange={e => handleEmployeeChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {employees.map(emp => (
                <option key={emp.userID} value={emp.userID}>
                  {emp.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Summary
            </button>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('active')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'active'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Active Tasks
        </button>
        <button
          onClick={() => setViewMode('historical')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'historical'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Historical Workload
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-300">
        <div className="space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="w-5 h-5 text-gray-600" />
            <input
              type="text"
              placeholder="Search by Project ID or Title..."
              value={filterSearchText}
              onChange={e => setFilterSearchText(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <input
              type="date"
              value={filterDueDate}
              onChange={e => setFilterDueDate(e.target.value)}
              placeholder="Filter by Due Date"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-5"></div>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Priority</option>
              {priorities.map(priority => (
                <option key={priority.priorityID} value={priority.priorityID}>
                  {priority.priorityLevel}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Status</option>
              {statuses.map(status => (
                <option key={status.statusID} value={status.statusID}>
                  {status.statusName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Active Tasks - Kanban Board */}
      {viewMode === 'active' && (
        <>
          {filteredTasks.length === 0 ? (
            <div className="bg-white border border-gray-300 rounded-lg p-10 text-center text-gray-500">
              <p className="text-lg font-medium mb-2">No tasks assigned</p>
              <p className="text-sm">
                This employee currently has no tasks.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* To Do Column */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <h3 className="text-gray-900">To Do</h3>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                    {toDoTasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {toDoTasks.map(task => (
                    <TaskCard
                      key={task.taskID}
                      task={task}
                      priorities={priorities}
                      statuses={statuses}
                      employees={employees}
                      onApproveUpdate={onApproveUpdate}
                      onDelete={onDeleteTask}
                    />
                  ))}
                </div>
              </div>

              {/* In Progress Column */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                  <h3 className="text-gray-900">In Progress</h3>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                    {inProgressTasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {inProgressTasks.map(task => (
                    <TaskCard
                      key={task.taskID}
                      task={task}
                      priorities={priorities}
                      statuses={statuses}
                      employees={employees}
                      onApproveUpdate={onApproveUpdate}
                      onDelete={onDeleteTask}
                    />
                  ))}
                </div>
              </div>

              {/* Revision Required Column */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                  <h3 className="text-gray-900">Revision Required</h3>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                    {revisionRequiredTasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {revisionRequiredTasks.map(task => (
                    <TaskCard
                      key={task.taskID}
                      task={task}
                      priorities={priorities}
                      statuses={statuses}
                      employees={employees}
                      onApproveUpdate={onApproveUpdate}
                      onDelete={onDeleteTask}
                    />
                  ))}
                </div>
              </div>

              {/* Completed Column */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-gray-800"></div>
                  <h3 className="text-gray-900">Completed</h3>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                    {completedTasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {completedTasks.map(task => (
                    <TaskCard
                      key={task.taskID}
                      task={task}
                      priorities={priorities}
                      statuses={statuses}
                      employees={employees}
                      onApproveUpdate={onApproveUpdate}
                      onDelete={onDeleteTask}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Historical Workload - List View */}
      {viewMode === 'historical' && (
        <div className="bg-white rounded-lg border border-gray-300">
          <div className="p-6 border-b border-gray-300">
            <h3 className="text-gray-900">Completed Tasks History</h3>
            <p className="text-gray-600 text-sm mt-1">
              Total completed: {completedTasks.length} tasks
            </p>
          </div>
          <div className="divide-y divide-gray-300">
            {completedTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No completed tasks found
              </div>
            ) : (
              completedTasks.map(task => {
                const priority = priorities.find(p => p.priorityID === task.priorityID);
                
                return (
                  <div key={task.taskID} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-gray-900 mb-1">{task.title}</h4>
                        <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                        <div className="flex gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs border ${
                            priority?.priorityLevel === 'High'
                              ? 'bg-red-100 text-red-700 border-red-300'
                              : priority?.priorityLevel === 'Medium'
                              ? 'bg-gray-200 text-gray-700 border-gray-400'
                              : 'bg-gray-100 text-gray-600 border-gray-300'
                          }`}>
                            {priority?.priorityLevel}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedTaskDetails(task)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors ml-4"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTaskDetails && (
        <TaskDetailsModal
          task={selectedTaskDetails}
          priorities={priorities}
          employees={employees}
          onClose={() => setSelectedTaskDetails(null)}
        />
      )}

      {/* Gantt Chart Modal */}
      {selectedTaskForGantt && (
        <GanttChartModal
          task={selectedTaskForGantt}
          employees={employees}
          onClose={() => setSelectedTaskForGantt(null)}
        />
      )}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  priorities: Priority[];
  statuses: Status[];
  employees: Employee[];
  onApproveUpdate: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

function TaskCard({ task, priorities, statuses, employees, onApproveUpdate, onDelete }: TaskCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const priority = priorities.find(p => p.priorityID === task.priorityID);
  const status = statuses.find(s => s.statusID === task.statusID);
  const reportedBy = employees.find(e => e.userID === task.reportedByUserID);

  const priorityColors = {
    High: 'bg-red-100 text-red-700 border-red-300',
    Medium: 'bg-gray-200 text-gray-700 border-gray-400',
    Low: 'bg-gray-100 text-gray-600 border-gray-300',
  };

  const handleDelete = () => {
    onDelete(task.taskID);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-300 hover:shadow-md transition-shadow">
      <h4 className="text-gray-900 mb-2">{task.title}</h4>
      <p className="text-gray-600 text-sm mb-3">{task.description}</p>
      
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          <div className={`inline-flex items-center px-2 py-1 rounded text-xs border ${
            priorityColors[priority?.priorityLevel as keyof typeof priorityColors] || priorityColors.Medium
          }`}>
            {priority?.priorityLevel}
          </div>
        </div>

        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Due: {task.dueDate}</span>
          </div>
          {task.completedDate && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Completed: {task.completedDate}</span>
            </div>
          )}
          <div className="text-xs text-gray-500">
            Reported by: {reportedBy?.name || 'Admin'}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onApproveUpdate(task.taskID)}
          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          Update
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
          title="Delete Task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-gray-900 mb-2">Delete Task?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TaskDetailsModalProps {
  task: Task;
  priorities: Priority[];
  employees: Employee[];
  onClose: () => void;
}

function TaskDetailsModal({ task, priorities, employees, onClose }: TaskDetailsModalProps) {
  const priority = priorities.find(p => p.priorityID === task.priorityID);
  const assignedTo = employees.find(e => e.userID === task.assignedToUserID);
  const reportedBy = employees.find(e => e.userID === task.reportedByUserID);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-300">
          <h2 className="text-gray-900">Task Details</h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-gray-900 mb-2">{task.title}</h3>
            <p className="text-gray-600">{task.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Task ID</p>
              <p className="text-gray-900">{task.taskID}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Priority</p>
              <span className={`inline-flex items-center px-3 py-1 rounded border ${
                priority?.priorityLevel === 'High'
                  ? 'bg-red-100 text-red-700 border-red-300'
                  : priority?.priorityLevel === 'Medium'
                  ? 'bg-gray-200 text-gray-700 border-gray-400'
                  : 'bg-gray-100 text-gray-600 border-gray-300'
              }`}>
                {priority?.priorityLevel}
              </span>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Assigned To</p>
              <p className="text-gray-900">{assignedTo?.name}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Reported By</p>
              <p className="text-gray-900">{reportedBy?.name || 'Admin'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Due Date</p>
              <p className="text-gray-900">{task.dueDate}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Created Date</p>
              <p className="text-gray-900">{task.createdDate}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Completed Date</p>
              <p className="text-gray-900">{task.completedDate || 'N/A'}</p>
            </div>
          </div>

          {/* Documents Section */}
          {task.documents.length > 0 && (
            <div className="pt-6 border-t border-gray-300">
              <h4 className="text-gray-900 mb-3">Attached Documents</h4>
              <DocumentManager
                documents={task.documents}
                onUpload={() => {}}
                onDelete={() => {}}
                currentUserId="admin1"
                canUpload={false}
                employees={employees}
              />
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-300">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface GanttChartModalProps {
  task: Task;
  employees: Employee[];
  onClose: () => void;
}

function GanttChartModal({ task, employees, onClose }: GanttChartModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-300 flex items-center justify-between">
          <h2 className="text-gray-900">Project Timeline</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <div className="p-6">
          <ProjectGanttChart
            task={task}
            employees={employees}
          />
        </div>

        <div className="p-6 border-t border-gray-300">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}