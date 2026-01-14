import { useState, useMemo } from 'react';
import { Task, Employee, Role, Status, Priority } from '../../App';
import { Calendar, Filter, X, Download, CheckCircle } from 'lucide-react';
import { exportGanttChartToExcel } from '../../utils/excelExport';

interface UserGanttChartProps {
  tasks: Task[];
  employees: Employee[];
  roles: Role[];
  statuses: Status[];
  priorities: Priority[];
  currentUserID: string;
}

export function UserGanttChart({ tasks, employees, statuses, priorities, currentUserID }: UserGanttChartProps) {
  const [searchProjectId, setSearchProjectId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);

  // Fixed date range: Jan 1, 2025 - Dec 31, 2025
  const dateRange = useMemo(() => {
    const start = new Date(2025, 0, 1); // January 1, 2025
    const end = new Date(2025, 11, 31); // December 31, 2025
    return { start, end };
  }, []);

  // Calculate total days for the year
  const totalDays = 365;

  // Generate monthly markers
  const dateMarkers = useMemo(() => {
    const markers = [];
    for (let i = 0; i < 12; i++) {
      markers.push(new Date(2025, i, 1));
    }
    return markers;
  }, []);

  const calculatePosition = (date: string) => {
    const d = new Date(date);
    const dayOfYear = Math.floor((d.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    return (dayOfYear / totalDays) * 100;
  };

  const calculateWidth = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    const daysDiff = diff / (1000 * 60 * 60 * 24);
    return Math.max((daysDiff / totalDays) * 100, 0.3);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  // Get current user info
  const currentUser = employees.find(e => e.userID === currentUserID);

  // Filter tasks to show only current user's assignments
  const myTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      const assignedIDs = Array.isArray(task.assignedToUserID) ? task.assignedToUserID : [task.assignedToUserID];
      return assignedIDs.includes(currentUserID);
    });

    // Apply project search filter if provided
    if (searchProjectId.trim()) {
      filtered = filtered.filter(t => 
        t.taskID.toLowerCase().includes(searchProjectId.toLowerCase()) ||
        t.title.toLowerCase().includes(searchProjectId.toLowerCase())
      );
    }

    return filtered;
  }, [tasks, currentUserID, searchProjectId]);

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = myTasks.filter(t => {
      const status = statuses.find(s => s.statusID === t.statusID);
      return status?.statusName === 'Completed';
    }).length;

    const inProgress = myTasks.filter(t => {
      const status = statuses.find(s => s.statusID === t.statusID);
      return status?.statusName === 'In Progress';
    }).length;

    const todo = myTasks.filter(t => {
      const status = statuses.find(s => s.statusID === t.statusID);
      return status?.statusName === 'To Do';
    }).length;

    return { completed, inProgress, todo, total: myTasks.length };
  }, [myTasks, statuses]);

  const handleViewDetails = (task: Task) => {
    setSelectedTaskForDetails(task);
  };

  const clearFilters = () => {
    setSearchProjectId('');
  };

  const handleExport = async () => {
    await exportGanttChartToExcel(myTasks, employees, statuses, priorities);
  };

  return (
    <div className="space-y-4">
      {/* Header with Search */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Calendar className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-gray-900">My Projects Gantt Chart 2025</h2>
              <p className="text-gray-600 text-sm mt-1">
                Track your assigned projects from January to December 2025
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export to Excel
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showFilters ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        {showFilters && (
          <div className="space-y-4 pb-4 border-b border-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current User Display */}
              <div>
                <label className="block text-gray-700 mb-2 text-sm">
                  Assigned To
                </label>
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-300">
                  <div className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center text-sm">
                    {currentUser?.name.charAt(0) || 'U'}
                  </div>
                  <span className="text-gray-900">{currentUser?.name || 'Current User'}</span>
                </div>
              </div>

              {/* Search by Project ID */}
              <div>
                <label className="block text-gray-700 mb-2 text-sm">
                  Search by Project ID or Title
                </label>
                <input
                  type="text"
                  value={searchProjectId}
                  onChange={(e) => setSearchProjectId(e.target.value)}
                  placeholder="Enter project ID or title..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
              </div>
            </div>

            {/* Active Filters Display */}
            {searchProjectId && (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <span className="text-sm text-gray-600">Active Filters:</span>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                  Project: {searchProjectId}
                  <button onClick={() => setSearchProjectId('')} className="hover:bg-red-200 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
                <button
                  onClick={clearFilters}
                  className="text-sm text-red-600 hover:text-red-700 underline"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 pt-4 mt-4 border-t border-gray-300">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-sm">Total Projects</p>
            <p className="text-gray-900 text-xl">{stats.total}</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-gray-600 text-sm">In Progress</p>
            <p className="text-red-600 text-xl">{stats.inProgress}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-sm">To Do</p>
            <p className="text-gray-900 text-xl">{stats.todo}</p>
          </div>
          <div className="text-center p-3 bg-gray-600 rounded-lg">
            <p className="text-white text-sm">Completed</p>
            <p className="text-white text-xl">{stats.completed}</p>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1800px]">
            {/* Timeline Header */}
            <div className="flex border-b border-gray-300 bg-gray-50 sticky top-0 z-20">
              <div className="w-96 p-4 border-r border-gray-300">
                <span className="text-gray-700">Project Details</span>
              </div>
              <div className="flex-1 relative h-20 p-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span className="px-2 py-1 bg-white rounded border border-gray-300">
                    January 2025
                  </span>
                  <span className="text-gray-700">← Scroll to view full year →</span>
                  <span className="px-2 py-1 bg-white rounded border border-gray-300">
                    December 2025
                  </span>
                </div>
                <div className="relative h-10 border-t border-gray-300">
                  {dateMarkers.map((date, idx) => {
                    const position = (idx / 12) * 100;
                    return (
                      <div
                        key={idx}
                        className="absolute top-0 text-xs text-gray-600"
                        style={{ left: `${position}%` }}
                      >
                        <div className="w-px h-3 bg-gray-400 mb-1"></div>
                        <span className="whitespace-nowrap bg-white px-1 rounded">{formatDate(date)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Projects List */}
            {myTasks.map((task) => {
              const status = statuses.find(s => s.statusID === task.statusID);
              const priority = priorities.find(p => p.priorityID === task.priorityID);
              const hasTimeline = task.timeline && task.timeline.length > 0;

              return (
                <div key={task.taskID} className="flex hover:bg-gray-50 transition-colors border-b border-gray-200">
                  {/* Project Info */}
                  <div className="w-96 p-4 border-r border-gray-300">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {task.taskID}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          status?.statusName === 'Completed' ? 'bg-gray-600 text-white' :
                          status?.statusName === 'In Progress' ? 'bg-red-100 text-red-700' :
                          status?.statusName === 'Revision Required' ? 'bg-red-200 text-red-800' :
                          'bg-gray-200 text-gray-700'
                        }`}>
                          {status?.statusName}
                        </span>
                        {priority && (
                          <span className={`px-2 py-1 rounded text-xs ${
                            priority.priorityName === 'High' ? 'bg-red-600 text-white' :
                            priority.priorityName === 'Medium' ? 'bg-red-400 text-white' :
                            'bg-gray-400 text-white'
                          }`}>
                            {priority.priorityName}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-900 text-sm" title={task.title}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span>{task.createdDate}</span>
                        <span>→</span>
                        <span>{task.dueDate}</span>
                      </div>
                      {hasTimeline && (
                        <button
                          onClick={() => handleViewDetails(task)}
                          className="text-xs text-red-600 hover:text-red-700 underline"
                        >
                          View {task.timeline!.length} milestone{task.timeline!.length !== 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Timeline Visualization */}
                  <div className="flex-1 relative p-4 min-h-[100px]">
                    <div className="relative h-full">
                      {/* Today line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                        style={{ left: `${calculatePosition(new Date().toISOString().split('T')[0])}%` }}
                      >
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full"></div>
                      </div>

                      {/* Progress Bars */}
                      {hasTimeline ? (
                        <div className="space-y-2">
                          {task.timeline!.map((milestone) => (
                            <div
                              key={milestone.milestoneID}
                              className="relative h-7 group"
                              title={`${milestone.milestone}\n${milestone.startDate} to ${milestone.endDate}\nStatus: ${milestone.status}\nPriority: ${milestone.priority}\nLast updated: ${milestone.updatedDate}`}
                            >
                              <div
                                className={`absolute h-full rounded flex items-center px-3 text-white text-xs transition-all cursor-pointer ${
                                  milestone.status === 'Completed' ? 'bg-gray-600 hover:bg-gray-700' :
                                  milestone.status === 'In Progress' ? 'bg-red-600 hover:bg-red-700' :
                                  'bg-gray-400 hover:bg-gray-500'
                                }`}
                                style={{
                                  left: `${calculatePosition(milestone.startDate)}%`,
                                  width: `${calculateWidth(milestone.startDate, milestone.endDate)}%`,
                                }}
                                onClick={() => handleViewDetails(task)}
                              >
                                <span className="truncate">{milestone.milestone}</span>
                                {milestone.status === 'Completed' && (
                                  <CheckCircle className="w-3 h-3 ml-2 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          className="relative h-8 cursor-pointer group"
                          onClick={() => handleViewDetails(task)}
                          title={`${task.title}\n${task.createdDate} to ${task.dueDate}\nStatus: ${status?.statusName}`}
                        >
                          <div
                            className={`absolute h-full rounded flex items-center px-3 text-white text-xs transition-all ${
                              status?.statusName === 'Completed' ? 'bg-gray-600 hover:bg-gray-700' :
                              status?.statusName === 'In Progress' ? 'bg-red-600 hover:bg-red-700' :
                              status?.statusName === 'Revision Required' ? 'bg-red-400 hover:bg-red-500' :
                              'bg-gray-400 hover:bg-gray-500'
                            }`}
                            style={{
                              left: `${calculatePosition(task.createdDate)}%`,
                              width: `${calculateWidth(task.createdDate, task.dueDate)}%`,
                            }}
                          >
                            <span className="truncate">{task.title}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty State */}
            {myTasks.length === 0 && (
              <div className="p-12 text-center text-gray-600">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-900 mb-1">No projects assigned</p>
                <p className="text-sm">
                  {searchProjectId 
                    ? 'Try adjusting your search filters' 
                    : 'You currently have no projects assigned to you'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h3 className="text-gray-900 mb-4">Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-700 mb-3 text-sm">Project Status</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-6 bg-gray-400 rounded"></div>
                <span className="text-gray-600 text-sm">To Do</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-6 bg-red-600 rounded"></div>
                <span className="text-gray-600 text-sm">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-6 bg-red-400 rounded"></div>
                <span className="text-gray-600 text-sm">Revision Required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-6 bg-gray-600 rounded"></div>
                <span className="text-gray-600 text-sm">Completed</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-gray-700 mb-3 text-sm">Timeline Indicators</p>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-6 bg-red-500"></div>
              <span className="text-gray-600 text-sm">Today&apos;s Date</span>
            </div>
          </div>
        </div>
      </div>

      {/* Task Details Modal */}
      {selectedTaskForDetails && (
        <TaskDetailsModal
          task={selectedTaskForDetails}
          employees={employees}
          statuses={statuses}
          priorities={priorities}
          onClose={() => setSelectedTaskForDetails(null)}
        />
      )}
    </div>
  );
}

interface TaskDetailsModalProps {
  task: Task;
  employees: Employee[];
  statuses: Status[];
  priorities: Priority[];
  onClose: () => void;
}

function TaskDetailsModal({ task, employees, statuses, priorities, onClose }: TaskDetailsModalProps) {
  const status = statuses.find(s => s.statusID === task.statusID);
  const priority = priorities.find(p => p.priorityID === task.priorityID);
  const assignedEmployees = Array.isArray(task.assignedToUserID)
    ? employees.filter(e => task.assignedToUserID.includes(e.userID))
    : employees.filter(e => e.userID === task.assignedToUserID);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-300 flex items-center justify-between">
          <div>
            <h2 className="text-gray-900">Project Progress Details</h2>
            <p className="text-gray-600 text-sm mt-1">{task.taskID} - {task.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-gray-900 mb-2">Description</h3>
            <div className="text-gray-600 whitespace-pre-wrap">{task.description}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-gray-600 text-sm mb-1">Assigned To</p>
              <div className="space-y-1">
                {assignedEmployees.map(emp => (
                  <p key={emp.userID} className="text-gray-900">{emp.name}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Current Status</p>
              <span className={`inline-flex px-3 py-1 rounded text-sm ${
                status?.statusName === 'Completed' ? 'bg-gray-600 text-white' :
                status?.statusName === 'In Progress' ? 'bg-red-100 text-red-700' :
                status?.statusName === 'Revision Required' ? 'bg-red-200 text-red-800' :
                'bg-gray-200 text-gray-700'
              }`}>
                {status?.statusName}
              </span>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Priority</p>
              <span className={`inline-flex px-3 py-1 rounded text-sm ${
                priority?.priorityName === 'High' ? 'bg-red-600 text-white' :
                priority?.priorityName === 'Medium' ? 'bg-red-400 text-white' :
                'bg-gray-400 text-white'
              }`}>
                {priority?.priorityName || 'Not set'}
              </span>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Start Date</p>
              <p className="text-gray-900">{task.createdDate}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Due Date</p>
              <p className="text-gray-900">{task.dueDate}</p>
            </div>
          </div>

          {/* Timeline/Progress Details - Date by Date */}
          {task.timeline && task.timeline.length > 0 ? (
            <div className="pt-4 border-t border-gray-300">
              <h4 className="text-gray-900 mb-4">Progress Timeline - Date by Date ({task.timeline.length} milestones)</h4>
              <div className="space-y-3">
                {task.timeline.map((milestone) => {
                  // Calculate number of days
                  const start = new Date(milestone.startDate);
                  const end = new Date(milestone.endDate);
                  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  
                  return (
                    <div
                      key={milestone.milestoneID}
                      className={`p-4 rounded-lg border-l-4 ${
                        milestone.status === 'Completed' ? 'bg-gray-50 border-gray-600' :
                        milestone.status === 'In Progress' ? 'bg-red-50 border-red-600' :
                        'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h5 className="text-gray-900">{milestone.milestone}</h5>
                          {milestone.description && (
                            <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap">{milestone.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className={`px-3 py-1 rounded text-sm ${
                            milestone.priority === 'High' ? 'bg-red-600 text-white' :
                            milestone.priority === 'Medium' ? 'bg-red-400 text-white' :
                            'bg-gray-400 text-white'
                          }`}>
                            {milestone.priority}
                          </span>
                          <span className={`px-3 py-1 rounded text-sm ${
                            milestone.status === 'Completed' ? 'bg-gray-600 text-white' :
                            milestone.status === 'In Progress' ? 'bg-red-600 text-white' :
                            'bg-gray-300 text-gray-700'
                          }`}>
                            {milestone.status}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Start Date</p>
                          <p className="text-gray-900">{milestone.startDate}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">End Date</p>
                          <p className="text-gray-900">{milestone.endDate}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Duration</p>
                          <p className="text-gray-900">{days} day{days !== 1 ? 's' : ''}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Last Updated</p>
                          <p className="text-gray-900">{milestone.updatedDate}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-gray-300 text-center p-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-1">No detailed progress timeline available yet</p>
              <p className="text-sm text-gray-500">Timeline milestones will appear here as you update progress</p>
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
