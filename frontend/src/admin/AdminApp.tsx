import { useState, useEffect } from 'react';
import { GlobalDashboard } from './components/admin/GlobalDashboard';
import { ManageUsers } from './components/admin/ManageUsers';
import { EmployeeSummary } from './components/admin/EmployeeSummary';
import { UpdateStatusPriority } from './components/admin/UpdateProject';
import { AdminSettings } from './components/admin/AdminSettings';
import { TeamGanttChart } from './components/admin/TeamGanttChart';
import { Sidebar } from './components/admin/Sidebar';
import { AdminHeader } from "./components/admin/AdminHeader";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";

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
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: string;
  priority?: 'Low' | 'Medium' | 'High';
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

export interface Project {
  id: number;
  projectId: string;
  title: string;
  description: string;
  assignedToUserIDs: string[]; // Changed from assignedToUserID to support multiple assignments
  statusID: string;
  status?: string; // 🔥 ADD THIS - for display status name
  priorityID: string;
  priority?: string; // 🔥 ADD THIS - for display priority name
  createdDate: string;
  dueDate: string;
  completedDate: string | null;
  documents: TaskDocument[];
  timelines: ProjectTimeline[];
  approvalStatus?: string; // Pending, Approved, Rejected
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
  const [projects, setProjects] = useState<Project[]>([]);
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
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
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
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          }).then(res => res.ok ? res.json() : []),
          
          // Fetch employees
          fetch("http://localhost:5000/api/admin/employees", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          }).then(res => res.ok ? res.json() : []),
          
          // Fetch priorities
          fetch("http://localhost:5000/api/admin/priorities", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          }).then(res => res.ok ? res.json() : []),
          
          // Fetch statuses
          fetch("http://localhost:5000/api/admin/statuses", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          }).then(res => res.ok ? res.json() : []),
          
          // Fetch tasks
          fetch("http://localhost:5000/api/admin/tasks", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          }).then(res => {
            console.log("TOKEN:", token);
            return res.ok ? res.json() : [];
          }),
          
          // Fetch projects
          fetch("http://localhost:5000/api/admin/projects", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          }).then(res => res.ok ? res.json() : []),
          
          // Fetch notifications
          fetch("http://localhost:5000/api/admin/notifications", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          }).then(res => res.ok ? res.json() : []),
        ]).then(([rolesData, employeesData, prioritiesData, statusesData, tasksData, projectsData, notificationsData]) => {
          setRoles(rolesData || []);
          
          // Transform employees data to use public_user_id
          setEmployees(
            (employeesData || []).map((u: any) => ({
              userID: u.userID,
              roleID: String(u.roleID),
              name: u.name,
              email: u.email,
              passwordHash: u.passwordHash || "",
            }))
          );
          
          // Transform priorities data
          setPriorities(
            (prioritiesData || []).map((p: any) => ({
              priorityID: String(p.priorityID),
              priorityLevel: p.priorityLevel,
            }))
          );
          
          // Transform statuses data
          setStatuses(
            (statusesData || []).map((s: any) => ({
              statusID: String(s.statusID),
              statusName: s.statusName,
            }))
          );
          
          // Transform tasks data to ensure all fields are properly typed
          setTasks(
            (tasksData || []).map((t: any) => ({
              ...t,
              description: t.description || "",
              taskID: String(t.taskID),
              assignedToUserID: t.assignedToUserID,
              reportedByUserID: String(t.reportedByUserID),
              statusID: String(t.statusID),
              priorityID: String(t.priorityID),
              createdDate: t.createdDate,
              dueDate: t.dueDate,
              completedDate: t.completedDate,
              documents: t.documents || [],
            }))
          );

          // Transform projects data with correct field mapping
          setProjects(
            (projectsData || []).map((p: any) => ({
              id: p.id,
              projectId: String(p.projectId),
              title: p.title,
              description: p.description || "",
              assignedToUserIDs: p.assignedToUserIDs || [], // Changed to array
              statusID: String(p.statusID),   // ✅ FIXED
              status: p.status || null,       // safe fallback
              priorityID: String(p.priorityID),
              priority: p.priority || null,   // safe fallback
              createdDate: p.createdDate,
              dueDate: p.dueDate,
              completedDate: p.completedDate,
              documents: p.documents || [],
              timelines: (p.timelines || []).map((tl: any) => ({
                id: String(tl.id ?? tl.milestoneID),
                title: tl.title ?? tl.milestone ?? "",
                description: tl.description ?? "",
                startDate: tl.startDate,
                endDate: tl.endDate,
                status: tl.status,
                priority: tl.priority ?? 'Low'
              })),
              approvalStatus: p.approvalStatus || null,
            }))
          );

          // Debug logs to check IDs
          console.log("EMPLOYEE IDS:", employeesData.map((u: any) => u.userID));
          console.log("TASK ASSIGNED IDS:", tasksData.map((t: any) => t.assignedToUserID));
          console.log("PROJECTS:", projectsData);
          console.log("PRIORITIES:", prioritiesData);
          console.log("STATUSES:", statusesData);
          
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
        projects,
        notifications,
      }));
    }
  }, [admin, roles, employees, priorities, statuses, tasks, projects, notifications, isAuthenticated]);

  const handleViewEmployeeSummary = (employeeId: string) => {
    navigate(`/admin/summary/${employeeId}`);
  };

  const handleApproveUpdate = (taskId: string) => {
    navigate(`/admin/update/${taskId}`);
  };

  const handleUpdateTask = async (updatedTask: Task, projectId: string) => {
    try {
      const token = localStorage.getItem("token");
      
      const statusObj = statuses.find(s => s.statusID === updatedTask.statusID);
      const priorityObj = priorities.find(p => p.priorityID === updatedTask.priorityID);

      const payload = {
        title: updatedTask.title,
        description: updatedTask.description,
        status: statusObj?.statusName,
        priority: priorityObj?.priorityLevel,
        dueDate: updatedTask.dueDate,
        documents: updatedTask.documents || [],
        timelines: (updatedTask.timeline || []).map(tl => ({
          id: tl.id,
          title: tl.title,
          description: tl.description || '',
          startDate: tl.startDate,
          endDate: tl.endDate,
          status: tl.status,
          priority: tl.priority || 'Low'
        }))
      };

      const response = await fetch(
        `http://localhost:5000/api/projects/${projectId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const updatedProjectData = await response.json();
      
      // Update projects state directly without re-fetching
      setProjects(prev =>
        prev.map(p =>
          p.projectId === projectId
            ? {
                ...p,
                title: updatedTask.title,
                description: updatedTask.description,
                dueDate: updatedTask.dueDate,
                documents: updatedTask.documents ?? [],
                timelines: (updatedTask.timeline || []).map(tl => ({
                  id: tl.id,
                  title: tl.title,
                  description: tl.description || '',
                  startDate: tl.startDate,
                  endDate: tl.endDate,
                  status: tl.status,
                  priority: tl.priority || 'Low'
                })),
              }
            : p
        )
      );

      // Update tasks state directly without re-fetching
      setTasks(prev =>
        prev.map(t =>
          t.taskID === updatedTask.taskID
            ? { ...t, statusID: updatedTask.statusID, priorityID: updatedTask.priorityID }
            : t
        )
      );
      
      // If status changed to "Revision Required", send notifications
      const oldTask = tasks.find(t => t.taskID === updatedTask.taskID);
      if (oldTask && oldTask.statusID !== updatedTask.statusID && updatedTask.statusID === '4') {
        const assignedUserIDs = Array.isArray(updatedTask.assignedToUserID) 
          ? updatedTask.assignedToUserID 
          : [updatedTask.assignedToUserID];
        
        // Create notifications via API
        await Promise.all(
          assignedUserIDs.map(userID => 
            fetch("http://localhost:5000/api/admin/notifications", {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              credentials: "include",
              body: JSON.stringify({
                userID,
                message: `Project requires revision: ${updatedTask.title}`,
                taskID: updatedTask.taskID,
              }),
            })
          )
        );

        // Refresh notifications
        const notificationsResponse = await fetch("http://localhost:5000/api/admin/notifications", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });
        const newNotifications = await notificationsResponse.json();
        setNotifications(newNotifications || []);
      }

      // Navigate back to employee summary
      if (updatedTask.assignedToUserID) {
        const firstUserId = Array.isArray(updatedTask.assignedToUserID) 
          ? updatedTask.assignedToUserID[0] 
          : updatedTask.assignedToUserID;
        navigate(`/admin/summary/${firstUserId}`);
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
        credentials: "include",
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
      
      // Find status name from statusID
      const statusObj = statuses.find(s => s.statusID === task.statusID);
      const priorityObj = priorities.find(p => p.priorityID === task.priorityID);

      const response = await fetch("http://localhost:5000/api/projects", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          status: statusObj?.statusName || 'To Do',
          priority: priorityObj?.priorityLevel,
          dueDate: task.dueDate,
          assignedUserId: task.assignedToUserID,
          documents: task.documents,
          timelines: (task.timeline || []).map(tl => ({
            id: tl.id,
            title: tl.title,
            description: tl.description || '',
            startDate: tl.startDate,
            endDate: tl.endDate,
            status: tl.status,
            priority: tl.priority || 'Low'
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add project');
      }

      const newProject = await response.json();
      
      // 🔥 REFRESH PROJECTS AFTER ADDING TASK
      const projectsResponse = await fetch("http://localhost:5000/api/admin/projects", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (projectsResponse.ok) {
        const updatedProjects = await projectsResponse.json();

        setProjects(
          (updatedProjects || []).map((p: any) => ({
            id: p.id,
            projectId: String(p.projectId),
            title: p.title,
            description: p.description || "",
            assignedToUserIDs: p.assignedToUserIDs || [],
            statusID: String(p.statusID),   // ✅ FIXED
            status: p.status || null,       // safe fallback
            priorityID: String(p.priorityID),
            priority: p.priority || null,   // safe fallback
            createdDate: p.createdDate,
            dueDate: p.dueDate,
            completedDate: p.completedDate,
            documents: p.documents || [],
            timelines: (p.timelines || []).map((tl: any) => ({
              id: String(tl.id ?? tl.milestoneID),
              title: tl.title ?? tl.milestone ?? "",
              description: tl.description ?? "",
              startDate: tl.startDate,
              endDate: tl.endDate,
              status: tl.status,
              priority: tl.priority ?? 'Low'
            })),
            approvalStatus: p.approvalStatus || null,
          }))
        );
      }
      
      // Refresh tasks after adding project
      const tasksResponse = await fetch("http://localhost:5000/api/admin/tasks", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (tasksResponse.ok) {
        const updatedTasks = await tasksResponse.json();
        setTasks(updatedTasks);
      }
      
      // Commented out notifications for now
      /*
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
            credentials: "include",
            body: JSON.stringify({
              userID,
              message: `New project assigned: ${task.title}`,
              taskID: newProject.taskId,
            }),
          })
        )
      );

      // Refresh notifications
      const notificationsResponse = await fetch("http://localhost:5000/api/admin/notifications", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
      const updatedNotifications = await notificationsResponse.json();
      setNotifications(updatedNotifications || []);
      */
    } catch (error) {
      console.error('Error adding project:', error);
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
        credentials: "include",
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

  const handleDeleteProject = async (
    projectId: string,
    dbId: number,
    mode: "ALL" | "SELF" = "ALL",
    targetUserId?: string
  ) => {
    try {
      const token = localStorage.getItem("token");

      if (mode === "SELF") {
        const userToRemove = targetUserId;

        if (!userToRemove) {
          console.error("No user specified for SELF deletion");
          return;
        }

        await fetch(
          `http://localhost:5000/api/projects/${dbId}/user/${userToRemove}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // 🔥 REMOVE USER FROM STATE
        setProjects(prev =>
          prev.map(p =>
            p.id === dbId
              ? {
                  ...p,
                  assignedToUserIDs: p.assignedToUserIDs.filter(
                    id => id !== userToRemove
                  ),
                }
              : p
          )
        );

      } else {
        await fetch(
          `http://localhost:5000/api/projects/${dbId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setProjects(prev => prev.filter(p => p.id !== dbId));
      }

    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("adminSystemData");
    navigate("/");
  };

  // Wrapper component for UpdateStatusPriority to handle task lookup
  const UpdateTaskWrapper = () => {
    const { taskId } = useParams();

    const project = projects.find(p => p.projectId === taskId);

    if (!project) {
      return <div>Project not found</div>;
    }

    // create fake task object from project
    const task = {
      taskID: project.projectId,
      title: project.title,
      description: project.description,
      assignedToUserID: project.assignedToUserIDs, // Changed to array
      reportedByUserID: "",
      statusID: project.statusID,
      priorityID: project.priorityID,
      createdDate: project.createdDate,
      dueDate: project.dueDate,
      completedDate: project.completedDate,
      documents: project.documents,
      timeline: project.timelines || [],
    };

    return (
      <UpdateStatusPriority
        task={task}
        project={project}
        statuses={statuses}
        priorities={priorities}
        employees={employees}
        onUpdate={async (updatedTask) => {

          const token = localStorage.getItem("token");

          const status = statuses.find(s => s.statusID === updatedTask.statusID)?.statusName;
          const priority = priorities.find(p => p.priorityID === updatedTask.priorityID)?.priorityLevel;

          await fetch(`http://localhost:5000/api/projects/${project.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              title: updatedTask.title,
              description: updatedTask.description,
              status: status,
              priority: priority,
              dueDate: updatedTask.dueDate,
              existingDocuments: updatedTask.documents,
              timelines: (updatedTask.timeline || []).map(tl => ({
                id: tl.id,
                title: tl.title,
                description: tl.description || '',
                startDate: tl.startDate,
                endDate: tl.endDate,
                status: tl.status,
                priority: tl.priority || 'Low'
              }))
            })
          });

          alert("Project updated successfully");

          const firstUserId = Array.isArray(updatedTask.assignedToUserID) 
            ? updatedTask.assignedToUserID[0] 
            : updatedTask.assignedToUserID;
          navigate(`/admin/summary/${firstUserId}`);
        }}
        onCancel={() => navigate(-1)}
      />
    );
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
                  projects={projects}
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
                  projects={projects}
                  statuses={statuses}
                  priorities={priorities}
                  roles={roles}
                  onApproveUpdate={handleApproveUpdate}
                  onDeleteProject={handleDeleteProject}
                  onUpdateProject={handleUpdateTask}
                  currentUserId={admin.adminID}
                />
              }
            />

            <Route
              path="summary/:employeeId"
              element={
                <EmployeeSummary
                  employees={employees}
                  projects={projects}
                  statuses={statuses}
                  priorities={priorities}
                  roles={roles}
                  onApproveUpdate={handleApproveUpdate}
                  onDeleteProject={handleDeleteProject}
                  onUpdateProject={handleUpdateTask}
                  currentUserId={admin.adminID}
                />
              }
            />

            <Route
              path="update/:taskId"
              element={<UpdateTaskWrapper />}
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
                  projects={projects}
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