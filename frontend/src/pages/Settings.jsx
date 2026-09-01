import React, { useState, useContext } from 'react';
import { generateLinkCode, testConnection } from '../services/telegramService';
import { AuthContext } from '../context/AuthContext';

// --- Paleta "Hierro y Sudor" ---
const colors = {
  background: '#1C1C1E',
  cardBg: '#2C2C2E',
  borderLine: '#3A3A3C',
  textPrimary: '#F2F2F7',
  textSecondary: '#AEAEB2',
  accentRed: '#FFD60A', // El nombre variable sigue siendo accentRed por compatibilidad, pero es Amarillo
  successGreen: '#32D74B',
  inputBg: '#1C1C1E'
};

const Settings = () => {
  const { user, updateProfile, updatePassword } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('perfil');

  // Telegram state
  const [code, setCode] = useState(null);
  const [loadingCode, setLoadingCode] = useState(false);
  
  // Perfil state
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    height_cm: user?.height_cm || '',
    weight_kg: user?.weight_kg || '',
    target_weight_kg: user?.target_weight_kg || ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [passData, setPassData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [savingPass, setSavingPass] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState(null);
  const [toastColor, setToastColor] = useState(colors.accentRed);

  const showToast = (msg, isSuccess = false) => {
    setToastMessage(msg);
    setToastColor(isSuccess ? colors.successGreen : colors.accentRed);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // --- Handlers ---
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
        username: profileData.username,
        height_cm: profileData.height_cm ? parseFloat(profileData.height_cm) : null,
        weight_kg: profileData.weight_kg ? parseFloat(profileData.weight_kg) : null,
        target_weight_kg: profileData.target_weight_kg ? parseFloat(profileData.target_weight_kg) : null,
      };
      await updateProfile(payload);
      showToast("Perfil actualizado correctamente", true);
    } catch (error) {
      showToast(error.response?.data?.detail || "Error actualizando perfil");
    } finally {
      setSavingProfile(false);
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
    width: '100%', padding: '0.75rem', backgroundColor: colors.inputBg,
    border: `1px solid ${colors.borderLine}`, borderRadius: '6px',
    color: colors.textPrimary, marginBottom: '1.25rem', fontSize: '1rem'
  };

  const labelStyle = {
    display: 'block', marginBottom: '0.5rem', color: colors.textSecondary,
    fontSize: '0.9rem', fontWeight: 'bold'
  };

  return (
    <div style={{ backgroundColor: colors.background, color: colors.textPrimary, minHeight: '100vh', padding: '2rem', margin: '-2rem' }}>
      
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: colors.textPrimary }}>Configuración</h1>
        <p style={{ color: colors.textSecondary, marginTop: '0.5rem', fontSize: '1.1rem' }}>Personaliza tu experiencia y dispositivos.</p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: `1px solid ${colors.borderLine}`, paddingBottom: '0.5rem' }}>
        {['perfil', 'seguridad', 'telegram'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              background: 'transparent', border: 'none', 
              color: activeTab === tab ? colors.accentRed : colors.textSecondary,
              fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer',
              textTransform: 'capitalize', padding: '0.5rem 1rem',
              borderBottom: activeTab === tab ? `3px solid ${colors.accentRed}` : '3px solid transparent'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <section style={{ backgroundColor: colors.cardBg, padding: '2rem', borderRadius: '16px', border: `1px solid ${colors.borderLine}`, boxShadow: '0 10px 30px rgba(0,0,0,0.4)', maxWidth: '600px' }}>
        
        {/* T pestaña: Perfil */}
        {activeTab === 'perfil' && (
          <form onSubmit={handleProfileSubmit}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: colors.textPrimary }}>Datos Físicos y Cuenta</h2>
            
            <label style={labelStyle}>Nombre de usuario</label>
            <input style={inputStyle} type="text" value={profileData.username} onChange={e => setProfileData({...profileData, username: e.target.value})} required />
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Estatura (cm)</label>
                <input style={inputStyle} type="number" step="0.1" value={profileData.height_cm} onChange={e => setProfileData({...profileData, height_cm: e.target.value})} placeholder="Ej. 175" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Peso Actual (kg)</label>
                <input style={inputStyle} type="number" step="0.1" value={profileData.weight_kg} onChange={e => setProfileData({...profileData, weight_kg: e.target.value})} placeholder="Ej. 70.5" />
              </div>
            </div>

            <label style={labelStyle}>Peso Objetivo (kg) - Meta</label>
            <input style={inputStyle} type="number" step="0.1" value={profileData.target_weight_kg} onChange={e => setProfileData({...profileData, target_weight_kg: e.target.value})} placeholder="Ej. 75" />

            <button type="submit" disabled={savingProfile} style={{ padding: '0.75rem 1.5rem', background: colors.accentRed, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
              {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        )}

        {/* T pestaña: Seguridad */}
        {activeTab === 'seguridad' && (
          <form onSubmit={handlePassSubmit}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: colors.textPrimary }}>Cambiar Contraseña</h2>
            
            <label style={labelStyle}>Contraseña Actual</label>
            <input style={inputStyle} type="password" value={passData.current_password} onChange={e => setPassData({...passData, current_password: e.target.value})} required />
            
            <label style={labelStyle}>Nueva Contraseña</label>
            <input style={inputStyle} type="password" value={passData.new_password} onChange={e => setPassData({...passData, new_password: e.target.value})} required minLength="6" />
            
            <label style={labelStyle}>Confirmar Nueva Contraseña</label>
            <input style={inputStyle} type="password" value={passData.confirm_password} onChange={e => setPassData({...passData, confirm_password: e.target.value})} required minLength="6" />

            <button type="submit" disabled={savingPass} style={{ padding: '0.75rem 1.5rem', background: colors.accentRed, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
              {savingPass ? 'Actualizando...' : 'Actualizar Contraseña'}
            </button>
          </form>
        )}

        {/* T pestaña: Telegram */}
        {activeTab === 'telegram' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: colors.textPrimary }}>Integración con Telegram</h2>
            <p style={{ color: colors.textSecondary, lineHeight: '1.6', marginBottom: '2rem' }}>
              Registra tus entrenamientos al instante sin desbloquear la app web. Vincula tu cuenta con nuestro bot oficial y empieza a enviar tus series escribiendo: <code>60 10</code> (60kg x 10reps).
            </p>

            {code && (
              <div style={{ backgroundColor: 'rgba(32, 191, 85, 0.1)', border: `1px solid ${colors.successGreen}`, padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'center' }}>
                <p style={{ margin: '0 0 1rem 0', color: colors.textSecondary }}>Tu código de vinculación (expira al usarlo):</p>
                <h3 style={{ margin: 0, fontSize: '2.5rem', color: colors.successGreen, letterSpacing: '8px' }}>{code}</h3>
                <p style={{ marginTop: '1rem', marginBottom: 0, color: colors.textPrimary }}>
                  Envía este código al bot <strong>@EntrenamientoTrackerBot</strong> en Telegram.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button 
                onClick={handleGenerateCode} 
                disabled={loadingCode}
                style={{ padding: '0.75rem 1.5rem', background: colors.accentRed, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', flex: 1, boxShadow: '0 4px 10px rgba(217, 4, 41, 0.4)' }}
              >
                {loadingCode ? 'Generando...' : 'Generar Código'}
              </button>
              
              <button 
                onClick={handleTestConnection} 
                style={{ padding: '0.75rem 1.5rem', background: 'transparent', color: colors.textPrimary, border: `1px solid ${colors.borderLine}`, borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', flex: 1 }}
              >
                Prueba de Conexión
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Toast */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', backgroundColor: toastColor, color: 'white', padding: '1rem 2rem', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 1000, fontWeight: 'bold', animation: 'fadeIn 0.3s ease-in-out' }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default Settings;
