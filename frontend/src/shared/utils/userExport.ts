import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { domToPng } from 'modern-screenshot';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun
} from 'docx';

/* =====================================================
   PROJECT LIST EXPORT (ManageProject.tsx)
===================================================== */

export const exportProjectsExcel = (projects: any[]) => {
  const worksheet = XLSX.utils.json_to_sheet(projects);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
  XLSX.writeFile(workbook, 'projects.xlsx');
};

export const exportProjectsPDF = (projects: any[], formatDate: (d?: string) => string) => {
  const doc = new jsPDF();

  autoTable(doc, {
    head: [['Project ID', 'Title', 'Status', 'Priority', 'Due Date']],
    body: projects.map(p => [
      p.projectId,
      p.title,
      p.status,
      p.priority || 'Not set',
      formatDate(p.dueDate),
    ]),
  });

  doc.save('projects.pdf');
};

export const exportProjectsWord = async (projects: any[], formatDate: (d?: string) => string) => {
  const rows = [
    new TableRow({
      children: ['Project ID', 'Title', 'Status', 'Priority', 'Due Date']
        .map(h => new TableCell({ children: [new Paragraph(h)] })),
    }),
    ...projects.map(p =>
      new TableRow({
        children: [
          p.projectId,
          p.title,
          p.status,
          p.priority || 'Not set',
          formatDate(p.dueDate),
        ].map(t => new TableCell({ children: [new Paragraph(String(t))] })),
      })
    ),
  ];

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: 'Projects', heading: 1 }),
        new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, 'projects.docx');
};

/* =====================================================
   USER EXPORT (ManageUsers.tsx)
===================================================== */

export const exportUsersExcel = (data: any[]) => {
  const formatted = data.map(u => ({
    UserID: u.userID,
    Name: u.name,
    Email: u.email,
    Projects: u.projects,
  }));

  const ws = XLSX.utils.json_to_sheet(formatted);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  XLSX.writeFile(wb, 'employees.xlsx');
};

export const exportUsersPDF = (data: any[]) => {
  const doc = new jsPDF();

  autoTable(doc, {
    head: [['User ID', 'Name', 'Email', 'Projects']],
    body: data.map(u => [
      u.userID,
      u.name,
      u.email,
      u.projects,
    ]),
  });

  doc.save('employees.pdf');
};

export const exportUsersWord = async (data: any[]) => {
  const rows = [
    new TableRow({
      children: ['User ID', 'Name', 'Email', 'Projects']
        .map(h => new TableCell({ children: [new Paragraph(h)] })),
    }),
    ...data.map(u =>
      new TableRow({
        children: [
          u.userID,
          u.name,
          u.email,
          String(u.projects),
        ].map(t => new TableCell({ children: [new Paragraph(t)] })),
      })
    ),
  ];

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: 'Employees', heading: 1 }),
        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, 'employees.docx');
};

/* =====================================================
   EMPLOYEE SUMMARY EXPORT (EmployeeSummary.tsx)
===================================================== */

export const exportEmployeeSummaryExcel = async (
  employee: any,
  groupedProjects: {
    toDo: any[];
    inProgress: any[];
    completed: any[];
    revision: any[];
    historical: any[];
  },
  statuses: any[],
  priorities: any[]
) => {
  const workbook = new ExcelJS.Workbook();

  const createSheet = (name: string, data: any[]) => {
    const sheet = workbook.addWorksheet(name);

    sheet.columns = [
      { header: 'Project ID', key: 'projectId', width: 20 },
      { header: 'Title', key: 'title', width: 25 },
      { header: 'Priority', key: 'priority', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 20 },
    ];

    data.forEach(p => {
      const priority = priorities.find(pr => pr.priorityID === p.priorityID);

      sheet.addRow({
        projectId: p.projectId,
        title: p.title,
        priority: priority?.priorityLevel || 'N/A',
        dueDate: p.dueDate
          ? new Date(p.dueDate).toLocaleString('en-US')
          : 'N/A',
      });
    });
  };

  createSheet('To Do', groupedProjects.toDo);
  createSheet('In Progress', groupedProjects.inProgress);
  createSheet('Revision Required', groupedProjects.revision);
  createSheet('Completed (Active)', groupedProjects.completed);
  createSheet('Historical Workload', groupedProjects.historical);

  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${employee.name}_summary.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const exportEmployeeSummaryPDF = (
  projects: any[],
  statuses: any[],
  priorities: any[],
  employeeName: string
) => {
  const doc = new jsPDF();

  doc.text(`Employee: ${employeeName}`, 14, 15);

  // 🔥 Split data
  const active = projects.filter(p => {
    const status = statuses.find(s => s.statusID === p.statusID);
    return !(status?.statusName === 'Completed' && p.approvalStatus === 'Approved');
  });

  const historical = projects.filter(p => {
    const status = statuses.find(s => s.statusID === p.statusID);
    return status?.statusName === 'Completed' && p.approvalStatus === 'Approved';
  });

  // 🔹 ACTIVE TABLE
  doc.text('Active Projects', 14, 25);

  autoTable(doc, {
    startY: 30,
    head: [['Project ID', 'Title', 'Status', 'Priority', 'Due Date']],
    body: active.map(p => {
      const status = statuses.find(s => s.statusID === p.statusID);
      const priority = priorities.find(pr => pr.priorityID === p.priorityID);

      return [
        p.projectId,
        p.title,
        status?.statusName || 'N/A',
        priority?.priorityLevel || 'N/A',
        p.dueDate ? new Date(p.dueDate).toLocaleString('en-US') : 'N/A',
      ];
    }),
  });

  // 🔹 HISTORICAL TABLE
  const finalY = (doc as any).lastAutoTable.finalY || 40;

  doc.text('Historical Workload', 14, finalY + 10);

  autoTable(doc, {
    startY: finalY + 15,
    head: [['Project ID', 'Title', 'Status', 'Priority', 'Due Date']],
    body: historical.map(p => {
      const status = statuses.find(s => s.statusID === p.statusID);
      const priority = priorities.find(pr => pr.priorityID === p.priorityID);

      return [
        p.projectId,
        p.title,
        status?.statusName || 'N/A',
        priority?.priorityLevel || 'N/A',
        p.completedAt ? new Date(p.completedAt).toLocaleString('en-US') : 'N/A',
      ];
    }),
  });

  doc.save('employee-summary.pdf');
};

export const exportEmployeeSummaryWord = async (
  projects: any[],
  statuses: any[],
  priorities: any[],
  employeeName: string
) => {
  // 🔥 Split data
  const active = projects.filter(p => {
    const status = statuses.find(s => s.statusID === p.statusID);
    return !(status?.statusName === 'Completed' && p.approvalStatus === 'Approved');
  });

  const historical = projects.filter(p => {
    const status = statuses.find(s => s.statusID === p.statusID);
    return status?.statusName === 'Completed' && p.approvalStatus === 'Approved';
  });

  const createRows = (data: any[]) => [
    new TableRow({
      children: ['Project ID', 'Title', 'Status', 'Priority', 'Due Date']
        .map(h => new TableCell({ children: [new Paragraph(h)] })),
    }),
    ...data.map(p => {
      const status = statuses.find(s => s.statusID === p.statusID);
      const priority = priorities.find(pr => pr.priorityID === p.priorityID);

      return new TableRow({
        children: [
          p.projectId,
          p.title,
          status?.statusName || 'N/A',
          priority?.priorityLevel || 'N/A',
          p.completedAt ? new Date(p.completedAt).toLocaleString('en-US') : 'N/A',
        ].map(t => new TableCell({ children: [new Paragraph(String(t))] })),
      });
    }),
  ];

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: `Employee Summary: ${employeeName}`,
          heading: 'Heading1',
        }),

        new Paragraph({ text: 'Active Projects', heading: 'Heading2' }),
        new Table({
          rows: createRows(active),
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),

        new Paragraph({ text: 'Historical Workload', heading: 'Heading2' }),
        new Table({
          rows: createRows(historical),
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'employee-summary.docx';
  link.click();
  URL.revokeObjectURL(link.href);
};

/* =====================================================
   HISTORICAL PROJECT EXPORT (HistoricalProjectView.tsx)
===================================================== */

export const exportHistoricalExcel = (projects: any[], formatDate: any) => {
  const data = projects.map(p => ({
    'Project ID': p.projectId,
    'Project Title': p.title,
    Description: p.description,
    Priority: p.priority || 'Not set',
    'Approval Status': p.approvalStatus || 'Not set',
    'Completed Date': formatDate(p.completedAt),
    Documents: p.documents?.length || 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Completed Projects');
  XLSX.writeFile(workbook, 'completed_projects.xlsx');
};

export const exportHistoricalPDF = (projects: any[], formatDate: any) => {
  const doc = new jsPDF();

  autoTable(doc, {
    head: [[
      'Project ID',
      'Project Title',
      'Description',
      'Priority',
      'Approval Status',
      'Completed Date',
      'Documents'
    ]],
    body: projects.map(p => [
      p.projectId,
      p.title,
      p.description,
      p.priority || 'Not set',
      p.approvalStatus || 'Not set',
      formatDate(p.completedAt),
      p.documents?.length || 0,
    ]),
  });

  doc.save('completed_projects.pdf');
};

export const exportHistoricalWord = async (projects: any[], formatDate: any) => {
  const rows = [
    new TableRow({
      children: [
        'Project ID',
        'Project Title',
        'Description',
        'Priority',
        'Approval Status',
        'Completed Date',
        'Documents'
      ].map(h => new TableCell({ children: [new Paragraph(h)] })),
    }),

    ...projects.map(p =>
      new TableRow({
        children: [
          p.projectId,
          p.title,
          p.description,
          p.priority || 'Not set',
          p.approvalStatus || 'Not set',
          formatDate(p.completedAt),
          String(p.documents?.length || 0),
        ].map(val => new TableCell({
          children: [new Paragraph(String(val))]
        })),
      })
    ),
  ];

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: 'Historical Projects',
          heading: 'Heading1',
        }),
        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, 'completed_projects.docx');
};

/* =====================================================
   GANTT EXPORT (with image)
===================================================== */

export const captureElementImage = async (ref: HTMLDivElement | null) => {
  if (!ref) return null;
  return await domToPng(ref, { quality: 1, scale: 2, backgroundColor: '#fff' });
};

export const exportGanttPDF = async (
  image: string,
  tableData: any[],
  dateRangeText: string
) => {
  const doc = new jsPDF('l', 'px', 'a4');

  doc.text('Gantt Chart Report', 40, 30);
  doc.text(dateRangeText, 40, 50);

  const props = doc.getImageProperties(image);
  const width = doc.internal.pageSize.getWidth() - 80;
  const height = (props.height * width) / props.width;

  doc.addImage(image, 'PNG', 40, 70, width, height);

  autoTable(doc, {
    startY: 70 + height + 20,
    head: [['Project ID', 'Title', 'Status', 'Priority', 'Start Date', 'Due Date']],
    body: tableData,
    styles: {
      fontSize: 8,
    },
    headStyles: {
      fillColor: [31, 41, 55],
    },
  });

  doc.save('gantt.pdf');
};

export const exportGanttChartToExcel = async (
  tasks: any[],
  employees: any[],
  statuses: any[],
  priorities: any[],
  image?: string
) => {
  const workbook = new ExcelJS.Workbook();

  /* =========================
     1. GANTT CHART SHEET
  ========================= */
  const chartSheet = workbook.addWorksheet('Gantt Chart');

  if (image) {
    const imageId = workbook.addImage({
      base64: image,
      extension: 'png',
    });

    chartSheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 1200, height: 400 },
    });
  }

  /* =========================
     2. PROJECT DATA SHEET
  ========================= */
  const dataSheet = workbook.addWorksheet('Project Data');

  dataSheet.columns = [
    { header: 'Project ID', key: 'id', width: 20 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Priority', key: 'priority', width: 15 },
    { header: 'Start Date', key: 'startDate', width: 20 },
    { header: 'Due Date', key: 'dueDate', width: 20 },
  ];

  tasks.forEach(task => {
    dataSheet.addRow({
      id: task.projectId,
      title: task.title,
      status: task.status || 'N/A',
      priority: task.priority || 'N/A',
      startDate: task.createdAt
        ? new Date(task.createdAt).toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : 'N/A',
      dueDate: task.dueDate
        ? new Date(task.dueDate).toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : 'N/A',
    });
  });

  // ✅ Style header (like before)
  const headerRow = dataSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F2937' },
  };

  /* =========================
     DOWNLOAD
  ========================= */
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  downloadBlob(blob, 'gantt-chart.xlsx');
};

export const exportGanttWord = async (
  image: string,
  tableData: any[],
  dateRangeText: string
) => {
  const rows = [
    new TableRow({
      children: ['Project ID', 'Title', 'Status', 'Priority', 'Start Date', 'Due Date']
        .map(h => new TableCell({ children: [new Paragraph(h)] })),
    }),
    ...tableData.map(row =>
      new TableRow({
        children: row.map(cell =>
          new TableCell({
            children: [new Paragraph(String(cell))]
          })
        ),
      })
    ),
  ];

  // 🔥 Convert base64 → Uint8Array
  const imageData = Uint8Array.from(
    atob(image.split(',')[1]),
    c => c.charCodeAt(0)
  );

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: 'Gantt Chart Report',
          heading: 'Heading1',
        }),

        new Paragraph({
          text: dateRangeText,
        }),

        // 🔥 ADD IMAGE
        new Paragraph({
          children: [
            new ImageRun({
              data: imageData,
              transformation: {
                width: 600,
                height: 300,
              },
            }),
          ],
        }),

        new Paragraph({ text: '' }),

        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, 'gantt.docx');
};

/* =====================================================
   SHARED
===================================================== */

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);   // ✅ REQUIRED
  a.click();
  document.body.removeChild(a);   // ✅ cleanup

  URL.revokeObjectURL(url);
};