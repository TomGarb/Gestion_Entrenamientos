import React, { useState, useEffect } from 'react';
import api from '../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const statsResponse = await api.get('/api/admin/stats');
        setStats(statsResponse.data);

        const usersResponse = await api.get('/api/admin/users');
        setUsers(usersResponse.data);
      } catch (err) {
        console.error("Error fetching admin data:", err);
        setError("Error al cargar datos. Verifica tu conexión o credenciales.");
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem 0', fontWeight: '700' }}>Panel de Control (Admin)</h1>
        <p style={{ color: 'var(--accent)', margin: 0, fontWeight: '600' }}>Acceso Restringido - Gestión de Plataforma</p>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 59, 48, 0.15)', color: 'var(--danger)', borderRadius: '12px', border: '1px solid var(--border-line)', marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Cargando datos del sistema...</p>
      ) : stats ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            {/* Tarjeta de Estadísticas Globales */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Usuarios Totales</h3>
              <p style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>{stats.total_users}</p>
            </div>
            {/* Próximas tarjetas irán aquí */}
          </div>

          <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: '600', fontSize: '1.5rem' }}>Lista de Usuarios</h2>
          <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-line)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-line)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>ID</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Usuario</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Email</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Rol</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-line)' }}>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>#{u.id}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '500' }}>{u.username}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '1rem' }}>
                      {u.is_admin ? (
                        <span style={{ background: 'rgba(52, 199, 89, 0.15)', color: 'var(--accent)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>ADMIN</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Usuario</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default AdminDashboard;
