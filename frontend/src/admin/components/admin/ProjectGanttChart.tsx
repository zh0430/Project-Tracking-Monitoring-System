import { Task, ProjectTimeline, Employee } from '../../App';
import { Calendar } from 'lucide-react';
import { useMemo } from 'react';

interface ProjectGanttChartProps {
  task: Task;
  employees: Employee[];
}

export function ProjectGanttChart({ task, employees }: ProjectGanttChartProps) {
  const timeline = task.timeline || [];

  // Calculate the date range for the gantt chart
  const dateRange = useMemo(() => {
    if (timeline.length === 0) {
      const start = new Date(task.createdDate);
      const end = new Date(task.dueDate);
      return { start, end };
    }

    const dates = timeline.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
    const start = new Date(Math.min(...dates.map(d => d.getTime())));
    const end = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return { start, end };
  }, [timeline, task.createdDate, task.dueDate]);

  // Calculate total days
  const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Generate date markers (show dates at intervals)
  const dateMarkers = useMemo(() => {
    const markers = [];
    const interval = Math.max(1, Math.floor(totalDays / 10));
    
    for (let i = 0; i < totalDays; i += interval) {
      const date = new Date(dateRange.start);
      date.setDate(date.getDate() + i);
      markers.push(date);
    }
    
    // Always include the end date
    markers.push(dateRange.end);
    
    return markers;
  }, [dateRange, totalDays]);

  const calculatePosition = (date: string) => {
    const d = new Date(date);
    const diff = d.getTime() - dateRange.start.getTime();
    const daysDiff = diff / (1000 * 60 * 60 * 24);
    return (daysDiff / totalDays) * 100;
  };

  const calculateWidth = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    const daysDiff = diff / (1000 * 60 * 60 * 24);
    return (daysDiff / totalDays) * 100;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-gray-600';
      case 'in progress':
        return 'bg-red-600';
      case 'to do':
        return 'bg-gray-300';
      case 'revision required':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  // Get assigned team members
  const assignedEmployees = useMemo(() => {
    const userIDs = Array.isArray(task.assignedToUserID) 
      ? task.assignedToUserID 
      : [task.assignedToUserID];
    return employees.filter(e => userIDs.includes(e.userID));
  }, [task.assignedToUserID, employees]);

  if (timeline.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-700" />
          <h3 className="text-gray-900">Project Timeline</h3>
        </div>
        <div className="text-center py-8 text-gray-600">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p>No timeline milestones have been added yet</p>
          <p className="text-sm mt-1">Staff members can add milestones as they work on the project</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-700" />
            <h3 className="text-gray-900">Project Timeline - {task.title}</h3>
          </div>
          <div className="text-sm text-gray-600">
            {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
          </div>
        </div>
        
        {/* Team Members */}
        {assignedEmployees.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-600">Team:</span>
            <div className="flex items-center gap-2">
              {assignedEmployees.map(emp => (
                <div key={emp.userID} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-sm">
                  <div className="w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs">
                    {emp.name.charAt(0)}
                  </div>
                  <span className="text-gray-700">{emp.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Gantt Chart */}
      <div className="space-y-4">
        {/* Date markers */}
        <div className="relative h-8 border-b border-gray-300">
          {dateMarkers.map((date, idx) => {
            const position = ((date.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
            return (
              <div
                key={idx}
                className="absolute top-0 text-xs text-gray-600"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-px h-2 bg-gray-400 mx-auto mb-1"></div>
                {formatDate(date)}
              </div>
            );
          })}
        </div>

        {/* Timeline bars */}
        <div className="space-y-3">
          {timeline.map((milestone) => (
            <div key={milestone.milestoneID} className="relative">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm text-gray-900">{milestone.milestone}</span>
                <span className="text-xs text-gray-600">
                  {formatDate(new Date(milestone.startDate))} - {formatDate(new Date(milestone.endDate))}
                </span>
              </div>
              <div className="relative h-10 bg-gray-100 rounded">
                <div
                  className={`absolute h-full rounded ${getStatusColor(milestone.status)} flex items-center px-2 text-white text-sm transition-all`}
                  style={{
                    left: `${calculatePosition(milestone.startDate)}%`,
                    width: `${calculateWidth(milestone.startDate, milestone.endDate)}%`,
                  }}
                >
                  <span className="truncate">{milestone.status}</span>
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Updated: {formatDate(new Date(milestone.updatedDate))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-300">
          <span className="text-sm text-gray-700">Status:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
            <span className="text-sm text-gray-600">To Do</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span className="text-sm text-gray-600">In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-400 rounded"></div>
            <span className="text-sm text-gray-600">Revision Required</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-600 rounded"></div>
            <span className="text-sm text-gray-600">Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
