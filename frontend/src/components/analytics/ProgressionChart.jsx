import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ProgressionChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>Sin registros suficientes para este ejercicio.</p>;
  }

  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-line)" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="var(--text-secondary)" 
            fontSize={12} 
            tickFormatter={(tick) => {
              const parts = tick.split('-');
              return `${parts[2]}/${parts[1]}`;
            }}
          />
          <YAxis stroke="var(--text-secondary)" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-line)', borderRadius: '8px' }}
            itemStyle={{ color: 'var(--accent)', fontWeight: 'bold' }}
            formatter={(value) => [`${value} kg`, 'Max Peso']}
            labelStyle={{ color: 'var(--text-secondary)' }}
          />
          <Line 
            type="monotone" 
            dataKey="weight" 
            stroke="var(--accent)" 
            strokeWidth={3}
            dot={{ fill: 'var(--bg-card)', stroke: 'var(--accent)', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressionChart;
