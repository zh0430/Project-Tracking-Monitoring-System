import { useState, useMemo, useEffect, useRef } from 'react';
import { Project, Employee, Status, Priority } from '../../App';
import { Calendar, Users, Filter, X, Download, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import {
  exportGanttChartToExcel,
  exportGanttPDF,
  exportGanttWord,
  captureElementImage
} from '../../../shared/utils/userexport';

interface TeamGanttChartProps {
  projects: Project[];
  employees: Employee[];
  statuses: Status[];
  priorities: Priority[];
}

const formatDisplayDate = (dateString: string) => {
  const date = new Date(dateString);

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * TEAM GANTT CHART COMPONENT
 * Interactive Gantt chart for visualizing project timelines across team members.
 * Features include:
 * - Employee and project filtering
 * - Year and date range selection
 * - Timeline visualization with progress bars
 * - Milestone tracking and detailed project views
 * - Export capabilities (Excel, PDF, Word)
 * - Responsive design with scrollable timeline
 */

export function TeamGanttChart({ projects, employees, statuses, priorities }: TeamGanttChartProps) {
  const [searchEmployee, setSearchEmployee] = useState<string>('');
  const [searchProjectId, setSearchProjectId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const currentYear = new Date().getFullYear();
  const startYear = 2026;
  const [selectedYear, setSelectedYear] = useState<number>(startYear);
  const [fromMonth, setFromMonth] = useState(`${selectedYear}-01`);
  const [toMonth, setToMonth] = useState(`${selectedYear}-12`);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const ganttRef = useRef<HTMLDivElement>(null);

  // Update fromMonth and toMonth when selectedYear changes
  useEffect(() => {
    setFromMonth(`${selectedYear}-01`);
    setToMonth(`${selectedYear}-12`);
  }, [selectedYear]);

  // Date range based on selected months
  const dateRange = useMemo(() => {
    const [fromY, fromM] = fromMonth.split('-').map(Number);
    const [toY, toM] = toMonth.split('-').map(Number);

    const start = new Date(fromY, fromM - 1, 1);
    const end = new Date(toY, toM, 0);

    end.setHours(23, 59, 59, 999);

    return { start, end };
  }, [fromMonth, toMonth]);

  // Calculate total days
  const diff = dateRange.end.getTime() - dateRange.start.getTime();
  const totalDays = diff / (1000 * 60 * 60 * 24);

  // Generate monthly markers based on date range
  const dateMarkers = useMemo(() => {
    const markers: Date[] = [];
    const current = new Date(dateRange.start);

    while (current <= dateRange.end) {
      markers.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }

    return markers;
  }, [dateRange]);

  // Calculate position percentage for timeline placement
  const calculatePosition = (date: string) => {
    const d = new Date(date);
    const dayOfYear = Math.floor((d.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const value = (dayOfYear / totalDays) * 100;
    return Math.min(Math.max(value, 0), 100);
  };

  // Calculate width percentage for timeline bars
  const calculateWidth = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    const daysDiff = diff / (1000 * 60 * 60 * 24);
    const value = Math.max((daysDiff / totalDays) * 100, 0.3);
    return Math.min(Math.max(value, 0), 100);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  // Filter projects based on search criteria and date range
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(p => {
      const isAssigned = (p.assignedToUserIDs || []).length > 0;
      const status = statuses.find(s => s.statusID === p.statusID);
      const isCompleted = status?.statusName === 'Completed';

      // ❌ Exclude completed + approved (same as EmployeeSummary)
      if (isCompleted && p.approvalStatus === 'Approved') {
        return false;
      }

      return isAssigned;
    });

    // Filter by year
    filtered = filtered.filter(p => {
      const projectStart = new Date(p.createdDate).getFullYear();
      const projectEnd = new Date(p.dueDate).getFullYear();

      if (projectStart !== selectedYear && projectEnd !== selectedYear) {
        return false;
      }

      return true;
    });

    // Filter by date range
    filtered = filtered.filter(p => {
      const start = new Date(p.createdDate);
      const end = new Date(p.dueDate);

      return end >= dateRange.start && start <= dateRange.end;
    });

    // Filter by employee
    if (searchEmployee) {
      filtered = filtered.filter(p => {
        const assignedIDs = p.assignedToUserIDs || [];
        return assignedIDs.includes(searchEmployee);
      });
    }

    // Filter by project ID/title
    if (searchProjectId) {
      filtered = filtered.filter(p =>
        p.projectId.toLowerCase().includes(searchProjectId.toLowerCase()) ||
        p.title.toLowerCase().includes(searchProjectId.toLowerCase())
      );
    }

    return filtered;
  }, [projects, searchEmployee, searchProjectId, employees, statuses, selectedYear, dateRange]);

  // Group projects by employee for organized display
  const projectsByEmployee = useMemo(() => {
    const grouped: { employee: Employee; projects: Project[] }[] = [];

    // 🔥 Filter employees FIRST
    const filteredEmployees = searchEmployee
      ? employees.filter(e => e.userID === searchEmployee)
      : employees;

    filteredEmployees.forEach(emp => {
      const empProjects = filteredProjects.filter(p =>
        (p.assignedToUserIDs || []).includes(emp.userID)
      );

      if (empProjects.length > 0) {
        grouped.push({ employee: emp, projects: empProjects });
      }
    });

    return grouped.sort((a, b) => a.employee.name.localeCompare(b.employee.name));
  }, [filteredProjects, employees, searchEmployee]);

  const handleViewDetails = (project: Project) => {
    setSelectedProjectForDetails(project);
  };

  const clearFilters = () => {
    setSearchEmployee('');
    setSearchProjectId('');
    setFromMonth(`${selectedYear}-01`);
    setToMonth(`${selectedYear}-12`);
  };

  // Export handlers for different formats
  const handleExport = async (type: 'excel' | 'pdf' | 'word') => {
    const image = await captureElementImage(ganttRef.current);
    if (!image) return;

    const tableData = filteredProjects.map(p => [
      p.projectId,
      p.title,
      statuses.find(s => s.statusID === p.statusID)?.statusName || 'N/A',
      priorities.find(pr => pr.priorityID === p.priorityID)?.priorityLevel || 'N/A'
    ]);

    const dateRangeText = `${fromMonth} to ${toMonth}`;

    if (type === 'pdf') {
      await exportGanttPDF(image, tableData, dateRangeText);
    }

    if (type === 'excel') {
      await exportGanttChartToExcel(
        filteredProjects,
        employees,
        statuses,
        priorities,
        image
      );
    }

    if (type === 'word') {
      await exportGanttWord(image, tableData, dateRangeText);
    }

    setShowExportMenu(false);
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
              <h2 className="text-gray-900">Team Projects Gantt Chart {selectedYear}</h2>
              <p className="text-gray-600 text-sm mt-1">
                Track project progress from {dateRange.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} to {dateRange.end.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => handleExport('excel')}
                    className="block w-full px-4 py-2 hover:bg-gray-100 rounded-t-lg text-left"
                  >
                    Excel
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="block w-full px-4 py-2 hover:bg-gray-100 text-left"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => handleExport('word')}
                    className="block w-full px-4 py-2 hover:bg-gray-100 rounded-b-lg text-left"
                  >
                    Word
                  </button>
                </div>
              )}
            </div>
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
              {/* Search by Employee Name */}
              <div>
                <label className="block text-gray-700 mb-2 text-sm">
                  Search by Employee
                </label>
                <select
                  value={searchEmployee}
                  onChange={(e) => setSearchEmployee(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                >
                  <option value="">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.userID} value={emp.userID}>
                      {emp.name}
                    </option>
                  ))}
                </select>
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

              {/* Year Selection */}
              <div>
                <label className="block text-gray-700 mb-2 text-sm">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                >
                  {Array.from({ length: 5 }, (_, i) => startYear + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-gray-700 mb-2 text-sm">
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="month"
                    value={fromMonth}
                    onChange={(e) => setFromMonth(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                  <span>to</span>
                  <input
                    type="month"
                    value={toMonth}
                    onChange={(e) => setToMonth(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {(searchEmployee || searchProjectId) && (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <span className="text-sm text-gray-600">Active Filters:</span>
                {searchEmployee && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                    Employee: {employees.find(e => e.userID === searchEmployee)?.name || searchEmployee}
                    <button onClick={() => setSearchEmployee('')} className="hover:bg-red-200 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {searchProjectId && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                    Project: {searchProjectId}
                    <button onClick={() => setSearchProjectId('')} className="hover:bg-red-200 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
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
        <div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t border-gray-300">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-sm">Employees</p>
            <p className="text-gray-900 text-xl">{projectsByEmployee.length}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-sm">Total Projects</p>
            <p className="text-gray-900 text-xl">{filteredProjects.length}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-sm">Time Period</p>
            <p className="text-gray-900 text-sm">Year {selectedYear}</p>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div ref={ganttRef} className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="w-full overflow-hidden">
          <div className="w-full">
            {/* Timeline Header */}
            <div className="flex border-b border-gray-300 bg-gray-50 sticky top-0 z-20">
              <div className="w-80 p-4 border-r border-gray-300">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700">Employee / Project</span>
                </div>
              </div>
              <div className="flex-1 relative h-20 p-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span className="px-2 py-1 bg-white rounded border border-gray-300">
                    {dateRange.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-gray-700">← Scroll to view full year →</span>
                  <span className="px-2 py-1 bg-white rounded border border-gray-300">
                    {dateRange.end.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="relative h-10 border-t border-gray-300">
                  {dateMarkers.map((date, idx) => {
                    const totalDuration = dateRange.end.getTime() - dateRange.start.getTime();
                    const position = ((date.getTime() - dateRange.start.getTime()) / totalDuration) * 100;
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

            <div className="max-h-[600px] overflow-y-auto">
              {/* Employee Groups */}
              {projectsByEmployee.map(({ employee, projects: employeeProjects }) => (
                <div key={employee.userID} className="border-b border-gray-200">
                  {/* Employee Header */}
                  <div className="bg-gray-50 border-b border-gray-300">
                    <div className="flex">
                      <div className="w-80 p-3 border-r border-gray-300">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center">
                            {employee.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-900">{employee.name}</p>
                            <p className="text-gray-600 text-xs">{employeeProjects.length} project{employeeProjects.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1"></div>
                    </div>
                  </div>

                  {/* Employee's Projects */}
                  {employeeProjects.map((project) => {
                    const status = statuses.find(s => s.statusID === project.statusID);
                    const hasTimeline = project.timelines && project.timelines.length > 0;

                    return (
                      <div key={project.projectId} className="flex hover:bg-gray-50 transition-colors">
                        {/* Project Info */}
                        <div className="w-80 p-4 border-r border-gray-300">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                {project.projectId}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                status?.statusName === 'Completed' ? 'bg-gray-600 text-white' :
                                status?.statusName === 'In Progress' ? 'bg-red-100 text-red-700' :
                                status?.statusName === 'Revision Required' ? 'bg-red-200 text-red-800' :
                                'bg-gray-200 text-gray-700'
                              }`}>
                                {status?.statusName}
                              </span>
                            </div>
                            <p className="text-gray-900 text-sm" title={project.title}>
                              {project.title}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                              <span>{formatDisplayDate(project.createdDate)}</span>
                              <span>→</span>
                              <span>{formatDisplayDate(project.dueDate)}</span>
                            </div>
                            {hasTimeline && (
                              <button
                                onClick={() => handleViewDetails(project)}
                                className="text-xs text-red-600 hover:text-red-700 underline"
                              >
                                View {project.timelines!.length} milestone{project.timelines!.length !== 1 ? 's' : ''}
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
                                {project.timelines!.map((milestone, idx) => (
                                  <div
                                    key={milestone.id}
                                    className="relative h-7 group"
                                    title={`${milestone.title}\n${milestone.startDate} to ${milestone.endDate}\nStatus: ${milestone.status}`}
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
                                      onClick={() => handleViewDetails(project)}
                                    >
                                      <span className="truncate">{milestone.title}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div
                                className="relative h-8 cursor-pointer group"
                                onClick={() => handleViewDetails(project)}
                                title={`${project.title}\n${project.createdDate} to ${project.dueDate}\nStatus: ${status?.statusName}`}
                              >
                                <div
                                  className={`absolute h-full rounded flex items-center px-3 text-white text-xs transition-all ${
                                    status?.statusName === 'Completed' ? 'bg-gray-600 hover:bg-gray-700' :
                                    status?.statusName === 'In Progress' ? 'bg-red-600 hover:bg-red-700' :
                                    status?.statusName === 'Revision Required' ? 'bg-red-400 hover:bg-red-500' :
                                    'bg-gray-400 hover:bg-gray-500'
                                  }`}
                                  style={{
                                    left: `${calculatePosition(project.createdDate)}%`,
                                    width: `${calculateWidth(project.createdDate, project.dueDate)}%`,
                                  }}
                                >
                                  <span className="truncate">{project.title}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Empty State */}
              {projectsByEmployee.length === 0 && (
                <div className="p-12 text-center text-gray-600">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-900 mb-1">No projects found</p>
                  <p className="text-sm">Try adjusting your search filters</p>
                </div>
              )}
            </div>
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

      {/* Project Details Modal */}
      {selectedProjectForDetails && (
        <ProjectDetailsModal
          project={selectedProjectForDetails}
          employees={employees}
          statuses={statuses}
          onClose={() => setSelectedProjectForDetails(null)}
        />
      )}
    </div>
  );
}

interface ProjectDetailsModalProps {
  project: Project;
  employees: Employee[];
  statuses: Status[];
  onClose: () => void;
}

/**
 * PROJECT DETAILS MODAL
 * Modal component displaying detailed project information including
 * assigned employees, status, dates, and timeline milestones.
 */

function ProjectDetailsModal({ project, employees, statuses, onClose }: ProjectDetailsModalProps) {
  const status = statuses.find(s => s.statusID === project.statusID);
  const assignedEmployees = (project.assignedToUserIDs || [])
    .map(userId => employees.find(e => e.userID === userId))
    .filter((e): e is Employee => e !== undefined);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-300 flex items-center justify-between">
          <div>
            <h2 className="text-gray-900">Project Progress Details</h2>
            <p className="text-gray-600 text-sm mt-1">{project.projectId} - {project.title}</p>
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
            <p className="text-gray-600">{project.description}</p>
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
              <p className="text-gray-600 text-sm mb-1">Start Date</p>
              <p className="text-gray-900">{formatDisplayDate(project.createdDate)}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Due Date</p>
              <p className="text-gray-900">{formatDisplayDate(project.dueDate)}</p>
            </div>
          </div>

          {/* Timeline/Progress Details */}
          {project.timelines && project.timelines.length > 0 ? (
            <div className="pt-4 border-t border-gray-300">
              <h4 className="text-gray-900 mb-4">Progress Timeline - Date by Date ({project.timelines.length} milestones)</h4>
              <div className="space-y-3">
                {project.timelines.map((milestone) => {
                  const start = new Date(milestone.startDate);
                  const end = new Date(milestone.endDate);
                  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  
                  return (
                    <div
                      key={milestone.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        milestone.status === 'Completed' ? 'bg-gray-50 border-gray-600' :
                        milestone.status === 'In Progress' ? 'bg-red-50 border-red-600' :
                        'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h5 className="text-gray-900">{milestone.title}</h5>
                        <span className={`px-3 py-1 rounded text-sm ${
                          milestone.status === 'Completed' ? 'bg-gray-600 text-white' :
                          milestone.status === 'In Progress' ? 'bg-red-600 text-white' :
                          'bg-gray-300 text-gray-700'
                        }`}>
                          {milestone.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Start Date</p>
                          <p className="text-gray-900">{formatDisplayDate(milestone.startDate)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">End Date</p>
                          <p className="text-gray-900">{formatDisplayDate(milestone.endDate)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Duration</p>
                          <p className="text-gray-900">{days} day{days !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      {milestone.description && (
                        <div className="mt-3">
                          <p className="text-gray-600 text-sm">Description</p>
                          <p className="text-gray-900 text-sm">{milestone.description}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-gray-300 text-center p-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-1">No detailed progress timeline available yet</p>
              <p className="text-sm text-gray-500">Timeline milestones will appear here as the employee updates progress</p>
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