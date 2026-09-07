import React, { useState, useEffect } from 'react';
import {
  logFood,
  searchFoodByBarcode,
  searchFoodByQuery,
} from '../../services/nutritionService';
import FullScreenScanner from './FullScreenScanner';

const FoodLogModal = ({ isOpen, onClose, onFoodLogged }) => {
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [foodForm, setFoodForm] = useState({
    food_name: '',
    grams: 100,
    calories_100g: 0,
    proteins_100g: 0,
    carbs_100g: 0,
    fats_100g: 0,
    barcode: '',
  });
  const [isCustomEntry, setIsCustomEntry] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState('');

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal is closed
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
      setIsSubmitting(false);
      setErrorMsg('');
      setSuccessMsg('');
      setFallbackNotice('');
      setShowScanner(false);
      setFoodForm({
        food_name: '',
        grams: 100,
        calories_100g: 0,
        proteins_100g: 0,
        carbs_100g: 0,
        fats_100g: 0,
        barcode: '',
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScanSuccess = async (barcode) => {
    setShowScanner(false);
    setFallbackNotice('');
    setErrorMsg('');
    setIsSearching(true);

    try {
      const product = await searchFoodByBarcode(barcode);
      if (product && product.name) {
        setFoodForm({
          food_name: product.name,
          grams: 100,
          calories_100g: product.calories_100g || 0,
          proteins_100g: product.proteins_100g || 0,
          carbs_100g: product.carbs_100g || 0,
          fats_100g: product.fats_100g || 0,
          barcode: product.barcode || barcode,
        });
        setIsCustomEntry(false);
        setSuccessMsg(`Producto detectado: ${product.name}`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        triggerFallbackManual(barcode);
      }
    } catch (err) {
      triggerFallbackManual(barcode);
    } finally {
      setIsSearching(false);
    }
  };

  const triggerFallbackManual = (barcode = '') => {
    setFoodForm({
      food_name: '',
      grams: 100,
      calories_100g: 0,
      proteins_100g: 0,
      carbs_100g: 0,
      fats_100g: 0,
      barcode: barcode || '',
    });
    setIsCustomEntry(true);
    setFallbackNotice(
      barcode
        ? `Código "${barcode}" no encontrado en OpenFoodFacts. Puedes registrar los datos manualmente:`
        : 'Registro manual de alimento:'
    );
  };

  const handleTextSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMsg('');
    try {
      const results = await searchFoodByQuery(searchQuery.trim());
      setSearchResults(results);
      if (results.length === 0) {
        setErrorMsg('No se encontraron alimentos en OpenFoodFacts con ese nombre.');
      }
    } catch (err) {
      setErrorMsg('Error buscando alimentos en OpenFoodFacts.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (prod) => {
    setFoodForm({
      food_name: prod.name,
      grams: 100,
      calories_100g: prod.calories_100g || 0,
      proteins_100g: prod.proteins_100g || 0,
      carbs_100g: prod.carbs_100g || 0,
      fats_100g: prod.fats_100g || 0,
      barcode: prod.barcode || '',
    });
    setSearchResults([]);
    setSearchQuery('');
    setIsCustomEntry(false);
    setFallbackNotice('');
  };

  const handleAddFoodSubmit = async (e) => {
    e.preventDefault();
    if (!foodForm.food_name.trim()) {
      setErrorMsg('Debes indicar el nombre del alimento.');
      return;
    }

    const gramsVal = Math.max(parseFloat(foodForm.grams) || 100, 1);
    const ratio = gramsVal / 100.0;

    const payload = {
      food_name: foodForm.food_name.trim(),
      grams: gramsVal,
      calories: Math.round((foodForm.calories_100g || 0) * ratio * 10) / 10,
      proteins: Math.round((foodForm.proteins_100g || 0) * ratio * 10) / 10,
      carbs: Math.round((foodForm.carbs_100g || 0) * ratio * 10) / 10,
      fats: Math.round((foodForm.fats_100g || 0) * ratio * 10) / 10,
      barcode: foodForm.barcode || null,
    };

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const savedItem = await logFood(payload);
      setSuccessMsg(`✓ ${payload.food_name} (${payload.calories} kcal) guardado.`);

      // Disparar evento global para que las vistas activas actualicen sus datos
      window.dispatchEvent(new CustomEvent('food-logged', { detail: payload }));

      if (onFoodLogged) {
        onFoodLogged(savedItem || payload);
      }

      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al registrar el alimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cálculos en tiempo real
  const currentFormGrams = Math.max(parseFloat(foodForm.grams) || 100, 1);
  const currentRatio = currentFormGrams / 100.0;
  const currentFormCalories = Math.round((foodForm.calories_100g || 0) * currentRatio);
  const currentFormProt = Math.round((foodForm.proteins_100g || 0) * currentRatio * 10) / 10;
  const currentFormCarbs = Math.round((foodForm.carbs_100g || 0) * currentRatio * 10) / 10;
  const currentFormFats = Math.round((foodForm.fats_100g || 0) * currentRatio * 10) / 10;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          padding: '1rem',
          boxSizing: 'border-box',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          style={{
            background: 'var(--bg-card, #1c1c1e)',
            color: 'var(--text-primary, #fff)',
            padding: '1.75rem',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid var(--border-line, rgba(255, 255, 255, 0.1))',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            position: 'relative',
          }}
        >
          {/* Header del Modal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.5rem' }}>🍎</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>Registrar Alimento</h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #888)' }}>
                  Busca en OpenFoodFacts o escanea con la cámara
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                color: '#fff',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease',
              }}
            >
              ✕
            </button>
          </div>

          {successMsg && (
            <div
              style={{
                background: 'rgba(52, 199, 89, 0.15)',
                border: '1px solid var(--accent, #34c759)',
                color: 'var(--accent, #34c759)',
                padding: '0.8rem',
                borderRadius: '12px',
                marginBottom: '1rem',
                fontSize: '0.88rem',
                fontWeight: '600',
              }}
            >
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '0.8rem',
                borderRadius: '12px',
                marginBottom: '1rem',
                fontSize: '0.85rem',
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Acciones principales: Escanear código de barras o Buscar por texto */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              style={{
                padding: '0.9rem',
                background: 'rgba(52, 199, 89, 0.12)',
                border: '1px solid var(--accent, #34c759)',
                borderRadius: '14px',
                color: 'var(--accent, #34c759)',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>📷</span> Escanear Código de Barras
            </button>

            {/* Búsqueda por texto en OpenFoodFacts */}
            <form onSubmit={handleTextSearch} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Buscar alimento (ej. avena, atún, yogur...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.8rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-line, rgba(255, 255, 255, 0.15))',
                  background: 'var(--bg-input, #2c2c2e)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={isSearching}
                style={{
                  padding: '0.8rem 1.2rem',
                  background: 'var(--accent, #34c759)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  cursor: isSearching ? 'default' : 'pointer',
                  fontSize: '0.9rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {isSearching ? '...' : 'Buscar'}
              </button>
            </form>
          </div>

          {/* Resultados de búsqueda por texto */}
          {searchResults.length > 0 && (
            <div
              style={{
                background: 'var(--bg-input, #2c2c2e)',
                borderRadius: '14px',
                border: '1px solid var(--border-line, rgba(255, 255, 255, 0.1))',
                maxHeight: '180px',
                overflowY: 'auto',
                marginBottom: '1.25rem',
                padding: '0.5rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #888)', padding: '0.4rem' }}>
                Selecciona un alimento de los resultados:
              </div>
              {searchResults.map((prod, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSearchResult(prod)}
                  style={{
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{prod.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #888)' }}>
                      {prod.calories_100g} kcal / 100g (P: {prod.proteins_100g}g | C: {prod.carbs_100g}g | G: {prod.fats_100g}g)
                    </div>
                  </div>
                  <span style={{ color: 'var(--accent, #34c759)', fontWeight: 'bold', fontSize: '1.2rem' }}>+</span>
                </div>
              ))}
            </div>
          )}

          {/* Aviso de fallback manual si aplica */}
          {fallbackNotice && (
            <div
              style={{
                background: 'rgba(255, 149, 0, 0.15)',
                border: '1px solid #ff9500',
                color: '#ffd60a',
                padding: '0.8rem',
                borderRadius: '12px',
                marginBottom: '1.2rem',
                fontSize: '0.85rem',
              }}
            >
              ℹ️ {fallbackNotice}
            </div>
          )}

          {/* Formulario de alimento y calculadora de porciones */}
          <form onSubmit={handleAddFoodSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary, #888)', marginBottom: '0.3rem' }}>
                Nombre del Alimento *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Pechuga de Pollo, Avena, Yogur Griego..."
                value={foodForm.food_name}
                onChange={(e) => setFoodForm({ ...foodForm, food_name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-line, rgba(255, 255, 255, 0.15))',
                  background: 'var(--bg-input, #2c2c2e)',
                  color: '#fff',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Gramos consumidos */}
            <div
              style={{
                background: 'rgba(52, 199, 89, 0.08)',
                padding: '1rem',
                borderRadius: '14px',
                border: '1px solid rgba(52, 199, 89, 0.25)',
              }}
            >
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent, #34c759)', marginBottom: '0.4rem' }}>
                ⚖️ Cantidad a consumir (Gramos)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={foodForm.grams}
                  onChange={(e) => setFoodForm({ ...foodForm, grams: e.target.value })}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(52, 199, 89, 0.4)',
                    background: 'var(--bg-card, #1c1c1e)',
                    color: '#fff',
                    fontSize: '1.2rem',
                    fontWeight: '800',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ fontWeight: '700', color: 'var(--text-secondary, #aaa)' }}>gramos</span>
              </div>
            </div>

            {/* Valores base por 100g */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary, #888)', marginBottom: '0.2rem' }}>
                  Calorías (por 100g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={foodForm.calories_100g}
                  onChange={(e) => setFoodForm({ ...foodForm, calories_100g: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-line, rgba(255, 255, 255, 0.15))',
                    background: 'var(--bg-input, #2c2c2e)',
                    color: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary, #888)', marginBottom: '0.2rem' }}>
                  Proteínas (por 100g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={foodForm.proteins_100g}
                  onChange={(e) => setFoodForm({ ...foodForm, proteins_100g: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-line, rgba(255, 255, 255, 0.15))',
                    background: 'var(--bg-input, #2c2c2e)',
                    color: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary, #888)', marginBottom: '0.2rem' }}>
                  Carbohidratos (por 100g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={foodForm.carbs_100g}
                  onChange={(e) => setFoodForm({ ...foodForm, carbs_100g: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-line, rgba(255, 255, 255, 0.15))',
                    background: 'var(--bg-input, #2c2c2e)',
                    color: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary, #888)', marginBottom: '0.2rem' }}>
                  Grasas (por 100g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={foodForm.fats_100g}
                  onChange={(e) => setFoodForm({ ...foodForm, fats_100g: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-line, rgba(255, 255, 255, 0.15))',
                    background: 'var(--bg-input, #2c2c2e)',
                    color: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Resumen Calculado de la porción en tiempo real */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #aaa)' }}>
                  Total porción ({currentFormGrams}g):
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #888)', marginTop: '2px' }}>
                  P: {currentFormProt}g | C: {currentFormCarbs}g | G: {currentFormFats}g
                </div>
              </div>
              <span style={{ fontWeight: '800', color: 'var(--accent, #34c759)', fontSize: '1.25rem' }}>
                {currentFormCalories} kcal
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary, #888)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  padding: '0.7rem 1.2rem',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '0.8rem 1.8rem',
                  background: 'var(--accent, #34c759)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  cursor: isSubmitting ? 'default' : 'pointer',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 14px rgba(52, 199, 89, 0.3)',
                }}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Alimento'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Escáner a pantalla completa */}
      <FullScreenScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanSuccess}
        onManualEntryFallback={(code) => {
          setShowScanner(false);
          triggerFallbackManual(code);
        }}
      />
    </>
  );
};

export default FoodLogModal;
