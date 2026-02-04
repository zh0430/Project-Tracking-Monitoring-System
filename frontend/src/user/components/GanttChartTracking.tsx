import { useState, useMemo, useRef } from 'react';
import { Project, ProjectTimeline, User } from '../App';
import { Calendar, Users, Filter, X, Download, ArrowLeft, CheckCircle } from 'lucide-react';
import { ProjectDetailModal } from './ProjectDetailModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, ImageRun } from 'docx';

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
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Ref for capturing the Gantt chart
  const ganttRef = useRef<HTMLDivElement>(null);
  
  // Helper function to get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // Initialize with date range (from/to months)
  const currentMonth = getCurrentMonth();
  const [fromMonth, setFromMonth] = useState<string>(currentMonth);
  const [toMonth, setToMonth] = useState<string>(currentMonth);

  // Calculate active year based on projects
  const activeYear = useMemo(() => {
    if (projects.length === 0) return new Date().getFullYear();

    const years = projects.map(p => new Date(p.createdAt).getFullYear());
    return Math.min(...years);
  }, [projects]);

  // Fixed date range: Jan 1 - Dec 31 of active year
  const dateRange = useMemo(() => {
    const [fromY, fromM] = fromMonth.split('-').map(Number);
    const [toY, toM] = toMonth.split('-').map(Number);

    const start = new Date(fromY, fromM - 1, 1);
    const end = new Date(toY, toM, 0); // last day of end month

    return { start, end };
  }, [fromMonth, toMonth]);

  // Calculate total days based on date range
  const totalDays = useMemo(() => {
    const diff = dateRange.end.getTime() - dateRange.start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }, [dateRange]);

  // Generate date markers based on date range
  const dateMarkers = useMemo(() => {
    const markers = [];
    const start = dateRange.start;
    const end = dateRange.end;
    
    // Check if range is within a single month
    const isSingleMonth = 
      start.getFullYear() === end.getFullYear() && 
      start.getMonth() === end.getMonth();
    
    if (isSingleMonth) {
      // Show weekly markers for single month
      const daysInMonth = end.getDate();
      for (let day = 1; day <= daysInMonth; day += 7) {
        markers.push(new Date(start.getFullYear(), start.getMonth(), day));
      }
      // Add the last day if not already included
      const lastDay = new Date(start.getFullYear(), start.getMonth(), daysInMonth);
      if (markers.length === 0 || markers[markers.length - 1].getDate() !== daysInMonth) {
        markers.push(lastDay);
      }
    } else {
      // Show monthly markers for multi-month range
      const current = new Date(start);
      while (current <= end) {
        markers.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
        current.setDate(1);
      }
      // Add end date if not already included
      if (markers.length === 0 || markers[markers.length - 1].getTime() !== end.getTime()) {
        markers.push(end);
      }
    }
    return markers;
  }, [dateRange]);

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
    const isSingleMonth = 
      dateRange.start.getFullYear() === dateRange.end.getFullYear() && 
      dateRange.start.getMonth() === dateRange.end.getMonth();
    
    if (isSingleMonth) {
      // Show day and month for single month view
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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

    // date range filter
    filtered = filtered.filter(project => {
      if (!project.createdAt || !project.dueDate) return false;

      const start = new Date(project.createdAt);
      const end = new Date(project.dueDate);

      // overlap check
      return end >= dateRange.start && start <= dateRange.end;
    });

    return filtered;
  }, [projects, searchProjectId, dateRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = myProjects.filter(p => p.status === 'Completed').length;
    const inProgress = myProjects.filter(p => p.status === 'In Progress').length;
    const todo = myProjects.filter(p => p.status === 'To Do').length;

    return { completed, inProgress, todo, total: myProjects.length };
  }, [myProjects]);

  const clearFilters = () => {
    setSearchProjectId('');
    const current = getCurrentMonth();
    setFromMonth(current);
    setToMonth(current);
  };

  // Capture Gantt chart as image
  const captureGanttImage = async () => {
    if (!ganttRef.current) return null;

    const clone = ganttRef.current.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.left = '-99999px';
    clone.style.top = '0';
    clone.style.background = '#ffffff';

    document.body.appendChild(clone);

    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT);
    let node = walker.currentNode as HTMLElement;

    const unsafeColor = (value: string) =>
      value.includes('oklab') || value.includes('oklch') || value.includes('color(');

    while (node) {
      const style = window.getComputedStyle(node);

      if (unsafeColor(style.color)) node.style.color = '#000000';
      if (unsafeColor(style.backgroundColor)) node.style.backgroundColor = '#ffffff';
      if (unsafeColor(style.borderColor)) node.style.borderColor = '#000000';

      node = walker.nextNode() as HTMLElement;
    }

    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    });

    document.body.removeChild(clone);

    return canvas.toDataURL('image/png');
  };

  // Export to Excel with image
  const handleExportExcel = async () => {
    try {
      const image = await captureGanttImage();
      if (!image) {
        alert('Could not capture Gantt chart image');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Gantt Chart');

      // Add image
      const imgId = workbook.addImage({
        base64: image.split(',')[1],
        extension: 'png',
      });

      sheet.addImage(imgId, {
        tl: { col: 0, row: 0 },
        ext: { width: 1200, height: 400 },
      });

      // Add data sheet
      const dataSheet = workbook.addWorksheet('Project Data');
      const exportData = myProjects.map((project) => ({
        'Project ID': project.projectId,
        'Title': project.title,
        'Status': project.status,
        'Priority': project.priority || 'N/A',
        'Start Date': project.createdAt,
        'Due Date': project.dueDate || 'N/A',
        'Category': project.workCategory,
      }));

      dataSheet.columns = [
        { header: 'Project ID', key: 'Project ID', width: 15 },
        { header: 'Title', key: 'Title', width: 30 },
        { header: 'Status', key: 'Status', width: 15 },
        { header: 'Priority', key: 'Priority', width: 12 },
        { header: 'Start Date', key: 'Start Date', width: 15 },
        { header: 'Due Date', key: 'Due Date', width: 15 },
        { header: 'Category', key: 'Category', width: 15 },
      ];

      exportData.forEach(row => {
        dataSheet.addRow(row);
      });

      // Style headers
      dataSheet.getRow(1).font = { bold: true };
      dataSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F2937' }
      };
      dataSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'gantt_chart_with_data.xlsx';
      a.click();

      URL.revokeObjectURL(url);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
      setShowExportMenu(false);
    }
  };

  // Export to PDF with image
  const handleExportPDF = async () => {
    try {
      const image = await captureGanttImage();
      if (!image) {
        alert('Could not capture Gantt chart image');
        return;
      }

      const doc = new jsPDF('l', 'px', 'a4'); // landscape

      // Title
      doc.setFontSize(20);
      doc.text('Gantt Chart Report', 40, 30);
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 40, 50);
      doc.text(`Date Range: ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`, 40, 65);

      // Add image
      doc.addImage(image, 'PNG', 40, 80, 720, 300);

      // Add project data table
      doc.setFontSize(14);
      doc.text('Project Details', 40, 400);
      
      const tableData = myProjects.map(project => [
        project.projectId,
        project.title.substring(0, 30) + (project.title.length > 30 ? '...' : ''),
        project.status,
        project.priority || 'N/A',
        project.createdAt,
        project.dueDate || 'N/A'
      ]);

      autoTable(doc, {
        startY: 410,
        head: [['Project ID', 'Title', 'Status', 'Priority', 'Start Date', 'Due Date']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [31, 41, 55] },
        margin: { left: 40, right: 40 }
      });

      doc.save('gantt_chart_report.pdf');
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Error exporting to PDF. Please try again.');
      setShowExportMenu(false);
    }
  };

  // Export to Word with image
  const handleExportWord = async () => {
    try {
      const image = await captureGanttImage();
      if (!image) {
        alert('Could not capture Gantt chart image');
        return;
      }

      const imageData = image.split(',')[1];

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ 
              text: 'Gantt Chart Report', 
              heading: 1 
            }),
            new Paragraph({
              text: `Generated on: ${new Date().toLocaleDateString()}`,
            }),
            new Paragraph({
              text: `Date Range: ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`,
            }),
            new Paragraph({}),
            new Paragraph({
              children: [
                new ImageRun({
                  data: Uint8Array.from(atob(imageData), c => c.charCodeAt(0)),
                  transformation: {
                    width: 700,
                    height: 300,
                  },
                }),
              ],
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'gantt_chart_report.docx';
      a.click();

      URL.revokeObjectURL(url);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting to Word:', error);
      alert('Error exporting to Word. Please try again.');
      setShowExportMenu(false);
    }
  };

  // Original simple Excel export
  const handleSimpleExcelExport = () => {
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
    setShowExportMenu(false);
  };

  const handleViewDetails = (project: Project) => {
    setSelectedProject(project);
  };

  // Check if any filters are active
  const hasActiveFilters = searchProjectId || fromMonth !== currentMonth || toMonth !== currentMonth;

  // Close export menu when clicking outside
  const handleClickOutside = (e: React.MouseEvent) => {
    if (showExportMenu && !(e.target as HTMLElement).closest('.export-menu-container')) {
      setShowExportMenu(false);
    }
  };

  return (
    <div className="space-y-4" onClick={handleClickOutside}>
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
              <h2 className="text-gray-900">My Projects Gantt Chart {activeYear}</h2>
              <p className="text-gray-600 text-sm mt-1">
                Track your project progress from {dateRange.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} to {dateRange.end.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative export-menu-container">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                  <button
                    onClick={handleExportExcel}
                    className="menu-btn"
                  >
                    Excel (with image)
                  </button>
                  <button
                    onClick={handleSimpleExcelExport}
                    className="menu-btn"
                  >
                    Excel (data only)
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="menu-btn"
                  >
                    PDF
                  </button>
                  <button
                    onClick={handleExportWord}
                    className="menu-btn"
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

              {/* Month Range Filter */}
              <div>
                <label className="block text-gray-700 mb-2 text-sm">
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="month"
                    value={fromMonth}
                    onChange={(e) => setFromMonth(e.target.value)}
                    min={`${activeYear}-01`}
                    max={`${activeYear}-12`}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                  <span className="text-gray-500 text-sm">to</span>
                  <input
                    type="month"
                    value={toMonth}
                    onChange={(e) => setToMonth(e.target.value)}
                    min={fromMonth}
                    max={`${activeYear}-12`}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
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
                {(fromMonth !== currentMonth || toMonth !== currentMonth) && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                    Range:
                    {new Date(fromMonth + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    →
                    {new Date(toMonth + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    <button onClick={clearFilters} className="hover:bg-red-200 rounded-full p-0.5">
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

      {/* Gantt Chart Container with ref */}
      <div ref={ganttRef}>
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="w-full">
              {/* Timeline Header */}
              <div className="flex border-b border-gray-300 bg-gray-50 sticky top-0 z-20">
                <div className="w-80 p-4 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-700">Employee / Project</span>
                  </div>
                </div>
                <div className="flex-1 relative h-20 p-2 min-w-0">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <span className="px-2 py-1 bg-white rounded border border-gray-300">
                      {dateRange.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <span className="text-gray-700">← Scroll to view timeline →</span>
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
                        <div className="flex-1 relative p-4 min-h-[100px] min-w-0">
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
                  <p className="text-gray-900 mb-1">No projects found</p>
                  <p className="text-sm">
                    {searchProjectId || fromMonth !== currentMonth || toMonth !== currentMonth
                      ? 'Try adjusting your search filters' 
                      : 'You currently have no projects assigned to you in the selected date range'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
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
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdateProject={onUpdateProject}
          onDeleteProject={onDeleteProject}
        />
      )}

      <style>{`
        .menu-btn {
          width: 100%;
          text-align: left;
          padding: 8px 16px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #374151;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        .menu-btn:hover {
          background: #f3f4f6;
        }
        .menu-btn:first-child {
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }
        .menu-btn:last-child {
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
        }
      `}</style>
    </div>
  );
}