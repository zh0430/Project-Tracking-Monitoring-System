import { Task, Category } from '../../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CategoryDistributionChartProps {
  tasks: Task[];
  categories: Category[];
}

export function CategoryDistributionChart({ tasks, categories }: CategoryDistributionChartProps) {
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
