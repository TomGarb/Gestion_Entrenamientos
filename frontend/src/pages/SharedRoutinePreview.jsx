import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const SharedRoutinePreview = () => {
  const { hash } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [routine, setRoutine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCloning, setIsCloning] = useState(false);

  useEffect(() => {
    const fetchRoutine = async () => {
      try {
        const response = await api.get(`/api/routines/shared/${hash}`);
        setRoutine(response.data);
      } catch (err) {
        setError('Rutina no encontrada o el enlace ha expirado.');
      } finally {
        setLoading(false);
      }
    };
    fetchRoutine();
  }, [hash]);

  const handleClone = async () => {
    if (!user) {
      // Redirigir a login con el parámetro redirect
      navigate(`/login?redirect=/shared/routine/${hash}`);
      return;
    }
    
    setIsCloning(true);
    try {
      await api.post(`/api/routines/shared/${hash}/clone`);
      navigate('/routines', { state: { message: '¡Rutina clonada exitosamente!' } });
    } catch (err) {
      const detail = err.response?.data?.detail || 'Error al clonar la rutina';
      alert(detail);
      setIsCloning(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando rutina compartida...</div>;
  }

  if (error || !routine) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>
        <h2 style={{ color: 'var(--accent)' }}>Oops</h2>
        <p>{error}</p>
        <Link to="/" style={{ color: '#4da3ff' }}>Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-app)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* Navbar simplificado público */}
      <div style={{ padding: '1rem 2rem', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent)' }}>GymTracker</h1>
        {!user ? (
          <button onClick={() => navigate(`/login?redirect=/shared/routine/${hash}`)} style={{ background: 'none', color: '#4da3ff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            Iniciar Sesión
          </button>
        ) : (
          <button onClick={() => navigate('/')} style={{ background: 'none', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
            Mi Panel
          </button>
        )}
      </div>

      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h1 style={{ margin: 0, fontSize: '2rem' }}>{routine.name}</h1>
          </div>
          
          <div style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span>Creada por <strong>{routine.author_name}</strong></span>
            <span>•</span>
            <span>{routine.routine_exercises.length} ejercicios</span>
          </div>

          {routine.description && (
            <p style={{ backgroundColor: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              "{routine.description}"
            </p>
          )}

          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-line)', paddingBottom: '0.5rem' }}>Ejercicios</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {routine.routine_exercises.map((re, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-input)', padding: '1rem', borderRadius: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>{re.exercise?.name || 'Ejercicio desconocido'}</span>
                <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{re.sets} sets x {re.reps} reps</span>
              </div>
            ))}
          </div>

          <button 
            onClick={handleClone}
            disabled={isCloning || (user && user.id === routine.user_id)}
            style={{ 
              width: '100%', 
              padding: '1rem', 
              backgroundColor: user && user.id === routine.user_id ? 'var(--bg-input)' : 'var(--accent)', 
              color: user && user.id === routine.user_id ? 'var(--text-secondary)' : 'white', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '1.2rem', 
              fontWeight: 'bold', 
              cursor: user && user.id === routine.user_id ? 'not-allowed' : 'pointer' 
            }}
          >
            {user && user.id === routine.user_id 
              ? 'Esta es tu propia rutina' 
              : isCloning ? 'Clonando...' : 'Clonar a mi cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharedRoutinePreview;
