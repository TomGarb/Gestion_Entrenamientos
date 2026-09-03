import React, { useMemo } from 'react';

const Heatmap = ({ data }) => {
  // data viene como [{ date: "2023-10-01", count: 1 }]
  
  // Generar ltimos 120 das
  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateArray = [];
    
    for (let i = 119; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      // Format YYYY-MM-DD local
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;
      
      const activity = (data || []).find(item => item.date && item.date.startsWith(dateString));
      
      dateArray.push({
        date: dateString,
        active: !!activity
      });
    }
    return dateArray;
  }, [data]);

  // Agrupar en semanas para renderizar como Github (columnas)
  const weeks = [];
  let currentWeek = [];
  
  days.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === days.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  return (
    <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '0.5rem' }}>
      {weeks.map((week, wIndex) => (
        <div key={wIndex} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {week.map((day, dIndex) => (
            <div 
              key={dIndex}
              title={day.date}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                backgroundColor: day.active ? 'var(--accent)' : 'var(--bg-input)',
                opacity: day.active ? 1 : 0.5
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default Heatmap;
