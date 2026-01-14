import { Task } from '../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface WorkloadChartProps {
  tasks: Task[];
}

export function WorkloadChart({ tasks }: WorkloadChartProps) {
  // Group tasks by assignee
  const workloadByAssignee = tasks.reduce((acc, task) => {
    if (!acc[task.assignee]) {
      acc[task.assignee] = {
        name: task.assignee,
        todo: 0,
        inProgress: 0,
        completed: 0,
      };
    }
    
    if (task.status === 'todo') {
      acc[task.assignee].todo += task.estimatedHours;
    } else if (task.status === 'in-progress') {
      acc[task.assignee].inProgress += task.estimatedHours;
    } else {
      acc[task.assignee].completed += task.estimatedHours;
    }
    
    return acc;
  }, {} as Record<string, { name: string; todo: number; inProgress: number; completed: number }>);

  const chartData = Object.values(workloadByAssignee);

  return (
    <div>
      <h3 className="text-gray-900 mb-4">Team Workload Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="todo" fill="#9CA3AF" name="To Do" />
          <Bar dataKey="inProgress" fill="#3B82F6" name="In Progress" />
          <Bar dataKey="completed" fill="#10B981" name="Completed" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
