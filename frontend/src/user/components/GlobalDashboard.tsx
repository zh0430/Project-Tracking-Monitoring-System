import { useState } from 'react';
import type { Project, User } from '../UserApp';
import { ClipboardList, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface GlobalDashboardProps {
  projects: Project[];
  user: User;
}

/**
 * GLOBAL DASHBOARD COMPONENT (Employee View)
 * Main dashboard for regular employees to view their projects and workload.
 * Features include:
 * - Welcome greeting based on time of day
 * - Statistics cards for total, active, completed, and high priority projects
 * - Pie chart for project distribution by status
 * - Bar chart for project distribution by priority
 * - Paginated list of active projects with status and priority badges
 * - Excludes historical projects (completed + approved)
 */

export function GlobalDashboard({ projects, user }: GlobalDashboardProps) {
  // Use safe projects array
  const safeProjects = projects ?? [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const visibleCount = 5; // how many cards per view
  
  // Helper functions
  const isHistorical = (project: Project) =>
    project.status === 'Completed' && project.approvalStatus === 'Approved';

  const isActive = (project: Project) =>
    !(project.status === 'Completed' && project.approvalStatus === 'Approved');

  // Calculate statistics
  const totalProjects = safeProjects.length;
  const activeProjectsList = safeProjects.filter(isActive);
  const activeProjects = activeProjectsList.length;
  const completedProjects = safeProjects.filter(
    (project) =>
      project.status === 'Completed' &&
      project.approvalStatus !== 'Approved'
  ).length;
  const highPriorityProjects = safeProjects.filter(
    (project) =>
      project.priority === 'High' &&
      isActive(project)
  ).length;

  // Project Distribution by Status (using activeProjectsList)
  const statusDistribution = [
    {
      name: 'To Do',
      value: activeProjectsList.filter(p => p.status === 'To Do').length,
      color: '#9CA3AF',
    },
    {
      name: 'In Progress',
      value: activeProjectsList.filter(p => p.status === 'In Progress').length,
      color: '#1F2937',
    },
    {
      name: 'Completed',
      value: activeProjectsList.filter(p => p.status === 'Completed').length,
      color: '#6B7280',
    },
    {
      name: 'Revision Required',
      value: activeProjectsList.filter(p => p.status === 'Revision Required').length,
      color: '#FEE2E2',
    },
  ];

  // Project Priority Distribution (using activeProjectsList)
  const priorityDistribution = [
    {
      name: 'Low',
      value: activeProjectsList.filter(p => p.priority === 'Low').length,
    },
    {
      name: 'Medium',
      value: activeProjectsList.filter(p => p.priority === 'Medium').length,
    },
    {
      name: 'High',
      value: activeProjectsList.filter(p => p.priority === 'High').length,
    },
    {
      name: 'Not Set',
      value: activeProjectsList.filter(p => !p.priority).length,
    },
  ];

  const statCards = [
    {
      title: 'Total Projects',
      value: totalProjects,
      icon: ClipboardList,
      bgColor: 'bg-gray-100',
      iconColor: 'text-gray-700',
    },
    {
      title: 'Active Projects',
      value: activeProjects,
      icon: Clock,
      bgColor: 'bg-gray-800',
      iconColor: 'text-white',
      textColor: 'text-white',
    },
    {
      title: 'Completed Projects',
      value: completedProjects,
      icon: CheckCircle,
      bgColor: 'bg-gray-200',
      iconColor: 'text-gray-800',
    },
    {
      title: 'High Priority',
      value: highPriorityProjects,
      icon: AlertTriangle,
      bgColor: 'bg-red-600',
      iconColor: 'text-white',
      textColor: 'text-white',
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const next = () => {
    if (currentIndex + visibleCount < activeProjectsList.length) {
      setCurrentIndex(prev => prev + visibleCount);
    }
  };

  const prev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - visibleCount);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-gray-900 mb-2">
          {getGreeting()}, {user.fullName?.split(' ')?.[0] || 'User'}!
        </h2>
        <p className="text-gray-600">
          Welcome to your dashboard. Here's an overview of your projects and workload.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`${stat.bgColor} border border-gray-200 rounded-lg p-6`}
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={`w-8 h-8 ${stat.iconColor}`} />
              </div>
              <div className={`text-3xl mb-2 ${stat.textColor || 'text-gray-900'}`}>
                {stat.value}
              </div>
              <div className={`${stat.textColor || 'text-gray-700'}`}>
                {stat.title}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Distribution by Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-gray-900 mb-6">Project Distribution by Status</h3>
          {safeProjects.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => (value > 0 ? `${name}: ${value}` : '')}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-gray-500 text-center">No project data available</p>
            </div>
          )}
        </div>

        {/* Project Priority Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-gray-900 mb-6">Project Priority Distribution</h3>
          {safeProjects.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.375rem',
                  }}
                />
                <Legend />
                <Bar dataKey="value" fill="#DC2626" name="Projects" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-gray-500 text-center">No project data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Projects List Section with Pagination */}
      {activeProjectsList.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-gray-900 mb-6">Active Projects</h3>
          
          <div className="space-y-4">
            {activeProjectsList
              .slice(currentIndex, currentIndex + visibleCount)
              .map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <h4 className="font-medium text-gray-900">{project.title}</h4>

                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-gray-600">
                        {project.projectId}
                      </span>

                      <span className={`text-sm px-2 py-1 rounded ${
                        project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        project.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        project.status === 'Revision Required' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>

                      {project.priority && (
                        <span className={`text-sm px-2 py-1 rounded ${
                          project.priority === 'High' ? 'bg-red-100 text-red-800' :
                          project.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {project.priority} Priority
                        </span>
                      )}
                    </div>
                  </div>

                  {project.dueDate && (
                    <div className="text-sm text-gray-600">
                      Due: {new Date(project.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
          </div>

          {/* Pagination Controls */}
          {activeProjectsList.length > visibleCount && (
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={prev}
                disabled={currentIndex === 0}
                className={`px-4 py-2 rounded transition-colors ${
                  currentIndex === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                ← Previous
              </button>

              <span className="text-sm text-gray-600">
                Page {Math.floor(currentIndex / visibleCount) + 1} of{' '}
                {Math.ceil(activeProjectsList.length / visibleCount)}
              </span>

              <button
                onClick={next}
                disabled={currentIndex + visibleCount >= activeProjectsList.length}
                className={`px-4 py-2 rounded transition-colors ${
                  currentIndex + visibleCount >= activeProjectsList.length
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}