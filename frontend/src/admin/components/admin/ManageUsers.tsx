import { useState } from 'react';
import { Employee, Role, Task, Priority, Status, Project } from '../../App';
import { Plus, Download } from 'lucide-react';
import { AssignTaskModal } from './AssignTaskModal';
import {
  exportUsersExcel,
  exportUsersPDF,
  exportUsersWord
} from '../../../shared/utils/userExport';

interface ManageUsersProps {
  employees: Employee[];
  roles: Role[];
  tasks: Task[];
  projects: Project[];
  priorities: Priority[];
  statuses: Status[];
  onUpdateEmployee: (employee: Employee) => void;
  onAddTask: (task: Task) => void;
  adminId: string;
}

/**
 * MANAGE USERS COMPONENT
 * Administrative interface for managing employee accounts including:
 * - Viewing all employees with their project assignments
 * - Assigning new projects/tasks to employees
 * - Resetting user passwords (generates temporary password)
 * - Exporting user data to Excel, PDF, or Word formats
 */

export function ManageUsers({ 
  employees, 
  roles, 
  tasks, 
  projects,
  priorities,
  statuses,
  onUpdateEmployee,
  onAddTask,
  adminId,
}: ManageUsersProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Sort employees by User ID (extract numeric part)
  const sortedEmployees = [...employees].sort((a, b) => {
    // Extract numeric part: USR-000002 -> 2
    const numA = Number(a.userID.replace(/\D/g, ''));
    const numB = Number(b.userID.replace(/\D/g, ''));

    return numA - numB; // ascending
  });

  const handleAssignWork = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setShowAssignModal(true);
  };

  const handleTaskAssigned = (task: Task) => {
    onAddTask(task);
    setShowAssignModal(false);
    setSelectedEmployeeId(null);
  };

  // Reset user password via admin API and display temporary password
  const handleResetPassword = async (userId: string) => {
    if (!window.confirm("Reset password for this user?")) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `http://localhost:5000/api/admin/users/${userId}/reset-password`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to reset password");
        return;
      }

      setTempPassword(data.temporaryPassword);
      setResetUserId(userId);
    } catch (err) {
      console.error(err);
      alert("Server error while resetting password");
    }
  };

  // Export user data to selected format (Excel, PDF, Word)
  const handleExport = (type: "excel" | "pdf" | "word") => {
    const data = sortedEmployees.map(employee => {
      const employeeProjects = projects.filter(p => {
        const isAssigned = (p.assignedToUserIDs || []).includes(employee.userID);
        if (!isAssigned) return false;

        const status = statuses.find(s => s.statusID === p.statusID);
        const isCompleted = status?.statusName === 'Completed';

        if (isCompleted && p.approvalStatus === 'Approved') {
          return false;
        }

        return true;
      });

      return {
        userID: employee.userID,
        name: employee.name,
        email: employee.email,
        projects: employeeProjects.length,
      };
    });

    if (type === "excel") exportUsersExcel(data);
    if (type === "pdf") exportUsersPDF(data);
    if (type === "word") exportUsersWord(data);
    
    setShowExportMenu(false);
  };

  // Close export menu when clicking outside
  const handleClickOutside = (e: React.MouseEvent) => {
    if (showExportMenu && !(e.target as HTMLElement).closest('.export-menu-container')) {
      setShowExportMenu(false);
    }
  };

  return (
    <div className="space-y-6" onClick={handleClickOutside}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 mb-1">Manage Users</h2>
          <p className="text-gray-600">Assign projects to team members</p>
        </div>
        <div className="relative w-fit export-menu-container">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowExportMenu(!showExportMenu);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          {showExportMenu && (
            <div
              className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[140px] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handleExport("excel")}
                className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm rounded-t-lg"
              >
                Excel
              </button>
              <button
                onClick={() => handleExport("pdf")}
                className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm"
              >
                PDF
              </button>
              <button
                onClick={() => handleExport("word")}
                className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm rounded-b-lg"
              >
                Word
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Temporary Password Display */}
      {tempPassword && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">
            Temporary Password Generated
          </p>
          <p className="mt-1 font-mono text-lg">{tempPassword}</p>
          <p className="text-sm text-gray-600 mt-1">
            Share this securely with the user. This password will not be shown again.
          </p>
          <button
            onClick={() => {
              setTempPassword(null);
              setResetUserId(null);
            }}
            className="mt-2 text-sm text-red-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-6 py-3 text-left text-gray-700">User ID</th>
              <th className="px-6 py-3 text-left text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-gray-700">Email</th>
              <th className="px-6 py-3 text-center text-gray-700">Projects Assigned</th>
              <th className="px-6 py-3 text-left text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {sortedEmployees.map(employee => {
              // Calculate active project count (excluding historical completed & approved)
              const employeeProjects = projects.filter(p => {
                // match assigned users
                const isAssigned = (p.assignedToUserIDs || []).includes(employee.userID);

                if (!isAssigned) return false;

                // find status
                const status = statuses.find(s => s.statusID === p.statusID);

                const isCompleted = status?.statusName === 'Completed';

                // ❌ EXCLUDE historical (Completed + Approved)
                if (isCompleted && p.approvalStatus === 'Approved') {
                  return false;
                }

                return true;
              });

              return (
                <tr key={employee.userID} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-700">{employee.userID}</td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900">{employee.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-700">{employee.email}</span>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-700">
                    {employeeProjects.length}
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button
                      onClick={() => handleAssignWork(employee.userID)}
                      className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      title="Assign Work"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {/* Prevent admin from resetting their own password */}
                    {employee.userID !== adminId && (
                      <button
                        onClick={() => handleResetPassword(employee.userID)}
                        className="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-900 text-sm"
                        title="Reset Password"
                      >
                        Reset
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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