import React, { useEffect, useRef, useState } from 'react';

/**
 * FullScreenScanner — Modal a pantalla completa (100vw x 100vh) para escanear códigos de barras.
 * Incluye máscara guía central, botón de cierre "X", retroalimentación háptica (vibración),
 * compatibilidad nativa (BarcodeDetector) y fallback dinámico.
 */
const FullScreenScanner = ({ isOpen, onClose, onScanSuccess, onManualEntryFallback }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  const [cameraError, setCameraError] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    setIsInitializing(true);
    setCameraError(null);
    startScanner();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn('Error deteniendo tracks de cámara:', e);
      }
      streamRef.current = null;
    }

    if (html5QrCodeRef.current) {
      try {
        html5QrCodeRef.current.stop().catch(() => {});
      } catch (e) {
        // ignore
      }
      html5QrCodeRef.current = null;
    }
  };

  const triggerVibration = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(200);
      } catch (e) {
        console.warn('Vibration API not allowed or supported', e);
      }
    }
  };

  const handleBarcodeDetected = (code) => {
    if (!code) return;
    const cleanCode = String(code).trim();
    if (!cleanCode) return;

    // 1. Detener cámara de inmediato
    stopCamera();

    // 2. Vibración háptica
    triggerVibration();

    // 3. Notificar al padre con el código capturado
    onScanSuccess(cleanCode);
  };

  const startScanner = async () => {
    try {
      // 1. Intentar API nativa BarcodeDetector (Chrome / Android / Edge)
      if ('BarcodeDetector' in window) {
        const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'];
        const detector = new window.BarcodeDetector({ formats });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsInitializing(false);

          // Bucle de detección nativo optimizado
          const scanLoop = async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) {
              animFrameRef.current = requestAnimationFrame(scanLoop);
              return;
            }

            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const detected = barcodes[0].rawValue;
                handleBarcodeDetected(detected);
                return;
              }
            } catch (err) {
              // frame detection error, continuar bucle
            }

            animFrameRef.current = requestAnimationFrame(scanLoop);
          };

          animFrameRef.current = requestAnimationFrame(scanLoop);
          return;
        }
      }

      // 2. Fallback: cargar html5-qrcode dinámicamente o usar librería
      await loadHtml5QrcodeFallback();
    } catch (err) {
      console.error('Error al iniciar cámara para escaneo:', err);
      setCameraError(
        'No pudimos acceder a la cámara trasera. Comprueba los permisos de tu navegador o ingresa el código manualmente.'
      );
      setIsInitializing(false);
    }
  };

  const loadHtml5QrcodeFallback = async () => {
    // Si la librería ya está en window o importada
    const startHtml5 = (Html5QrcodeClass) => {
      const qrScanner = new Html5QrcodeClass('reader-target');
      html5QrCodeRef.current = qrScanner;
      setIsInitializing(false);

      qrScanner
        .start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleBarcodeDetected(decodedText);
          },
          () => {
            // Ignorar errores por frame no detectado
          }
        )
        .catch((err) => {
          console.error('Error en Html5Qrcode:', err);
          setCameraError('No se pudo iniciar el escáner alternativo. Ingresa el código manualmente.');
        });
    };

    if (window.Html5Qrcode) {
      startHtml5(window.Html5Qrcode);
      return;
    }

    // Inyectar script CDN de html5-qrcode si no existe
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.async = true;
    script.onload = () => {
      if (window.Html5Qrcode) {
        startHtml5(window.Html5Qrcode);
      } else {
        setCameraError('No se pudo cargar el módulo de escáner. Introduce el código manualmente.');
        setIsInitializing(false);
      }
    };
    script.onerror = () => {
      setCameraError('No se pudo cargar el escáner. Puedes introducir el código manualmente.');
      setIsInitializing(false);
    };
    document.body.appendChild(script);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Botón de cierre prominente */}
      <button
        onClick={() => {
          stopCamera();
          onClose();
        }}
        aria-label="Cerrar escáner"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 100000,
          background: 'rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
        }}
      >
        ✕
      </button>

      {/* Video nativo */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1,
        }}
      />

      {/* Contenedor para Html5Qrcode si se usa fallback */}
      <div
        id="reader-target"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      />

      {/* Máscara guía y mirilla de escaneo */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle, transparent 130px, rgba(0, 0, 0, 0.75) 170px, rgba(0, 0, 0, 0.88) 100%)',
        }}
      >
        {/* Recuadro / Mira con esquinas brillantes */}
        <div
          style={{
            width: '260px',
            height: '260px',
            position: 'relative',
            borderRadius: '20px',
            boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Esquinas guía verdes fluorescentes */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '32px',
              height: '32px',
              borderTop: '4px solid var(--accent, #34c759)',
              borderLeft: '4px solid var(--accent, #34c759)',
              borderTopLeftRadius: '16px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '32px',
              height: '32px',
              borderTop: '4px solid var(--accent, #34c759)',
              borderRight: '4px solid var(--accent, #34c759)',
              borderTopRightRadius: '16px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '32px',
              height: '32px',
              borderBottom: '4px solid var(--accent, #34c759)',
              borderLeft: '4px solid var(--accent, #34c759)',
              borderBottomLeftRadius: '16px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '32px',
              height: '32px',
              borderBottom: '4px solid var(--accent, #34c759)',
              borderRight: '4px solid var(--accent, #34c759)',
              borderBottomRightRadius: '16px',
            }}
          />

          {/* Línea láser de escaneo animada */}
          <div
            style={{
              position: 'absolute',
              left: '10px',
              right: '10px',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #34c759, transparent)',
              boxShadow: '0 0 8px #34c759',
              top: '50%',
              animation: 'scannerLaser 2s infinite ease-in-out alternate',
            }}
          />
        </div>

        {/* Texto de instrucción */}
        <p
          style={{
            marginTop: '2rem',
            color: '#ffffff',
            fontSize: '1rem',
            fontWeight: '600',
            textAlign: 'center',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            maxWidth: '280px',
          }}
        >
          {isInitializing
            ? 'Iniciando cámara...'
            : 'Apunta con la cámara al código de barras del producto'}
        </p>
      </div>

      {/* Barra inferior con fallback manual */}
      <div
        style={{
          position: 'absolute',
          bottom: '30px',
          zIndex: 10,
          width: '90%',
          maxWidth: '380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          alignItems: 'center',
        }}
      >
        {cameraError && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.9)',
              color: '#fff',
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              fontSize: '0.85rem',
              textAlign: 'center',
              width: '100%',
              backdropFilter: 'blur(8px)',
            }}
          >
            {cameraError}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            width: '100%',
            background: 'rgba(20, 20, 20, 0.85)',
            padding: '0.5rem',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <input
            type="text"
            placeholder="O escribe el código de barras..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manualCode.trim()) {
                handleBarcodeDetected(manualCode.trim());
              }
            }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#fff',
              padding: '0.5rem 0.8rem',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          <button
            onClick={() => {
              if (manualCode.trim()) {
                handleBarcodeDetected(manualCode.trim());
              }
            }}
            disabled={!manualCode.trim()}
            style={{
              background: manualCode.trim() ? 'var(--accent, #34c759)' : 'rgba(255,255,255,0.1)',
              color: manualCode.trim() ? '#000' : '#888',
              border: 'none',
              borderRadius: '10px',
              padding: '0.5rem 1rem',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: manualCode.trim() ? 'pointer' : 'default',
            }}
          >
            Buscar
          </button>
        </div>

        <button
          onClick={() => {
            stopCamera();
            onClose();
            if (onManualEntryFallback) onManualEntryFallback(manualCode || '');
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.85rem',
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: '0.4rem',
          }}
        >
          Introducir datos de comida manualmente
        </button>
      </div>

      <style>{`
        @keyframes scannerLaser {
          0% { top: 15%; opacity: 0.8; }
          100% { top: 85%; opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default FullScreenScanner;
