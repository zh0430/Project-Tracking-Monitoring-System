import { useState } from 'react';
import { Employee, Role, Task, Priority, Status } from '../../App';
import { Plus, Download } from 'lucide-react';
import { AssignTaskModal } from './AssignTaskModal';
import { exportAllTasksToExcel } from '../../utils/excelExport';

interface ManageUsersProps {
  employees: Employee[];
  roles: Role[];
  tasks: Task[];
  priorities: Priority[];
  statuses: Status[];
  onUpdateEmployee: (employee: Employee) => void;
  onAddTask: (task: Task) => void;
  adminId: string;
}

export function ManageUsers({ 
  employees, 
  roles, 
  tasks, 
  priorities,
  statuses,
  onUpdateEmployee,
  onAddTask,
  adminId,
}: ManageUsersProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const handleAssignWork = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setShowAssignModal(true);
  };

  const handleTaskAssigned = (task: Task) => {
    onAddTask(task);
    setShowAssignModal(false);
    setSelectedEmployeeId(null);
  };

  const handleExportAll = async () => {
    await exportAllTasksToExcel(employees, tasks, statuses, priorities);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 mb-1">Manage Users</h2>
          <p className="text-gray-600">Assign projects to team members</p>
        </div>
        <button
          onClick={handleExportAll}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export All Projects
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-6 py-3 text-left text-gray-700">User ID</th>
              <th className="px-6 py-3 text-left text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-gray-700">Email</th>
              <th className="px-6 py-3 text-left text-gray-700">Role</th>
              <th className="px-6 py-3 text-left text-gray-700">Projects Assigned</th>
              <th className="px-6 py-3 text-left text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {employees.map(employee => {
              const employeeTasks = tasks.filter(t => {
                if (Array.isArray(t.assignedToUserID)) {
                  return t.assignedToUserID.includes(employee.userID);
                }
                return t.assignedToUserID === employee.userID;
              });
              const role = roles.find(r => r.roleID === employee.roleID);

              return (
                <tr key={employee.userID} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-700">{employee.userID}</td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900">{employee.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-700">{employee.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      {role?.roleName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{employeeTasks.length}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleAssignWork(employee.userID)}
                      className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      title="Assign Work"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Role Distribution */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h3 className="text-gray-900 mb-4">Role Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {roles.map(role => {
            const count = employees.filter(e => e.roleID === role.roleID).length;
            return (
              <div key={role.roleID} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-300">
                <span className="text-gray-700">{role.roleName}</span>
                <span className="text-gray-900">{count} {count === 1 ? 'user' : 'users'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assign Task Modal */}
      {showAssignModal && selectedEmployeeId && (
        <AssignTaskModal
          employeeId={selectedEmployeeId}
          employees={employees}
          priorities={priorities}
          statuses={statuses}
          adminId={adminId}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedEmployeeId(null);
          }}
          onAssign={handleTaskAssigned}
        />
      )}
    </div>
  );
}