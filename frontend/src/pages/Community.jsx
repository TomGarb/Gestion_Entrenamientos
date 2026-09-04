import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  searchUsers,
  getFriends,
  getRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend
} from '../services/communityService';
import { getGroups, createGroup } from '../services/groupService';
import GroupDetailView from '../components/community/GroupDetailView';

const Community = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'groups' | 'requests' | 'search'
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Estado del buscador
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Amigo a eliminar para confirmación modal
  const [friendToDelete, setFriendToDelete] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCommunityData = async () => {
    try {
      setLoading(true);
      const [friendsData, requestsData, groupsData] = await Promise.all([
        getFriends(),
        getRequests(),
        getGroups().catch(() => [])
      ]);
      setFriends(friendsData);
      setRequests(requestsData);
      setGroups(groupsData || []);
    } catch (error) {
      console.error('Error cargando comunidad:', error);
      showNotification('Error al cargar datos de comunidad', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupData.name.trim()) {
      showNotification('Ingresa un nombre para el grupo.', 'error');
      return;
    }
    try {
      setActionLoading(true);
      const created = await createGroup(newGroupData);
      showNotification(`¡Grupo "${created.name}" creado con éxito!`);
      setShowCreateGroupModal(false);
      setNewGroupData({ name: '', description: '' });
      await loadCommunityData();
      setSelectedGroupId(created.id);
    } catch (error) {
      const errMsg = error.response?.data?.detail || 'Error al crear el grupo.';
      showNotification(errMsg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    loadCommunityData();
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query || query.length < 2) {
      showNotification('Ingresa al menos 2 caracteres para buscar.', 'error');
      return;
    }

    try {
      setIsSearching(true);
      setHasSearched(true);
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error buscando usuarios:', error);
      showNotification('Error en la búsqueda de usuarios', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (targetUser) => {
    try {
      setActionLoading(true);
      await sendFriendRequest(targetUser.id);
      showNotification(`Solicitud enviada a @${targetUser.username} con éxito!`);
      
      // Actualizar estado en los resultados de búsqueda
      setSearchResults(prev =>
        prev.map(u => u.id === targetUser.id ? { ...u, relationship_status: 'pending_sent' } : u)
      );
      
      // Recargar solicitudes
      const reqs = await getRequests();
      setRequests(reqs);
    } catch (error) {
      const errMsg = error.response?.data?.detail || 'Error al enviar la solicitud.';
      showNotification(errMsg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId, username = '') => {
    try {
      setActionLoading(true);
      await acceptFriendRequest(requestId);
      showNotification(`¡Ahora eres amigo de @${username || 'usuario'}!`);
      await loadCommunityData();
      
      if (hasSearched) {
        handleSearch();
      }
    } catch (error) {
      const errMsg = error.response?.data?.detail || 'Error al aceptar la solicitud.';
      showNotification(errMsg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      setActionLoading(true);
      await rejectFriendRequest(requestId);
      showNotification('Solicitud rechazada.');
      const reqs = await getRequests();
      setRequests(reqs);
      
      if (hasSearched) {
        handleSearch();
      }
    } catch (error) {
      showNotification('Error al rechazar solicitud.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      setActionLoading(true);
      await cancelFriendRequest(requestId);
      showNotification('Solicitud cancelada.');
      const reqs = await getRequests();
      setRequests(reqs);
      
      if (hasSearched) {
        handleSearch();
      }
    } catch (error) {
      showNotification('Error al cancelar la solicitud.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDeleteFriend = async () => {
    if (!friendToDelete) return;
    try {
      setActionLoading(true);
      await removeFriend(friendToDelete.id);
      showNotification('Amigo eliminado correctamente.');
      setFriendToDelete(null);
      await loadCommunityData();
      
      if (hasSearched) {
        handleSearch();
      }
    } catch (error) {
      showNotification('Error al eliminar amigo.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const incomingCount = requests.incoming.length;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Toast Notification Banner */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          background: notification.type === 'error' ? 'var(--danger-gradient, #FF3B30)' : 'var(--mint-gradient, #34C759)',
          color: '#FFFFFF',
          padding: '0.85rem 1.4rem',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '600',
          fontSize: '0.95rem'
        }}>
          <span>{notification.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          margin: '0 0 0.5rem 0',
          color: 'var(--text-primary)',
          letterSpacing: '-0.5px'
        }}>
          Comunidad & Amigos
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Conecta con otros atletas, comparte progresos y entrena en comunidad.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        borderBottom: '1px solid var(--border-line)',
        paddingBottom: '0.75rem',
        marginBottom: '2rem',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => {
            setActiveTab('friends');
            setSelectedGroupId(null);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeTab === 'friends' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'friends' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: activeTab === 'friends' ? '1px solid var(--border-line)' : '1px solid transparent',
            padding: '0.65rem 1.25rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.95rem'
          }}
        >
          <span>👥 Mis Amigos</span>
          <span style={{
            background: 'var(--bg-input)',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '0.8rem',
            color: 'var(--text-primary)'
          }}>
            {friends.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('groups');
            setSelectedGroupId(null);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeTab === 'groups' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'groups' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: activeTab === 'groups' ? '1px solid var(--border-line)' : '1px solid transparent',
            padding: '0.65rem 1.25rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.95rem'
          }}
        >
          <span>🛡️ Grupos</span>
          <span style={{
            background: 'var(--bg-input)',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '0.8rem',
            color: 'var(--text-primary)'
          }}>
            {groups.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeTab === 'requests' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'requests' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: activeTab === 'requests' ? '1px solid var(--border-line)' : '1px solid transparent',
            padding: '0.65rem 1.25rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.95rem'
          }}
        >
          <span>📩 Solicitudes</span>
          {incomingCount > 0 && (
            <span style={{
              background: 'var(--accent, #34C759)',
              color: '#000000',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: '700'
            }}>
              {incomingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('search')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeTab === 'search' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'search' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: activeTab === 'search' ? '1px solid var(--border-line)' : '1px solid transparent',
            padding: '0.65rem 1.25rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.95rem'
          }}
        >
          <span>🔍 Buscar Atletas</span>
        </button>
      </div>

      {/* TAB 1: MIS AMIGOS */}
      {activeTab === 'friends' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Cargando lista de amigos...
            </div>
          ) : friends.length === 0 ? (
            <div className="glass-panel" style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: 'var(--text-secondary)',
              borderRadius: '20px'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤝</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Aún no tienes amigos agregados</h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem' }}>
                Busca atletas por su nombre de usuario o email exacto para conectar.
              </p>
              <button
                onClick={() => setActiveTab('search')}
                style={{
                  background: 'var(--accent, #34C759)',
                  color: '#000000',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                🔍 Buscar Atletas
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {friends.map(f => {
                const friend = f.friend_details;
                if (!friend) return null;
                const initial = friend.username.charAt(0).toUpperCase();

                return (
                  <div
                    key={f.id}
                    className="glass-panel"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: '16px',
                      border: '1px solid var(--border-line)',
                      background: 'var(--bg-card)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent) 0%, #059669 100%)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '1.2rem'
                      }}>
                        {initial}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                          @{friend.username}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {friend.email}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-line)',
                      gap: '0.5rem'
                    }}>
                      <button
                        onClick={() => navigate(`/calendar?friendId=${friend.id}&friendName=${encodeURIComponent(friend.username)}`)}
                        title={`Ver calendario de @${friend.username}`}
                        style={{
                          background: 'rgba(52, 199, 89, 0.12)',
                          border: '1px solid var(--accent, #34C759)',
                          color: 'var(--accent, #34C759)',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <span>📅</span>
                        <span>Ver Calendario</span>
                      </button>

                      <button
                        onClick={() => setFriendToDelete(friend)}
                        title="Eliminar amigo"
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-line)',
                          color: 'var(--text-secondary)',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--danger, #FF3B30)';
                          e.currentTarget.style.color = 'var(--danger, #FF3B30)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-line)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: GRUPOS DE ENTRENAMIENTO */}
      {activeTab === 'groups' && (
        selectedGroupId ? (
          <GroupDetailView
            groupId={selectedGroupId}
            onBack={() => {
              setSelectedGroupId(null);
              loadCommunityData();
            }}
            friends={friends}
            showNotification={showNotification}
          />
        ) : (
          <div>
            {/* Header del listado de grupos */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.3rem 0', fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  🛡️ Tus Grupos de Entrenamiento
                </h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Compite sanamente y comparte el progreso de tus sesiones con tu equipo.
                </p>
              </div>

              <button
                onClick={() => setShowCreateGroupModal(true)}
                style={{
                  background: 'var(--primary-gradient, linear-gradient(135deg, #34C759 0%, #28CD41 100%))',
                  color: '#000000',
                  border: 'none',
                  padding: '0.75rem 1.4rem',
                  borderRadius: '14px',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(52, 199, 89, 0.3)'
                }}
              >
                <span>➕</span> Crear Grupo
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                Cargando grupos...
              </div>
            ) : groups.length === 0 ? (
              <div className="glass-panel" style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                color: 'var(--text-secondary)',
                borderRadius: '20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-line)'
              }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🛡️</div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontWeight: '700' }}>
                  Aún no perteneces a ningún grupo
                </h3>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem', maxWidth: '480px', marginInline: 'auto' }}>
                  Crea tu primer grupo de entrenamiento con amigos o espera a ser invitado a uno para compartir tu muro de actividad.
                </p>
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  style={{
                    background: 'var(--accent, #34C759)',
                    color: '#000000',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ➕ Crear mi primer grupo
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {groups.map((group) => {
                  const isGroupAdmin = group.is_admin;

                  return (
                    <div
                      key={group.id}
                      className="glass-panel"
                      onClick={() => setSelectedGroupId(group.id)}
                      style={{
                        padding: '1.5rem',
                        borderRadius: '18px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-line)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.borderColor = 'rgba(52, 199, 89, 0.4)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'var(--border-line)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.6rem' }}>🛡️</span>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                              {group.name}
                            </h3>
                          </div>

                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: isGroupAdmin ? 'rgba(255, 215, 0, 0.15)' : 'rgba(52, 199, 89, 0.15)',
                              color: isGroupAdmin ? '#FFD700' : 'var(--accent)',
                              border: isGroupAdmin ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid rgba(52, 199, 89, 0.3)'
                            }}
                          >
                            {isGroupAdmin ? '👑 Admin' : '🏋️‍♂️ Miembro'}
                          </span>
                        </div>

                        <p
                          style={{
                            margin: '0 0 1rem 0',
                            color: 'var(--text-secondary)',
                            fontSize: '0.85rem',
                            lineHeight: '1.4',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {group.description || 'Sin descripción.'}
                        </p>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '0.85rem',
                          borderTop: '1px solid var(--border-line)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <span style={{ color: 'var(--text-secondary)' }}>
                          👥 {group.members_count} {group.members_count === 1 ? 'miembro' : 'miembros'}
                        </span>
                        <span style={{ color: 'var(--accent)', fontWeight: '600' }}>
                          Entrar ➔
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      {/* TAB 2: SOLICITUDES */}
      {activeTab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Solicitudes Recibidas */}
          <div>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📥 Solicitudes Recibidas</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                ({requests.incoming.length})
              </span>
            </h3>

            {requests.incoming.length === 0 ? (
              <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '16px' }}>
                No tienes solicitudes entrantes pendientes.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {requests.incoming.map(req => {
                  const requester = req.friend_details;
                  if (!requester) return null;
                  const initial = requester.username.charAt(0).toUpperCase();

                  return (
                    <div
                      key={req.id}
                      className="glass-panel"
                      style={{
                        padding: '1.25rem',
                        borderRadius: '16px',
                        border: '1px solid var(--border-line)',
                        background: 'var(--bg-card)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-line)',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700'
                        }}>
                          {initial}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>@{requester.username}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{requester.email}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleAcceptRequest(req.id, requester.username)}
                          style={{
                            flex: 1,
                            background: 'var(--accent, #34C759)',
                            color: '#000000',
                            border: 'none',
                            padding: '0.65rem 1rem',
                            borderRadius: '10px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                          }}
                        >
                          ✓ Aceptar
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleRejectRequest(req.id)}
                          style={{
                            flex: 1,
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-line)',
                            padding: '0.65rem 1rem',
                            borderRadius: '10px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                          }}
                        >
                          ✕ Rechazar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Solicitudes Enviadas */}
          <div>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📤 Solicitudes Enviadas</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                ({requests.outgoing.length})
              </span>
            </h3>

            {requests.outgoing.length === 0 ? (
              <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '16px' }}>
                No has enviado solicitudes pendientes.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {requests.outgoing.map(req => {
                  const addressee = req.friend_details;
                  if (!addressee) return null;
                  const initial = addressee.username.charAt(0).toUpperCase();

                  return (
                    <div
                      key={req.id}
                      className="glass-panel"
                      style={{
                        padding: '1.25rem',
                        borderRadius: '16px',
                        border: '1px solid var(--border-line)',
                        background: 'var(--bg-card)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700'
                        }}>
                          {initial}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>@{addressee.username}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pendiente de respuesta</div>
                        </div>
                      </div>

                      <button
                        disabled={actionLoading}
                        onClick={() => handleCancelRequest(req.id)}
                        style={{
                          background: 'transparent',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-line)',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BUSCAR AMIGOS */}
      {activeTab === 'search' && (
        <div>
          {/* Search Form Card */}
          <div className="glass-panel" style={{
            padding: '1.75rem',
            borderRadius: '20px',
            marginBottom: '2rem',
            border: '1px solid var(--border-line)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Buscar Atletas</h3>
            <p style={{ margin: '0 0 1.25rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Por políticas de privacidad, ingresa el <strong>nombre de usuario</strong> o <strong>correo exacto</strong> del atleta.
            </p>

            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Ej. valen_strong o valentina@gym.com"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '240px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-line)',
                  borderRadius: '12px',
                  padding: '0.85rem 1rem',
                  fontSize: '0.95rem'
                }}
              />
              <button
                type="submit"
                disabled={isSearching}
                style={{
                  background: 'var(--accent, #34C759)',
                  color: '#000000',
                  border: 'none',
                  padding: '0.85rem 1.75rem',
                  borderRadius: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isSearching ? 'Buscando...' : '🔍 Buscar'}
              </button>
            </form>
          </div>

          {/* Results List */}
          <div>
            {isSearching ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                Buscando atletas...
              </div>
            ) : hasSearched && searchResults.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '16px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔎</div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  No se encontraron resultados para "{searchQuery}"
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  Verifica que el nombre de usuario o email esté escrito exactamente igual.
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {searchResults.map(user => {
                  const initial = user.username.charAt(0).toUpperCase();

                  return (
                    <div
                      key={user.id}
                      className="glass-panel"
                      style={{
                        padding: '1.25rem',
                        borderRadius: '16px',
                        border: '1px solid var(--border-line)',
                        background: 'var(--bg-card)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', overflow: 'hidden' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          flexShrink: 0
                        }}>
                          {initial}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>@{user.username}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {user.email}
                          </div>
                        </div>
                      </div>

                      {/* Action Button depending on relationship_status */}
                      <div>
                        {user.relationship_status === 'accepted' && (
                          <span style={{
                            fontSize: '0.85rem',
                            color: 'var(--accent, #34C759)',
                            fontWeight: '600',
                            padding: '0.4rem 0.8rem',
                            background: 'rgba(52, 199, 89, 0.1)',
                            borderRadius: '8px',
                            whiteSpace: 'nowrap'
                          }}>
                            ✓ Amigos
                          </span>
                        )}

                        {user.relationship_status === 'pending_sent' && (
                          <span style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                            fontWeight: '600',
                            padding: '0.4rem 0.8rem',
                            background: 'var(--bg-input)',
                            borderRadius: '8px',
                            whiteSpace: 'nowrap'
                          }}>
                            ⏳ Enviada
                          </span>
                        )}

                        {user.relationship_status === 'pending_received' && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleAcceptRequest(user.request_id, user.username)}
                            style={{
                              background: 'var(--accent, #34C759)',
                              color: '#000000',
                              border: 'none',
                              padding: '0.5rem 0.9rem',
                              borderRadius: '8px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            ✓ Aceptar
                          </button>
                        )}

                        {user.relationship_status === 'none' && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleSendRequest(user)}
                            style={{
                              background: 'var(--accent, #34C759)',
                              color: '#000000',
                              border: 'none',
                              padding: '0.5rem 0.9rem',
                              borderRadius: '8px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            + Agregar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación */}
      {friendToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '400px',
            width: '100%',
            padding: '2rem',
            borderRadius: '20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-line)'
          }}>
            <h3 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>¿Eliminar a @{friendToDelete.username}?</h3>
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>
              Ya no compartirán rutinas de amigos ni aparecerán en sus listas de comunidad.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setFriendToDelete(null)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid var(--border-line)',
                  color: 'var(--text-primary)',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancelar
              </button>
              <button
                disabled={actionLoading}
                onClick={handleConfirmDeleteFriend}
                style={{
                  flex: 1,
                  background: 'var(--danger, #FF3B30)',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '700'
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Nuevo Grupo */}
      {showCreateGroupModal && (
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
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                🛡️ Crear Grupo de Entrenamiento
              </h3>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGroup}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Crossfit Team, Powerlifting Squad"
                  value={newGroupData.name}
                  onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
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

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Descripción (Opcional)
                </label>
                <textarea
                  rows="3"
                  placeholder="Describe el objetivo del equipo o tipo de entrenamiento..."
                  value={newGroupData.description}
                  onChange={(e) => setNewGroupData({ ...newGroupData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-line)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-line)',
                    color: 'var(--text-secondary)',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: 'var(--primary-gradient, linear-gradient(135deg, #34C759 0%, #28CD41 100%))',
                    color: '#000000',
                    border: 'none',
                    padding: '0.6rem 1.4rem',
                    borderRadius: '10px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Crear Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Community;
