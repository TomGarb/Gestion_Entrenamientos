import React, { useState, useEffect } from 'react';
import api from '../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Edit user state
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({ username: '', email: '', is_admin: false });
  const [savingUser, setSavingUser] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchAdminData = async () => {
    try {
      const [statsResponse, usersResponse, feedbackResponse] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
        api.get('/api/admin/feedback')
      ]);
      setStats(statsResponse.data);
      setUsers(usersResponse.data);
      setFeedbackList(feedbackResponse.data);
    } catch (err) {
      console.error("Error fetching admin data:", err);
      setError("Error al cargar datos. Verifica tu conexión o credenciales.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username,
      email: user.email,
      is_admin: user.is_admin
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingUser(true);
    try {
      await api.put(`/api/admin/users/${editingUser.id}`, editFormData);
      showToast(`Usuario @${editFormData.username} actualizado con éxito.`);
      setEditingUser(null);
      await fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.detail || "Error al actualizar usuario");
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente a @${user.username}?`)) return;
    try {
      await api.delete(`/api/admin/users/${user.id}`);
      showToast(`Usuario @${user.username} eliminado.`);
      await fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.detail || "Error al eliminar usuario");
    }
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem 0', fontWeight: '700' }}>Panel de Control (Admin)</h1>
        <p style={{ color: 'var(--accent)', margin: 0, fontWeight: '600' }}>Acceso Restringido - Gestión de Plataforma</p>
      </div>

      {toastMessage && (
        <div style={{ padding: '0.85rem 1.25rem', backgroundColor: 'rgba(52, 199, 89, 0.15)', color: 'var(--accent)', borderRadius: '12px', border: '1px solid rgba(52, 199, 89, 0.3)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✅</span> {toastMessage}
        </div>
      )}

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
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>Acciones</th>
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
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-line)',
                          color: 'var(--text-primary)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          marginRight: '8px',
                          fontSize: '0.85rem'
                        }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        style={{
                          background: 'rgba(255, 59, 48, 0.1)',
                          border: '1px solid rgba(255, 59, 48, 0.3)',
                          color: 'var(--danger, #FF3B30)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        🗑️ Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ color: 'var(--text-primary)', margin: '2.5rem 0 1rem 0', fontWeight: '600', fontSize: '1.5rem' }}>Buzón de Feedback</h2>
          <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-line)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-line)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Fecha</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Usuario</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Mensaje</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {feedbackList.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay reportes de feedback.</td>
                  </tr>
                ) : (
                  feedbackList.map(fb => (
                    <tr key={fb.id} style={{ borderBottom: '1px solid var(--border-line)' }}>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {new Date(fb.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                        {fb.username} <br />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{fb.email}</span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)', maxWidth: '300px', wordWrap: 'break-word' }}>
                        {fb.message}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ background: fb.status === 'pending' ? 'rgba(255, 159, 10, 0.15)' : 'rgba(52, 199, 89, 0.15)', color: fb.status === 'pending' ? '#FF9F0A' : 'var(--accent)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          {fb.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Modal Editar Usuario */}
          {editingUser && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
              }}
            >
              <div
                className="glass-panel"
                style={{
                  width: '100%',
                  maxWidth: '460px',
                  borderRadius: '20px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-line)',
                  padding: '1.75rem',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    ✏️ Editar Usuario #{editingUser.id}
                  </h3>
                  <button
                    onClick={() => setEditingUser(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Nombre de Usuario
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.username}
                      onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-line)',
                        color: 'var(--text-primary)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-line)',
                        color: 'var(--text-primary)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="editIsAdmin"
                      checked={editFormData.is_admin}
                      onChange={(e) => setEditFormData({ ...editFormData, is_admin: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                    />
                    <label htmlFor="editIsAdmin" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '500' }}>
                      Rol de Administrador
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-line)',
                        color: 'var(--text-secondary)',
                        padding: '0.65rem 1.2rem',
                        borderRadius: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingUser}
                      style={{
                        background: 'var(--primary-gradient, linear-gradient(135deg, #34C759 0%, #28CD41 100%))',
                        color: '#000000',
                        border: 'none',
                        padding: '0.65rem 1.4rem',
                        borderRadius: '10px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {savingUser ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default AdminDashboard;
