import { useState } from 'react';
import { Project, ProjectTimeline } from '../App';
import { ArrowLeft, Filter, Download } from 'lucide-react';
import { ProjectDetailModal } from './ProjectDetailModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface GanttChartTrackingProps {
  projects: Project[];
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
  onBack: () => void;
}

interface TimelineItem {
  id: string;
  projectId: string;
  projectTitle: string;
  title: string;
  startDate: string;
  endDate: string;
  status: ProjectTimeline['status'];
  isProjectLevel?: boolean;
}

export function GanttChartTracking({
  projects,
  onUpdateProject,
  onDeleteProject,
  onBack,
}: GanttChartTrackingProps) {
  const [filters, setFilters] = useState({
    searchTerm: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Create timeline items from projects and their timelines
  const createTimelineItems = (): TimelineItem[] => {
    const items: TimelineItem[] = [];

    projects.forEach(project => {
      // Add project-level timeline if it has dates
      if (project.createdAt && project.dueDate) {
        items.push({
          id: `proj-${project.id}`,
          projectId: project.projectId,
          projectTitle: project.title,
          title: project.title,
          startDate: project.createdAt,
          endDate: project.dueDate,
          status: project.status,
          isProjectLevel: true,
        });
      }

      // Add timeline entries from the project
      if (project.timelines && project.timelines.length > 0) {
        project.timelines.forEach(timeline => {
          items.push({
            id: `timeline-${timeline.id}`,
            projectId: project.projectId,
            projectTitle: project.title,
            title: `${project.projectId} - ${timeline.title}`,
            startDate: timeline.startDate,
            endDate: timeline.endDate,
            status: timeline.status,
            isProjectLevel: false,
          });
        });
      }
    });

    return items;
  };

  const allTimelineItems = createTimelineItems();

  // Apply filters
  const filteredItems = allTimelineItems.filter((item) => {
    if (
      filters.searchTerm &&
      !item.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
      !item.projectId.toLowerCase().includes(filters.searchTerm.toLowerCase())
    )
      return false;
    if (filters.startDate && item.startDate < filters.startDate) return false;
    if (filters.endDate && item.endDate > filters.endDate) return false;
    return true;
  });

  // Sort items by start date
  const sortedItems = [...filteredItems].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      startDate: '',
      endDate: '',
    });
  };

  const hasActiveFilters =
    filters.searchTerm || filters.startDate || filters.endDate;

  // Get status color for timeline bars
  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'To Do':
        return 'bg-gray-400';
      case 'In Progress':
        return 'bg-red-600'; // Changed from bg-gray-900 to bg-red-600
      case 'Completed':
        return 'bg-gray-500';
      case 'Revision Required':
        return 'bg-red-300'; // Changed from bg-red-600 to bg-red-300 (light red)
      default:
        return 'bg-gray-400';
    }
  };

  // Calculate gantt bar position and width
  const calculateGanttBar = (item: TimelineItem) => {
    if (!item.startDate || !item.endDate) return null;

    const allDates = sortedItems.flatMap(t => [
      new Date(t.startDate).getTime(),
      new Date(t.endDate).getTime(),
    ]);

    const minDate = Math.min(...allDates);
    const maxDate = Math.max(...allDates);
    const totalDuration = maxDate - minDate || 1;

    const startDate = new Date(item.startDate).getTime();
    const endDate = new Date(item.endDate).getTime();

    const leftPercent = ((startDate - minDate) / totalDuration) * 100;
    const widthPercent = ((endDate - startDate) / totalDuration) * 100;

    return {
      left: `${leftPercent}%`,
      width: `${Math.max(widthPercent, 2)}%`, // Minimum 2% width
    };
  };

  // Calculate timeline dates
  const getTimelineDates = () => {
    if (sortedItems.length === 0) return [];

    const allDates = sortedItems.flatMap(t => [
      new Date(t.startDate).getTime(),
      new Date(t.endDate).getTime(),
    ]);

    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));

    const dates = [];
    const current = new Date(minDate);
    
    while (current <= maxDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24 * 5)));
    }

    if (dates.length === 0 || dates[dates.length - 1].getTime() !== maxDate.getTime()) {
      dates.push(maxDate);
    }

    return dates;
  };

  const timelineDates = getTimelineDates();

  // Calculate today indicator position
  const getTodayPosition = () => {
    if (sortedItems.length === 0) return null;

    const allDates = sortedItems.flatMap(t => [
      new Date(t.startDate).getTime(),
      new Date(t.endDate).getTime(),
    ]);

    const minDate = Math.min(...allDates);
    const maxDate = Math.max(...allDates);
    const totalDuration = maxDate - minDate || 1;

    const today = new Date().getTime();
    
    // Check if today is within the timeline range
    if (today < minDate || today > maxDate) return null;

    const todayPercent = ((today - minDate) / totalDuration) * 100;
    return `${todayPercent}%`;
  };

  const todayPosition = getTodayPosition();

  const exportToExcel = () => {
    const exportData = filteredItems.map((item) => ({
      'Project ID': item.projectId,
      'Timeline Title': item.title,
      Status: item.status,
      'Start Date': item.startDate,
      'End Date': item.endDate,
      Type: item.isProjectLevel ? 'Project' : 'Timeline Entry',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gantt Chart');
    XLSX.writeFile(workbook, 'gantt_chart.xlsx');
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');

    doc.setFontSize(16);
    doc.text('Gantt Chart - Project Timeline', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    doc.autoTable({
      startY: 30,
      head: [
        [
          'Project ID',
          'Timeline Title',
          'Status',
          'Start Date',
          'End Date',
          'Type',
        ],
      ],
      body: filteredItems.map((item) => [
        item.projectId,
        item.title,
        item.status,
        item.startDate,
        item.endDate,
        item.isProjectLevel ? 'Project' : 'Timeline Entry',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [31, 41, 55] },
    });

    doc.save('gantt_chart.pdf');
  };

  // Calculate dashboard stats
  const totalProjects = projects.length;
  const year2025Projects = projects.filter(p => {
    const year = new Date(p.createdAt).getFullYear();
    return year === 2025;
  }).length;

  const handleClickTimeline = (item: TimelineItem) => {
    const project = projects.find(p => p.projectId === item.projectId);
    if (project) {
      setSelectedProject(project);
    }
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-6 text-gray-700 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Manage Projects
      </button>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-gray-900">Gantt Chart Tracking</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[150px]">
              <button
                onClick={exportToExcel}
                className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors rounded-t-lg"
              >
                Export to Excel
              </button>
              <button
                onClick={exportToPDF}
                className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors rounded-b-lg"
              >
                Export to PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-gray-700 mb-2">Total Projects</div>
          <div className="text-3xl text-gray-900">{totalProjects}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-gray-700 mb-2">Time Period</div>
          <div className="text-3xl text-gray-900">Year 2025</div>
          <div className="text-gray-600 text-sm mt-1">{year2025Projects} projects in 2025</div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">
                Search by ID or Title
              </label>
              <input
                type="text"
                placeholder="Project ID or Title"
                value={filters.searchTerm}
                onChange={(e) =>
                  setFilters({ ...filters, searchTerm: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Start Date From</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">End Date To</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-4">
              <button
                onClick={resetFilters}
                className="text-red-600 hover:text-red-700 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-6">
          <span className="text-gray-700">Status Legend:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span className="text-gray-700 text-sm">To Do</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span className="text-gray-700 text-sm">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 rounded"></div>
            <span className="text-gray-700 text-sm">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-300 rounded"></div>
            <span className="text-gray-700 text-sm">Revision Required</span>
          </div>
        </div>
      </div>

      {sortedItems.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500">
            {hasActiveFilters
              ? 'No timelines match your filters'
              : 'No projects with dates available for Gantt chart'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-4 px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Timeline Header */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex">
              <div className="w-64 px-6 py-3 border-r border-gray-200">
                <span className="text-gray-700">Timeline</span>
              </div>
              <div className="flex-1 relative px-4">
                <div className="flex justify-between items-center py-3">
                  {timelineDates.map((date, index) => (
                    <div key={index} className="text-gray-700 text-sm">
                      {date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Gantt Chart Rows */}
          <div className="divide-y divide-gray-100 relative">
            {sortedItems.map((item) => {
              const barStyle = calculateGanttBar(item);
              return (
                <div key={item.id} className="flex hover:bg-gray-50 transition-colors">
                  <div className="w-64 px-6 py-4 border-r border-gray-200">
                    <div className="text-gray-900 text-sm">{item.projectId}</div>
                    <div className="text-gray-600 text-xs truncate">
                      {item.title}
                    </div>
                    {!item.isProjectLevel && (
                      <div className="text-gray-500 text-xs mt-1 italic">Timeline Entry</div>
                    )}
                  </div>
                  <div className="flex-1 relative px-4 py-4">
                    {barStyle && (
                      <div
                        className="relative h-8"
                        style={{ paddingLeft: barStyle.left }}
                      >
                        <button
                          onClick={() => handleClickTimeline(item)}
                          className={`absolute h-8 rounded ${getStatusColor(
                            item.status
                          )} hover:opacity-80 transition-opacity cursor-pointer flex items-center justify-center text-white text-xs px-2`}
                          style={{ width: barStyle.width }}
                          title={`${item.projectId}: ${item.title}\nStatus: ${item.status}\n${item.startDate} - ${item.endDate}`}
                        >
                          <span className="truncate">{item.projectId}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Today Indicator */}
            {todayPosition && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 pointer-events-none z-10"
                style={{ left: `calc(16rem + ${todayPosition})` }}
              >
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Today
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
