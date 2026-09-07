import React, { useState, useEffect } from 'react';
import {
  getDailyNutrition,
  logFood,
  deleteFoodLog,
  searchFoodByBarcode,
  searchFoodByQuery,
} from '../../services/nutritionService';
import FullScreenScanner from './FullScreenScanner';

const DailyNutritionCard = ({ onNutritionUpdated }) => {
  const [nutrition, setNutrition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showItemList, setShowItemList] = useState(false);

  // Estados del Formulario de Comida
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Alimento seleccionado / en edición
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
    loadDailyNutrition();
  }, []);

  const loadDailyNutrition = async () => {
    try {
      setLoading(true);
      const data = await getDailyNutrition();
      setNutrition(data);
      if (onNutritionUpdated) onNutritionUpdated(data);
    } catch (err) {
      console.error('Error cargando balance nutricional:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = async (barcode) => {
    setShowScanner(false);
    setShowAddModal(true);
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
        // Fallback inteligente
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
      await logFood(payload);
      setShowAddModal(false);
      setSuccessMsg(`✓ ${payload.food_name} (${payload.calories} kcal) añadido.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadDailyNutrition();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al registrar el alimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await deleteFoodLog(itemId);
      await loadDailyNutrition();
    } catch (err) {
      console.error('Error eliminando alimento:', err);
    }
  };

  // Cálculos de porcentaje y métricas
  const targetCalories = nutrition?.target_calories || 2000;
  const netCalories = nutrition?.net_calories || 0;
  const consumedCalories = nutrition?.total_calories_consumed || 0;
  const burnedCalories = nutrition?.total_calories_burned || 0;

  const targetProteins = nutrition?.target_proteins || 140;
  const targetCarbs = nutrition?.target_carbs || 220;
  const targetFats = nutrition?.target_fats || 65;

  const totalProteins = nutrition?.total_proteins || 0;
  const totalCarbs = nutrition?.total_carbs || 0;
  const totalFats = nutrition?.total_fats || 0;

  const calProgress = Math.min(Math.max((netCalories / targetCalories) * 100, 0), 100);
  const protProgress = Math.min(Math.max((totalProteins / targetProteins) * 100, 0), 100);
  const carbsProgress = Math.min(Math.max((totalCarbs / targetCarbs) * 100, 0), 100);
  const fatsProgress = Math.min(Math.max((totalFats / targetFats) * 100, 0), 100);

  // Valores calculados en el formulario en tiempo real
  const currentFormGrams = Math.max(parseFloat(foodForm.grams) || 100, 1);
  const currentRatio = currentFormGrams / 100.0;
  const currentFormCalories = Math.round((foodForm.calories_100g || 0) * currentRatio);
  const currentFormProt = Math.round((foodForm.proteins_100g || 0) * currentRatio * 10) / 10;
  const currentFormCarbs = Math.round((foodForm.carbs_100g || 0) * currentRatio * 10) / 10;
  const currentFormFats = Math.round((foodForm.fats_100g || 0) * currentRatio * 10) / 10;

  return (
    <div
      className="neo-card"
      style={{
        background: 'var(--bg-card, #1c1c1e)',
        borderRadius: '20px',
        padding: '1.5rem',
        border: '1px solid var(--border-line, rgba(255, 255, 255, 0.08))',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        marginBottom: '2rem',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Cabecera de la Tarjeta */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.3rem' }}>🥗</span>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: '700',
                color: 'var(--text-primary, #fff)',
              }}
            >
              Balance Nutricional Diario
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #8e8e93)' }}>
              OpenFoodFacts & Gasto MET
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setSuccessMsg('');
            setFallbackNotice('');
            setFoodForm({
              food_name: '',
              grams: 100,
              calories_100g: 0,
              proteins_100g: 0,
              carbs_100g: 0,
              fats_100g: 0,
              barcode: '',
            });
            setShowAddModal(true);
          }}
          style={{
            background: 'var(--accent, #34c759)',
            color: '#000000',
            border: 'none',
            borderRadius: '12px',
            padding: '0.6rem 1.2rem',
            fontWeight: '700',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 4px 12px rgba(52, 199, 89, 0.3)',
          }}
        >
          <span>+</span> Añadir Comida
        </button>
      </div>

      {successMsg && (
        <div
          style={{
            background: 'rgba(52, 199, 89, 0.15)',
            border: '1px solid #34c759',
            color: '#34c759',
            padding: '0.6rem 1rem',
            borderRadius: '10px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontWeight: '600',
          }}
        >
          {successMsg}
        </div>
      )}

      {/* Barra Verde Vibrante de Calorías Netas */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '0.4rem',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '1.75rem',
                fontWeight: '800',
                color: 'var(--accent, #34c759)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {netCalories}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #888)', marginLeft: '4px' }}>
              / {targetCalories} kcal netas
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-secondary, #aaa)' }}>
              🍽️ {consumedCalories} consumidas
            </span>
            <span style={{ color: '#ff9500', fontWeight: '600' }}>
              🔥 {burnedCalories} quemadas
            </span>
          </div>
        </div>

        {/* Track de Progreso */}
        <div
          style={{
            height: '10px',
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${calProgress}%`,
              background: 'linear-gradient(90deg, #30d158 0%, #34c759 100%)',
              borderRadius: '999px',
              transition: 'width 0.4s ease',
              boxShadow: '0 0 10px rgba(52, 199, 89, 0.5)',
            }}
          />
        </div>
      </div>

      {/* 3 Barras / Indicadores de Macronutrientes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        {/* Proteínas */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #888)', fontWeight: '600' }}>
              🥩 Proteínas
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#ff453a' }}>
              {totalProteins}g
            </span>
          </div>
          <div
            style={{
              height: '5px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${protProgress}%`,
                background: '#ff453a',
                borderRadius: '999px',
              }}
            />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #666)', marginTop: '0.2rem', textAlign: 'right' }}>
            meta: {targetProteins}g
          </div>
        </div>

        {/* Carbohidratos */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #888)', fontWeight: '600' }}>
              🍞 Carbos
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#ffd60a' }}>
              {totalCarbs}g
            </span>
          </div>
          <div
            style={{
              height: '5px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${carbsProgress}%`,
                background: '#ffd60a',
                borderRadius: '999px',
              }}
            />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #666)', marginTop: '0.2rem', textAlign: 'right' }}>
            meta: {targetCarbs}g
          </div>
        </div>

        {/* Grasas */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #888)', fontWeight: '600' }}>
              🥑 Grasas
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64d2ff' }}>
              {totalFats}g
            </span>
          </div>
          <div
            style={{
              height: '5px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${fatsProgress}%`,
                background: '#64d2ff',
                borderRadius: '999px',
              }}
            />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #666)', marginTop: '0.2rem', textAlign: 'right' }}>
            meta: {targetFats}g
          </div>
        </div>
      </div>

      {/* Desplegable de alimentos consumidos hoy */}
      {nutrition?.items && nutrition.items.length > 0 && (
        <div>
          <button
            onClick={() => setShowItemList(!showItemList)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #888)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0',
            }}
          >
            <span>{showItemList ? '▲ Ocultar comidas registradas' : `▼ Ver ${nutrition.items.length} comidas de hoy`}</span>
          </button>

          {showItemList && (
            <div
              style={{
                marginTop: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              {nutrition.items.map((it) => (
                <div
                  key={it.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '0.5rem 0.8rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary, #fff)' }}>
                      {it.food_name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #888)', marginLeft: '6px' }}>
                      ({it.grams}g)
                    </span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #aaa)', marginTop: '2px' }}>
                      P: {it.proteins}g | C: {it.carbs}g | G: {it.fats}g
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--accent, #34c759)' }}>
                      {it.calories} kcal
                    </span>
                    <button
                      onClick={() => handleDeleteItem(it.id)}
                      title="Eliminar comida"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.4)',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        fontSize: '0.9rem',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Añadir Alimento (Buscar, Escanear o Manual) */}
      {showAddModal && (
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
            padding: '1rem',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #1c1c1e)',
              color: 'var(--text-primary, #fff)',
              padding: '2rem',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700' }}>Registrar Alimento</h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
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
                }}
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  padding: '0.8rem',
                  borderRadius: '10px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Acciones principales: Escanear código de barras o Buscar por texto */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowScanner(true);
                }}
                style={{
                  padding: '1rem',
                  background: 'rgba(52, 199, 89, 0.12)',
                  border: '1px solid var(--accent, #34c759)',
                  borderRadius: '14px',
                  color: 'var(--accent, #34c759)',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>📷</span> Escanear Código de Barras
              </button>

              {/* Búsqueda por texto en OpenFoodFacts */}
              <form onSubmit={handleTextSearch} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Buscar en OpenFoodFacts (ej. avena, atún...)"
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
                  marginBottom: '1.5rem',
                  padding: '0.5rem',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #888)', padding: '0.4rem' }}>
                  Selecciona un alimento:
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
                        {prod.calories_100g} kcal / 100g (P: {prod.proteins_100g}g)
                      </div>
                    </div>
                    <span style={{ color: 'var(--accent, #34c759)', fontWeight: 'bold' }}>+</span>
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
                  placeholder="Ej. Pechuga de Pavo, Avena, Yogur..."
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
                      padding: '0.8rem 1rem',
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

              {/* Resumen Calculado de la porción */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #aaa)' }}>
                  Total porción ({currentFormGrams}g):
                </span>
                <span style={{ fontWeight: '800', color: 'var(--accent, #34c759)', fontSize: '1.1rem' }}>
                  {currentFormCalories} kcal
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-secondary, #888)',
                    cursor: 'pointer',
                    fontWeight: '600',
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
                  }}
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Comida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Escáner a pantalla completa */}
      <FullScreenScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanSuccess}
        onManualEntryFallback={(code) => {
          setShowScanner(false);
          setShowAddModal(true);
          triggerFallbackManual(code);
        }}
      />
    </div>
  );
};

export default DailyNutritionCard;
