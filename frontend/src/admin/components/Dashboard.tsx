import { Task } from '../App';
import { WorkloadChart } from './WorkloadChart';
import { StatusChart } from './StatusChart';
import { PriorityChart } from './PriorityChart';
import { CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
}

/**
 * DASHBOARD COMPONENT
 * Main dashboard displaying task analytics and metrics including:
 * - Task counts by status (To Do, In Progress, Completed)
 * - High priority task tracking
 * - Total workload hours estimation
 * - Task completion rate percentage
 * - Visual charts for status distribution, priority distribution, and workload analysis
 */

export function Dashboard({ tasks }: DashboardProps) {
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length;

  const totalEstimatedHours = tasks
    .filter(t => t.status !== 'completed')
    .reduce((sum, task) => sum + task.estimatedHours, 0);

  const completionRate = tasks.length > 0 
    ? Math.round((completedTasks / tasks.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">To Do</p>
              <p className="text-gray-900 mt-1">{todoTasks}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">In Progress</p>
              <p className="text-gray-900 mt-1">{inProgressTasks}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Completed</p>
              <p className="text-gray-900 mt-1">{completedTasks}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">High Priority</p>
              <p className="text-gray-900 mt-1">{highPriorityTasks}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-gray-900 mb-2">Total Workload</h3>
          <p className="text-gray-900">{totalEstimatedHours} hours</p>
          <p className="text-gray-500 text-sm mt-1">Estimated for active tasks</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-gray-900 mb-2">Completion Rate</h3>
          <p className="text-gray-900">{completionRate}%</p>
          <p className="text-gray-500 text-sm mt-1">{completedTasks} of {tasks.length} tasks completed</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusChart tasks={tasks} />
        <PriorityChart tasks={tasks} />
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <WorkloadChart tasks={tasks} />
      </div>
    </div>
  );
}