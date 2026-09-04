import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { AuthContext } from './AuthContext';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification as apiDeleteNotification
} from '../services/notificationService';

export const NotificationContext = createContext();

const getWsUrl = (token) => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  // Si apiUrl es relativo o absoluto
  let cleanBase = apiUrl.replace(/^http(s)?:\/\//, '');
  cleanBase = cleanBase.replace(/\/+$/, '');
  return `${wsProtocol}//${cleanBase}/api/ws/notifications?token=${encodeURIComponent(token)}`;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user || !user.isAuthenticated) return;
    try {
      const data = await getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  }, [user]);

  // Manejo de WebSocket y Polling de respaldo
  useEffect(() => {
    if (!user || !user.isAuthenticated) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // 1. Carga inicial vía REST
    fetchNotifications();

    // 2. Conexión WebSocket en tiempo real
    let isMounted = true;

    const connectWebSocket = () => {
      const token = localStorage.getItem('token');
      if (!token || !isMounted) return;

      try {
        const wsUrl = getWsUrl(token);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          // Conexión exitosa
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification' && data.notification) {
              setNotifications((prev) => [data.notification, ...prev]);
              setUnreadCount((prev) => prev + 1);
            } else if (data.type === 'unread_count' && typeof data.unread_count === 'number') {
              setUnreadCount(data.unread_count);
            }
          } catch (err) {
            console.error('Error procesando mensaje WebSocket:', err);
          }
        };

        ws.onclose = (event) => {
          if (!isMounted) return;
          // Reconectar automáticamente en 3s si no fue un cierre intencional
          if (event.code !== 1000 && event.code !== 1008) {
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
          }
        };

        ws.onerror = () => {
          // Error silencioso, el polling de respaldo mantendrá los datos al día
        };
      } catch (err) {
        console.error('Error al inicializar WebSocket:', err);
      }
    };

    connectWebSocket();

    // 3. Polling de respaldo cada 30 segundos
    const interval = setInterval(fetchNotifications, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await apiDeleteNotification(id);
      const target = notifications.find(n => n.id === id);
      if (target && !target.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error eliminando notificación:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

