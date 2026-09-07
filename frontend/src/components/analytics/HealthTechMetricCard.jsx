import React from 'react';

/**
 * HealthTechMetricCard
 * Componente de tarjeta de métrica con diseño "Premium Health-Tech".
 * Soporta Neón Dark Mode (con glow emisivo) y Clean Light Mode (sombras difusas).
 *
 * @param {string} title - Encabezado en mayúsculas (ej. "CALORÍAS ACTIVAS")
 * @param {string|number} value - Número gigante de la métrica (ej. "1,420" o "30")
 * @param {string} unit - Unidad de medida (ej. "KCAL", "LBS", "KG")
 * @param {'crimson'|'electric'} [variant='crimson'] - Variante de color de acento
 * @param {number} [progress=75] - Progreso en porcentaje (0 - 100) para el anillo circular
 * @param {string} [subtitle] - Texto explicativo o meta (ej. "+14% vs. semana anterior")
 * @param {React.ReactNode} [icon] - Ícono superior
 */
const HealthTechMetricCard = ({
  title = "CALORÍAS ACTIVAS",
  value = "1,420",
  unit = "KCAL",
  variant = "crimson",
  progress = 78,
  subtitle = "Meta diaria: 1,800 KCAL (78%)",
  icon,
}) => {
  const isCrimson = variant === 'crimson';
  
  // Colores directos por variable CSS
  const accentColor = isCrimson ? 'var(--accent-crimson)' : 'var(--accent-electric)';
  const accentGlowCard = isCrimson ? 'var(--glow-crimson-card)' : 'var(--glow-electric-card)';
  const accentBgSubtle = isCrimson ? 'var(--accent-crimson-bg)' : 'var(--accent-electric-bg)';

  // Geometría para el Anillo de Progreso Circular
  const size = 80;
  const strokeWidth = 8;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const safeProgress = Math.min(Math.max(progress, 0), 100);
  const strokeDashoffset = circumference - (safeProgress / 100) * circumference;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '24px',
        padding: '1.75rem',
        border: '1px solid var(--border-line)',
        boxShadow: accentGlowCard,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* 🔮 Luz ambiental de fondo (Subtle Ambient Glow en Dark Mode) */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: accentColor,
          filter: 'blur(50px)',
          opacity: 0.12,
          pointerEvents: 'none',
        }}
      />

      {/* Header: Categoría en mayúsculas pequeñas e Ícono */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-secondary)',
          }}
        >
          {title}
        </span>

        {/* Ícono de Estado o Píldora */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            backgroundColor: accentBgSubtle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accentColor,
            flexShrink: 0,
          }}
        >
          {icon || (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {isCrimson ? (
                /* Ícono de Llama / Esfuerzo */
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              ) : (
                /* Ícono de Rayo / Energía Eléctrica */
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              )}
            </svg>
          )}
        </div>
      </div>

      {/* Cuerpo Central: Métrica Gigante + Anillo Circular Grueso */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          margin: '0.5rem 0 1.25rem 0',
        }}
      >
        {/* Número Gigante */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '3.25rem',
              fontWeight: '900',
              lineHeight: 1,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
          >
            {value}
          </span>
          <span
            style={{
              fontSize: '0.95rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              letterSpacing: '0.04em',
            }}
          >
            {unit}
          </span>
        </div>

        {/* Anillo de Progreso Circular SVG */}
        <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            {/* Pista de Fondo */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="var(--border-line)"
              strokeWidth={strokeWidth}
            />
            {/* Anillo de Progreso con bordes redondeados y Glow */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={accentColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: `drop-shadow(0 0 6px ${accentColor})`,
              }}
            />
          </svg>
          {/* Porcentaje en el centro */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.78rem',
              fontWeight: '800',
              color: 'var(--text-primary)',
            }}
          >
            {safeProgress}%
          </div>
        </div>
      </div>

      {/* Barra de Progreso Lineal Gruesa */}
      <div style={{ marginTop: 'auto' }}>
        <div
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '9999px',
            backgroundColor: 'var(--border-line)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${safeProgress}%`,
              height: '100%',
              borderRadius: '9999px',
              backgroundColor: accentColor,
              boxShadow: isCrimson ? '0 0 10px rgba(255, 42, 85, 0.6)' : '0 0 10px rgba(0, 212, 255, 0.6)',
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>

        {/* Subtítulo / Comparativa */}
        {subtitle && (
          <p
            style={{
              margin: '0.75rem 0 0 0',
              fontSize: '0.8rem',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: accentColor }} />
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default HealthTechMetricCard;
