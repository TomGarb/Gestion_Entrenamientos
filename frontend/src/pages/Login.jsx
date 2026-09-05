import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loginWithGoogle } = useContext(AuthContext);
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [credentials, setCredentials] = useState({ 
    username: '', 
    email: '', 
    password: '',
    peso: '',
    altura: '',
    foto_perfil: ''
  });
  const [error, setError] = useState('');

  const queryParams = new URLSearchParams(location.search);
  const redirectUrl = queryParams.get('redirect') || '/';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate(redirectUrl);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error en Google Login');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegistering) {
        if (!credentials.peso || !credentials.altura) {
          setError('Por favor ingresa tu peso y altura');
          return;
        }
        await register({
          username: credentials.username.trim(),
          email: credentials.email.trim(),
          password: credentials.password,
          peso: parseFloat(credentials.peso),
          altura: parseFloat(credentials.altura),
          foto_perfil: credentials.foto_perfil.trim() || null
        });
      } else {
        await login(credentials.username.trim(), credentials.password);
      }
      navigate(redirectUrl);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0].msg || 'Error de validación en los datos ingresados');
      } else {
        setError(detail || 'Error de autenticación. Verifica tus datos o conexión.');
      }
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '5vh', marginBottom: '5vh' }}>
      <div style={{ padding: '2rem', border: '1px solid #ccc', borderRadius: '8px', width: '340px', maxWidth: '90%' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
        </h2>
        {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.9rem', backgroundColor: '#ffeef0', padding: '8px', borderRadius: '4px' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Usuario</label>
            <input 
              type="text" 
              name="username" 
              value={credentials.username} 
              onChange={handleChange} 
              required 
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          {isRegistering && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Email</label>
                <input 
                  type="email" 
                  name="email" 
                  value={credentials.email} 
                  onChange={handleChange} 
                  required 
                  style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Peso (kg)</label>
                  <input 
                    type="number" 
                    name="peso" 
                    step="0.1" 
                    min="20" 
                    max="300"
                    placeholder="ej. 75.5"
                    value={credentials.peso} 
                    onChange={handleChange} 
                    required 
                    style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Altura (cm)</label>
                  <input 
                    type="number" 
                    name="altura" 
                    step="0.5" 
                    min="50" 
                    max="260"
                    placeholder="ej. 178"
                    value={credentials.altura} 
                    onChange={handleChange} 
                    required 
                    style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Foto de perfil (URL opcional)</label>
                <input 
                  type="url" 
                  name="foto_perfil" 
                  placeholder="https://ejemplo.com/mifoto.jpg"
                  value={credentials.foto_perfil} 
                  onChange={handleChange} 
                  style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </>
          )}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Contraseña</label>
            <input 
              type="password" 
              name="password" 
              value={credentials.password} 
              onChange={handleChange} 
              required 
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <button type="submit" style={{ padding: '0.75rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isRegistering ? 'Crear Cuenta' : 'Ingresar'}
          </button>
        </form>
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('La conexión con Google falló')}
          />
        </div>
        <p style={{ textAlign: 'center', marginTop: '1.2rem', fontSize: '0.9rem' }}>
          {isRegistering ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
          <button 
            type="button"
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }} 
            style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', marginLeft: '0.5rem', fontWeight: 'bold' }}>
            {isRegistering ? 'Ingresa aquí' : 'Regístrate'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
