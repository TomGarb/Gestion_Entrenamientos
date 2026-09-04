import React, { useMemo } from 'react';

const Heatmap = ({ data }) => {
  // data viene como [{ date: "2024-03-01", count: 1, total_sets: 12, total_volume: 4500, level: 2 }]
  
  // Generar últimos 120 días
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
      
      let level = 0;
      let totalSets = 0;
      let totalVolume = 0;
      let count = 0;

      if (activity) {
        count = activity.count || 1;
        totalSets = activity.total_sets || 0;
        totalVolume = activity.total_volume || 0;
        
        if (activity.level) {
          level = activity.level;
        } else if (totalSets > 16 || totalVolume >= 8000 || count >= 2) {
          level = 3;
        } else if (totalSets >= 9 || totalVolume >= 3000) {
          level = 2;
        } else {
          level = 1;
        }
      }
      
      dateArray.push({
        date: dateString,
        active: level > 0,
        level,
        count,
        totalSets,
        totalVolume
      });
    }
    return dateArray;
  }, [data]);

  // Agrupar en semanas para renderizar en columnas estilo GitHub
  const weeks = [];
  let currentWeek = [];
  
  days.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === days.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const getCellColor = (level) => {
    switch (level) {
      case 1:
        return '#9BE9A8'; // Verde tenue (sesión ligera)
      case 2:
        return '#40C463'; // Verde medio (rutina estándar)
      case 3:
        return '#216E39'; // Verde intenso (alto volumen)
      default:
        return 'var(--heatmap-empty, #EBEDF0)'; // Alto contraste (#EBEDF0 claro / #2D333B oscuro)
    }
  };

  const getTooltip = (day) => {
    if (!day.active) return `${day.date}: Sin entrenamiento`;
    const labels = {
      1: 'Sesión ligera',
      2: 'Rutina estándar',
      3: 'Día de alto volumen'
    };
    const intensity = labels[day.level] || 'Entrenamiento completado';
    const stats = day.totalSets > 0 ? ` (${day.totalSets} series • ${day.totalVolume.toLocaleString()} kg)` : '';
    return `${day.date}: ${intensity}${stats}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* Contenedor del Heatmap */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '4px', 
          overflowX: 'auto', 
          paddingBottom: '0.5rem',
          scrollbarWidth: 'thin'
        }}
      >
        {weeks.map((week, wIndex) => (
          <div key={wIndex} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {week.map((day, dIndex) => (
              <div 
                key={dIndex}
                title={getTooltip(day)}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '2.5px',
                  backgroundColor: getCellColor(day.level),
                  border: day.level === 0 ? '1px solid var(--border-line)' : 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, opacity 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.35)';
                  e.currentTarget.style.zIndex = '10';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.zIndex = '1';
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Leyenda de escala de calor */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'flex-end', 
        gap: '6px', 
        fontSize: '0.75rem', 
        color: 'var(--text-secondary)' 
      }}>
        <span>Menos</span>
        <div style={{ width: '11px', height: '11px', borderRadius: '2px', backgroundColor: 'var(--heatmap-empty, #EBEDF0)', border: '1px solid var(--border-line)' }} title="Sin entrenamiento" />
        <div style={{ width: '11px', height: '11px', borderRadius: '2px', backgroundColor: '#9BE9A8' }} title="Sesión ligera" />
        <div style={{ width: '11px', height: '11px', borderRadius: '2px', backgroundColor: '#40C463' }} title="Rutina estándar" />
        <div style={{ width: '11px', height: '11px', borderRadius: '2px', backgroundColor: '#216E39' }} title="Alto volumen" />
        <span>Más</span>
      </div>
    </div>
  );
};

export default Heatmap;
