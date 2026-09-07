import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ProgressionChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>Sin registros suficientes para este ejercicio.</p>;
  }

  return (
    <div style={{ width: '100%', height: 250, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-line)" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="var(--text-secondary)" 
            fontSize={12} 
            tickFormatter={(tick) => {
              if (!tick || typeof tick !== 'string' || !tick.includes('-')) return tick || '';
              const parts = tick.split('-');
              return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : tick;
            }}
          />
          <YAxis stroke="var(--text-secondary)" fontSize={12} unit=" kg" />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-line)', borderRadius: '8px' }}
            itemStyle={{ color: 'var(--accent)', fontWeight: 'bold' }}
            formatter={(value) => [`${value} kg`, 'Fuerza Bruta Est.']}
            labelStyle={{ color: 'var(--text-secondary)' }}
          />
          <Line 
            type="monotone" 
            dataKey="weight" 
            stroke="var(--accent)" 
            strokeWidth={3}
            dot={{ fill: 'var(--accent)', stroke: 'var(--bg-card)', strokeWidth: 2, r: data.length === 1 ? 7 : 4 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressionChart;
