import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../services/dashboardService';
import api from '../services/api';

import Heatmap from '../components/analytics/Heatmap';
import MusclePieChart from '../components/analytics/MusclePieChart';
import ProgressionChart from '../components/analytics/ProgressionChart';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [volumeData, setVolumeData] = useState([]);
  const [progressionData, setProgressionData] = useState([]);
  
  const [exercises, setExercises] = useState([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const statsData = await getDashboardStats();
        setStats(statsData);
        
        // Fetch Analytics
        const [heatRes, volRes, exRes] = await Promise.all([
          api.get('/api/analytics/activity-heatmap'),
          api.get('/api/analytics/volume-by-muscle'),
          api.get('/api/exercises')
        ]);
        
        setHeatmapData(heatRes.data);
        setVolumeData(volRes.data);
        
        const allEx = exRes.data;
        setExercises(allEx);
        
        // Seleccionar por defecto el primer ejercicio que el usuario tenga (o press de banca si existe)
        if (allEx.length > 0) {
          const defaultEx = allEx.find(e => e.name.toLowerCase().includes('banca') || e.name.toLowerCase().includes('bench')) || allEx[0];
          setSelectedExerciseId(defaultEx.id);
        }
        
      } catch (error) {
        console.error("Error fetching dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, []);

  useEffect(() => {
    if (selectedExerciseId) {
      fetchProgression(selectedExerciseId);
    }
  }, [selectedExerciseId]);

  const fetchProgression = async (exerciseId) => {
    try {
      const res = await api.get(`/api/analytics/progression/${exerciseId}`);
      setProgressionData(res.data);
    } catch (error) {
      console.error("Error fetching progression", error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ color: 'var(--text-secondary)' }}>Cargando analíticas...</h2>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      
      {/* Header Profile / Title Area */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>Overview</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Track your fitness metrics</p>
        </div>
      </header>

      {/* Main Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        
        {/* BIG HERO CARD - Monthly Volume */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Volumen Mensual</span>
            <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>💪</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {stats?.monthly_volume_kg ? Math.round(stats.monthly_volume_kg).toLocaleString('es-AR') : 0}
            </span>
            <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', fontWeight: '600' }}>KG</span>
          </div>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Basado en el historial reciente</span>
          </div>
        </div>

        {/* Small Cards Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <Link to="/history" style={{ textDecoration: 'none' }}>
            <div className="glass-panel" style={{ padding: '1.2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s', cursor: 'pointer' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>Actividad Reciente</span>
                <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>{stats?.recent_workouts || 0} <span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>sesiones</span></span>
              </div>
              <div style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: '600', backgroundColor: 'rgba(52, 199, 89, 0.15)', padding: '4px 10px', borderRadius: '8px' }}>
                Ver ➔
              </div>
            </div>
          </Link>

          <div className="glass-panel" style={{ padding: '1.2rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Último Entrenamiento</span>
            {stats?.last_workout ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <span style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', display: 'block' }}>{stats.last_workout.routine_name}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{stats.last_workout.duration_minutes || '--'} mins</span>
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {Math.floor((new Date() - new Date(stats.last_workout.date)) / (1000 * 60 * 60 * 24))}d ago
                </span>
              </div>
            ) : (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No hay registros.</span>
            )}
          </div>

        </div>
      </div>

      {/* Analytics Section */}
      
      {/* 1. Mapa de Calor */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '600' }}>Consistencia (Últimos 120 días)</span>
        </div>
        <Heatmap data={heatmapData} />
      </div>

      {/* Gráficos Recharts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        
        {/* 2. Distribución de Volumen (PieChart) */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '600' }}>Volumen por Músculo</span>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>Tonelaje total registrado</p>
          </div>
          <MusclePieChart data={volumeData} />
        </div>

        {/* 3. Progresión (LineChart) */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '600' }}>Progresión de Fuerza</span>
            <select 
              value={selectedExerciseId} 
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              style={{
                background: 'var(--bg-input)', border: '1px solid var(--border-line)',
                color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '8px', outline: 'none'
              }}
            >
              {exercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>
          <ProgressionChart data={progressionData} />
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
