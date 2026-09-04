import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
  getGroup,
  getGroupFeed,
  updateGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  updateMemberRole
} from '../../services/groupService';

const GroupDetailView = ({ groupId, onBack, friends, showNotification }) => {
  const { user: currentUser } = useContext(AuthContext);
  const [group, setGroup] = useState(null);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modales
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', description: '' });
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupData, feedData] = await Promise.all([
        getGroup(groupId),
        getGroupFeed(groupId)
      ]);
      setGroup(groupData);
      setFeed(feedData.feed || []);
      setEditFormData({
        name: groupData.name || '',
        description: groupData.description || ''
      });
    } catch (error) {
      console.error('Error cargando grupo:', error);
      showNotification('Error al cargar datos del grupo.', 'error');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const refreshFeed = async () => {
    try {
      setFeedLoading(true);
      const feedData = await getGroupFeed(groupId);
      setFeed(feedData.feed || []);
    } catch (error) {
      console.error('Error refrescando feed:', error);
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [groupId]);

  const handleEditGroup = async (e) => {
    e.preventDefault();
    if (!editFormData.name.trim()) {
      showNotification('El nombre del grupo es obligatorio.', 'error');
      return;
    }
    try {
      setActionLoading(true);
      const updated = await updateGroup(groupId, editFormData);
      setGroup(prev => ({ ...prev, name: updated.name, description: updated.description }));
      setShowEditModal(false);
      showNotification('Grupo actualizado con éxito.');
    } catch (error) {
      showNotification(error.response?.data?.detail || 'Error al actualizar grupo.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este grupo? Esta acción no se puede deshacer.')) return;
    try {
      setActionLoading(true);
      await deleteGroup(groupId);
      showNotification('Grupo eliminado con éxito.');
      onBack();
    } catch (error) {
      showNotification(error.response?.data?.detail || 'Error al eliminar grupo.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('¿Estás seguro de que deseas salir de este grupo?')) return;
    try {
      setActionLoading(true);
      await removeGroupMember(groupId, currentUser.id);
      showNotification('Has salido del grupo.');
      onBack();
    } catch (error) {
      showNotification(error.response?.data?.detail || 'Error al salir del grupo.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMember = async (friendUserId) => {
    try {
      setActionLoading(true);
      await addGroupMember(groupId, friendUserId);
      showNotification('¡Amigo añadido al grupo exitosamente!');
      const updatedGroup = await getGroup(groupId);
      setGroup(updatedGroup);
    } catch (error) {
      showNotification(error.response?.data?.detail || 'Error al añadir amigo.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (memberId, memberUsername) => {
    if (!window.confirm(`¿Expulsar a @${memberUsername} del grupo?`)) return;
    try {
      setActionLoading(true);
      await removeGroupMember(groupId, memberId);
      showNotification(`@${memberUsername} ha sido expulsado del grupo.`);
      const updatedGroup = await getGroup(groupId);
      setGroup(updatedGroup);
    } catch (error) {
      showNotification(error.response?.data?.detail || 'Error al expulsar miembro.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRole = async (member) => {
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    const actionText = newRole === 'admin' ? 'promover a Administrador' : 'degradar a Miembro';
    if (!window.confirm(`¿Deseas ${actionText} a @${member.user.username}?`)) return;

    try {
      setActionLoading(true);
      await updateMemberRole(groupId, member.user_id, newRole);
      showNotification(`Rol de @${member.user.username} actualizado a ${newRole}.`);
      const updatedGroup = await getGroup(groupId);
      setGroup(updatedGroup);
    } catch (error) {
      showNotification(error.response?.data?.detail || 'Error al cambiar rol.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !group) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
        <div>Cargando grupo de entrenamiento...</div>
      </div>
    );
  }

  const isAdmin = group.is_admin;
  const currentMemberIds = group.members.map(m => m.user_id);
  const availableFriends = friends.filter(f => f.friend_details && !currentMemberIds.includes(f.friend_details.id));
  const filteredFriends = availableFriends.filter(f => 
    f.friend_details.username.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    f.friend_details.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-in-out' }}>
      {/* Botón Volver y Cabecera */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-line)',
            color: 'var(--text-secondary)',
            padding: '0.6rem 1.1rem',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-line)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <span>←</span> Volver a Grupos
        </button>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {isAdmin && (
            <>
              <button
                onClick={() => setShowEditModal(true)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-line)',
                  color: 'var(--text-primary)',
                  padding: '0.6rem 1rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.85rem'
                }}
              >
                ✏️ Editar
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={actionLoading}
                style={{
                  background: 'rgba(255, 59, 48, 0.1)',
                  border: '1px solid rgba(255, 59, 48, 0.25)',
                  color: 'var(--danger, #FF3B30)',
                  padding: '0.6rem 1rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.85rem'
                }}
              >
                🗑️ Eliminar Grupo
              </button>
            </>
          )}
          <button
            onClick={handleLeaveGroup}
            disabled={actionLoading}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-line)',
              color: 'var(--text-secondary)',
              padding: '0.6rem 1rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem'
            }}
          >
            🚪 Salir
          </button>
        </div>
      </div>

      {/* Banner del Grupo */}
      <div
        className="glass-panel"
        style={{
          padding: '1.75rem',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.08) 0%, rgba(26, 26, 26, 0.6) 100%)',
          border: '1px solid rgba(52, 199, 89, 0.2)',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '1.8rem' }}>🛡️</span>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              {group.name}
            </h1>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: '20px',
                background: isAdmin ? 'rgba(255, 215, 0, 0.15)' : 'rgba(52, 199, 89, 0.15)',
                color: isAdmin ? '#FFD700' : 'var(--accent)',
                border: isAdmin ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid rgba(52, 199, 89, 0.3)'
              }}
            >
              {isAdmin ? '👑 Eres Administrador' : '🏋️‍♂️ Eres Miembro'}
            </span>
          </div>

          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '650px' }}>
            {group.description || 'Sin descripción definida para este grupo.'}
          </p>
          <div style={{ marginTop: '0.6rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Creado por <strong>@{group.creator_username}</strong> • {group.members.length} {group.members.length === 1 ? 'miembro' : 'miembros'}
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddMemberModal(true)}
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
            <span>👤➕</span> Añadir Amigo
          </button>
        )}
      </div>

      {/* Layout de 2 Columnas: Muro Central (Feed) y Panel Lateral de Miembros */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: '2rem',
          alignItems: 'start'
        }}
        className="group-content-grid"
      >
        {/* Columna Izquierda: Muro de Actividad */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏆 Muro de Entrenamientos</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                ({feed.length})
              </span>
            </h2>

            <button
              onClick={refreshFeed}
              disabled={feedLoading}
              title="Refrescar muro"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-line)',
                color: 'var(--text-secondary)',
                padding: '0.45rem 0.85rem',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🔄</span> {feedLoading ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>

          {feed.length === 0 ? (
            <div
              className="glass-panel"
              style={{
                padding: '3.5rem 1.5rem',
                textAlign: 'center',
                borderRadius: '20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-line)'
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏋️‍♂️</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontWeight: '700' }}>
                El muro está esperando su primer entrenamiento
              </h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '450px', marginInline: 'auto' }}>
                Completa una sesión de entrenamiento en la app para liderar la actividad del grupo y motivar a tus compañeros.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {feed.map((item) => {
                const initial = item.username.charAt(0).toUpperCase();

                return (
                  <div
                    key={item.id}
                    className="glass-panel"
                    style={{
                      padding: '1.5rem',
                      borderRadius: '18px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-line)',
                      transition: 'transform 0.2s ease, border-color 0.2s ease'
                    }}
                  >
                    {/* Header de la Publicación */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.2) 0%, rgba(52, 199, 89, 0.05) 100%)',
                            color: 'var(--accent)',
                            border: '1px solid rgba(52, 199, 89, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '1.2rem'
                          }}
                        >
                          {initial}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                              @{item.username}
                            </span>
                            {item.routine_name && (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  background: 'rgba(52, 199, 89, 0.1)',
                                  color: 'var(--accent)',
                                  border: '1px solid rgba(52, 199, 89, 0.25)',
                                  fontWeight: '600'
                                }}
                              >
                                📋 {item.routine_name}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {item.date} {item.duration_minutes ? `• ⏱️ ${item.duration_minutes} min` : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span
                          style={{
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-line)',
                            padding: '4px 10px',
                            borderRadius: '10px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            color: 'var(--text-primary)'
                          }}
                        >
                          🔥 {item.sets_count} series
                        </span>
                        {item.total_volume_kg > 0 && (
                          <span
                            style={{
                              background: 'var(--bg-input)',
                              border: '1px solid var(--border-line)',
                              padding: '4px 10px',
                              borderRadius: '10px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              color: 'var(--accent)'
                            }}
                          >
                            ⚡ {item.total_volume_kg.toLocaleString()} kg total
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Notas del entrenamiento */}
                    {item.notes && (
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderLeft: '3px solid var(--accent)',
                          padding: '0.6rem 0.9rem',
                          borderRadius: '0 8px 8px 0',
                          marginBottom: '1rem',
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                          fontStyle: 'italic'
                        }}
                      >
                        "{item.notes}"
                      </div>
                    )}

                    {/* Desglose de ejercicios */}
                    {item.exercises && item.exercises.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          Ejercicios Completados
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {item.exercises.map((ex, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-line)',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <strong>{ex.exercise_name}</strong>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                ({ex.sets_count}s {ex.max_weight_kg > 0 ? `• Max ${ex.max_weight_kg}kg` : ''})
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna Derecha: Panel de Miembros */}
        <div
          className="glass-panel"
          style={{
            padding: '1.5rem',
            borderRadius: '20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-line)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              👥 Miembros ({group.members.length})
            </h3>
            {isAdmin && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent)',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  padding: '4px 6px'
                }}
              >
                + Invitar
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {group.members.map((member) => {
              const isMemberAdmin = member.role === 'admin';
              const isSelf = member.user_id === currentUser.id;
              const initial = member.user.username.charAt(0).toUpperCase();

              return (
                <div
                  key={member.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '12px',
                    background: isSelf ? 'rgba(52, 199, 89, 0.05)' : 'var(--bg-input)',
                    border: isSelf ? '1px solid rgba(52, 199, 89, 0.2)' : '1px solid var(--border-line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: isMemberAdmin ? 'rgba(255, 215, 0, 0.15)' : 'var(--bg-card)',
                        color: isMemberAdmin ? '#FFD700' : 'var(--text-primary)',
                        border: isMemberAdmin ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid var(--border-line)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.95rem',
                        flexShrink: 0
                      }}
                    >
                      {initial}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        @{member.user.username} {isSelf && '(Tú)'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: isMemberAdmin ? '#FFD700' : 'var(--text-secondary)', fontWeight: isMemberAdmin ? '600' : 'normal' }}>
                        {isMemberAdmin ? '👑 Administrador' : '🏋️‍♂️ Miembro'}
                      </div>
                    </div>
                  </div>

                  {/* Acciones de Admin sobre otros miembros */}
                  {isAdmin && !isSelf && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleToggleRole(member)}
                        disabled={actionLoading}
                        title={isMemberAdmin ? 'Degradar a Miembro' : 'Promover a Administrador'}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isMemberAdmin ? '#FFD700' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          padding: '4px'
                        }}
                      >
                        👑
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.user_id, member.user.username)}
                        disabled={actionLoading}
                        title="Expulsar del grupo"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          padding: '4px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger, #FF3B30)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal: Añadir Amigo */}
      {showAddMemberModal && (
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
                👤 Invitar Amigo al Grupo
              </h3>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setMemberSearchQuery('');
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Selecciona a uno de tus amigos de GymTracker para sumarlo a <strong>{group.name}</strong>.
            </p>

            {availableFriends.length > 5 && (
              <input
                type="text"
                placeholder="Filtrar por nombre de amigo..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-line)',
                  color: 'var(--text-primary)',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
            )}

            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredFriends.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {availableFriends.length === 0
                    ? 'Todos tus amigos ya forman parte de este grupo o aún no tienes amigos en tu lista.'
                    : 'No se encontraron amigos con esa búsqueda.'}
                </div>
              ) : (
                filteredFriends.map((f) => {
                  const friend = f.friend_details;
                  return (
                    <div
                      key={friend.id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-line)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          @{friend.username}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {friend.email}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddMember(friend.id)}
                        disabled={actionLoading}
                        style={{
                          background: 'var(--primary-gradient, linear-gradient(135deg, #34C759 0%, #28CD41 100%))',
                          color: '#000000',
                          border: 'none',
                          padding: '0.45rem 0.9rem',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        + Sumar
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setMemberSearchQuery('');
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-line)',
                  color: 'var(--text-secondary)',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Grupo */}
      {showEditModal && (
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
                ✏️ Editar Grupo
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditGroup}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Nombre del Grupo
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
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
                  Descripción
                </label>
                <textarea
                  rows="3"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
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
                  onClick={() => setShowEditModal(false)}
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
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetailView;
