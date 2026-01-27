import { useState, useEffect } from 'react';
import { GlobalDashboard } from './components/admin/GlobalDashboard';
import { ManageUsers } from './components/admin/ManageUsers';
import { EmployeeSummary } from './components/admin/EmployeeSummary';
import { UpdateStatusPriority } from './components/admin/UpdateStatusPriority';
import { AdminSettings } from './components/admin/AdminSettings';
import { TeamGanttChart } from './components/admin/TeamGanttChart';
import { Sidebar } from './components/admin/Sidebar';
import { AdminHeader } from "./components/admin/AdminHeader";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

export interface Role {
  roleID: string;
  roleName: string;
}

export interface Employee {
  userID: string;
  roleID: string;
  name: string;
  email: string;
  passwordHash: string;
}

export interface Priority {
  priorityID: string;
  priorityLevel: string;
}

export interface Status {
  statusID: string;
  statusName: string;
}

export interface ProjectTimeline {
  milestoneID: string;
  milestone: string;
  startDate: string;
  endDate: string;
  status: string;
  updatedDate: string;
}

export interface Task {
  taskID: string;
  title: string;
  description: string;
  assignedToUserID: string | string[]; // Support both single and multiple assignments
  reportedByUserID: string;
  statusID: string;
  priorityID: string;
  createdDate: string;
  dueDate: string;
  completedDate: string | null;
  documents: TaskDocument[];
  timeline?: ProjectTimeline[]; // Track project workflow
}

export interface TaskDocument {
  documentID: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploadedDate: string;
  fileData: string; // base64 encoded file data
}

export interface Admin {
  adminID: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  profilePicture?: string;
}

export interface Notification {
  notificationID: string;
  userID: string;
  message: string;
  taskID: string;
  createdAt: string;
  read: boolean;
}

type ViewType = 'dashboard' | 'users' | 'summary' | 'update' | 'settings' | 'gantt';

export default function AdminApp() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Check authentication
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const userRole = storedUser ? JSON.parse(storedUser).role : null;
  const isAuthenticated = !!token && userRole === "admin";
  
  // Data states
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch admin data from API
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }

    const fetchAdminData = async () => {
      try {
        // Fetch admin profile
        const adminResponse = await fetch("http://localhost:5000/api/admin/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!adminResponse.ok) {
          throw new Error("Failed to fetch admin data");
        }

        const adminData = await adminResponse.json();
        setAdmin(adminData);

        // Fetch all other data
        await Promise.all([
          // Fetch roles
          fetch("http://localhost:5000/api/admin/roles", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }).then(res => res.ok ? res.json() : []),
          
          // Fetch employees
          fetch("http://localhost:5000/api/admin/employees", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }).then(res => res.ok ? res.json() : []),
          
          // Fetch priorities
          fetch("http://localhost:5000/api/admin/priorities", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }).then(res => res.ok ? res.json() : []),
          
          // Fetch statuses
          fetch("http://localhost:5000/api/admin/statuses", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }).then(res => res.ok ? res.json() : []),
          
          // Fetch tasks
          fetch("http://localhost:5000/api/admin/tasks", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }).then(res => res.ok ? res.json() : []),
          
          // Fetch notifications
          fetch("http://localhost:5000/api/admin/notifications", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }).then(res => res.ok ? res.json() : []),
        ]).then(([rolesData, employeesData, prioritiesData, statusesData, tasksData, notificationsData]) => {
          setRoles(rolesData || []);
          setEmployees(employeesData || []);
          setPriorities(prioritiesData || []);
          setStatuses(statusesData || []);
          setTasks(tasksData || []);
          setNotifications(notificationsData || []);
        });
      } catch (error) {
        console.error('Error fetching admin data:', error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [isAuthenticated, navigate, token]);

  // Save data to localStorage whenever it changes (optional backup)
  useEffect(() => {
    if (isAuthenticated && admin && employees.length > 0) {
      localStorage.setItem('adminSystemData', JSON.stringify({
        admin,
        roles,
        employees,
        priorities,
        statuses,
        tasks,
        notifications,
      }));
    }
  }, [admin, roles, employees, priorities, statuses, tasks, notifications, isAuthenticated]);

  const handleViewEmployeeSummary = (employeeId: string) => {
    navigate(`/admin/summary/${employeeId}`);
  };

  const handleApproveUpdate = (taskId: string) => {
    navigate(`/admin/update/${taskId}`);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/admin/tasks/${updatedTask.taskID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedTask),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const updatedTaskData = await response.json();
      
      // Update local state
      setTasks(tasks.map(t => t.taskID === updatedTaskData.taskID ? updatedTaskData : t));
      
      // If status changed to "Revision Required", send notifications
      const oldTask = tasks.find(t => t.taskID === updatedTask.taskID);
      if (oldTask && oldTask.statusID !== updatedTaskData.statusID && updatedTaskData.statusID === '4') {
        const assignedUserIDs = Array.isArray(updatedTaskData.assignedToUserID) 
          ? updatedTaskData.assignedToUserID 
          : [updatedTaskData.assignedToUserID];
        
        // Create notifications via API
        await Promise.all(
          assignedUserIDs.map(userID => 
            fetch("http://localhost:5000/api/admin/notifications", {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                userID,
                message: `Project requires revision: ${updatedTaskData.title}`,
                taskID: updatedTaskData.taskID,
              }),
            })
          )
        );

        // Refresh notifications
        const notificationsResponse = await fetch("http://localhost:5000/api/admin/notifications", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const newNotifications = await notificationsResponse.json();
        setNotifications(newNotifications || []);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleUpdateEmployee = async (updatedEmployee: Employee) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/admin/employees/${updatedEmployee.userID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedEmployee),
      });

      if (!response.ok) {
        throw new Error('Failed to update employee');
      }

      const updatedEmployeeData = await response.json();
      setEmployees(employees.map(e => e.userID === updatedEmployeeData.userID ? updatedEmployeeData : e));
    } catch (error) {
      console.error('Error updating employee:', error);
    }
  };

  const handleAddTask = async (task: Task) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/admin/tasks", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(task),
      });

      if (!response.ok) {
        throw new Error('Failed to add task');
      }

      const newTask = await response.json();
      setTasks([...tasks, newTask]);
      
      // Create notifications for assigned employees
      const assignedUserIDs = Array.isArray(task.assignedToUserID) 
        ? task.assignedToUserID 
        : [task.assignedToUserID];
      
      await Promise.all(
        assignedUserIDs.map(userID => 
          fetch("http://localhost:5000/api/admin/notifications", {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userID,
              message: `New project assigned: ${task.title}`,
              taskID: newTask.taskID,
            }),
          })
        )
      );

      // Refresh notifications
      const notificationsResponse = await fetch("http://localhost:5000/api/admin/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const updatedNotifications = await notificationsResponse.json();
      setNotifications(updatedNotifications || []);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleUpdateAdmin = async (updatedAdmin: Admin) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/admin/me", {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedAdmin),
      });

      if (!response.ok) {
        throw new Error('Failed to update admin profile');
      }

      const updatedAdminData = await response.json();
      setAdmin(updatedAdminData);
    } catch (error) {
      console.error('Error updating admin:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/admin/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      setTasks(tasks.filter(t => t.taskID !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("adminSystemData");
    navigate("/");
  };

  // Check authentication
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col transition-all duration-300"
        style={{
          marginLeft: sidebarOpen ? '16rem' : '5rem',
        }}
      >
        {/* Header */}
        <header className="bg-white sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-4">
              <div className="flex-1" />
              <AdminHeader admin={admin} onLogout={handleLogout} />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-auto">
          <Routes>
            <Route
              path="dashboard"
              element={
                <GlobalDashboard
                  tasks={tasks}
                  employees={employees}
                  statuses={statuses}
                  priorities={priorities}
                  roles={roles}
                  onViewEmployee={handleViewEmployeeSummary}
                />
              }
            />

            <Route
              path="users"
              element={
                <ManageUsers
                  employees={employees}
                  roles={roles}
                  tasks={tasks}
                  priorities={priorities}
                  statuses={statuses}
                  onUpdateEmployee={handleUpdateEmployee}
                  onAddTask={handleAddTask}
                  adminId={admin.adminID}
                />
              }
            />

            <Route
              path="summary"
              element={
                <EmployeeSummary
                  employees={employees}
                  tasks={tasks}
                  statuses={statuses}
                  priorities={priorities}
                  roles={roles}
                  onApproveUpdate={handleApproveUpdate}
                  onDeleteTask={handleDeleteTask}
                  onUpdateTask={handleUpdateTask}
                  currentUserId={admin.adminID}
                />
              }
            />

            <Route
              path="summary/:employeeId"
              element={
                <EmployeeSummary
                  employees={employees}
                  tasks={tasks}
                  statuses={statuses}
                  priorities={priorities}
                  roles={roles}
                  onApproveUpdate={handleApproveUpdate}
                  onDeleteTask={handleDeleteTask}
                  onUpdateTask={handleUpdateTask}
                  currentUserId={admin.adminID}
                />
              }
            />

            <Route
              path="update/:taskId"
              element={
                <UpdateStatusPriority
                  tasks={tasks}
                  statuses={statuses}
                  priorities={priorities}
                  employees={employees}
                  onUpdate={handleUpdateTask}
                  onCancel={() => navigate(-1)}
                />
              }
            />

            <Route
              path="settings"
              element={
                <AdminSettings
                  admin={admin}
                  onUpdate={handleUpdateAdmin}
                />
              }
            />

            <Route
              path="gantt"
              element={
                <TeamGanttChart
                  tasks={tasks}
                  employees={employees}
                  statuses={statuses}
                  priorities={priorities}
                  roles={roles}
                />
              }
            />

            <Route path="*" element={<Navigate to="dashboard" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}