import { Task, Category } from '../../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CategoryDistributionChartProps {
  tasks: Task[];
  categories: Category[];
}

/**
 * CATEGORY DISTRIBUTION CHART COMPONENT
 * Visualizes task distribution across different work categories using a bar chart.
 * Calculates task counts per category and displays the data using Recharts library.
 */

export function CategoryDistributionChart({ tasks, categories }: CategoryDistributionChartProps) {
  // Transform category data into chart-compatible format with task counts
  const categoryData = categories.map(category => ({
    name: category.categoryName,
    count: tasks.filter(t => t.categoryID === category.categoryID).length,
  }));

  return (
    <div>
      <h3 className="text-gray-900 mb-4">Work Categories Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={categoryData}>
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
          <Bar dataKey="count" fill="#DC2626" name="Tasks" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}