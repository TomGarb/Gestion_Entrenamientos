import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

// Re-usando la misma paleta
const colors = {
  background: 'var(--bg-primary)',
  cardBg: 'var(--bg-card)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  mintGradient: 'var(--mint-gradient)',
  cardShadow: 'var(--shadow-card)',
  borderLine: 'var(--border-line)',
  inputBg: 'var(--bg-input)',
  danger: 'var(--danger)'
};

const Community = () => {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  
  const [loading, setLoading] = useState(false);
  
  const fetchData = async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        api.get('/api/community/friends'),
        api.get('/api/community/requests')
      ]);
      setFriends(friendsRes.data);
      setRequests(requestsRes.data);
    } catch (error) {
      console.error("Error cargando amigos:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery || searchQuery.length < 3) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/community/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data);
    } catch (error) {
      console.error("Error buscando:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (targetId) => {
    try {
      await api.post(`/api/community/request/${targetId}`);
      alert('Solicitud enviada.');
      setSearchResults([]);
      setSearchQuery('');
    } catch (error) {
      const msg = error.response?.data?.detail || "Error enviando solicitud";
      alert(msg);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.post(`/api/community/accept/${requestId}`);
      fetchData();
    } catch (error) {
      alert("Error aceptando solicitud");
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await api.post(`/api/community/reject/${requestId}`);
      fetchData();
    } catch (error) {
      alert("Error rechazando solicitud");
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if(!window.confirm("¿Estás seguro de eliminar a este amigo?")) return;
    try {
      await api.delete(`/api/community/friend/${friendId}`);
      fetchData();
    } catch (error) {
      alert("Error eliminando amigo");
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ margin: 0, color: colors.textPrimary, marginBottom: '0.5rem', fontWeight: '700', fontSize: '2.5rem' }}>Comunidad</h1>
        <p style={{ margin: 0, color: colors.textSecondary, fontSize: '1.1rem', lineHeight: '1.6' }}>
          Busca amigos por su usuario exacto o email, acepta solicitudes y gestiona tu red.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Columna Izquierda: Buscador & Solicitudes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Buscador */}
          <div style={{ background: colors.cardBg, borderRadius: '24px', padding: '2rem', boxShadow: colors.cardShadow }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem' }}>Añadir Amigo</h2>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Usuario o email exacto..." 
                style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: `1px solid ${colors.borderLine}`, background: colors.inputBg, color: colors.textPrimary }}
              />
              <button 
                type="submit"
                disabled={loading}
                style={{ padding: '0.8rem 1.5rem', background: colors.mintGradient, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {loading ? '...' : 'Buscar'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {searchResults.map(u => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.inputBg, padding: '1rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 'bold' }}>@{u.username}</span>
                      <span style={{ fontSize: '0.85rem', color: colors.textSecondary }}>{u.email}</span>
                    </div>
                    <button 
                      onClick={() => handleSendRequest(u.id)}
                      style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Añadir
                    </button>
                  </div>
                ))}
              </div>
            )}
            {searchQuery && searchResults.length === 0 && !loading && (
              <p style={{ marginTop: '1rem', color: colors.textSecondary, fontSize: '0.9rem' }}>No se encontraron coincidencias exactas.</p>
            )}
          </div>

          {/* Solicitudes Pendientes */}
          <div style={{ background: colors.cardBg, borderRadius: '24px', padding: '2rem', boxShadow: colors.cardShadow }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem' }}>Solicitudes Pendientes</h2>
            {requests.length === 0 ? (
              <p style={{ color: colors.textSecondary }}>No tienes solicitudes pendientes.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {requests.map(req => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.inputBg, padding: '1rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 'bold' }}>@{req.friend_details.username}</span>
                      <span style={{ fontSize: '0.85rem', color: colors.textSecondary }}>Quiere ser tu amigo</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleAcceptRequest(req.id)}
                        style={{ padding: '0.5rem', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ✓
                      </button>
                      <button 
                        onClick={() => handleRejectRequest(req.id)}
                        style={{ padding: '0.5rem', background: 'transparent', color: colors.danger, border: `1px solid ${colors.danger}`, borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Mis Amigos */}
        <div style={{ background: colors.cardBg, borderRadius: '24px', padding: '2rem', boxShadow: colors.cardShadow }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem' }}>Mis Amigos ({friends.length})</h2>
          {friends.length === 0 ? (
            <p style={{ color: colors.textSecondary }}>Aún no tienes amigos en tu red.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {friends.map(f => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.borderLine}`, paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>@{f.friend_details.username}</span>
                    <span style={{ fontSize: '0.85rem', color: colors.textSecondary }}>Amigos desde {new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                  <button 
                    onClick={() => handleRemoveFriend(f.friend_details.id)}
                    style={{ background: 'transparent', border: 'none', color: colors.textSecondary, cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Community;
