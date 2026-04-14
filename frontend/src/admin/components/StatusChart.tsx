import { Task } from '../App';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface StatusChartProps {
  tasks: Task[];
}

/**
 * STATUS CHART COMPONENT
 * Visualizes task distribution across different workflow statuses
 * using a pie chart with color-coded segments (Gray for To Do, Blue for In Progress, Green for Completed).
 * Provides quick overview of project progress and workload balance.
 */

export function StatusChart({ tasks }: StatusChartProps) {
  // Count tasks by status
  const statusCounts = {
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  const data = [
    { name: 'To Do', value: statusCounts.todo },
    { name: 'In Progress', value: statusCounts.inProgress },
    { name: 'Completed', value: statusCounts.completed },
  ];

  const COLORS = ['#9CA3AF', '#3B82F6', '#10B981'];

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-gray-900 mb-4">Project Status</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}