// public/javascript-driver.js - Sistema de viajes para conductoras (CORREGIDO)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getDatabase, ref, onValue, off, update } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzgSyBlq49zL5txrqrWKwDI3avRqD80ST-Go",
  authDomain: "ladysongo.firebaseapp.com",
  databaseURL: "https://ladysongo-default-rtdb.firebaseio.com",
  projectId: "ladysongo",
  storageBucket: "ladysongo.firebasestorage.app",
  messagingSenderId: "35749846402",
  appId: "1:35749846402:web:ac39ac2d4adc27e1675237"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Variables globales del mapa
let map;
let currentLocationMarker = null;
let isDriverOnline = false;

// Driver Trip Manager
class DriverTripManager {
  constructor() {
    this.isOnline = false;
    this.driverId = null;
    this.tripsListener = null;
    this.availableTrips = [];
    this.currentTrip = null;
    this.startTime = null;
    this.statsInterval = null;
  }

  async init() {
    this.driverId = this.generateDriverId();
    this.initMap();
    this.setupEventListeners();
    this.setupNotificationPermission();
    console.log('🚗 Sistema de conductora inicializado');
    console.log('📱 Driver ID:', this.driverId);
  }

  generateDriverId() {
    return 'driver_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  initMap() {
    // Verificar si Leaflet está disponible
    if (typeof L === 'undefined') {
      console.error('❌ Leaflet no está cargado');
      return;
    }

    map = L.map('map', {
      zoomControl: false
    }).setView([-17.783333, -63.182222], 13); // Santa Cruz de la Sierra

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    console.log('🗺️ Mapa inicializado para conductora');
  }

  generateSimulatedLocation() {
    const santaCruzLat = -17.7833;
    const santaCruzLng = -63.1821;
    
    const randomLat = santaCruzLat + (Math.random() - 0.5) * 0.05;
    const randomLng = santaCruzLng + (Math.random() - 0.5) * 0.05;
    
    return { lat: randomLat, lng: randomLng };
  }

  setupEventListeners() {
    const toggleBtn = document.getElementById('toggleStatusBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleOnlineStatus());
    }

    // Funciones globales para los botones del mapa
    window.toggleDriverStatus = () => this.toggleOnlineStatus();
    window.zoomIn = () => {
      if (map) map.zoomIn();
    };
    window.zoomOut = () => {
      if (map) map.zoomOut();
    };
    window.centerToMyLocation = () => this.centerToMyLocation();
    window.refreshRides = () => this.manualRefresh();
  }

  async setupNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('✅ Permisos de notificación concedidos');
      }
    }
  }

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

  async goOnline() {
    try {
      this.showToast('Conectando...', 'info');

      const driverLocation = this.generateSimulatedLocation();
      
      // Actualizar mapa con ubicación de conductora
      if (map) {
        map.setView([driverLocation.lat, driverLocation.lng], 15);
        
        if (currentLocationMarker) {
          map.removeLayer(currentLocationMarker);
        }
        
        currentLocationMarker = L.marker([driverLocation.lat, driverLocation.lng], {
          icon: this.createDriverIcon()
        }).addTo(map).bindPopup('🚗 Tu ubicación');
      }

      const driverData = {
        id: this.driverId,
        name: 'Ana García',
        vehicle: 'Toyota Corolla - ABC123',
        phone: '+591 70987654',
        location: driverLocation,
        status: 'online',
        lastSeen: Date.now()
      };

      await update(ref(database, `drivers/${this.driverId}`), driverData);
      
      this.isOnline = true;
      isDriverOnline = true;
      this.startTime = Date.now();
      this.updateUI();
      this.startListeningForTrips();
      this.startStatsTimer();
      
      this.showToast('✅ ¡Online! Esperando viajes...', 'success');
      
      console.log('✅ Conductora online en:', driverLocation);
    } catch (error) {
      console.error('❌ Error en goOnline:', error);
      this.showToast('❌ Error al conectar', 'error');
    }
  }

  async goOffline() {
    try {
      await update(ref(database, `drivers/${this.driverId}`), {
        status: 'offline',
        lastSeen: Date.now()
      });
      
      this.isOnline = false;
      isDriverOnline = false;
      this.stopListeningForTrips();
      this.stopStatsTimer();
      this.updateUI();
      
      if (currentLocationMarker && map) {
        map.removeLayer(currentLocationMarker);
        currentLocationMarker = null;
      }
      
      this.showToast('⏹️ Desconectada', 'info');
      console.log('⏹️ Conductora offline');
    } catch (error) {
      console.error('❌ Error en goOffline:', error);
    }
  }

  createDriverIcon() {
    return L.divIcon({
      html: `
        <div style="
          width: 30px;
          height: 30px;
          background: #059669;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: bold;
        ">🚗</div>
      `,
      className: 'driver-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  }

  updateUI() {
    const toggleBtn = document.getElementById('toggleStatusBtn');
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('driverStatus');
    const statusFab = document.getElementById('driverStatusFab');
    const statusFabText = document.getElementById('statusFabText');

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

    if (statusFab) {
      statusFab.className = this.isOnline ? 'driver-status-button absolute right-4 bottom-24 online' : 'driver-status-button absolute right-4 bottom-24';
    }

    if (statusFabText) {
      statusFabText.textContent = this.isOnline ? 'ON' : 'OFF';
    }
  }

  startListeningForTrips() {
    console.log('📡 Iniciando escucha de viajes...');
    const tripsRef = ref(database, 'trips');
    
    this.tripsListener = onValue(tripsRef, (snapshot) => {
      const trips = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach(key => {
          if (data[key].status === 'pending') {
            trips.push({
              id: key,
              ...data[key]
            });
          }
        });
      }
      
      console.log('📱 Viajes encontrados:', trips.length);
      
      // Detectar nuevos viajes
      const newTrips = trips.filter(trip => 
        !this.availableTrips.find(existing => existing.id === trip.id)
      );

      if (newTrips.length > 0) {
        console.log('🆕 Nuevos viajes detectados:', newTrips.length);
        newTrips.forEach(trip => {
          console.log('📢 Mostrando notificación para viaje:', trip.id);
          this.showTripNotification(trip);
        });
      }

      this.availableTrips = trips;
      this.updateTripsDisplay();
    }, (error) => {
      console.error('❌ Error escuchando viajes:', error);
    });
  }

  stopListeningForTrips() {
    if (this.tripsListener) {
      console.log('⏹️ Deteniendo escucha de viajes...');
      off(ref(database, 'trips'), 'value', this.tripsListener);
      this.tripsListener = null;
    }
    this.availableTrips = [];
    this.updateTripsDisplay();
  }

  showTripNotification(trip) {
    console.log('🔔 Mostrando notificación para viaje:', trip);
    
    // Notificación del navegador
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('🚗 ¡Nuevo viaje disponible!', {
        body: `Viaje hacia: ${trip.destination}\nTarifa estimada: $${trip.estimatedFare}`,
        icon: '/images/logo_sin_fondo.png',
        tag: 'trip-' + trip.id,
        requireInteraction: true
      });

      notification.onclick = () => {
        this.showTripModal(trip);
        notification.close();
        window.focus();
      };

      setTimeout(() => notification.close(), 15000);
    }

    // Modal en la aplicación - SIEMPRE mostrar
    setTimeout(() => {
      this.showTripModal(trip);
    }, 500);
    
    this.playNotificationSound();
  }

  showTripModal(trip) {
    console.log('📱 Mostrando modal para viaje:', trip.id);
    const distance = this.calculateDistance();
    const timeAgo = this.getTimeAgo(trip.timestamp);

    // Crear el modal con funciones inline para evitar problemas de scope
    const modalHTML = `
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
              <p class="font-bold text-lg text-green-600">$${trip.estimatedFare}</p>
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
            id="accept-trip-btn" 
            data-trip-id="${trip.id}"
            class="flex-1 bg-green-500 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-600 transition-colors"
          >
            ✅ Aceptar
          </button>
          <button 
            id="decline-trip-btn"
            data-trip-id="${trip.id}" 
            class="flex-1 bg-red-500 text-white py-3 rounded-lg font-bold text-lg hover:bg-red-600 transition-colors"
          >
            ❌ Rechazar
          </button>
        </div>
        
        <p class="text-xs text-gray-500 text-center mt-3">
          Esta solicitud expirará automáticamente en 30 segundos
        </p>
      </div>
    `;

    this.showModal(modalHTML, 30000);

    // Agregar event listeners después de crear el modal
    setTimeout(() => {
      const acceptBtn = document.getElementById('accept-trip-btn');
      const declineBtn = document.getElementById('decline-trip-btn');

      if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
          const tripId = acceptBtn.getAttribute('data-trip-id');
          console.log('✅ Intentando aceptar viaje:', tripId);
          this.acceptTrip(tripId);
        });
      }

      if (declineBtn) {
        declineBtn.addEventListener('click', () => {
          const tripId = declineBtn.getAttribute('data-trip-id');
          console.log('❌ Rechazando viaje:', tripId);
          this.declineTrip(tripId);
        });
      }
    }, 100);
  }

  async acceptTrip(tripId) {
    console.log('✅ Iniciando aceptación de viaje:', tripId);
    try {
      this.hideModal();
      this.showToast('Aceptando viaje...', 'info');

      const driverLocation = this.generateSimulatedLocation();
      
      const updates = {
        [`trips/${tripId}/status`]: 'accepted',
        [`trips/${tripId}/driver`]: {
          name: 'Ana García',
          vehicle: 'Toyota Corolla - ABC123',
          phone: '+591 70987654',
          location: driverLocation,
          id: this.driverId
        },
        [`trips/${tripId}/acceptedAt`]: Date.now()
      };

      console.log('📝 Actualizando Firebase con:', updates);
      await update(ref(database), updates);
      
      this.showToast('🎉 ¡Viaje aceptado!', 'success');
      this.updateStats();
      
      console.log('✅ Viaje aceptado exitosamente:', tripId);
    } catch (error) {
      console.error('❌ Error aceptando viaje:', error);
      this.showToast('❌ Error al aceptar viaje: ' + error.message, 'error');
    }
  }

  declineTrip(tripId) {
    console.log('❌ Rechazando viaje:', tripId);
    this.hideModal();
    this.showToast('❌ Viaje rechazado', 'info');
  }

  calculateDistance() {
    return (Math.random() * 7 + 1).toFixed(1);
  }

  getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Hace menos de 1 minuto';
    if (minutes === 1) return 'Hace 1 minuto';
    return `Hace ${minutes} minutos`;
  }

  updateTripsDisplay() {
    const container = document.getElementById('availableRides');
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
            $${trip.estimatedFare}
          </span>
        </div>
        
        <div class="flex justify-between items-center">
          <span class="text-xs text-gray-500">${this.getTimeAgo(trip.timestamp)}</span>
          <button 
            onclick="window.driverTrip.showTripModal(${JSON.stringify(trip).replace(/"/g, '&quot;')})"
            class="bg-pink-500 text-white px-3 py-1 rounded text-sm font-medium hover:bg-pink-600 transition-colors"
          >
            Ver Detalles
          </button>
        </div>
      </div>
    `).join('');
  }

  playNotificationSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('No se pudo reproducir sonido de notificación');
    }
  }

  updateStats() {
    const tripsElement = document.getElementById('tripsToday');
    const earningsElement = document.getElementById('earningsToday');
    
    if (tripsElement) {
      const current = parseInt(tripsElement.textContent) || 0;
      tripsElement.textContent = current + 1;
    }
    
    if (earningsElement) {
      const current = parseInt(earningsElement.textContent.replace('$', '')) || 0;
      const newEarnings = current + Math.floor(Math.random() * 25) + 15;
      earningsElement.textContent = `$${newEarnings}`;
    }
  }

  startStatsTimer() {
    this.statsInterval = setInterval(() => {
      if (this.startTime) {
        const now = Date.now();
        const diffHours = (now - this.startTime) / (1000 * 60 * 60);
        const hoursElement = document.getElementById('onlineTime');
        if (hoursElement) {
          hoursElement.textContent = `${diffHours.toFixed(1)}h`;
        }
      }
    }, 60000); // Actualizar cada minuto
  }

  stopStatsTimer() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  centerToMyLocation() {
    if (currentLocationMarker && map) {
      const latlng = currentLocationMarker.getLatLng();
      map.setView(latlng, 16);
    } else {
      this.showToast('ℹ️ Conecta primero para ver tu ubicación', 'info');
    }
  }

  manualRefresh() {
    if (this.isOnline) {
      this.showToast('🔄 Actualizando lista de viajes...', 'info');
      // La actualización ya se hace automáticamente con Firebase
    } else {
      this.showToast('ℹ️ Conecta para ver viajes disponibles', 'info');
    }
  }

  showModal(content, autoCloseMs = null) {
    console.log('📱 Creando modal...');
    const existingModal = document.getElementById('trip-modal');
    if (existingModal) {
      console.log('🗑️ Eliminando modal existente');
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'trip-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = content;
    document.body.appendChild(modal);
    console.log('✅ Modal creado y agregado al DOM');

    if (autoCloseMs) {
      setTimeout(() => {
        if (document.getElementById('trip-modal')) {
          console.log('⏰ Auto-cerrando modal por timeout');
          this.hideModal();
        }
      }, autoCloseMs);
    }
  }

  hideModal() {
    console.log('❌ Ocultando modal...');
    const modal = document.getElementById('trip-modal');
    if (modal) {
      modal.remove();
      console.log('✅ Modal eliminado');
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
}

// Inicializar sistema de conductora
const driverTrip = new DriverTripManager();
window.driverTrip = driverTrip;

// Función global para debug
window.testModal = () => {
  console.log('🧪 Probando modal...');
  driverTrip.showModal(`
    <div class="bg-white rounded-lg p-6 max-w-md mx-auto">
      <h3 class="text-lg font-bold mb-4">Modal de Prueba</h3>
      <p>Este es un modal de prueba para verificar que funciona.</p>
      <button onclick="window.driverTrip.hideModal()" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
        Cerrar
      </button>
    </div>
  `);
};

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Inicializando sistema de conductora...');
  driverTrip.init();
});

console.log('📜 JavaScript de conductora cargado');