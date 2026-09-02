import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../services/dashboardService';

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ color: 'var(--text-secondary)' }}>Loading analytics...</h2>
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
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Monthly Volume</span>
            <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>📊</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {stats?.monthly_volume_kg ? (stats.monthly_volume_kg / 1000).toFixed(1) : 0}
            </span>
            <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', fontWeight: '600' }}>TONS</span>
          </div>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: '600', backgroundColor: 'rgba(52, 199, 89, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
              ↑ +12.5%
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>vs last month</span>
          </div>
        </div>

        {/* Small Cards Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <Link to="/history" style={{ textDecoration: 'none' }}>
            <div className="glass-panel" style={{ padding: '1.2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s', cursor: 'pointer' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>Recent Activity</span>
                <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>{stats?.recent_workouts || 0} <span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>sessions</span></span>
              </div>
              <div style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: '600', backgroundColor: 'rgba(52, 199, 89, 0.15)', padding: '4px 10px', borderRadius: '8px' }}>
                View ➔
              </div>
            </div>
          </Link>

          <div className="glass-panel" style={{ padding: '1.2rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Last Workout</span>
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
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No recent records.</span>
            )}
          </div>

        </div>
      </div>

      {/* Fake Heatmap/Chart Area to simulate the crypto layout for future analytics */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '600' }}>Consistency Heatmap</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', background: 'var(--bg-input)', padding: '4px 10px', borderRadius: '6px' }}>Last 30 Days</span>
        </div>
        
        {/* Heatmap Mockup */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} style={{
              width: 'calc(10% - 4px)',
              aspectRatio: '1',
              backgroundColor: Math.random() > 0.7 ? 'var(--accent)' : 'var(--bg-input)',
              borderRadius: '2px',
              opacity: Math.random() > 0.7 ? 1 : 0.3
            }}></div>
          ))}
        </div>
        <p style={{ margin: '1rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
          Advanced analytics coming in the next update...
        </p>
      </div>
      
    </div>
  );
};

export default Dashboard;
