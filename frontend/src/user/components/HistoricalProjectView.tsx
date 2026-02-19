import { useState } from 'react';
import { Project } from '../App';
import { ArrowLeft, CheckCircle2, Filter, FileText, Eye } from 'lucide-react';
import { ProjectDetailModal } from './ProjectDetailModal';
import { ExportDropdown } from './ExportDropdown';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType } from 'docx';

interface HistoricalProjectViewProps {
  projects: Project[];
  onBack: () => void;
}

export function HistoricalProjectView({ projects, onBack }: HistoricalProjectViewProps) {
  const [filters, setFilters] = useState({
    projectId: '',
    projectTitle: '',
    completedDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

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

  // Apply filters
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

    if (filters.completedDate) {
      if (!project.createdAt) return false;

      const projectDate = new Date(project.createdAt);
      const filterDate = new Date(filters.completedDate);

      if (
        projectDate.getFullYear() !== filterDate.getFullYear() ||
        projectDate.getMonth() !== filterDate.getMonth() ||
        projectDate.getDate() !== filterDate.getDate()
      ) {
        return false;
      }
    }

    return true;
  });

  const resetFilters = () => {
    setFilters({
      projectId: '',
      projectTitle: '',
      completedDate: '',
    });
  };

  const hasActiveFilters =
    filters.projectId ||
    filters.projectTitle ||
    filters.completedDate;

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

  const exportToExcel = () => {
    const exportData = filteredProjects.map((project) => ({
      'Project ID': project.projectId,
      'Project Title': project.title,
      Description: project.description,
      Priority: project.priority || 'Not set',
      'Approval Status': project.approvalStatus || 'Not set',
      'Completed Date': formatDisplayDate(project.createdAt),
      Effort: project.estimatedEffort || 'Not specified',
      Documents: project.documents?.length || 0,
      'Timeline Entries': project.timelines?.length || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Completed Projects');
    XLSX.writeFile(workbook, 'completed_projects.xlsx');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Completed Projects Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    autoTable(doc, {
      startY: 30,
      head: [[
        'Project ID',
        'Project Title',
        'Priority',
        'Approval Status',
        'Completed Date',
        'Effort',
        'Docs',
      ]],
      body: filteredProjects.map(project => [
        project.projectId,
        project.title,
        project.priority || 'Not set',
        project.approvalStatus || 'Not set',
        formatDisplayDate(project.createdAt),
        project.estimatedEffort || 'Not specified',
        project.documents?.length || 0,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [31, 41, 55] },
    });

    doc.save('completed_projects.pdf');
  };

  const exportToWord = async () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: 'Completed Projects Report',
              heading: 1,
            }),
            new Paragraph({
              text: `Generated on: ${new Date().toLocaleDateString()}`,
            }),
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph('Project ID')],
                    }),
                    new TableCell({
                      children: [new Paragraph('Project Title')],
                    }),
                    new TableCell({
                      children: [new Paragraph('Priority')],
                    }),
                    new TableCell({
                      children: [new Paragraph('Approval Status')],
                    }),
                    new TableCell({
                      children: [new Paragraph('Completed Date')],
                    }),
                    new TableCell({
                      children: [new Paragraph('Effort')],
                    }),
                    new TableCell({
                      children: [new Paragraph('Documents')],
                    }),
                  ],
                }),
                ...filteredProjects.map((project) => {
                  return new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph(project.projectId)],
                      }),
                      new TableCell({
                        children: [new Paragraph(project.title)],
                      }),
                      new TableCell({
                        children: [new Paragraph(project.priority || 'Not set')],
                      }),
                      new TableCell({
                        children: [new Paragraph(project.approvalStatus || 'Not set')],
                      }),
                      new TableCell({
                        children: [new Paragraph(formatDisplayDate(project.createdAt))],
                      }),
                      new TableCell({
                        children: [new Paragraph(project.estimatedEffort || 'Not specified')],
                      }),
                      new TableCell({
                        children: [new Paragraph(String(project.documents?.length || 0))],
                      }),
                    ],
                  });
                }),
              ],
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'completed_projects.docx';
    a.click();

    URL.revokeObjectURL(url);
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
              <label className="block text-gray-700 mb-2">Completed Date</label>
              <input
                type="date"
                value={filters.completedDate}
                onChange={(e) =>
                  setFilters({ ...filters, completedDate: e.target.value })
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
                <th className="text-left px-6 py-3 text-gray-700">
                  Completed Date
                </th>
                <th className="text-left px-6 py-3 text-gray-700">Effort</th>
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
                    {formatDisplayDate(project.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {project.estimatedEffort || 'Not specified'}
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