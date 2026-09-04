import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../services/dashboardService';
import { getGroups, getGroupFeed } from '../services/groupService';
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

  // Grupos y Muro de Actividad
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupFeed, setGroupFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [statsData, groupsData, heatRes, volRes, exRes] = await Promise.all([
          getDashboardStats(),
          getGroups().catch(() => []),
          api.get('/api/analytics/activity-heatmap'),
          api.get('/api/analytics/volume-by-muscle'),
          api.get('/api/exercises')
        ]);

        setStats(statsData);
        setGroups(groupsData || []);
        if (groupsData && groupsData.length > 0) {
          setSelectedGroupId(groupsData[0].id);
        }
        
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
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      const fetchGroupFeedData = async () => {
        setFeedLoading(true);
        try {
          // Solicitamos solo el último entrenamiento de cada integrante del grupo
          const feedRes = await getGroupFeed(selectedGroupId, 20, 0, true);
          setGroupFeed(feedRes.feed || []);
        } catch (error) {
          console.error("Error fetching group feed", error);
          setGroupFeed([]);
        } finally {
          setFeedLoading(false);
        }
      };
      fetchGroupFeedData();
    }
  }, [selectedGroupId]);

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

      {/* SECCIÓN: Muro de Actividad de Grupos de Entrenamiento */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>👥</span>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Última Sesión de cada Integrante
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              El entrenamiento más reciente de cada miembro de tu grupo
            </p>
          </div>

          <Link
            to="/community"
            style={{
              color: 'var(--accent)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(52, 199, 89, 0.1)'
            }}
          >
            Ver Historial Completo en Comunidad ➔
          </Link>
        </div>

        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed var(--border-line)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '600' }}>
              Aún no formas parte de ningún Grupo de Entrenamiento
            </h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Crea un grupo con tus amigos de entrenamiento o únete a uno existente para compartir logros y progresos.
            </p>
            <Link
              to="/community"
              style={{
                display: 'inline-block',
                background: 'var(--primary-gradient, linear-gradient(135deg, #34C759 0%, #28CD41 100%))',
                color: '#000000',
                padding: '0.55rem 1.2rem',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.85rem',
                textDecoration: 'none'
              }}
            >
              Explorar Grupos en Comunidad
            </Link>
          </div>
        ) : (
          <div>
            {/* Selector de Grupos (Tabs / Pills) */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              {groups.map((grp) => {
                const isSelected = grp.id === selectedGroupId;
                return (
                  <button
                    key={grp.id}
                    onClick={() => setSelectedGroupId(grp.id)}
                    style={{
                      background: isSelected ? 'var(--accent)' : 'var(--bg-input)',
                      color: isSelected ? '#000000' : 'var(--text-secondary)',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-line)',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: isSelected ? '700' : '500',
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>🛡️</span>
                    <span>{grp.name}</span>
                    <span style={{ opacity: 0.75, fontSize: '0.75rem' }}>({grp.members_count || grp.members?.length || 1})</span>
                  </button>
                );
              })}
            </div>

            {/* Muro / Feed del Grupo Seleccionado */}
            {feedLoading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Cargando entrenamientos del grupo...
              </div>
            ) : groupFeed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed var(--border-line)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                🏋️‍♂️ No hay entrenamientos recientes registrados por los miembros de este grupo.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {groupFeed.map((item) => {
                  const initial = item.username.charAt(0).toUpperCase();

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '1.1rem',
                        borderRadius: '14px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-line)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        {/* Cabecera del usuario y fecha */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: 'rgba(52, 199, 89, 0.15)',
                                color: 'var(--accent)',
                                border: '1px solid rgba(52, 199, 89, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '0.9rem'
                              }}
                            >
                              {initial}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                @{item.username}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {item.date} {item.duration_minutes ? `• ${item.duration_minutes}m` : ''}
                              </div>
                            </div>
                          </div>

                          {item.routine_name && (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                padding: '2px 8px',
                                borderRadius: '8px',
                                background: 'rgba(52, 199, 89, 0.1)',
                                color: 'var(--accent)',
                                fontWeight: '600',
                                maxWidth: '120px',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap'
                              }}
                              title={item.routine_name}
                            >
                              {item.routine_name}
                            </span>
                          )}
                        </div>

                        {/* Métricas rápidas */}
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-line)', color: 'var(--text-primary)', fontWeight: '600' }}>
                            🔥 {item.sets_count} series
                          </span>
                          {item.total_volume_kg > 0 && (
                            <span style={{ fontSize: '0.75rem', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-line)', color: 'var(--accent)', fontWeight: '600' }}>
                              ⚡ {item.total_volume_kg.toLocaleString()} kg
                            </span>
                          )}
                        </div>

                        {/* Ejercicios resumidos */}
                        {item.exercises && item.exercises.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '0.4rem' }}>
                            {item.exercises.slice(0, 3).map((ex, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: '0.75rem',
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid var(--border-line)',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  color: 'var(--text-secondary)'
                                }}
                              >
                                {ex.exercise_name} {ex.max_weight_kg > 0 ? `(${ex.max_weight_kg}kg)` : ''}
                              </span>
                            ))}
                            {item.exercises.length > 3 && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '2px 4px' }}>
                                +{item.exercises.length - 3} más
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
