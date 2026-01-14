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
  priority?: 'Low' | 'Medium' | 'High';
  dueDate?: string;
  estimatedEffort?: string;
  workCategory: 'Routine' | 'Cost Roll' | 'Enhancement' | 'Others';
  status: 'To Do' | 'In Progress' | 'Completed' | 'Revision Required';
  createdAt: string;
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
}

export default function UserApp() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string>('');

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
        setUser(data);
        // Update localStorage with fresh user data
        localStorage.setItem("user", JSON.stringify(data));
      })
      .catch(error => {
        console.error('Error fetching user:', error);
        // If API fails, use stored user data as fallback
        setUser(parsedUser);
      })
      .finally(() => {
        setLoading(false);
      });

    // Fetch projects data from API
    fetch("http://localhost:5000/api/projects", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch projects');
        }
        return res.json();
      })
      .then(data => {
        setProjects(data);
      })
      .catch(error => {
        console.error('Error fetching projects:', error);
        // Start with empty projects array if API fails
        setProjects([]);
      });
  }, [navigate]);

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCreateProject = (projectData: Omit<Project, 'id' | 'projectId' | 'status' | 'createdAt'>) => {
    const token = localStorage.getItem("token");
    
    fetch("http://localhost:5000/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(projectData),
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to create project');
        }
        return res.json();
      })
      .then(newProject => {
        setProjects([...projects, newProject]);
        navigate('dashboard');
        showSuccessMessage('Project submitted for review.');
      })
      .catch(error => {
        console.error('Error creating project:', error);
        showSuccessMessage('Failed to create project. Please try again.');
      });
  };

  const handleUpdateProject = (projectId: string, updates: Partial<Project>) => {
    const token = localStorage.getItem("token");
    
    fetch(`http://localhost:5000/api/projects/${projectId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to update project');
        }
        return res.json();
      })
      .then(updatedProject => {
        setProjects(projects.map(project => 
          project.id === projectId ? updatedProject : project
        ));
        navigate('dashboard');
        showSuccessMessage('Project updated successfully.');
      })
      .catch(error => {
        console.error('Error updating project:', error);
        showSuccessMessage('Failed to update project. Please try again.');
      });
  };

  const handleDeleteProject = (projectId: string) => {
    const token = localStorage.getItem("token");
    
    fetch(`http://localhost:5000/api/projects/${projectId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to delete project');
        }
        return res.json();
      })
      .then(() => {
        setProjects(projects.filter(project => project.id !== projectId));
        navigate('dashboard');
        showSuccessMessage('Project deleted successfully.');
      })
      .catch(error => {
        console.error('Error deleting project:', error);
        showSuccessMessage('Failed to delete project. Please try again.');
      });
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    const token = localStorage.getItem("token");
    
    fetch("http://localhost:5000/api/users/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
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
  const isAuthenticated = !!token && userRole === "user" && user !== null;

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
        <Route path="dashboard" element={<GlobalDashboard projects={projects} user={user} />} />
        <Route
          path="projects"
          element={
            <ManageProject
              projects={projects}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
            />
          }
        />
        <Route path="projects/new" element={<ProjectSubmissionForm onSubmit={handleCreateProject} />} />
        <Route path="projects/history" element={<HistoricalProjectView projects={projects} />} />
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
            />
          }
        />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
}