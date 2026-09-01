import React, { useState, useEffect } from 'react';
import { getDashboardStats } from '../services/dashboardService';

// --- Paleta "Hierro y Sudor" ---
const colors = {
  background: '#1C1C1E',
  cardBg: '#2C2C2E',
  borderLine: '#3A3A3C',
  textPrimary: '#F2F2F7',
  textSecondary: '#AEAEB2',
  accentRed: '#FFD60A',
  successGreen: '#32D74B'
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error("Error fetching dashboard stats", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: colors.background, color: colors.textPrimary, minHeight: '100vh', padding: '2rem', margin: '-2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Cargando métricas...</h2>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: colors.background, color: colors.textPrimary, minHeight: '100vh', padding: '2rem', margin: '-2rem' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: colors.textPrimary }}>Panel de Control</h1>
        <p style={{ color: colors.textSecondary, marginTop: '0.5rem', fontSize: '1.1rem', lineHeight: '1.5', maxWidth: '800px' }}>
          Bienvenido a GymTracker. Este es tu centro de mando. Aquí visualizarás tu progreso, el peso total levantado y tu consistencia.<br/><br/>
          💡 <strong>¿Eres nuevo?</strong> Dirígete a <strong>Ejercicios</strong> para revisar el catálogo y luego crea tu primera plantilla en <strong>Rutinas</strong>. Cuando estés listo para sudar, presiona <strong>Entrenar</strong>.
        </p>
      </header>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '2rem',
        marginBottom: '3rem'
      }}>
        {/* Tarjeta: Entrenamientos Recientes */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: colors.textSecondary, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Últimos 7 Días
          </h3>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: 0, color: colors.successGreen }}>
            {stats?.recent_workouts || 0}
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '0.9rem', marginTop: '0.5rem' }}>sesiones completadas</p>
        </div>

        {/* Tarjeta: Volumen del Mes */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: colors.textSecondary, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Volumen Mensual
          </h3>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: 0, color: colors.accentRed }}>
            {stats?.monthly_volume_kg ? stats.monthly_volume_kg.toLocaleString() : 0} <span style={{fontSize: '1.5rem'}}>kg</span>
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '0.9rem', marginTop: '0.5rem' }}>tonelaje total levantado</p>
        </div>

        {/* Tarjeta: Último Entrenamiento */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: colors.textSecondary, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Última Sesión
          </h3>
          {stats?.last_workout ? (
            <>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: colors.textPrimary }}>
                {stats.last_workout.routine_name}
              </p>
              <p style={{ color: colors.accentRed, fontWeight: 'bold', margin: '0.5rem 0' }}>
                Hace {Math.floor((new Date() - new Date(stats.last_workout.date)) / (1000 * 60 * 60 * 24))} días
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '0.9rem', margin: 0 }}>
                Duración: {stats.last_workout.duration_minutes || '--'} min
              </p>
            </>
          ) : (
             <p style={{ fontSize: '1.2rem', color: colors.textSecondary, margin: '2rem 0' }}>No hay registros recientes.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const cardStyle = {
  padding: '2rem',
  backgroundColor: colors.cardBg,
  border: `1px solid ${colors.borderLine}`,
  borderRadius: '16px',
  textAlign: 'center',
  boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
  transition: 'transform 0.2s ease',
};

export default Dashboard;
