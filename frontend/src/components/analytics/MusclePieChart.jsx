import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#007bff', '#34C759', '#FF9F0A', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55', '#4da3ff'];

const MusclePieChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>Sin datos suficientes</p>;
  }

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={65}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-line)', borderRadius: '8px' }}
            itemStyle={{ color: 'var(--text-primary)' }}
            formatter={(value) => [`${value.toLocaleString('es-AR')} kg`, 'Volumen']}
          />
          <Legend 
            layout="horizontal" 
            verticalAlign="bottom" 
            align="center"
            wrapperStyle={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingTop: '20px' }}
            formatter={(value) => <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MusclePieChart;
