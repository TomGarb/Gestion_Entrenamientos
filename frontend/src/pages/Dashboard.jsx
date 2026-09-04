import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../services/dashboardService';
import { getGroups, getGroupFeed } from '../services/groupService';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

import Heatmap from '../components/analytics/Heatmap';
import MusclePieChart from '../components/analytics/MusclePieChart';
import ProgressionChart from '../components/analytics/ProgressionChart';
import { 
  PlayIcon, 
  PlusIcon, 
  CalendarIcon, 
  UsersIcon, 
  LayoutGridIcon, 
  FlameIcon, 
  TrendingUpIcon, 
  BarChartIcon, 
  SparklesIcon,
  DumbbellIcon 
} from '../components/common/Icons';

const DEFAULT_WIDGETS = {
  quick_actions: true,
  monthly_volume: true,
  recent_activity: true,
  last_workout: true,
  group_feed: true,
  consistency_heatmap: true,
  volume_by_muscle: true,
  strength_progression: true
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
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

  // Preferencias activas del usuario
  const widgets = {
    ...DEFAULT_WIDGETS,
    ...(user?.extra_data?.dashboard_widgets || {})
  };

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
        
        // Seleccionar por defecto press de banca o primer ejercicio
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
    if (selectedGroupId && widgets.group_feed) {
      const fetchGroupFeedData = async () => {
        setFeedLoading(true);
        try {
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
  }, [selectedGroupId, widgets.group_feed]);

  useEffect(() => {
    if (selectedExerciseId && widgets.strength_progression) {
      fetchProgression(selectedExerciseId);
    }
  }, [selectedExerciseId, widgets.strength_progression]);

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
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: '600' }}>
          Cargando métricas del dashboard...
        </h2>
      </div>
    );
  }

  // Comprobar si al menos un widget principal está activo
  const hasActiveWidgets = Object.values(widgets).some(v => v === true);

  // Layout helper para la primera fila Bento (Hero vs Side Cards)
  const showHero = widgets.monthly_volume;
  const showSideCards = widgets.recent_activity || widgets.last_workout;

  return (
    <div style={{ paddingBottom: '3rem' }}>
      
      {/* Cabecera del Dashboard */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Panel Principal
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            {user?.username ? `¡Hola de nuevo, @${user.username}! Resumen de tu rendimiento.` : 'Resumen de tu rendimiento deportivo.'}
          </p>
        </div>

        <Link
          to="/settings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: '600',
            padding: '6px 12px',
            borderRadius: '10px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-line)',
            transition: 'all 0.2s ease'
          }}
        >
          <LayoutGridIcon size={16} color="var(--accent)" />
          <span>Personalizar</span>
        </Link>
      </header>

      {/* ⚡ Barra de Acciones Rápidas (Quick Actions) */}
      {widgets.quick_actions && (
        <div className="quick-actions-bar">
          <Link to="/workouts" className="quick-action-btn primary">
            <PlayIcon size={16} color="#000000" />
            <span>Entrenar Ahora</span>
          </Link>

          <Link to="/routines" className="quick-action-btn">
            <PlusIcon size={16} color="var(--accent)" />
            <span>Crear Rutina</span>
          </Link>

          <Link to="/calendar" className="quick-action-btn">
            <CalendarIcon size={16} color="var(--accent)" />
            <span>Calendario</span>
          </Link>

          <Link to="/community" className="quick-action-btn">
            <UsersIcon size={16} color="var(--accent)" />
            <span>Comunidad & Grupos</span>
          </Link>
        </div>
      )}

      {/* Si todos los widgets fueron desactivados */}
      {!hasActiveWidgets ? (
        <div className="bento-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', alignItems: 'center' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent)' }}>
            <LayoutGridIcon size={28} color="currentColor" />
          </div>
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: '700' }}>
            Tu Dashboard está despejado
          </h2>
          <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '420px' }}>
            Has apagado todos los módulos visuales. Puedes reactivar los widgets que necesites en cualquier momento.
          </p>
          <Link to="/settings" className="quick-action-btn primary">
            <LayoutGridIcon size={16} color="#000000" />
            <span>Configurar Módulos</span>
          </Link>
        </div>
      ) : (
        /* 🍱 Cuadrícula Asimétrica Bento Box */
        <div className="bento-grid">
          
          {/* ================================================================= */}
          {/* FILA 1: Métrica Hero de Volumen Mensual */}
          {/* ================================================================= */}
          {showHero && (
            <div 
              className={`bento-card ${showSideCards ? 'bento-col-8' : 'bento-col-12'}`}
              style={{
                background: 'linear-gradient(145deg, var(--bg-card) 0%, rgba(52, 199, 89, 0.04) 100%)',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Volumen Levantado (Mes Actual)
                  </span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <BarChartIcon size={18} color="currentColor" />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>
                    {stats?.monthly_volume_kg ? Math.round(stats.monthly_volume_kg).toLocaleString('es-AR') : 0}
                  </span>
                  <span style={{ fontSize: '1.25rem', color: 'var(--accent)', fontWeight: '700' }}>
                    KG
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <SparklesIcon size={15} color="var(--accent)" />
                <span>Calculado automáticamente a partir de todas las series válidas del mes.</span>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* FILA 1 (Lado Derecho): Actividad Reciente & Último Entrenamiento */}
          {/* ================================================================= */}
          {showSideCards && (
            <div 
              className={`${showHero ? 'bento-col-4' : 'bento-col-12'}`}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              {/* Tarjeta: Actividad Reciente */}
              {widgets.recent_activity && (
                <Link to="/history" style={{ textDecoration: 'none', flex: 1 }}>
                  <div className="bento-card" style={{ height: '100%', boxSizing: 'border-box', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '0.35rem' }}>
                          Últimos 7 Días
                        </span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                            {stats?.recent_workouts || 0}
                          </span>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                            sesiones
                          </span>
                        </div>
                      </div>

                      <div style={{ color: 'var(--accent)', fontSize: '0.82rem', fontWeight: '700', backgroundColor: 'var(--accent-glow)', padding: '5px 10px', borderRadius: '8px' }}>
                        Ver ➔
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                      <FlameIcon size={14} color="var(--accent)" />
                      <span>Mantén tu racha activa esta semana</span>
                    </div>
                  </div>
                </Link>
              )}

              {/* Tarjeta: Último Entrenamiento */}
              {widgets.last_workout && (
                <div className="bento-card" style={{ flex: 1, justifyContent: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>
                    Última Sesión
                  </span>
                  {stats?.last_workout ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', display: 'block' }}>
                          {stats.last_workout.routine_name}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px', display: 'block' }}>
                          {stats.last_workout.duration_minutes ? `${stats.last_workout.duration_minutes} mins` : 'Duración N/D'}
                        </span>
                      </div>
                      <span style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: '600', background: 'var(--bg-input)', padding: '3px 8px', borderRadius: '6px' }}>
                        {Math.floor((new Date() - new Date(stats.last_workout.date)) / (1000 * 60 * 60 * 24))}d atrás
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                      Aún no registras entrenamientos.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* FILA 2: Muro de Actividad de Grupos */}
          {/* ================================================================= */}
          {widgets.group_feed && (
            <div className="bento-card bento-col-12">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <UsersIcon size={18} color="currentColor" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Última Sesión de cada Integrante
                    </h2>
                    <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      El entrenamiento más reciente de tus compañeros de grupo
                    </p>
                  </div>
                </div>

                <Link
                  to="/community"
                  style={{
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'var(--accent-glow)'
                  }}
                >
                  Ver Comunidad ➔
                </Link>
              </div>

              {groups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--bg-input)', borderRadius: '14px', border: '1px dashed var(--border-line)' }}>
                  <UsersIcon size={32} color="var(--text-secondary)" style={{ margin: '0 auto 0.5rem auto', opacity: 0.7 }} />
                  <h3 style={{ margin: '0 0 0.35rem 0', color: 'var(--text-primary)', fontSize: '0.98rem', fontWeight: '600' }}>
                    Aún no formas parte de ningún Grupo de Entrenamiento
                  </h3>
                  <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Crea un grupo con tus amigos o únete a uno existente para compartir logros y progresos.
                  </p>
                  <Link
                    to="/community"
                    className="quick-action-btn primary"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}
                  >
                    Explorar Grupos en Comunidad
                  </Link>
                </div>
              ) : (
                <div>
                  {/* Selector de Grupos */}
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1rem', scrollbarWidth: 'none' }}>
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
                          <UsersIcon size={14} color="currentColor" />
                          <span>{grp.name}</span>
                          <span style={{ opacity: 0.75, fontSize: '0.75rem' }}>
                            ({grp.members_count || grp.members?.length || 1})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Feed del Grupo */}
                  {feedLoading ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                      Cargando entrenamientos del grupo...
                    </div>
                  ) : groupFeed.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--bg-input)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                      No hay entrenamientos recientes registrados por los miembros de este grupo.
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
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div
                                    style={{
                                      width: '34px',
                                      height: '34px',
                                      borderRadius: '50%',
                                      background: 'var(--accent-glow)',
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
                                      background: 'var(--accent-glow)',
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
          )}

          {/* ================================================================= */}
          {/* FILA 3: Mapa de Consistencia (120 días) */}
          {/* ================================================================= */}
          {widgets.consistency_heatmap && (
            <div className="bento-card bento-col-12">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <FlameIcon size={18} color="currentColor" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Consistencia (Últimos 120 días)
                    </h2>
                    <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      Frecuencia y volumen de tus sesiones de entrenamiento
                    </p>
                  </div>
                </div>
              </div>
              <Heatmap data={heatmapData} />
            </div>
          )}

          {/* ================================================================= */}
          {/* FILA 4: Distribución de Volumen & Progresión de Fuerza */}
          {/* ================================================================= */}
          {widgets.volume_by_muscle && (
            <div className={`bento-card ${widgets.strength_progression ? 'bento-col-6' : 'bento-col-12'}`}>
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <BarChartIcon size={18} color="currentColor" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Volumen por Músculo
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
                    Tonelaje total registrado por grupo muscular
                  </p>
                </div>
              </div>
              <MusclePieChart data={volumeData} />
            </div>
          )}

          {widgets.strength_progression && (
            <div className={`bento-card ${widgets.volume_by_muscle ? 'bento-col-6' : 'bento-col-12'}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <TrendingUpIcon size={18} color="currentColor" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Progresión de Fuerza
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
                      Historial de cargas máximas estimadas
                    </p>
                  </div>
                </div>

                <select 
                  value={selectedExerciseId} 
                  onChange={(e) => setSelectedExerciseId(e.target.value)}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-line)',
                    color: 'var(--text-primary)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '0.88rem',
                    marginTop: '0.25rem'
                  }}
                >
                  {exercises.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </div>
              <ProgressionChart data={progressionData} />
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default Dashboard;
