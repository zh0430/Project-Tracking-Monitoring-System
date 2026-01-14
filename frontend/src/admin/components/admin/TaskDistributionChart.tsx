import { Task, Status } from '../../App';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface TaskDistributionChartProps {
  tasks: Task[];
  statuses: Status[];
}

export function TaskDistributionChart({ tasks, statuses }: TaskDistributionChartProps) {
  const statusCounts = statuses.map(status => ({
    name: status.statusName,
    value: tasks.filter(t => t.statusID === status.statusID).length,
  }));

  const COLORS = ['#9CA3AF', '#6B7280', '#374151'];

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-300">
      <h3 className="text-gray-900 mb-4">Task Distribution by Status</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={statusCounts}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {statusCounts.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
