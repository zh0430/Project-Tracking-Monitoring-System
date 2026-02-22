import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Layout } from './components/Layout';
import { GlobalDashboard } from './components/GlobalDashboard';
import { ManageProject } from './components/ManageProject';
import { ProjectSubmissionForm } from './components/ProjectSubmissionForm';
import { HistoricalProjectView } from './components/HistoricalProjectView';
import { UserSettings } from './components/UserSettings';
import { GanttChartTracking } from './components/GanttChartTracking';

export interface TaskDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
  file?: File;   // 👈 ADD THIS
}

export interface ProjectTimeline {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'To Do' | 'In Progress' | 'Completed' | 'Revision Required';
  priority?: 'Low' | 'Medium' | 'High';
  description?: string;
}

export interface Project {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority?: 'Low' | 'Medium' | 'High' | undefined;
  dueDate?: string;
  estimatedEffort?: string;
  workCategory: 'Routine' | 'Cost Roll' | 'Enhancement' | 'Others';
  status: 'To Do' | 'In Progress' | 'Completed' | 'Revision Required';
  createdAt: string;
  approvalStatus?: string;
  documents?: TaskDocument[];
  timelines?: ProjectTimeline[];
}

export interface User {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  department: string;
  emailNotifications: boolean;
  taskReminders: boolean;
  profilePicture?: string;
  role: string;
  mustChangePassword?: boolean;
  tempPassword?: string | null;
}

// Wrapper components for direct routing
const ProjectSubmissionFormWrapper = () => {
  const navigate = useNavigate();
  
  const handleSubmit = (projectData: any) => {
    const token = localStorage.getItem("token");
    
    const formData = new FormData();

    formData.append("title", projectData.title);
    formData.append("description", projectData.description);
    formData.append("dueDate", projectData.dueDate || "");
    formData.append("estimatedEffort", projectData.estimatedEffort || "");

    if (projectData.documents) {
      projectData.documents.forEach((doc: any) => {
        if (doc.file) {
          formData.append("documents", doc.file);
        }
      });
    }

    fetch("http://localhost:5000/api/projects", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
      .then(res => {
        if (res.ok) {
          navigate('/user/projects');
        }
      })
      .catch(console.error);
  };

  return <ProjectSubmissionForm onSubmit={handleSubmit} onCancel={() => navigate('/user/projects')} />;
};

const HistoricalProjectWrapper = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) return;

    fetch("http://localhost:5000/api/projects", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const mapped = data.map((p: any) => ({
          id: String(p.id),
          projectId: p.projectId,
          title: p.title,
          description: p.description,
          priority: p.priority || undefined,
          dueDate: p.dueDate,
          estimatedEffort: p.estimatedEffort,
          workCategory: 'Others',
          status: p.status,
          createdAt: p.createdAt,
          approvalStatus: p.approvalStatus,
          documents: Array.isArray(p.documents)
            ? p.documents.map((d: any) => ({
                id: d.documentID || d.id || Date.now().toString(),
                name: d.fileName || d.name,          // original filename
                type: d.fileType || d.type || '',
                size: Number(d.fileSize || d.size || 0),
                url: d.fileData || d.url || '',
                uploadedAt: d.uploadedDate || d.uploadedAt,
              }))
            : [],
          timelines: (p.timelines || []).map((t: any) => ({
            id: t.milestoneID,
            title: t.milestone,
            startDate: t.startDate,
            endDate: t.endDate,
            status: t.status,
          })),
        }));

        setProjects(mapped);
      })
      .catch(() => setProjects([]));
  }, [token]);

  return (
    <HistoricalProjectView
      projects={projects}
      onBack={() => navigate('/user/projects')}
    />
  );
};

// Main UserApp component
export default function UserApp() {
  return <MainUserApp />;
}

// Original UserApp functionality (now as MainUserApp component)
function MainUserApp() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Fetch projects from API
  const fetchProjects = () => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:5000/api/projects", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const mapped = data.map((p: any) => ({
          id: String(p.id),
          projectId: p.projectId,
          title: p.title,
          description: p.description,
          priority: p.priority || undefined,
          dueDate: p.dueDate,
          estimatedEffort: p.estimatedEffort,
          workCategory: 'Others',
          status: p.status,
          createdAt: p.createdAt,
          approvalStatus: p.approvalStatus,
          documents: Array.isArray(p.documents)
            ? p.documents.map((d: any) => ({
                id: d.documentID || d.id || Date.now().toString(),
                name: d.fileName || d.name,          // original filename
                type: d.fileType || d.type || '',
                size: Number(d.fileSize || d.size || 0),
                url: d.fileData || d.url || '',
                uploadedAt: d.uploadedDate || d.uploadedAt,
              }))
            : [],
          timelines: (p.timelines || []).map((t: any) => ({
            id: t.milestoneID,
            title: t.milestone,
            startDate: t.startDate,
            endDate: t.endDate,
            status: t.status,
          })),
        }));

        setProjects(mapped);
      })
      .catch(() => setProjects([]));
  };

  // Check authentication and fetch user data
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (!token || !storedUser) {
      navigate("/");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "user") {
      navigate("/");
      return;
    }

    // Fetch user data from API
    fetch("http://localhost:5000/api/users/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch user data');
        }
        return res.json();
      })
      .then(data => {
        const existingUser = JSON.parse(localStorage.getItem("user")!);

        const mergedUser = {
          ...existingUser,
          ...data, // refresh server-truth fields
        };

        setUser(mergedUser);
        localStorage.setItem("user", JSON.stringify(mergedUser));
      })
      .catch(error => {
        console.error("Auth failed, logging out:", error);

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/", { replace: true });
      })
      .finally(() => {
        setLoading(false);
      });

    // Fetch initial projects data
    fetchProjects();
  }, [navigate]);

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCreateProject = (projectData: any) => {
    const token = localStorage.getItem("token");

    const formData = new FormData();

    formData.append("title", projectData.title);
    formData.append("description", projectData.description);
    formData.append("dueDate", projectData.dueDate || "");
    formData.append("estimatedEffort", projectData.estimatedEffort || "");

    // Append files
    if (projectData.documents) {
      projectData.documents.forEach((file: File) => {
        formData.append("documents", file);
      });
    }

    fetch("http://localhost:5000/api/projects", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
      .then(res => res.json())
      .then(() => {
        fetchProjects();
        navigate("dashboard");
        showSuccessMessage("Project submitted.");
      })
      .catch(console.error);
  };

  const handleUpdateProject = (projectId: string, updates: any) => {
    const token = localStorage.getItem("token");
    const formData = new FormData();

    formData.append("title", updates.title);
    formData.append("description", updates.description);
    formData.append("priority", updates.priority || "");
    formData.append("status", updates.status);
    formData.append("dueDate", updates.dueDate || "");
    formData.append("estimatedEffort", updates.estimatedEffort || "");

    const existingDocs: any[] = [];

    if (updates.documents) {
      updates.documents.forEach((doc: any) => {
        if (doc.file) {
          formData.append("documents", doc.file);
        } else if (doc.url && !doc.url.startsWith('blob:')) {
          existingDocs.push(doc);
        }
      });
    }

    formData.append("existingDocuments", JSON.stringify(existingDocs));

    fetch(`http://localhost:5000/api/projects/${projectId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(err.error || `HTTP ${res.status}`); });
        }
        return res.json();
      })
      .then(() => {
        fetchProjects();
        showSuccessMessage("Project updated.");
      })
      .catch(error => {
        console.error("Update failed:", error);
        showSuccessMessage(`Failed to update project: ${error.message}`);
      });
  };

  const handleDeleteProject = (projectId: string) => {
    const token = localStorage.getItem("token");

    fetch(`http://localhost:5000/api/projects/${projectId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to delete project");
        return res.json();
      })
      .then(() => {
        fetchProjects(); // 🔥 Refresh projects from DB
        showSuccessMessage("Project deleted successfully.");
      })
      .catch(error => {
        console.error(error);
        showSuccessMessage("Failed to delete project.");
      });
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    const token = localStorage.getItem("token");
    
    fetch("http://localhost:5000/api/users/me", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to update profile');
        }
        return res.json();
      })
      .then(updatedUser => {
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        navigate('dashboard');
        showSuccessMessage('Profile updated successfully.');
      })
      .catch(error => {
        console.error('Error updating user:', error);
        showSuccessMessage('Failed to update profile. Please try again.');
      });
  };

  const handleDeleteAccount = () => {
    const token = localStorage.getItem("token");
    
    fetch("http://localhost:5000/api/users/me", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to delete account');
        }
        return res.json();
      })
      .then(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        showSuccessMessage('Account deleted successfully.');
        navigate("/");
      })
      .catch(error => {
        console.error('Error deleting account:', error);
        showSuccessMessage('Failed to delete account. Please try again.');
      });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  // Show loading state while fetching user data
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication after loading
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const userRole = storedUser ? JSON.parse(storedUser).role : null;
  
  // Updated authentication check - user is NOT authenticated if they need to change password
  const isAuthenticated =
    !!token &&
    userRole === "user" &&
    user !== null &&
    user.mustChangePassword !== true;

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // This should not happen due to above checks, but added for type safety
  if (!user) return null;

  return (
    <Routes>
      <Route
        element={
          <Layout
            user={user}
            successMessage={successMessage}
            onLogout={handleLogout}
          />
        }
      >
        <Route
          index
          element={<Navigate to="dashboard" replace />}
        />

        <Route
          path="dashboard"
          element={<GlobalDashboard projects={projects} user={user} />}
        />

        <Route
          path="projects"
          element={
            <ManageProject
              projects={projects}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onNavigateToNewProject={() => navigate('/user/projects/new')}
              onNavigateToHistorical={() => navigate('/user/projects/history')}
            />
          }
        />

        <Route
          path="projects/new"
          element={<ProjectSubmissionFormWrapper />}
        />

        <Route
          path="projects/history"
          element={<HistoricalProjectWrapper />}
        />

        <Route
          path="settings"
          element={
            <UserSettings
              user={user}
              onUpdateUser={handleUpdateUser}
              onDeleteAccount={handleDeleteAccount}
            />
          }
        />

        <Route
          path="gantt"
          element={
            <GanttChartTracking
              projects={projects}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onBack={() => navigate('/user/projects')}
            />
          }
        />

        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
}