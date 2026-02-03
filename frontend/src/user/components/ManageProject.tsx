import { useState, useEffect } from 'react';
import { Project } from '../App';
import { ProjectDetailModal } from './ProjectDetailModal';
import { ClipboardList, Plus, History, Filter, Check } from 'lucide-react';
import { ExportDropdown } from './ExportDropdown';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType } from 'docx';

interface ManageProjectProps {
  projects: Project[];
  onNavigateToNewProject: () => void;
  onNavigateToHistorical: () => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
}

export function ManageProject({
  projects,
  onNavigateToNewProject,
  onNavigateToHistorical,
  onUpdateProject,
  onDeleteProject,
}: ManageProjectProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filters, setFilters] = useState({
    dueDate: '',
    priority: '',
    searchTerm: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format date and time for display
  const formatDateTime = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  };

  // Format date for display in table
  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return 'No deadline';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const isTomorrow = new Date(now.setDate(now.getDate() + 1)).toDateString() === date.toDateString();
      
      if (isToday) {
        return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
      } else if (isTomorrow) {
        return `Tomorrow, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
      }
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const activeProjects = projects.filter((project) => project.status !== 'Completed');

  // Apply filters
  const filteredProjects = activeProjects.filter((project) => {
    if (filters.dueDate) {
      if (!project.dueDate) return false;

      const projectDate = new Date(project.dueDate);
      const filterDate = new Date(filters.dueDate);

      if (
        projectDate.getFullYear() !== filterDate.getFullYear() ||
        projectDate.getMonth() !== filterDate.getMonth() ||
        projectDate.getDate() !== filterDate.getDate()
      ) {
        return false;
      }
    }

    if (filters.priority && project.priority !== filters.priority) return false;

    if (
      filters.searchTerm &&
      !project.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
      !project.projectId.toLowerCase().includes(filters.searchTerm.toLowerCase())
    )
      return false;

    return true;
  });

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'Completed':
        return 'bg-gray-200 text-gray-800';
      case 'In Progress':
        return 'bg-gray-800 text-white';
      case 'Blocked':
        return 'bg-red-600 text-white';
      case 'Revision Required':
        return 'bg-red-100 text-red-800 border border-red-300';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'High':
        return 'text-red-600';
      case 'Medium':
        return 'text-gray-700';
      case 'Low':
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  };

  const resetFilters = () => {
    setFilters({
      dueDate: '',
      priority: '',
      searchTerm: '',
    });
  };

  const hasActiveFilters =
    filters.dueDate ||
    filters.priority ||
    filters.searchTerm;

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredProjects);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
    XLSX.writeFile(workbook, 'projects.xlsx');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    autoTable(doc, {
      head: [['Project ID', 'Project Title', 'Status', 'Priority', 'Due Date']],
      body: filteredProjects.map((project) => [
        project.projectId,
        project.title,
        project.status,
        project.priority || 'Not set',
        project.dueDate ? formatDisplayDate(project.dueDate) : 'No deadline',
      ]),
    });

    doc.save('projects.pdf');
  };

  const exportToWord = async () => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'Projects', heading: 1 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Project ID')] }),
                  new TableCell({ children: [new Paragraph('Project Title')] }),
                  new TableCell({ children: [new Paragraph('Status')] }),
                  new TableCell({ children: [new Paragraph('Priority')] }),
                  new TableCell({ children: [new Paragraph('Due Date')] }),
                ],
              }),
              ...filteredProjects.map(project =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(project.projectId)] }),
                    new TableCell({ children: [new Paragraph(project.title)] }),
                    new TableCell({ children: [new Paragraph(project.status)] }),
                    new TableCell({ children: [new Paragraph(project.priority || 'Not set')] }),
                    new TableCell({
                      children: [new Paragraph(
                        project.dueDate ? formatDisplayDate(project.dueDate) : 'No deadline'
                      )],
                    }),
                  ],
                })
              ),
            ],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc); // ✅ important change
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects.docx';
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-gray-700" />
          <h2 className="text-gray-900">Manage Projects</h2>
        </div>
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
          <button
            onClick={onNavigateToHistorical}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
          >
            <History className="w-4 h-4" />
            View Historical Work
          </button>
          <button
            onClick={onNavigateToNewProject}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
          <ExportDropdown
            onExportExcel={exportToExcel}
            onExportPDF={exportToPDF}
            onExportWord={exportToWord}
          />
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">Search</label>
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
              <label className="block text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={filters.dueDate}
                onChange={(e) =>
                  setFilters({ ...filters, dueDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) =>
                  setFilters({ ...filters, priority: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
              >
                <option value="">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
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

      {filteredProjects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            {hasActiveFilters ? 'No projects match your filters' : 'No active projects'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={resetFilters}
              className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
            >
              Clear Filters
            </button>
          ) : (
            <button
              onClick={onNavigateToNewProject}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Create Your First Project
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Last Updated Time */}
          <div className="flex items-center gap-2 mb-4 text-gray-700">
            <Check className="w-4 h-4 text-green-600" />
            <span>Last Updated {formatDateTime(currentDateTime)}</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-700 whitespace-nowrap">Project ID</th>
                  <th className="text-left px-6 py-3 text-gray-700">Project Title</th>
                  <th className="text-left px-6 py-3 text-gray-700">Status</th>
                  <th className="text-left px-6 py-3 text-gray-700">Priority</th>
                  <th className="text-left px-6 py-3 text-gray-700 whitespace-nowrap">Due Date</th>
                  <th className="text-left px-6 py-3 text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-gray-900 whitespace-nowrap align-top">{project.projectId}</td>
                    <td className="px-6 py-4 align-top">
                      <div>
                        <div className="text-gray-900">{project.title}</div>
                        <div className="text-gray-500 text-sm mt-1 whitespace-pre-wrap">
                          {project.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-start">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded text-sm ${getStatusColor(
                            project.status
                          )}`}
                        >
                          {project.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className={`${getPriorityColor(project.priority)}`}>
                        {project.priority || 'Not set'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap align-top">
                      {formatDisplayDate(project.dueDate)}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <button
                        onClick={() => setSelectedProject(project)}
                        className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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