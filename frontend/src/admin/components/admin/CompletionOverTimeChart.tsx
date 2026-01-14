import { Task, Status } from '../../App';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CompletionOverTimeChartProps {
  tasks: Task[];
  statuses: Status[];
}

export function CompletionOverTimeChart({ tasks, statuses }: CompletionOverTimeChartProps) {
  // Get completed tasks
  const completedStatusId = statuses.find(s => s.statusName === 'Completed')?.statusID;
  const completedTasks = tasks.filter(t => t.statusID === completedStatusId && t.completedDate);

  // Group by completion date
  const completionByDate = completedTasks.reduce((acc, task) => {
    const date = task.completedDate!;
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date]++;
    return acc;
  }, {} as Record<string, number>);

  // Convert to array and sort by date
  const chartData = Object.entries(completionByDate)
    .map(([date, count]) => ({
      date,
      completed: count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate cumulative
  let cumulative = 0;
  const chartDataWithCumulative = chartData.map(item => {
    cumulative += item.completed;
    return {
      ...item,
      cumulative,
    };
  });

  return (
    <div>
      <h3 className="text-gray-900 mb-4">Completed Tasks Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartDataWithCumulative}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            stroke="#6B7280"
            tick={{ fill: '#6B7280' }}
          />
          <YAxis 
            stroke="#6B7280"
            tick={{ fill: '#6B7280' }}
          />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="completed" 
            stroke="#9CA3AF" 
            strokeWidth={2}
            name="Daily Completed"
          />
          <Line 
            type="monotone" 
            dataKey="cumulative" 
            stroke="#DC2626" 
            strokeWidth={2}
            name="Total Completed"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
