import React, { useState, useEffect, useContext, useRef } from 'react';
import { generateLinkCode, testConnection } from '../services/telegramService';
import { AuthContext } from '../context/AuthContext';
import { 
  UserIcon, 
  ShieldIcon, 
  LayoutGridIcon, 
  SparklesIcon, 
  BarChartIcon, 
  FlameIcon, 
  TrendingUpIcon, 
  UsersIcon, 
  CalendarIcon, 
  CheckIcon 
} from '../components/common/Icons';

// --- Paleta "Soft Fitness" ---
const colors = {
  background: 'var(--bg-primary)',
  cardBg: 'var(--bg-card)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  cardShadow: 'var(--shadow-card)',
  borderLine: 'var(--border-line)',
  accentGreen: 'var(--accent)',
  successGreen: 'var(--accent)',
  danger: 'var(--danger, #FF3B30)',
  inputBg: 'var(--bg-input)'
};

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

const WIDGET_DEFINITIONS = [
  {
    key: 'quick_actions',
    title: 'Barra de Acciones Rápidas',
    description: 'Acceso veloz para iniciar entrenamiento, crear rutinas o ver calendario.',
    icon: SparklesIcon
  },
  {
    key: 'monthly_volume',
    title: 'Métrica de Volumen Mensual (Hero)',
    description: 'Tarjeta destacada con el tonelaje total acumulado en el mes en curso.',
    icon: BarChartIcon
  },
  {
    key: 'recent_activity',
    title: 'Actividad Reciente',
    description: 'Conteo de sesiones completadas en los últimos 7 días con acceso al historial.',
    icon: FlameIcon
  },
  {
    key: 'last_workout',
    title: 'Último Entrenamiento',
    description: 'Resumen de la rutina más reciente realizada y su duración.',
    icon: TrendingUpIcon
  },
  {
    key: 'group_feed',
    title: 'Muro de Actividad de Grupos',
    description: 'Feed social con la última sesión realizada por cada integrante de tus grupos.',
    icon: UsersIcon
  },
  {
    key: 'consistency_heatmap',
    title: 'Mapa de Consistencia (120 días)',
    description: 'Gráfico de calor de frecuencia y volumen estilo GitHub.',
    icon: FlameIcon
  },
  {
    key: 'volume_by_muscle',
    title: 'Distribución de Volumen por Músculo',
    description: 'Gráfico circular con el porcentaje de carga dedicado a cada grupo muscular.',
    icon: BarChartIcon
  },
  {
    key: 'strength_progression',
    title: 'Progresión de Fuerza',
    description: 'Gráfico interactivo de evolución de cargas y récords por ejercicio.',
    icon: TrendingUpIcon
  }
];

const Settings = () => {
  const { user, updateProfile, updatePassword } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('perfil');
  const fileInputRef = useRef(null);

  // Telegram state
  const [code, setCode] = useState(null);
  const [loadingCode, setLoadingCode] = useState(false);
  
  // Perfil state
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    avatar_url: user?.avatar_url || '',
    height_cm: user?.height_cm || '',
    weight_kg: user?.weight_kg || '',
    target_weight_kg: user?.target_weight_kg || '',
    share_calendar_with_friends: user?.share_calendar_with_friends ?? true
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Dashboard widgets state
  const [widgets, setWidgets] = useState({
    ...DEFAULT_WIDGETS,
    ...(user?.extra_data?.dashboard_widgets || {})
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState(null); // 'saving', 'saved', null

  // Sincronizar estado cuando el usuario se actualiza
  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username || '',
        email: user.email || '',
        avatar_url: user.avatar_url || '',
        height_cm: user.height_cm || '',
        weight_kg: user.weight_kg || '',
        target_weight_kg: user.target_weight_kg || '',
        share_calendar_with_friends: user.share_calendar_with_friends ?? true
      });

      if (user.extra_data?.dashboard_widgets) {
        setWidgets(prev => ({
          ...DEFAULT_WIDGETS,
          ...user.extra_data.dashboard_widgets
        }));
      }
    }
  }, [user]);

  // Password state
  const [passData, setPassData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [savingPass, setSavingPass] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState(null);
  const [toastColor, setToastColor] = useState(colors.accentGreen);

  const showToast = (msg, isSuccess = false) => {
    setToastMessage(msg);
    setToastColor(isSuccess ? colors.successGreen : colors.danger);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // --- Handlers ---
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast("La imagen supera los 8MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setProfileData(prev => ({ ...prev, avatar_url: dataUrl }));
        showToast("Fotografía cargada. Guarda para aplicar.", true);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateCode = async () => {
    setLoadingCode(true);
    try {
      const data = await generateLinkCode();
      setCode(data.code);
    } catch (error) {
      showToast("Error generando código");
    } finally {
      setLoadingCode(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const response = await testConnection();
      showToast(response.message || "Conexión exitosa", true);
    } catch (error) {
      showToast(error.response?.data?.detail || "Error en la conexión. Asegúrate de estar vinculado.");
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        username: profileData.username.trim(),
        email: profileData.email.trim(),
        avatar_url: profileData.avatar_url || null,
        height_cm: profileData.height_cm ? parseFloat(profileData.height_cm) : null,
        weight_kg: profileData.weight_kg ? parseFloat(profileData.weight_kg) : null,
        target_weight_kg: profileData.target_weight_kg ? parseFloat(profileData.target_weight_kg) : null,
        share_calendar_with_friends: profileData.share_calendar_with_friends
      };
      await updateProfile(payload);
      showToast("Perfil actualizado correctamente", true);
    } catch (error) {
      showToast(error.response?.data?.detail || "Error actualizando perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  // Guardado asíncrono instantáneo al cambiar interruptores
  const handleToggleWidget = async (key) => {
    const nextWidgets = {
      ...widgets,
      [key]: !widgets[key]
    };
    setWidgets(nextWidgets);
    setAutoSaveStatus('saving');

    try {
      await updateProfile({
        extra_data: {
          dashboard_widgets: nextWidgets
        }
      });
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus(null), 2500);
    } catch (error) {
      console.error("Error guardando preferencias del dashboard", error);
      showToast("Error guardando preferencias del dashboard");
      setAutoSaveStatus(null);
    }
  };

  const handlePassSubmit = async (e) => {
    e.preventDefault();
    if (passData.new_password !== passData.confirm_password) {
      showToast("Las contraseñas nuevas no coinciden");
      return;
    }
    setSavingPass(true);
    try {
      await updatePassword(passData.current_password, passData.new_password);
      showToast("Contraseña actualizada con éxito", true);
      setPassData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      showToast(error.response?.data?.detail || "Error cambiando contraseña");
    } finally {
      setSavingPass(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: colors.inputBg,
    border: `1px solid ${colors.borderLine}`,
    borderRadius: '8px',
    color: colors.textPrimary,
    marginBottom: '1.25rem',
    fontSize: '1rem',
    boxSizing: 'border-box',
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    color: colors.textSecondary,
    fontSize: '0.9rem',
    fontWeight: '600'
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      
      {/* Header */}
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: '700', color: colors.textPrimary }}>
          Configuración
        </h1>
        <p style={{ color: colors.textSecondary, marginTop: '0.35rem', fontSize: '0.95rem' }}>
          Personaliza tu perfil, módulos del dashboard y seguridad.
        </p>
      </header>

      {/* Tabs con Iconos Vectoriales */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '2rem', 
        borderBottom: `1px solid ${colors.borderLine}`, 
        paddingBottom: '0.5rem',
        overflowX: 'auto',
        scrollbarWidth: 'none'
      }}>
        {[
          { id: 'perfil', label: 'Cuenta & Físico', icon: UserIcon },
          { id: 'dashboard', label: 'Preferencias del Dashboard', icon: LayoutGridIcon },
          { id: 'seguridad', label: 'Seguridad & Telegram', icon: ShieldIcon }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ 
                background: isActive ? 'var(--accent-glow)' : 'transparent', 
                border: 'none', 
                color: isActive ? colors.accentGreen : colors.textSecondary,
                fontWeight: isActive ? '700' : '500', 
                fontSize: '0.95rem', 
                cursor: 'pointer',
                padding: '0.6rem 1.1rem',
                borderRadius: '10px',
                borderBottom: isActive ? `2px solid ${colors.accentGreen}` : '2px solid transparent',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={18} color="currentColor" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel Contenedor Principal */}
      <section style={{ 
        backgroundColor: colors.cardBg, 
        padding: '2rem', 
        borderRadius: '20px', 
        border: `1px solid ${colors.borderLine}`, 
        boxShadow: colors.cardShadow, 
        maxWidth: '720px' 
      }}>
        
        {/* =================================================================== */}
        {/* PESTAÑA 1: Perfil y Datos Físicos */}
        {/* =================================================================== */}
        {activeTab === 'perfil' && (
          <form onSubmit={handleProfileSubmit}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: colors.textPrimary }}>
                  Datos Físicos y Cuenta
                </h2>
                <p style={{ margin: '4px 0 0 0', color: colors.textSecondary, fontSize: '0.85rem' }}>
                  Gestiona tu identidad y parámetros antropométricos.
                </p>
              </div>
            </div>
            
            {/* Foto de Perfil */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1.25rem', 
              marginBottom: '1.5rem', 
              padding: '1.1rem', 
              background: 'var(--bg-input)', 
              borderRadius: '16px', 
              border: `1px solid ${colors.borderLine}` 
            }}>
              <div style={{ 
                position: 'relative', 
                width: '72px', 
                height: '72px', 
                borderRadius: '50%', 
                overflow: 'hidden', 
                background: 'var(--bg-card)', 
                border: '2px solid var(--accent)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: 0 
              }}>
                {profileData.avatar_url ? (
                  <img 
                    src={profileData.avatar_url} 
                    alt={profileData.username} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <UserIcon size={36} color="var(--accent)" />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: colors.textPrimary }}>
                  Fotografía de Perfil
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleAvatarChange} 
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'var(--accent)',
                      color: '#000000',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Subir Fotografía
                  </button>

                  {profileData.avatar_url && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileData(prev => ({ ...prev, avatar_url: '' }));
                        showToast("Foto eliminada. Guarda los cambios para aplicar.", true);
                      }}
                      style={{
                        background: 'transparent',
                        color: 'var(--danger, #FF3B30)',
                        border: '1px solid var(--border-line)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Quitar Foto
                    </button>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                  Se optimiza automáticamente en el navegador (320px).
                </span>
              </div>
            </div>

            <label style={labelStyle}>Nombre de usuario</label>
            <input 
              style={inputStyle} 
              type="text" 
              value={profileData.username} 
              onChange={e => setProfileData({...profileData, username: e.target.value})} 
              required 
            />

            <label style={labelStyle}>Correo Electrónico</label>
            <input 
              style={inputStyle} 
              type="email" 
              value={profileData.email} 
              onChange={e => setProfileData({...profileData, email: e.target.value})} 
              required 
            />
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>Estatura (cm)</label>
                <input 
                  style={inputStyle} 
                  type="number" 
                  step="0.1" 
                  value={profileData.height_cm} 
                  onChange={e => setProfileData({...profileData, height_cm: e.target.value})} 
                  placeholder="Ej. 175" 
                />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>Peso Actual (kg)</label>
                <input 
                  style={inputStyle} 
                  type="number" 
                  step="0.1" 
                  value={profileData.weight_kg} 
                  onChange={e => setProfileData({...profileData, weight_kg: e.target.value})} 
                  placeholder="Ej. 70.5" 
                />
              </div>
            </div>

            <label style={labelStyle}>Peso Objetivo (kg) - Meta</label>
            <input 
              style={inputStyle} 
              type="number" 
              step="0.1" 
              value={profileData.target_weight_kg} 
              onChange={e => setProfileData({...profileData, target_weight_kg: e.target.value})} 
              placeholder="Ej. 75" 
            />

            <button 
              type="submit" 
              disabled={savingProfile} 
              style={{ 
                marginTop: '0.5rem',
                padding: '0.85rem 1.5rem', 
                background: 'linear-gradient(135deg, #34C759 0%, #10B981 100%)', 
                color: '#000000', 
                border: 'none', 
                borderRadius: '12px', 
                cursor: 'pointer', 
                fontWeight: '700', 
                fontSize: '0.95rem',
                width: '100%',
                boxShadow: '0 4px 14px rgba(52, 199, 89, 0.35)'
              }}
            >
              {savingProfile ? 'Guardando...' : 'Guardar Datos Físicos'}
            </button>
          </form>
        )}

        {/* =================================================================== */}
        {/* PESTAÑA 2: Preferencias y Modularidad del Dashboard */}
        {/* =================================================================== */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: colors.textPrimary }}>
                  Módulos del Dashboard
                </h2>
                <p style={{ margin: '4px 0 0 0', color: colors.textSecondary, fontSize: '0.85rem' }}>
                  Enciende o apaga las tarjetas según tu flujo de entrenamiento. Los cambios se guardan al instante.
                </p>
              </div>

              {/* Indicador de Auto-guardado */}
              {autoSaveStatus && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  background: autoSaveStatus === 'saved' ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  color: autoSaveStatus === 'saved' ? 'var(--accent)' : 'var(--text-secondary)',
                  border: `1px solid ${autoSaveStatus === 'saved' ? 'var(--accent)' : 'var(--border-line)'}`
                }}>
                  {autoSaveStatus === 'saved' ? (
                    <>
                      <CheckIcon size={14} color="var(--accent)" />
                      <span>Guardado</span>
                    </>
                  ) : (
                    <span>Guardando...</span>
                  )}
                </div>
              )}
            </div>

            {/* Lista de Widgets con Interruptores Móviles (iOS/Android) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
              {WIDGET_DEFINITIONS.map(widget => {
                const Icon = widget.icon;
                const isEnabled = widgets[widget.key] !== false;

                return (
                  <div 
                    key={widget.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      padding: '1.1rem 1.25rem',
                      borderRadius: '14px',
                      background: isEnabled ? 'var(--bg-input)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isEnabled ? 'var(--border-line)' : 'rgba(255, 255, 255, 0.04)'}`,
                      opacity: isEnabled ? 1 : 0.65,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{
                        marginTop: '2px',
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: isEnabled ? 'var(--accent-glow)' : 'rgba(255, 255, 255, 0.05)',
                        color: isEnabled ? 'var(--accent)' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={20} color="currentColor" />
                      </div>

                      <div>
                        <span style={{ 
                          fontWeight: '700', 
                          fontSize: '0.95rem', 
                          color: colors.textPrimary,
                          display: 'block'
                        }}>
                          {widget.title}
                        </span>
                        <span style={{ 
                          fontSize: '0.8rem', 
                          color: colors.textSecondary, 
                          display: 'block',
                          marginTop: '2px' 
                        }}>
                          {widget.description}
                        </span>
                      </div>
                    </div>

                    {/* Interruptor (Toggle Switch) */}
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={isEnabled} 
                        onChange={() => handleToggleWidget(widget.key)} 
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* PESTAÑA 3: Seguridad, Privacidad y Telegram */}
        {/* =================================================================== */}
        {activeTab === 'seguridad' && (
          <div>
            {/* Privacidad de Calendario */}
            <div style={{ 
              padding: '1.25rem', 
              background: 'var(--bg-input)', 
              borderRadius: '16px', 
              border: `1px solid ${colors.borderLine}`, 
              marginBottom: '2rem' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    marginTop: '2px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--accent-glow)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <CalendarIcon size={20} color="currentColor" />
                  </div>
                  <div>
                    <span style={{ fontWeight: '700', fontSize: '0.95rem', color: colors.textPrimary, display: 'block' }}>
                      Compartir Calendario con Amigos
                    </span>
                    <span style={{ fontSize: '0.8rem', color: colors.textSecondary, display: 'block', marginTop: '2px' }}>
                      Permite a los usuarios en tu lista de amigos ver tus sesiones completadas y programadas.
                    </span>
                  </div>
                </div>

                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={profileData.share_calendar_with_friends}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      setProfileData(prev => ({ ...prev, share_calendar_with_friends: val }));
                      await updateProfile({ share_calendar_with_friends: val });
                      showToast("Privacidad actualizada", true);
                    }}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            {/* Cambio de Contraseña */}
            <form onSubmit={handlePassSubmit} style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '1.2rem', color: colors.textPrimary }}>
                Cambiar Contraseña
              </h2>
              
              <label style={labelStyle}>Contraseña Actual</label>
              <input 
                style={inputStyle} 
                type="password" 
                value={passData.current_password} 
                onChange={e => setPassData({...passData, current_password: e.target.value})} 
                required 
              />
              
              <label style={labelStyle}>Nueva Contraseña</label>
              <input 
                style={inputStyle} 
                type="password" 
                value={passData.new_password} 
                onChange={e => setPassData({...passData, new_password: e.target.value})} 
                required 
                minLength="6" 
              />
              
              <label style={labelStyle}>Confirmar Nueva Contraseña</label>
              <input 
                style={inputStyle} 
                type="password" 
                value={passData.confirm_password} 
                onChange={e => setPassData({...passData, confirm_password: e.target.value})} 
                required 
                minLength="6" 
              />

              <button 
                type="submit" 
                disabled={savingPass} 
                style={{ 
                  padding: '0.75rem 1.5rem', 
                  background: 'var(--bg-input)', 
                  color: colors.textPrimary, 
                  border: `1px solid ${colors.borderLine}`, 
                  borderRadius: '10px', 
                  cursor: 'pointer', 
                  fontWeight: '700', 
                  fontSize: '0.9rem',
                  width: '100%' 
                }}
              >
                {savingPass ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>

            {/* Integración con Telegram */}
            <div style={{ borderTop: `1px solid ${colors.borderLine}`, paddingTop: '1.75rem' }}>
              <h2 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1.2rem', color: colors.textPrimary }}>
                Integración con Telegram
              </h2>
              <p style={{ color: colors.textSecondary, lineHeight: '1.6', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Registra entrenamientos al instante sin desbloquear la web. Vincula tu cuenta con nuestro bot oficial enviando series en formato: <code>60 10</code> (60kg x 10reps).
              </p>

              {code && (
                <div style={{ 
                  backgroundColor: 'rgba(52, 199, 89, 0.1)', 
                  border: `1px solid var(--accent)`, 
                  padding: '1.25rem', 
                  borderRadius: '12px', 
                  marginBottom: '1.5rem', 
                  textAlign: 'center' 
                }}>
                  <p style={{ margin: '0 0 0.5rem 0', color: colors.textSecondary, fontSize: '0.85rem' }}>
                    Tu código de vinculación (expira al usarlo):
                  </p>
                  <h3 style={{ margin: 0, fontSize: '2.2rem', color: 'var(--accent)', letterSpacing: '6px', fontWeight: '800' }}>
                    {code}
                  </h3>
                  <p style={{ marginTop: '0.75rem', marginBottom: 0, color: colors.textPrimary, fontSize: '0.85rem' }}>
                    Envía este código al bot <strong>@EntrenamientoTrackerBot</strong> en Telegram.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={handleGenerateCode} 
                  disabled={loadingCode}
                  style={{ 
                    padding: '0.75rem 1.25rem', 
                    background: 'var(--accent)', 
                    color: '#000000', 
                    border: 'none', 
                    borderRadius: '10px', 
                    cursor: 'pointer', 
                    fontWeight: '700', 
                    fontSize: '0.9rem', 
                    flex: '1 1 180px' 
                  }}
                >
                  {loadingCode ? 'Generando...' : 'Generar Código'}
                </button>
                
                <button 
                  onClick={handleTestConnection} 
                  style={{ 
                    padding: '0.75rem 1.25rem', 
                    background: 'transparent', 
                    color: colors.textPrimary, 
                    border: `1px solid ${colors.borderLine}`, 
                    borderRadius: '10px', 
                    cursor: 'pointer', 
                    fontWeight: '600', 
                    fontSize: '0.9rem', 
                    flex: '1 1 180px' 
                  }}
                >
                  Prueba de Conexión
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Toast */}
      {toastMessage && (
        <div style={{ 
          position: 'fixed', 
          bottom: '2rem', 
          right: '2rem', 
          backgroundColor: toastColor, 
          color: toastColor === colors.successGreen ? '#000000' : '#FFFFFF', 
          padding: '0.85rem 1.5rem', 
          borderRadius: '10px', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)', 
          zIndex: 1000, 
          fontWeight: '700', 
          fontSize: '0.9rem',
          animation: 'fadeIn 0.3s ease-in-out' 
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default Settings;
