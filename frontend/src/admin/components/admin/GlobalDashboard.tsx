import { Task, Employee, Status, Priority, Role } from '../../App';
import { Users, ClipboardList, CheckCircle2, AlertCircle } from 'lucide-react';
import { TaskDistributionChart } from './TaskDistributionChart';
import { WorkloadByEmployeeChart } from './WorkloadByEmployeeChart';

interface GlobalDashboardProps {
  tasks: Task[];
  employees: Employee[];
  statuses: Status[];
  priorities: Priority[];
  roles: Role[];
  onViewEmployee: (employeeId: string) => void;
}

export function GlobalDashboard({
  tasks,
  employees,
  statuses,
  priorities,
  roles,
  onViewEmployee,
}: GlobalDashboardProps) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => {
    const status = statuses.find(s => s.statusID === t.statusID);
    return status?.statusName === 'Completed';
  }).length;
  const activeTasks = totalTasks - completedTasks;
  const highPriorityTasks = tasks.filter(t => {
    const priority = priorities.find(p => p.priorityID === t.priorityID);
    const status = statuses.find(s => s.statusID === t.statusID);
    return priority?.priorityLevel === 'High' && status?.statusName !== 'Completed';
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-gray-900 mb-1">Global Dashboard</h2>
        <p className="text-gray-600">Overview of all projects and employee workload</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Employees</p>
              <p className="text-gray-900 mt-1">{employees.length}</p>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-gray-700" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Projects</p>
              <p className="text-gray-900 mt-1">{activeTasks}</p>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-gray-700" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Completed Projects</p>
              <p className="text-gray-900 mt-1">{completedTasks}</p>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-gray-700" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">High Priority</p>
              <p className="text-gray-900 mt-1">{highPriorityTasks}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Employees Overview - Moved to Top */}
      <div className="bg-white rounded-lg border border-gray-300">
        <div className="p-6 border-b border-gray-300">
          <h3 className="text-gray-900">Employees Overview</h3>
          <p className="text-gray-600 text-sm mt-1">Click to view detailed project dashboard</p>
        </div>
        <div className="divide-y divide-gray-300">
          {employees.map(employee => {
            const role = roles.find(r => r.roleID === employee.roleID);
            const employeeTasks = tasks.filter(t => {
              if (Array.isArray(t.assignedToUserID)) {
                return t.assignedToUserID.includes(employee.userID);
              }
              return t.assignedToUserID === employee.userID;
            });
            const completedCount = employeeTasks.filter(t => {
              const status = statuses.find(s => s.statusID === t.statusID);
              return status?.statusName === 'Completed';
            }).length;
            const activeCount = employeeTasks.length - completedCount;

            return (
              <div
                key={employee.userID}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onViewEmployee(employee.userID)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center">
                      {employee.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-gray-900">{employee.name}</p>
                      <p className="text-gray-600 text-sm">{role?.roleName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-gray-600 text-sm">Active Projects</p>
                      <p className="text-gray-900">{activeCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600 text-sm">Completed</p>
                      <p className="text-gray-900">{completedCount}</p>
                    </div>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                      View Dashboard
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaskDistributionChart tasks={tasks} statuses={statuses} />
        <WorkloadByEmployeeChart tasks={tasks} employees={employees} />
      </div>
    </div>
  );
}