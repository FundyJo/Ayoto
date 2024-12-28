import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaInfoCircle } from 'react-icons/fa'; // Importiere das Info-Icon

// Funktion, um eine eindeutige ID zu generieren
//const generateUniqueId = () => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// FadeIn- und FadeOut-Animationen für Benachrichtigungen
const fadeIn = keyframes`
    0% {
        opacity: 0;
        transform: translateY(10px);
    }
    100% {
        opacity: 1;
        transform: translateY(0);
    }
`;

const fadeOut = keyframes`
    0% {
        opacity: 1;
        transform: translateY(0);
    }
    90% {
        opacity: 0.2;
        transform: translateY(5px);
    }
    100% {
        opacity: 0;
        transform: translateY(10px);
    }
`;

// Styled-Component für das Overlay, das oben rechts angezeigt wird
const Overlay = styled.div`
    font-size: 0.85rem;
    animation: ${fadeIn} 0.5s ease-in-out; /* FadeIn-Animation */
    position: fixed;
    top: 20px; /* Abstand vom oberen Rand */
    right: 20px; /* Abstand vom rechten Rand */
    background: rgba(0, 0, 0, 0); /* Der Hintergrund bleibt halbtransparent */
    display: flex;
    flex-direction: column;
    align-items: flex-end; /* Position der Benachrichtigungen rechts */
    z-index: 10000; /* Sehr hoher Z-Index, damit es über anderen Inhalten bleibt */
    max-width: 320px;
    padding: 10px;
    box-sizing: border-box;
`;

// Benachrichtigung-Stil
const Notification = styled.div`
    background-color: rgba(51, 51, 51, 0.9); /* Durchsichtiger Hintergrund */
    color: white;
    padding: 12px;
    margin: 5px 0;
    border-radius: 8px;
    border: 1px solid #444;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: opacity 0.3s ease, transform 0.3s ease;
    width: 100%;
    max-width: 280px;
    font-size: 1rem;
    line-height: 1.4;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: ${fadeIn} 0.5s ease-in-out; /* FadeIn für das erste Erscheinen */

    &.fade-out {
        animation: ${fadeOut} 2s ease-out forwards; /* Langsame fade-out-Animation */
    }
`;

const InfoIcon = styled(FaInfoCircle)`
    color: #4f8fd1; /* Blaues Info-Symbol */
    font-size: 1.2rem;
`;

// Benachrichtigungstyp
interface NotificationType {
  id: string;
  message: string;
  duration: number; // In Millisekunden
  timestamp: number; // Zeitstempel für die Benachrichtigungserstellung
  fadeOut?: boolean; // Optional property to track the fade-out state
}

const NotificationTray: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  // Funktion zum Hinzufügen einer Benachrichtigung
  //const addNotification = (message: string, duration: number) => {
  //  const id = generateUniqueId(); // Generiere eine eindeutige ID
  //  const timestamp = Date.now();
  //  const newNotification: NotificationType = { id, message, duration, timestamp };
  //
  //  // Speichere die Benachrichtigung im localStorage
  //  const storedNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
  //  storedNotifications.push(newNotification);
  //  localStorage.setItem('notifications', JSON.stringify(storedNotifications));
  //
  //  setNotifications((prev) => [...prev, { ...newNotification, fadeOut: false }]);
  //
  //  // Entferne die Benachrichtigung nach der angegebenen Dauer
  //  setTimeout(() => {
  //    removeNotification(id);
  //  }, duration);
  //};

  // Funktion zum Entfernen einer Benachrichtigung
  //const removeNotification = (id: string) => {
  //  setNotifications((prev) => {
  //    setTimeout(() => { // Delay actual removal to allow fade-out animation
  //      setNotifications((current) => current.filter((n) => n.id !== id));
  //    }, 2000); // Match fade-out animation duration (2s)
  //    return prev.map((n) => (n.id === id ? { ...n, fadeOut: true } : n));
  //  });
  //
  //  // Entferne aus localStorage
  //  const storedNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
  //  const updatedNotifications = storedNotifications.filter((n: NotificationType) => n.id !== id);
  //  localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  //};

  // Alle Benachrichtigungen beim Laden der Seite überprüfen
  const removeExpiredNotifications = () => {
    const now = Date.now();
    const storedNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');

    // Filtere abgelaufene Benachrichtigungen
    const activeNotifications = storedNotifications.filter((n: NotificationType) => now - n.timestamp < n.duration);

    // Speichern der aktiven Benachrichtigungen
    localStorage.setItem('notifications', JSON.stringify(activeNotifications));
    setNotifications(activeNotifications);
  };

  useEffect(() => {
    // Laden der gespeicherten Benachrichtigungen bei Komponenten-Mount
    removeExpiredNotifications();

    // Beispiel-Benachrichtigungen
    //addNotification('Keine Episoden bei Aniworld gefunden, es wird zu Animecloud gewechselt', 5000); // 5 Sekunden

    // Optional: Intervall um abgelaufene Benachrichtigungen zu entfernen
    const interval = setInterval(removeExpiredNotifications, 1000);

    return () => clearInterval(interval); // Bereinigen des Intervals
  }, []);

  return (
    <Overlay>
      {notifications.map((notification) => (
        <Notification
          key={notification.id} // Verwende die generierte eindeutige ID als key
          className={notifications.find(n => n.id === notification.id)?.fadeOut ? 'fade-out' : ''}
        >
          <InfoIcon />
          {notification.message}
        </Notification>
      ))}
    </Overlay>
  );
};

export default NotificationTray;
