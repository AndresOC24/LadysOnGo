// driver-trip.js - Sistema para conductoras
import tripManager from '../lib/firebase.js';

class DriverTripManager {
  constructor() {
    this.isOnline = false;
    this.driverId = null;
    this.tripsListener = null;
    this.availableTrips = [];
    this.currentTrip = null;
  }

  // Inicializar sistema de conductora
  async init() {
    this.driverId = this.generateDriverId();
    this.setupEventListeners();
    this.setupNotificationPermission();
    console.log('🚗 Sistema de conductora inicializado');
  }

  // Generar ID único para conductora
  generateDriverId() {
    return 'driver_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Configurar event listeners
  setupEventListeners() {
    const toggleBtn = document.getElementById('toggle-online-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleOnlineStatus());
    }
  }

  // Solicitar permisos de notificación
  async setupNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('✅ Permisos de notificación concedidos');
      }
    }
  }

  // Alternar estado online/offline
  async toggleOnlineStatus() {
    try {
      if (!this.isOnline) {
        await this.goOnline();
      } else {
        await this.goOffline();
      }
    } catch (error) {
      console.error('❌ Error cambiando estado:', error);
      this.showToast('❌ Error al cambiar estado', 'error');
    }
  }

  // Poner conductora online
  async goOnline() {
    try {
      this.showLoadingToast('Conectando...');

      const driverData = {
        id: this.driverId,
        name: 'Ana García', // Puedes obtener esto de un formulario
        vehicle: 'Toyota Corolla - ABC123',
        phone: '+591 70987654',
        rating: 4.8
      };

      const location = await tripManager.setDriverOnline(driverData);
      
      this.isOnline = true;
      this.updateUI();
      this.startListeningForTrips();
      
      this.hideLoadingToast();
      this.showToast('✅ ¡Online! Esperando viajes...', 'success');
      
      console.log('✅ Conductora online en:', location);
    } catch (error) {
      this.hideLoadingToast();
      throw error;
    }
  }

  // Poner conductora offline
  async goOffline() {
    try {
      await tripManager.setDriverOffline(this.driverId);
      
      this.isOnline = false;
      this.stopListeningForTrips();
      this.updateUI();
      
      this.showToast('⏹️ Desconectada', 'info');
      console.log('⏹️ Conductora offline');
    } catch (error) {
      throw error;
    }
  }

  // Actualizar interfaz según estado
  updateUI() {
    const toggleBtn = document.getElementById('toggle-online-btn');
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');

    if (toggleBtn) {
      if (this.isOnline) {
        toggleBtn.textContent = 'Desconectar';
        toggleBtn.className = 'px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium';
      } else {
        toggleBtn.textContent = 'Conectar';
        toggleBtn.className = 'px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium';
      }
    }

    if (statusText) {
      statusText.textContent = this.isOnline ? 'En línea' : 'Desconectada';
    }

    if (statusDot) {
      statusDot.className = this.isOnline ? 'status-dot online' : 'status-dot offline';
    }
  }

  // Comenzar a escuchar viajes
  startListeningForTrips() {
    this.tripsListener = tripManager.listenForPendingTrips((trips) => {
      console.log('📱 Viajes disponibles:', trips.length);
      
      // Detectar nuevos viajes
      const newTrips = trips.filter(trip => 
        !this.availableTrips.find(existing => existing.id === trip.id)
      );

      if (newTrips.length > 0) {
        newTrips.forEach(trip => this.showTripNotification(trip));
      }

      this.availableTrips = trips;
      this.updateTripsDisplay();
    });
  }

  // Dejar de escuchar viajes
  stopListeningForTrips() {
    if (this.tripsListener) {
      this.tripsListener();
      this.tripsListener = null;
    }
    this.availableTrips = [];
    this.updateTripsDisplay();
  }

  // Mostrar notificación de nuevo viaje
  showTripNotification(trip) {
    // Notificación del navegador
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('🚗 ¡Nuevo viaje disponible!', {
        body: `Viaje hacia: ${trip.destination}\nTarifa estimada: ${trip.estimatedFare}`,
        icon: '/images/logo_sin_fondo.png',
        badge: '/images/logo_sin_fondo.png',
        tag: 'trip-' + trip.id,
        requireInteraction: true,
        actions: [
          { action: 'accept', title: 'Aceptar' },
          { action: 'decline', title: 'Rechazar' }
        ]
      });

      notification.onclick = () => {
        this.showTripModal(trip);
        notification.close();
      };

      // Auto cerrar después de 10 segundos
      setTimeout(() => notification.close(), 10000);
    }

    // Modal en la aplicación
    this.showTripModal(trip);
    
    // Sonido de notificación (opcional)
    this.playNotificationSound();
  }

  // Mostrar modal de viaje
  showTripModal(trip) {
    const distance = this.calculateDistance(trip.passenger.location);
    const timeAgo = this.getTimeAgo(trip.timestamp);

    this.showModal(`
      <div class="bg-white rounded-lg p-6 max-w-md mx-auto">
        <div class="text-center mb-4">
          <div class="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <span class="text-white text-2xl">🚗</span>
          </div>
          <h3 class="text-xl font-bold text-gray-900">¡Nuevo Viaje!</h3>
        </div>
        
        <div class="space-y-3 mb-6">
          <div class="bg-gray-50 rounded-lg p-3">
            <p class="text-sm text-gray-600">👤 Pasajera:</p>
            <p class="font-medium">${trip.passenger.name}</p>
          </div>
          
          <div class="bg-gray-50 rounded-lg p-3">
            <p class="text-sm text-gray-600">📍 Destino:</p>
            <p class="font-medium">${trip.destination}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-gray-50 rounded-lg p-3 text-center">
              <p class="text-sm text-gray-600">💰 Tarifa</p>
              <p class="font-bold text-lg text-green-600">${trip.estimatedFare}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3 text-center">
              <p class="text-sm text-gray-600">📏 Distancia</p>
              <p class="font-bold text-lg text-blue-600">${distance}km</p>
            </div>
          </div>
          
          <div class="bg-gray-50 rounded-lg p-3">
            <p class="text-sm text-gray-600">⏰ Solicitado:</p>
            <p class="font-medium">${timeAgo}</p>
          </div>
        </div>
        
        <div class="flex space-x-3">
          <button 
            onclick="driverTrip.acceptTrip('${trip.id}')" 
            class="flex-1 bg-green-500 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-600 transition-colors"
          >
            ✅ Aceptar
          </button>
          <button 
            onclick="driverTrip.declineTrip('${trip.id}')" 
            class="flex-1 bg-red-500 text-white py-3 rounded-lg font-bold text-lg hover:bg-red-600 transition-colors"
          >
            ❌ Rechazar
          </button>
        </div>
        
        <p class="text-xs text-gray-500 text-center mt-3">
          Esta solicitud expirará automáticamente en 30 segundos
        </p>
      </div>
    `, 30000); // Auto cerrar en 30 segundos
  }

  // Aceptar viaje
  async acceptTrip(tripId) {
    try {
      this.hideModal();
      this.showLoadingToast('Aceptando viaje...');

      const driverData = {
        id: this.driverId,
        name: 'Ana García',
        vehicle: 'Toyota Corolla - ABC123',
        phone: '+591 70987654'
      };

      const driverLocation = await tripManager.acceptTrip(tripId, driverData);
      
      this.hideLoadingToast();
      this.showToast('🎉 ¡Viaje aceptado!', 'success');
      
      // Actualizar estadísticas (opcional)
      this.updateStats();
      
      console.log('✅ Viaje aceptado:', tripId);
    } catch (error) {
      this.hideLoadingToast();
      console.error('❌ Error aceptando viaje:', error);
      this.showToast('❌ Error al aceptar viaje', 'error');
    }
  }

  // Rechazar viaje
  declineTrip(tripId) {
    this.hideModal();
    this.showToast('❌ Viaje rechazado', 'info');
    console.log('❌ Viaje rechazado:', tripId);
  }

  // Calcular distancia aproximada (simulada)
  calculateDistance(passengerLocation) {
    // Simulación de distancia entre 1-8 km
    return (Math.random() * 7 + 1).toFixed(1);
  }

  // Obtener tiempo transcurrido
  getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Hace menos de 1 minuto';
    if (minutes === 1) return 'Hace 1 minuto';
    return `Hace ${minutes} minutos`;
  }

  // Actualizar display de viajes
  updateTripsDisplay() {
    const container = document.getElementById('available-rides');
    if (!container) return;

    if (this.availableTrips.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p>${this.isOnline ? 'No hay viajes disponibles' : 'Conecta para recibir viajes'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.availableTrips.map(trip => `
      <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-3">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h4 class="font-medium text-gray-900">${trip.passenger.name}</h4>
            <p class="text-sm text-gray-600">${trip.destination}</p>
          </div>
          <span class="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded">
            ${trip.estimatedFare}
          </span>
        </div>
        
        <div class="flex justify-between items-center">
          <span class="text-xs text-gray-500">${this.getTimeAgo(trip.timestamp)}</span>
          <button 
            onclick="driverTrip.showTripModal(${JSON.stringify(trip).replace(/"/g, '&quot;')})"
            class="bg-pink-500 text-white px-3 py-1 rounded text-sm font-medium hover:bg-pink-600 transition-colors"
          >
            Ver Detalles
          </button>
        </div>
      </div>
    `).join('');
  }

  // Reproducir sonido de notificación
  playNotificationSound() {
    try {
      // Crear sonido usando Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('No se pudo reproducir sonido de notificación');
    }
  }

  // Actualizar estadísticas
  updateStats() {
    const tripsElement = document.getElementById('trips-completed');
    const earningsElement = document.getElementById('earnings-today');
    
    if (tripsElement) {
      const current = parseInt(tripsElement.textContent) || 0;
      tripsElement.textContent = current + 1;
    }
    
    if (earningsElement) {
      const current = parseInt(earningsElement.textContent.replace('$', '')) || 0;
      const newEarnings = current + Math.floor(Math.random() * 25) + 15;
      earningsElement.textContent = `${newEarnings}`;
    }
  }

  // Utilitarios para UI
  showModal(content, autoCloseMs = null) {
    const existingModal = document.getElementById('trip-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'trip-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = content;
    document.body.appendChild(modal);

    // Auto cerrar si se especifica tiempo
    if (autoCloseMs) {
      setTimeout(() => {
        if (document.getElementById('trip-modal')) {
          this.hideModal();
        }
      }, autoCloseMs);
    }
  }

  hideModal() {
    const modal = document.getElementById('trip-modal');
    if (modal) {
      modal.remove();
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      info: 'bg-blue-500'
    };
    
    toast.className = `fixed top-4 right-4 ${colors[type]} text-white px-4 py-2 rounded-lg shadow-lg z-50 transform transition-all duration-300`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-x-full');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  showLoadingToast(message) {
    const toast = document.createElement('div');
    toast.id = 'loading-toast';
    toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2';
    toast.innerHTML = `
      <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
      <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
  }

  hideLoadingToast() {
    const toast = document.getElementById('loading-toast');
    if (toast) {
      toast.remove();
    }
  }
}

// Crear instancia global
const driverTrip = new DriverTripManager();

// Inicializar cuando se cargue la página
document.addEventListener('DOMContentLoaded', () => {
  driverTrip.init();
});

// Hacer disponible globalmente para uso en botones
window.driverTrip = driverTrip;

export default driverTrip;