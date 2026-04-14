import { useState } from 'react';
import { Project } from '../App';
import { ArrowLeft, CheckCircle2, Filter, FileText, Eye } from 'lucide-react';
import { ProjectDetailModal } from './ProjectDetailModal';
import { ExportDropdown } from './ExportDropdown';
import {
  exportHistoricalExcel,
  exportHistoricalPDF,
  exportHistoricalWord
} from '../../shared/utils/userExport';

interface HistoricalProjectViewProps {
  projects: Project[];
  onBack: () => void;
}

/**
 * HISTORICAL PROJECT VIEW COMPONENT
 * Displays completed and approved projects (historical workload) with filtering and export capabilities.
 * Features include:
 * - Filtering by project ID, title, and completion date range
 * - Export to Excel, PDF, and Word formats
 * - Tabular view with project details (ID, title, description, priority, approval status, etc.)
 * - Document count indicator
 * - Read-only project detail modal for viewing historical project information
 */

export function HistoricalProjectView({ projects, onBack }: HistoricalProjectViewProps) {
  const [filters, setFilters] = useState({
    projectId: '',
    projectTitle: '',
    completedFrom: '',
    completedTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Filter only completed and approved projects (historical workload)
  const completedProjects = projects.filter(
    project =>
      project.status === 'Completed' &&
      project.approvalStatus === 'Approved'
  );

  // Format date for display
  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return 'No date';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';

      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Apply filters to historical projects
  const filteredProjects = completedProjects.filter((project) => {
    if (
      filters.projectId &&
      !project.projectId.toLowerCase().includes(filters.projectId.toLowerCase())
    )
      return false;

    if (
      filters.projectTitle &&
      !project.title.toLowerCase().includes(filters.projectTitle.toLowerCase())
    )
      return false;

    if (filters.completedFrom || filters.completedTo) {
      if (!project.completedAt) return false;

      const projectDate = new Date(project.completedAt);

      if (filters.completedFrom) {
        const from = new Date(filters.completedFrom);
        if (projectDate < from) return false;
      }

      if (filters.completedTo) {
        const to = new Date(filters.completedTo);
        to.setHours(23, 59, 59, 999);
        if (projectDate > to) return false;
      }
    }

    return true;
  });

  const resetFilters = () => {
    setFilters({
      projectId: '',
      projectTitle: '',
      completedFrom: '',
      completedTo: '',
    });
  };

  const hasActiveFilters =
    filters.projectId ||
    filters.projectTitle ||
    filters.completedFrom ||
    filters.completedTo;

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

  const exportToExcel = () =>
    exportHistoricalExcel(filteredProjects, formatDisplayDate);

  const exportToPDF = () =>
    exportHistoricalPDF(filteredProjects, formatDisplayDate);

  const exportToWord = () =>
    exportHistoricalWord(filteredProjects, formatDisplayDate);

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
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-gray-700" />
          <h2 className="text-gray-900">Historical Work</h2>
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
              <label className="block text-gray-700 mb-2">Project ID</label>
              <input
                type="text"
                placeholder="Search by Project ID"
                value={filters.projectId}
                onChange={(e) =>
                  setFilters({ ...filters, projectId: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Project Title</label>
              <input
                type="text"
                placeholder="Search by Title"
                value={filters.projectTitle}
                onChange={(e) =>
                  setFilters({ ...filters, projectTitle: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Completed Date (From)</label>
              <input
                type="date"
                value={filters.completedFrom}
                onChange={(e) =>
                  setFilters({ ...filters, completedFrom: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Completed Date (To)</label>
              <input
                type="date"
                value={filters.completedTo}
                onChange={(e) =>
                  setFilters({ ...filters, completedTo: e.target.value })
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

      {filteredProjects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            {hasActiveFilters
              ? 'No approved completed projects match your filters'
              : 'No approved completed projects yet'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-gray-700">Project ID</th>
                <th className="text-left px-6 py-3 text-gray-700">Project Title</th>
                <th className="text-left px-6 py-3 text-gray-700">Description</th>
                <th className="text-left px-6 py-3 text-gray-700">Priority</th>
                <th className="text-left px-6 py-3 text-gray-700">Approval Status</th>
                <th className="text-left px-6 py-3 text-gray-700">Completed Date</th>
                <th className="text-left px-6 py-3 text-gray-700">Documents</th>
                <th className="text-left px-6 py-3 text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-gray-900">{project.projectId}</td>
                  <td className="px-6 py-4 text-gray-900">{project.title}</td>
                  <td className="px-6 py-4 text-gray-700">{project.description}</td>
                  <td className="px-6 py-4">
                    <span className={`${getPriorityColor(project.priority)}`}>
                      {project.priority || 'Not set'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      project.approvalStatus === 'Approved' 
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : project.approvalStatus === 'Pending'
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        : project.approvalStatus === 'Rejected'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}>
                      {project.approvalStatus || 'Not set'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {formatDisplayDate(project.completedAt)}
                  </td>
                  <td className="px-6 py-4">
                    {project.documents && project.documents.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-900">
                          {project.documents.length} file{project.documents.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">No files</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedProject(project)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <p className="text-gray-700">
              Total Approved Completed Projects:{' '}
              <span className="text-gray-900">{filteredProjects.length}</span>
              {hasActiveFilters && (
                <span className="text-gray-500 ml-2">
                  (filtered from {completedProjects.length} total)
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdateProject={() => {}}
          onDeleteProject={() => {}}
          readOnly={true}
        />
      )}
    </div>
  );
}