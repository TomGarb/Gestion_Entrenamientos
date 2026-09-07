import React, { useState, useEffect } from 'react';
import {
  getDailyNutrition,
  deleteFoodLog,
} from '../../services/nutritionService';
import FoodLogModal from './FoodLogModal';

const DailyNutritionCard = ({ onNutritionUpdated }) => {
  const [nutrition, setNutrition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showItemList, setShowItemList] = useState(false);

  useEffect(() => {
    loadDailyNutrition();

    const handleGlobalFoodLogged = () => {
      loadDailyNutrition();
    };
    window.addEventListener('food-logged', handleGlobalFoodLogged);
    return () => window.removeEventListener('food-logged', handleGlobalFoodLogged);
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
          onClick={() => setShowAddModal(true)}
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

      {/* MODAL: Añadir Alimento reutilizable */}
      <FoodLogModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onFoodLogged={loadDailyNutrition}
      />
    </div>
  );
};

export default DailyNutritionCard;
