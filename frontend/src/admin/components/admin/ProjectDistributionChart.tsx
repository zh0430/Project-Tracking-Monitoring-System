import { Project, Status } from '../../App';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ProjectDistributionChartProps {
  projects: Project[];
  statuses: Status[];
}

export function ProjectDistributionChart({ projects, statuses }: ProjectDistributionChartProps) {
  const statusCounts = statuses
    .map(status => ({
      name: status.statusName,
      value: projects.filter(p => p.statusID === status.statusID).length,
    }))
    .filter(item => item.value > 0);

  const COLORS = {
    'To Do': '#EF4444',        // Bright Red
    'In Progress': '#3B82F6',  // Bright Blue
    'Revision Required': '#F59E0B', // Amber/Orange
    'Completed': '#22C55E',    // Bright Green
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-300">
      <h3 className="text-gray-900 mb-4">Project Distribution by Status</h3>

      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={statusCounts}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            label={({ name, percent }) =>
              percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
            }
          >
            {statusCounts.map((entry, index) => (
              <Cell key={index} fill={COLORS[entry.name as keyof typeof COLORS] || '#6B7280'} />
            ))}
          </Pie>

          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}