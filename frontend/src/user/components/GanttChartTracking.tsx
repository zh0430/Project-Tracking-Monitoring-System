import { useState, useMemo } from 'react';
import { Project, ProjectTimeline, User } from '../App';
import { Calendar, Users, Filter, X, Download, ArrowLeft, CheckCircle } from 'lucide-react';
import { ProjectDetailModal } from './ProjectDetailModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType } from 'docx';

interface GanttChartTrackingProps {
  projects: Project[];
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
  onBack: () => void;
}

// Mock employee data - in a real app, this would come from props
const currentEmployee = {
  userID: 'EMP001',
  name: 'John Smith',
  email: 'john.smith@company.com',
  department: 'Software Development'
};

export function GanttChartTracking({
  projects,
  onUpdateProject,
  onDeleteProject,
  onBack,
}: GanttChartTrackingProps) {
  const [searchProjectId, setSearchProjectId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // Add month filter state

  // Fixed date range: Jan 1, 2025 - Dec 31, 2025
  const dateRange = useMemo(() => {
    // If a month is selected, use that month's range
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0); // Last day of the month
      return { start, end };
    }
    // Otherwise use full year
    const start = new Date(2025, 0, 1); // January 1, 2025
    const end = new Date(2025, 11, 31); // December 31, 2025
    return { start, end };
  }, [selectedMonth]);

  // Calculate total days based on date range
  const totalDays = useMemo(() => {
    const diff = dateRange.end.getTime() - dateRange.start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }, [dateRange]);

  // Generate date markers based on selected month
  const dateMarkers = useMemo(() => {
    const markers = [];
    if (selectedMonth) {
      // Show weekly markers for the selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day += 7) {
        markers.push(new Date(year, month - 1, day));
      }
      // Add the last day if not already included
      const lastDay = new Date(year, month - 1, daysInMonth);
      if (markers[markers.length - 1].getDate() !== daysInMonth) {
        markers.push(lastDay);
      }
    } else {
      // Show monthly markers for full year
      for (let i = 0; i < 12; i++) {
        markers.push(new Date(2025, i, 1));
      }
    }
    return markers;
  }, [selectedMonth]);

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
    if (selectedMonth) {
      // Show day and month for month view
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  // Filter projects - show only current user's projects
  const myProjects = useMemo(() => {
    let filtered = [...projects];

    // Apply project search filter if provided
    if (searchProjectId.trim()) {
      filtered = filtered.filter(p => 
        p.projectId.toLowerCase().includes(searchProjectId.toLowerCase()) ||
        p.title.toLowerCase().includes(searchProjectId.toLowerCase())
      );
    }

    return filtered;
  }, [projects, searchProjectId]);

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = myProjects.filter(p => p.status === 'Completed').length;
    const inProgress = myProjects.filter(p => p.status === 'In Progress').length;
    const todo = myProjects.filter(p => p.status === 'To Do').length;

    return { completed, inProgress, todo, total: myProjects.length };
  }, [myProjects]);

  const clearFilters = () => {
    setSearchProjectId('');
    setSelectedMonth('');
  };

  const handleExport = async () => {
    const exportData = myProjects.map((project) => ({
      'Project ID': project.projectId,
      'Title': project.title,
      'Status': project.status,
      'Priority': project.priority || 'N/A',
      'Start Date': project.createdAt,
      'Due Date': project.dueDate || 'N/A',
      'Category': project.workCategory,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'My Projects Gantt Chart');
    XLSX.writeFile(workbook, 'my_gantt_chart.xlsx');
  };

  const handleViewDetails = (project: Project) => {
    setSelectedProject(project);
  };

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Manage Projects
      </button>

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
                Track your project progress from January to December 2025
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Current User Display */}
              <div>
                <label className="block text-gray-700 mb-2 text-sm">
                  Assigned To
                </label>
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-300">
                  <div className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center text-sm">
                    {currentEmployee.name.charAt(0)}
                  </div>
                  <span className="text-gray-900">{currentEmployee.name}</span>
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

              {/* Month Filter */}
              <div>
                <label className="block text-gray-700 mb-2 text-sm">
                  Filter by Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  min="2025-01"
                  max="2025-12"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
              </div>
            </div>

            {/* Active Filters Display */}
            {(searchProjectId || selectedMonth) && (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <span className="text-sm text-gray-600">Active Filters:</span>
                {searchProjectId && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                    Project: {searchProjectId}
                    <button onClick={() => setSearchProjectId('')} className="hover:bg-red-200 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedMonth && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                    Month: {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    <button onClick={() => setSelectedMonth('')} className="hover:bg-red-200 rounded-full p-0.5">
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
            <p className="text-gray-600 text-sm">Total Projects</p>
            <p className="text-gray-900 text-xl">{stats.total}</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-gray-600 text-sm">In Progress</p>
            <p className="text-red-600 text-xl">{stats.inProgress}</p>
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
              <div className="w-80 p-4 border-r border-gray-300">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700">Employee / Project</span>
                </div>
              </div>
              <div className="flex-1 relative h-20 p-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  {selectedMonth ? (
                    <>
                      <span className="px-2 py-1 bg-white rounded border border-gray-300">
                        {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <span className="text-gray-700">← Scroll to view month →</span>
                      <span className="px-2 py-1 bg-white rounded border border-gray-300">
                        {dateMarkers.length} week markers
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="px-2 py-1 bg-white rounded border border-gray-300">
                        January 2025
                      </span>
                      <span className="text-gray-700">← Scroll to view full year →</span>
                      <span className="px-2 py-1 bg-white rounded border border-gray-300">
                        December 2025
                      </span>
                    </>
                  )}
                </div>
                <div className="relative h-10 border-t border-gray-300">
                  {dateMarkers.map((date, idx) => {
                    const position = selectedMonth 
                      ? (idx / (dateMarkers.length - 1)) * 100  // Evenly distribute for month view
                      : (idx / 12) * 100; // Monthly distribution for year view
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

            {/* Employee Header */}
            {myProjects.length > 0 && (
              <div className="border-b border-gray-200">
                <div className="bg-gray-50 border-b border-gray-300">
                  <div className="flex">
                    <div className="w-80 p-3 border-r border-gray-300">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center">
                          {currentEmployee.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-900">{currentEmployee.name}</p>
                          <p className="text-gray-600 text-xs">{myProjects.length} project{myProjects.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1"></div>
                  </div>
                </div>

                {/* Employee's Projects */}
                {myProjects.map((project) => {
                  const hasTimeline = project.timelines && project.timelines.length > 0;

                  return (
                    <div key={project.id} className="flex hover:bg-gray-50 transition-colors">
                      {/* Project Info */}
                      <div className="w-80 p-4 border-r border-gray-300">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {project.projectId}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              project.status === 'Completed' ? 'bg-gray-600 text-white' :
                              project.status === 'In Progress' ? 'bg-red-100 text-red-700' :
                              project.status === 'Revision Required' ? 'bg-red-200 text-red-800' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {project.status}
                            </span>
                            {project.priority && (
                              <span className={`px-2 py-1 rounded text-xs ${
                                project.priority === 'High' ? 'bg-red-600 text-white' :
                                project.priority === 'Medium' ? 'bg-red-400 text-white' :
                                'bg-gray-400 text-white'
                              }`}>
                                {project.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-900 text-sm" title={project.title}>
                            {project.title}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <span>{project.createdAt}</span>
                            <span>→</span>
                            <span>{project.dueDate || 'No due date'}</span>
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
                              {project.timelines!.map((timeline) => (
                                <div
                                  key={timeline.id}
                                  className="relative h-7 group"
                                  title={`${timeline.title}\n${timeline.startDate} to ${timeline.endDate}\nStatus: ${timeline.status}\nPriority: ${timeline.priority || 'N/A'}`}
                                >
                                  <div
                                    className={`absolute h-full rounded flex items-center px-3 text-white text-xs transition-all cursor-pointer ${
                                      timeline.status === 'Completed' ? 'bg-gray-600 hover:bg-gray-700' :
                                      timeline.status === 'In Progress' ? 'bg-red-600 hover:bg-red-700' :
                                      'bg-gray-400 hover:bg-gray-500'
                                    }`}
                                    style={{
                                      left: `${calculatePosition(timeline.startDate)}%`,
                                      width: `${calculateWidth(timeline.startDate, timeline.endDate)}%`,
                                    }}
                                    onClick={() => handleViewDetails(project)}
                                  >
                                    <span className="truncate">{timeline.title}</span>
                                    {timeline.status === 'Completed' && (
                                      <CheckCircle className="w-3 h-3 ml-2 flex-shrink-0" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            project.createdAt && project.dueDate && (
                              <div
                                className="relative h-8 cursor-pointer group"
                                onClick={() => handleViewDetails(project)}
                                title={`${project.title}\n${project.createdAt} to ${project.dueDate}\nStatus: ${project.status}`}
                              >
                                <div
                                  className={`absolute h-full rounded flex items-center px-3 text-white text-xs transition-all ${
                                    project.status === 'Completed' ? 'bg-gray-600 hover:bg-gray-700' :
                                    project.status === 'In Progress' ? 'bg-red-600 hover:bg-red-700' :
                                    project.status === 'Revision Required' ? 'bg-red-400 hover:bg-red-500' :
                                    'bg-gray-400 hover:bg-gray-500'
                                  }`}
                                  style={{
                                    left: `${calculatePosition(project.createdAt)}%`,
                                    width: `${calculateWidth(project.createdAt, project.dueDate)}%`,
                                  }}
                                >
                                  <span className="truncate">{project.title}</span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {myProjects.length === 0 && (
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

      {/* Project Details Modal */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdateProject={onUpdateProject}
          onDeleteProject={onDeleteProject}
        />
      )}
    </div>
  );
}