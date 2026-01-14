import type { Project, User } from '../UserApp';
import { ClipboardList, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface GlobalDashboardProps {
  projects: Project[];
  user: User;
}

export function GlobalDashboard({ projects, user }: GlobalDashboardProps) {
  // Use safe projects array
  const safeProjects = projects ?? [];
  
  // Calculate statistics
  const totalProjects = safeProjects.length;
  const activeProjects = safeProjects.filter(
    (project) => project.status !== 'Completed'
  ).length;
  const completedProjects = safeProjects.filter(
    (project) => project.status === 'Completed'
  ).length;
  const highPriorityProjects = safeProjects.filter(
    (project) => project.priority === 'High' && project.status !== 'Completed'
  ).length;

  // Project Distribution by Status
  const statusDistribution = [
    {
      name: 'To Do',
      value: safeProjects.filter((project) => project.status === 'To Do').length,
      color: '#9CA3AF',
    },
    {
      name: 'In Progress',
      value: safeProjects.filter((project) => project.status === 'In Progress').length,
      color: '#1F2937',
    },
    {
      name: 'Completed',
      value: safeProjects.filter((project) => project.status === 'Completed').length,
      color: '#6B7280',
    },
    {
      name: 'Revision Required',
      value: safeProjects.filter((project) => project.status === 'Revision Required').length,
      color: '#FEE2E2',
    },
  ];

  // Project Priority Distribution
  const priorityDistribution = [
    {
      name: 'Low',
      value: safeProjects.filter((project) => project.priority === 'Low').length,
    },
    {
      name: 'Medium',
      value: safeProjects.filter((project) => project.priority === 'Medium').length,
    },
    {
      name: 'High',
      value: safeProjects.filter((project) => project.priority === 'High').length,
    },
    {
      name: 'Not Set',
      value: safeProjects.filter((project) => !project.priority).length,
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

      {/* Projects List Section (Optional - Add if you want to show actual projects) */}
      {safeProjects.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-gray-900 mb-6">Recent Projects</h3>
          <div className="space-y-4">
            {safeProjects.slice(0, 5).map((project) => (
              <div key={project.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div>
                  <h4 className="font-medium text-gray-900">{project.title}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-600">{project.projectId}</span>
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
            {safeProjects.length > 5 && (
              <div className="text-center pt-4">
                <p className="text-gray-600 text-sm">
                  Showing 5 of {safeProjects.length} projects
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}