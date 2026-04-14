import { Project, Employee, Status } from '../../App';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface IncompleteProjectsChartProps {
  projects: Project[];
  employees: Employee[];
  statuses: Status[];
}

/**
 * INCOMPLETE PROJECTS CHART COMPONENT
 * Visualizes workload distribution by displaying the number of incomplete
 * projects assigned to each employee using a bar chart.
 * Helps identify employees with high pending workload.
 */

export function IncompleteProjectsChart({
  projects,
  employees,
  statuses,
}: IncompleteProjectsChartProps) {

  // Calculate incomplete project count per employee
  const workloadData = employees.map(employee => {
    const count = projects.filter(p => {
      const isAssigned = (p.assignedToUserIDs || []).includes(employee.userID);
      const status = statuses.find(s => s.statusID === p.statusID);

      return isAssigned && status?.statusName !== 'Completed';
    }).length;

    return {
      name: employee.name.split(' ')[0], // Use first name only for cleaner display
      value: count,
    };
  });

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-300">
      <h3 className="text-gray-900 mb-4">Incomplete Projects by Employee</h3>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={workloadData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#EF4444" name="Incomplete Projects" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}