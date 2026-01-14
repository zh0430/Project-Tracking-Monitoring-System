import { Task, Employee, Status, Priority } from '../App';

// Dynamically import XLSX to avoid build errors
async function loadXLSX() {
  try {
    const XLSX = await import('xlsx');
    return XLSX;
  } catch (error) {
    console.error('Failed to load xlsx library:', error);
    return null;
  }
}

export async function exportEmployeeTasksToExcel(
  employee: Employee,
  tasks: Task[],
  statuses: Status[],
  priorities: Priority[]
) {
  const XLSX = await loadXLSX();
  if (!XLSX) {
    alert('Export functionality is not available. Please try again.');
    return;
  }

  const employeeTasks = tasks.filter(t => {
    if (Array.isArray(t.assignedToUserID)) {
      return t.assignedToUserID.includes(employee.userID);
    }
    return t.assignedToUserID === employee.userID;
  });
  
  // Group tasks by status
  const todoTasks = employeeTasks.filter(t => {
    const status = statuses.find(s => s.statusID === t.statusID);
    return status?.statusName === 'To Do';
  });
  
  const inProgressTasks = employeeTasks.filter(t => {
    const status = statuses.find(s => s.statusID === t.statusID);
    return status?.statusName === 'In Progress';
  });
  
  const completedTasks = employeeTasks.filter(t => {
    const status = statuses.find(s => s.statusID === t.statusID);
    return status?.statusName === 'Completed';
  });
  
  const revisionRequiredTasks = employeeTasks.filter(t => {
    const status = statuses.find(s => s.statusID === t.statusID);
    return status?.statusName === 'Revision Required';
  });

  // Helper function to format task data
  const formatTaskData = (taskList: Task[]) => {
    return taskList.map(task => {
      const priority = priorities.find(p => p.priorityID === task.priorityID);
      const status = statuses.find(s => s.statusID === task.statusID);
      
      return {
        'Project ID': task.taskID,
        'Title': task.title,
        'Description': task.description,
        'Priority': priority?.priorityLevel || 'N/A',
        'Status': status?.statusName || 'N/A',
        'Created Date': task.createdDate,
        'Due Date': task.dueDate,
        'Completed Date': task.completedDate || 'N/A',
        'Milestones': task.timeline && task.timeline.length > 0 
          ? task.timeline.map(m => `${m.milestone} (${m.status})`).join('; ') 
          : 'None',
        'Documents': task.documents.length > 0 ? task.documents.map(d => d.fileName).join(', ') : 'None',
      };
    });
  };

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Add sheets for each status
  const todoSheet = XLSX.utils.json_to_sheet(formatTaskData(todoTasks));
  XLSX.utils.book_append_sheet(workbook, todoSheet, 'To Do');

  const inProgressSheet = XLSX.utils.json_to_sheet(formatTaskData(inProgressTasks));
  XLSX.utils.book_append_sheet(workbook, inProgressSheet, 'In Progress');

  const completedSheet = XLSX.utils.json_to_sheet(formatTaskData(completedTasks));
  XLSX.utils.book_append_sheet(workbook, completedSheet, 'Completed');

  const revisionSheet = XLSX.utils.json_to_sheet(formatTaskData(revisionRequiredTasks));
  XLSX.utils.book_append_sheet(workbook, revisionSheet, 'Revision Required');

  // Download file
  XLSX.writeFile(workbook, `${employee.name}_Projects_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export async function exportAllTasksToExcel(
  employees: Employee[],
  tasks: Task[],
  statuses: Status[],
  priorities: Priority[]
) {
  const XLSX = await loadXLSX();
  if (!XLSX) {
    alert('Export functionality is not available. Please try again.');
    return;
  }

  const formattedTasks = tasks.map(task => {
    const assignedIDs = Array.isArray(task.assignedToUserID) ? task.assignedToUserID : [task.assignedToUserID];
    const assignedEmployees = employees.filter(e => assignedIDs.includes(e.userID));
    const priority = priorities.find(p => p.priorityID === task.priorityID);
    const status = statuses.find(s => s.statusID === task.statusID);
    
    return {
      'Project ID': task.taskID,
      'Title': task.title,
      'Description': task.description,
      'Assigned To': assignedEmployees.map(e => e.name).join(', ') || 'N/A',
      'Employee Email': assignedEmployees.map(e => e.email).join(', ') || 'N/A',
      'Priority': priority?.priorityLevel || 'N/A',
      'Status': status?.statusName || 'N/A',
      'Created Date': task.createdDate,
      'Due Date': task.dueDate,
      'Completed Date': task.completedDate || 'N/A',
      'Milestones': task.timeline && task.timeline.length > 0 
        ? task.timeline.map(m => `${m.milestone} (${m.status})`).join('; ') 
        : 'None',
      'Documents': task.documents.length > 0 ? task.documents.map(d => d.fileName).join(', ') : 'None',
    };
  });

  // Create workbook and sheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(formattedTasks);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'All Projects');

  // Download file
  XLSX.writeFile(workbook, `All_Employee_Projects_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export async function exportGanttChartToExcel(
  tasks: Task[],
  employees: Employee[],
  statuses: Status[],
  priorities: Priority[]
) {
  const XLSX = await loadXLSX();
  if (!XLSX) {
    alert('Export functionality is not available. Please try again.');
    return;
  }

  const workbook = XLSX.utils.book_new();

  // Group tasks by project to create separate sheets
  const uniqueProjects = new Map<string, Task>();
  
  tasks.forEach(task => {
    if (!uniqueProjects.has(task.taskID)) {
      uniqueProjects.set(task.taskID, task);
    }
  });

  // Create a sheet for each project with Gantt-style format
  uniqueProjects.forEach((task, projectId) => {
    const assignedIDs = Array.isArray(task.assignedToUserID) ? task.assignedToUserID : [task.assignedToUserID];
    const assignedEmployees = employees.filter(e => assignedIDs.includes(e.userID));
    const priority = priorities.find(p => p.priorityID === task.priorityID);
    const status = statuses.find(s => s.statusID === task.statusID);

    // Create formatted Gantt chart data
    const ganttData = [];
    
    // Header section
    ganttData.push({
      'GANTT CHART': 'PROJECT GANTT CHART',
      '': '',
      ' ': '',
      '  ': '',
      '   ': '',
      '    ': ''
    });
    ganttData.push({
      'GANTT CHART': '',
      '': '',
      ' ': '',
      '  ': '',
      '   ': '',
      '    ': ''
    });
    
    // Project Information
    ganttData.push({
      'GANTT CHART': 'Project ID:',
      '': task.taskID,
      ' ': '',
      '  ': '',
      '   ': '',
      '    ': ''
    });
    ganttData.push({
      'GANTT CHART': 'Project Title:',
      '': task.title,
      ' ': '',
      '  ': '',
      '   ': '',
      '    ': ''
    });
    ganttData.push({
      'GANTT CHART': 'Description:',
      '': task.description,
      ' ': '',
      '  ': '',
      '   ': '',
      '    ': ''
    });
    ganttData.push({
      'GANTT CHART': 'Assigned To:',
      '': assignedEmployees.map(e => e.name).join(', '),
      ' ': '',
      '  ': '',
      '   ': '',
      '    ': ''
    });
    ganttData.push({
      'GANTT CHART': 'Priority:',
      '': priority?.priorityLevel || 'N/A',
      ' ': '',
      '  ': '',
      '   ': '',
      '    ': ''
    });
    ganttData.push({
      'GANTT CHART': 'Status:',
      '': status?.statusName || 'N/A',
      ' ': '',
      '  ': '',
      '   ': '',
      '    ': ''
    });
    ganttData.push({
      'GANTT CHART': 'Start Date:',
      '': task.createdDate,
      ' ': '',
      '  ': '',
      '   ': '',
      '    ': ''
    });
    ganttData.push({
      'GANTT CHART': 'Due Date:',
      '': task.dueDate,
      ' ': '',
      '  ': '',
      '   ': '',
      '    ': ''
    });
    ganttData.push({
      'GANTT CHART': '',
      '': '',
      ' ': '',
      '  ': '',
      '   ': '',
      '    ': ''
    });
    
    // Timeline Header
    ganttData.push({
      'GANTT CHART': 'TIMELINE',
      '': '',
      ' ': '',
      '  ': '',
      '   ': '',
      '    ': ''
    });
    ganttData.push({
      'GANTT CHART': '',
      '': '',
      ' ': '',
      '  ': '',
      '   ': '',
      '    ': ''
    });

    // Milestones/Timeline data
    if (task.timeline && task.timeline.length > 0) {
      ganttData.push({
        'GANTT CHART': 'Milestone',
        '': 'Start Date',
        ' ': 'End Date',
        '  ': 'Duration (days)',
        '   ': 'Status',
        '    ': 'Last Updated'
      });
      
      task.timeline.forEach(milestone => {
        const start = new Date(milestone.startDate);
        const end = new Date(milestone.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        ganttData.push({
          'GANTT CHART': milestone.milestone,
          '': milestone.startDate,
          ' ': milestone.endDate,
          '  ': days.toString(),
          '   ': milestone.status,
          '    ': milestone.updatedDate
        });
      });
    } else {
      ganttData.push({
        'GANTT CHART': 'Overall Project',
        '': task.createdDate,
        ' ': task.dueDate,
        '  ': calculateDuration(task.createdDate, task.dueDate).toString(),
        '   ': status?.statusName || 'N/A',
        '    ': task.completedDate || 'In Progress'
      });
    }
    
    ganttData.push({
      'GANTT CHART': '',
      '': '',
      ' ': '',
      '  ': '',
      '   ': '',
      '    ': ''
    });
    
    // Documents section
    ganttData.push({
      'GANTT CHART': 'DOCUMENTS',
      '': '',
      ' ': '',
      '  ': '',
      '   ': '',
      '    ': ''
    });
    
    if (task.documents && task.documents.length > 0) {
      ganttData.push({
        'GANTT CHART': 'File Name',
        '': 'Uploaded By',
        ' ': 'Upload Date',
        '  ': '',
        '   ': '',
        '    ': ''
      });
      
      task.documents.forEach(doc => {
        const uploader = employees.find(e => e.userID === doc.uploadedBy);
        ganttData.push({
          'GANTT CHART': doc.fileName,
          '': uploader?.name || 'Unknown',
          ' ': doc.uploadedDate,
          '  ': '',
          '   ': '',
          '    ': ''
        });
      });
    } else {
      ganttData.push({
        'GANTT CHART': 'No documents uploaded',
        '': '',
        ' ': '',
        '  ': '',
        '   ': '',
        '    ': ''
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(ganttData);
    
    // Set column widths for better formatting
    worksheet['!cols'] = [
      { wch: 30 }, // Column A
      { wch: 20 }, // Column B
      { wch: 20 }, // Column C
      { wch: 15 }, // Column D
      { wch: 15 }, // Column E
      { wch: 20 }  // Column F
    ];
    
    // Limit sheet name to 31 characters (Excel limitation)
    let sheetName = task.taskID.substring(0, 31);
    
    // Ensure unique sheet names
    let counter = 1;
    let finalSheetName = sheetName;
    while (workbook.SheetNames.includes(finalSheetName)) {
      const suffix = `_${counter}`;
      finalSheetName = sheetName.substring(0, 31 - suffix.length) + suffix;
      counter++;
    }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, finalSheetName);
  });

  // Download file
  XLSX.writeFile(workbook, `Team_Gantt_Chart_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Helper function to calculate duration
function calculateDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}