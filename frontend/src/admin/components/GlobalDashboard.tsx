import { useState } from 'react';
import { Employee, Status, Priority, Role, Project } from '../../App';
import { Users, ClipboardList, CheckCircle2, AlertCircle } from 'lucide-react';
import { ProjectDistributionChart } from './ProjectDistributionChart';
import { IncompleteProjectsChart } from './IncompleteProjectsChart';

interface GlobalDashboardProps {
  projects: Project[];
  employees: Employee[];
  statuses: Status[];
  priorities: Priority[];
  roles: Role[];
  onViewEmployee: (employeeId: string) => void;
}

type SortOption = 'NAME_ASC' | 'NAME_DESC' | 'WORKLOAD';

/**
 * GLOBAL DASHBOARD COMPONENT
 * Main administrative dashboard providing organization-wide overview including:
 * - Key metrics (employee count, active/completed projects, high priority tasks)
 * - Employee list with sorting by name or workload
 * - Visual charts for project distribution and incomplete projects analysis
 */

export function GlobalDashboard({
  projects,
  employees,
  statuses,
  priorities,
  roles,
  onViewEmployee,
}: GlobalDashboardProps) {
  const [sortOption, setSortOption] = useState<SortOption>('NAME_ASC');

  // 🔥 UNIQUE PROJECTS (VERY IMPORTANT)
  const uniqueProjects = Array.from(
    new Map(projects.map(p => [p.projectId, p])).values()
  );

  // Filter out historical workload (completed AND approved projects)
  const activeProjectsList = uniqueProjects.filter(p => {
    const status = statuses.find(s => s.statusID === p.statusID);
    const isCompleted = status?.statusName === 'Completed';

    // ❌ EXCLUDE historical workload
    if (isCompleted && p.approvalStatus === 'Approved') {
      return false;
    }

    return true;
  });

  // Calculate metrics based on activeProjectsList
  const completedProjects = activeProjectsList.filter(p => {
    const status = statuses.find(s => s.statusID === p.statusID);
    return status?.statusName === 'Completed';
  }).length;

  const activeProjects = activeProjectsList.length;

  const highPriorityProjects = activeProjectsList.filter(p => {
    const priority = priorities.find(pr => pr.priorityID === p.priorityID);
    return priority?.priorityLevel === 'High';
  }).length;

  // Helper function to calculate active project count for an employee (FOR SORTING)
  const getActiveCount = (employeeId: string) => {
    return activeProjectsList.filter(p =>
      (p.assignedToUserIDs || []).includes(employeeId)
    ).length;
  };

  // Sort employees based on selected sort option
  const sortedEmployees = [...employees].sort((a, b) => {
    if (sortOption === 'NAME_ASC') {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }

    if (sortOption === 'NAME_DESC') {
      return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
    }

    if (sortOption === 'WORKLOAD') {
      return getActiveCount(b.userID) - getActiveCount(a.userID);
    }

    return 0;
  });

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
              <p className="text-gray-900 mt-1">{activeProjects}</p>
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
              <p className="text-gray-900 mt-1">{completedProjects}</p>
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
              <p className="text-gray-900 mt-1">{highPriorityProjects}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Employees Overview */}
      <div className="bg-white rounded-lg border border-gray-300">
        <div className="p-6 border-b border-gray-300 flex items-center justify-between">
          <div>
            <h3 className="text-gray-900">Employees Overview</h3>
            <p className="text-gray-600 text-sm mt-1">
              Click to view detailed project dashboard
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSortOption('NAME_ASC')}
              className={`px-3 py-1 rounded border text-sm ${
                sortOption === 'NAME_ASC'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700'
              }`}
            >
              Name A–Z
            </button>

            <button
              onClick={() => setSortOption('NAME_DESC')}
              className={`px-3 py-1 rounded border text-sm ${
                sortOption === 'NAME_DESC'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700'
              }`}
            >
              Name Z–A
            </button>

            <button
              onClick={() => setSortOption('WORKLOAD')}
              className={`px-3 py-1 rounded border text-sm ${
                sortOption === 'WORKLOAD'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700'
              }`}
            >
              Workload
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-300">
          {sortedEmployees.map(employee => {
            const role = roles.find(r => r.roleID === employee.roleID);
            
            // Get projects assigned to this employee from activeProjectsList
            const employeeProjects = activeProjectsList.filter(p =>
              (p.assignedToUserIDs || []).includes(employee.userID)
            );
            
            const completedCount = employeeProjects.filter(p => {
              const status = statuses.find(s => s.statusID === p.statusID);
              return status?.statusName === 'Completed';
            }).length;
            
            const activeCount = employeeProjects.length;

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
        <ProjectDistributionChart projects={activeProjectsList} statuses={statuses} />
        <IncompleteProjectsChart projects={activeProjectsList} employees={employees} statuses={statuses} />
      </div>
    </div>
  );
}