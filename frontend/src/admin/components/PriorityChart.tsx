import { Task } from '../App';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PriorityChartProps {
  tasks: Task[];
}

/**
 * PRIORITY CHART COMPONENT
 * Visualizes the distribution of active (non-completed) tasks by priority level
 * using a pie chart with color-coded segments (Red for High, Amber for Medium, Green for Low).
 * Only includes active tasks to focus on current workload.
 */

export function PriorityChart({ tasks }: PriorityChartProps) {
  // Filter to active tasks only (excluding completed)
  const activeTasks = tasks.filter(t => t.status !== 'completed');
  
  // Count tasks by priority level
  const priorityCounts = {
    high: activeTasks.filter(t => t.priority === 'high').length,
    medium: activeTasks.filter(t => t.priority === 'medium').length,
    low: activeTasks.filter(t => t.priority === 'low').length,
  };

  const data = [
    { name: 'High', value: priorityCounts.high },
    { name: 'Medium', value: priorityCounts.medium },
    { name: 'Low', value: priorityCounts.low },
  ];

  const COLORS = ['#EF4444', '#F59E0B', '#10B981'];

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-gray-900 mb-4">Priority Distribution</h3>
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
      <p className="text-gray-500 text-sm mt-2 text-center">Active tasks only</p>
    </div>
  );
}