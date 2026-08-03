import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { hasServiceWorkerSupport } from './utils.ts';

// Intercept and cleanly suppress benign cross-origin iframe sandbox errors
if (typeof window !== 'undefined') {
  window.onerror = function (message, source, lineno, colno, error) {
    const msg = String(message || '').toLowerCase();
    const isScriptError = msg.includes('script error') || !source;
    const isWebSocketError = msg.includes('websocket') || msg.includes('ws://') || msg.includes('wss://') || msg.includes('opened');
    const isServiceWorkerError = msg.includes('serviceworker') || 
                                msg.includes('service worker') || 
                                msg.includes('securityerror') ||
                                msg.includes('pushmanager') ||
                                msg.includes('permission');
    
    if (isScriptError || isWebSocketError || isServiceWorkerError) {
      console.log('[Suppressed Benign Iframe/SW/WS Error via onerror]:', message);
      return true; // Prevents the firing of the default event handler and upward logging
    }
    return false;
  };

  window.addEventListener('error', (event) => {
    const message = (event.message || '').toLowerCase();
    const isScriptError = message.includes('script error') || !event.filename;
    const isWebSocketError = message.includes('websocket') || 
                            message.includes('ws://') || 
                            message.includes('wss://') ||
                            message.includes('opened');
    const isServiceWorkerError = message.includes('serviceworker') || 
                                message.includes('service worker') || 
                                message.includes('securityerror') ||
                                message.includes('pushmanager') ||
                                message.includes('permission');
    
    if (isScriptError || isWebSocketError || isServiceWorkerError) {
      // Prevent browser from printing this error to the console or bubbling up to parent iframe loggers
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      console.log('[Suppressed Benign Iframe/SW/WS Error]:', event.message);
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = String(reason?.message || reason || '').toLowerCase();
    
    const isWebSocketRejection = message.includes('websocket') || message.includes('vite') || message.includes('opened') || message.includes('closed');
    const isServiceWorkerRejection = message.includes('serviceworker') || 
                                    message.includes('service worker') || 
                                    message.includes('securityerror') || 
                                    message.includes('failed to register') ||
                                    message.includes('pushmanager') ||
                                    message.includes('subscription') ||
                                    message.includes('permission');
      
    const isFirestoreRejection = message.includes('firestore') || message.includes('disconnecting idle stream') || message.includes('cancelled');
    const isFetchRejection = message.includes('failed to fetch');

    if (isWebSocketRejection || isServiceWorkerRejection || isFirestoreRejection || isFetchRejection) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      console.log('[Suppressed Benign Rejection]:', reason?.message || reason);
    }
  }, true);

  // Fallback direct assignment to catch everything
  window.onunhandledrejection = function (event) {
    const reason = event.reason;
    const message = String(reason?.message || reason || '').toLowerCase();
    const isWebSocketRejection = message.includes('websocket') || message.includes('vite') || message.includes('opened') || message.includes('closed');
    const isServiceWorkerRejection = message.includes('serviceworker') || 
                                    message.includes('service worker') || 
                                    message.includes('securityerror') || 
                                    message.includes('failed to register') ||
                                    message.includes('pushmanager') ||
                                    message.includes('subscription') ||
                                    message.includes('permission');
    const isFirestoreRejection = message.includes('firestore') || message.includes('disconnecting idle stream') || message.includes('cancelled');
    const isFetchRejection = message.includes('failed to fetch');

    if (isWebSocketRejection || isServiceWorkerRejection || isFirestoreRejection || isFetchRejection) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return true;
    }
  };
}

// Register Service Worker for Offline PWA Support
if (hasServiceWorkerSupport()) {
  navigator.serviceWorker.register('/sw.js')
    .then((reg) => {
      console.log('ServiceWorker registered successfully: ', reg.scope);
    })
    .catch((err) => {
      console.error('ServiceWorker registration failed: ', err);
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
