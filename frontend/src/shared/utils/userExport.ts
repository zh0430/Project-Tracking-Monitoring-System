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
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  XLSX.writeFile(wb, 'employees.xlsx');
};

export const exportUsersPDF = (data: any[]) => {
  const doc = new jsPDF();

  autoTable(doc, {
    head: [['User ID', 'Name', 'Email', 'Role', 'Projects']],
    body: data.map(u => [
      u.userID,
      u.name,
      u.email,
      u.role,
      u.projects,
    ]),
  });

  doc.save('employees.pdf');
};

export const exportUsersWord = async (data: any[]) => {
  const rows = [
    new TableRow({
      children: ['User ID', 'Name', 'Email', 'Role', 'Projects']
        .map(h => new TableCell({ children: [new Paragraph(h)] })),
    }),
    ...data.map(u =>
      new TableRow({
        children: [
          u.userID,
          u.name,
          u.email,
          u.role,
          String(u.projects),
        ].map(t => new TableCell({ children: [new Paragraph(t)] })),
      })
    ),
  ];

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: 'Employees', heading: 1 }),
        new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, 'employees.docx');
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
    head: [['Project ID', 'Title', 'Status', 'Priority']],
    body: tableData,
  });

  doc.save('gantt.pdf');
};

/* =====================================================
   SHARED
===================================================== */

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
