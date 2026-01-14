import { Task, Employee } from '../../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface WorkloadByEmployeeChartProps {
  tasks: Task[];
  employees: Employee[];
}

export function WorkloadByEmployeeChart({ tasks, employees }: WorkloadByEmployeeChartProps) {
  const workloadData = employees.map(employee => {
    // Only count tasks that are NOT completed (statusID '3' is typically Completed)
    const employeeTasks = tasks.filter(t => 
      t.assignedToUserID === employee.userID && 
      t.statusID !== '3' // Exclude completed tasks
    );
    return {
      name: employee.name.split(' ')[0], // First name only for chart
      tasks: employeeTasks.length,
    };
  });

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-300">
      <h3 className="text-gray-900 mb-4">Incomplete Tasks by Employee</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={workloadData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="name" 
            stroke="#6B7280"
            tick={{ fill: '#6B7280' }}
          />
          <YAxis 
            stroke="#6B7280"
            tick={{ fill: '#6B7280' }}
          />
          <Tooltip />
          <Legend />
          <Bar dataKey="tasks" fill="#DC2626" name="Incomplete Tasks" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}