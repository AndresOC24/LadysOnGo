// public/javascript-passenger.js - Sistema completo para pasajeras
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getDatabase, ref, push, onValue, off, update } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js';

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

// Clase para manejar viajes de pasajeras con seguimiento en tiempo real
class PassengerTripManager {
  constructor() {
    this.currentTrip = null;
    this.tripListener = null;
    this.driverLocationListener = null;
    this.map = null;
    this.passengerMarker = null;
    this.driverMarker = null;
    this.routeLine = null;
    this.estimatedTime = null;
  }

  async init() {
    this.setupMenuFunctionality();
    await this.initMap();
    this.setupEventListeners();
    console.log('🚗 Sistema de pasajera inicializado');
  }

  // Funcionalidad del menú existente
  setupMenuFunctionality() {
    const menuButton = document.getElementById('menuButton');
    const slideMenu = document.getElementById('slideMenu');
    const menuOverlay = document.getElementById('menuOverlay');

    const openMenu = () => {
      if (slideMenu && menuOverlay) {
        slideMenu.classList.add('active');
        menuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    };

    const closeMenu = () => {
      if (slideMenu && menuOverlay) {
        slideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
      }
    };

    if (menuButton) menuButton.addEventListener('click', openMenu);
    if (menuOverlay) menuOverlay.addEventListener('click', closeMenu);

    // Cerrar menú con tecla Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && slideMenu?.classList.contains('active')) {
        closeMenu();
      }
    });

    // Manejar click en los elementos del menú
    const menuItems = document.querySelectorAll('.slide-menu a');
    menuItems.forEach(item => {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        const text = this.querySelector('span')?.textContent;
        console.log('Navegando a:', text);
        closeMenu();
        
        if (window.showToast) {
          window.showToast(`Abriendo: ${text}`, 'info');
        }
      });
    });
  }

  async initMap() {
    try {
      // Verificar si Leaflet está disponible
      if (typeof L === 'undefined') {
        console.error('❌ Leaflet no está cargado');
        return;
      }

      const userLocation = await this.getCurrentLocation();
      console.log('📍 Ubicación de pasajera:', userLocation);
      
      this.map = L.map('map').setView([userLocation.lat, userLocation.lng], 15);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      this.passengerMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: this.createPassengerIcon()
      }).addTo(this.map).bindPopup('📍 Tu ubicación');

      console.log('🗺️ Mapa inicializado para pasajera');
    } catch (error) {
      console.error('❌ Error inicializando mapa:', error);
    }
  }

  createPassengerIcon() {
    return L.divIcon({
      html: `<div style="width: 24px; height: 24px; background: #ec4899; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
      className: 'passenger-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
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

  setupEventListeners() {
    const solicitarBtn = document.getElementById('solicitar-viaje-btn');
    const destinoInput = document.getElementById('destino-input');

    if (solicitarBtn) {
      solicitarBtn.addEventListener('click', () => this.handleSolicitarViaje());
    }

    if (destinoInput) {
      destinoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleSolicitarViaje();
        }
      });
    }
  }

  async handleSolicitarViaje() {
    const destinoInput = document.getElementById('destino-input');
    const destino = destinoInput?.value?.trim();

    if (!destino) {
      this.showToast('❌ Por favor ingresa un destino', 'error');
      return;
    }

    try {
      console.log('📝 Solicitando viaje a:', destino);
      this.showLoadingModal('Solicitando viaje...');

      const passengerLocation = await this.getCurrentLocation();
      
      const tripData = {
        id: Date.now().toString(),
        passenger: {
          name: 'Bianca',
          location: passengerLocation,
          phone: '+591 70123456'
        },
        destination: destino,
        status: 'pending',
        timestamp: Date.now(),
        driver: null,
        estimatedFare: Math.floor(Math.random() * 25) + 15
      };

      console.log('📊 Datos del viaje:', tripData);
      const newTripRef = await push(ref(database, 'trips'), tripData);
      this.currentTrip = newTripRef.key;
      
      console.log('✅ Viaje creado con ID:', this.currentTrip);
      
      this.hideLoadingModal();
      this.showWaitingModal(destino);
      this.startListeningToTrip(newTripRef.key);
      
      this.showToast('✅ Viaje solicitado, buscando conductora...', 'success');

    } catch (error) {
      console.error('❌ Error solicitando viaje:', error);
      this.hideLoadingModal();
      this.showToast('❌ Error al solicitar viaje: ' + error.message, 'error');
    }
  }

  startListeningToTrip(tripId) {
    console.log('👂 Escuchando estado del viaje:', tripId);
    const tripRef = ref(database, `trips/${tripId}`);
    
    this.tripListener = onValue(tripRef, (snapshot) => {
      if (snapshot.exists()) {
        const trip = { id: tripId, ...snapshot.val() };
        console.log('📱 Estado del viaje actualizado:', trip.status);
        this.handleTripUpdate(trip);
      } else {
        console.log('❌ Viaje no existe o fue eliminado');
      }
    }, (error) => {
      console.error('❌ Error escuchando viaje:', error);
    });
  }

  handleTripUpdate(trip) {
    console.log('🔄 Manejando actualización del viaje:', trip.status);

    switch (trip.status) {
      case 'pending':
        console.log('⏳ Viaje pendiente, esperando...');
        break;
      case 'accepted':
        console.log('✅ Viaje aceptado!');
        this.handleTripAccepted(trip);
        break;
      case 'in_progress':
        console.log('🚗 Conductora llegó, viaje en progreso');
        this.handleTripInProgress(trip);
        break;
      case 'completed':
        console.log('🏁 Viaje completado');
        this.handleTripCompleted(trip);
        break;
      case 'cancelled':
        console.log('❌ Viaje cancelado');
        this.handleTripCancelled(trip);
        break;
    }
  }

  handleTripAccepted(trip) {
    this.hideWaitingModal();
    this.showToast('🎉 ¡Viaje aceptado!', 'success');
    this.showDriverInfo(trip.driver);
    this.addDriverToMap(trip.driver.location);
    this.showRouteToPassenger(trip.driver.location, trip.passenger.location);
    
    // Comenzar a escuchar la ubicación de la conductora en tiempo real
    this.startTrackingDriver(trip.id);
    
    // Calcular tiempo estimado
    this.estimatedTime = this.calculateEstimatedTime(trip.driver.location, trip.passenger.location);
    this.showEstimatedTime(this.estimatedTime);
  }

  startTrackingDriver(tripId) {
    console.log('📡 Iniciando seguimiento de conductora...');
    const driverLocationRef = ref(database, `trips/${tripId}/driver/location`);
    
    this.driverLocationListener = onValue(driverLocationRef, (snapshot) => {
      if (snapshot.exists()) {
        const newLocation = snapshot.val();
        console.log('📍 Nueva ubicación de conductora:', newLocation);
        this.updateDriverPosition(newLocation);
      }
    }, (error) => {
      console.error('❌ Error siguiendo conductora:', error);
    });
  }

  updateDriverPosition(newLocation) {
    if (!this.map || !this.driverMarker) return;

    // Actualizar posición del marcador
    this.driverMarker.setLatLng([newLocation.lat, newLocation.lng]);
    
    // Actualizar la ruta
    const passengerLocation = {
      lat: this.passengerMarker.getLatLng().lat, 
      lng: this.passengerMarker.getLatLng().lng
    };
    
    this.updateRouteToPassenger(newLocation, passengerLocation);
    
    // Calcular y mostrar tiempo estimado actualizado
    const distance = this.calculateDistance(newLocation, passengerLocation);
    const timeRemaining = Math.max(1, Math.round(distance * 2)); // 2 minutos por km aproximadamente
    
    this.updateEstimatedTime(timeRemaining);
  }

  updateRouteToPassenger(driverLocation, passengerLocation) {
    if (!this.map || !passengerLocation) return;

    // Remover ruta anterior
    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
    }

    const latlngs = [
      [driverLocation.lat, driverLocation.lng],
      [passengerLocation.lat, passengerLocation.lng]
    ];
    
    this.routeLine = L.polyline(latlngs, {
      color: '#ec4899',
      weight: 4,
      opacity: 0.8,
      dashArray: '10, 10'
    }).addTo(this.map);
  }

  addDriverToMap(driverLocation) {
    if (!this.map) return;

    if (this.driverMarker) {
      this.map.removeLayer(this.driverMarker);
    }

    this.driverMarker = L.marker([driverLocation.lat, driverLocation.lng], {
      icon: this.createDriverIcon()
    }).addTo(this.map).bindPopup('🚗 Tu conductora');

    const group = new L.featureGroup([this.passengerMarker, this.driverMarker]);
    this.map.fitBounds(group.getBounds().pad(0.1));
  }

  showRouteToPassenger(driverLocation, passengerLocation) {
    if (!this.map) return;

    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
    }

    const latlngs = [
      [driverLocation.lat, driverLocation.lng],
      [passengerLocation.lat, passengerLocation.lng]
    ];
    
    this.routeLine = L.polyline(latlngs, {
      color: '#ec4899',
      weight: 4,
      opacity: 0.8,
      dashArray: '10, 10'
    }).addTo(this.map);
  }

  calculateDistance(point1, point2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  calculateEstimatedTime(driverLocation, passengerLocation) {
    const distance = this.calculateDistance(driverLocation, passengerLocation);
    return Math.max(1, Math.round(distance * 2)); // 2 minutos por km aproximadamente
  }

  showEstimatedTime(minutes) {
    this.showToast(`⏰ Tiempo estimado de llegada: ${minutes} minutos`, 'info');
  }

  updateEstimatedTime(minutes) {
    // Solo mostrar actualizaciones cada 2 minutos para no saturar
    if (minutes % 2 === 0 && minutes > 0) {
      this.showToast(`⏰ Tiempo estimado: ${minutes} minutos`, 'info');
    }
  }

  showDriverInfo(driver) {
    const modalHTML = `
      <div class="bg-white rounded-lg p-6 max-w-sm mx-auto">
        <div class="text-center mb-4">
          <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <span class="text-white text-2xl">👩‍💼</span>
          </div>
          <h3 class="text-lg font-semibold">¡Viaje Aceptado!</h3>
          <p class="text-sm text-gray-600 mt-2">Tu conductora se está dirigiendo hacia ti</p>
        </div>
        
        <div class="space-y-3">
          <div>
            <p class="text-sm text-gray-600">Conductora:</p>
            <p class="font-medium">${driver.name}</p>
          </div>
          
          <div>
            <p class="text-sm text-gray-600">Vehículo:</p>
            <p class="font-medium">${driver.vehicle}</p>
          </div>
          
          <div>
            <p class="text-sm text-gray-600">Teléfono:</p>
            <p class="font-medium">${driver.phone}</p>
          </div>
          
          <div class="bg-blue-50 rounded-lg p-3">
            <p class="text-sm text-blue-600 font-medium">📍 Sigue el progreso en el mapa</p>
            <p class="text-xs text-blue-500">Tu conductora aparecerá moviéndose hacia ti</p>
          </div>
        </div>
        
        <div class="mt-6 space-y-2">
          <button id="call-driver-btn" class="w-full bg-green-500 text-white py-2 rounded-lg font-medium">
            📞 Llamar Conductora
          </button>
          <button id="close-driver-info-btn" class="w-full bg-gray-500 text-white py-2 rounded-lg font-medium">
            ✅ Entendido
          </button>
          <button id="cancel-trip-btn" class="w-full bg-red-500 text-white py-2 rounded-lg font-medium">
            ❌ Cancelar Viaje
          </button>
        </div>
      </div>
    `;

    this.showModal(modalHTML);

    setTimeout(() => {
      const callBtn = document.getElementById('call-driver-btn');
      const closeBtn = document.getElementById('close-driver-info-btn');
      const cancelBtn = document.getElementById('cancel-trip-btn');

      if (callBtn) {
        callBtn.addEventListener('click', () => this.callDriver());
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.hideModal());
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.cancelCurrentTrip());
      }
    }, 100);
  }

  handleTripInProgress(trip) {
    this.hideModal();
    this.showToast('🎯 ¡Tu conductora ha llegado!', 'success');
    
    // Mostrar modal de llegada
    this.showArrivalModal(trip.driver);
  }

  showArrivalModal(driver) {
    const modalHTML = `
      <div class="bg-white rounded-lg p-6 max-w-sm mx-auto">
        <div class="text-center mb-4">
          <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <span class="text-white text-2xl">🎯</span>
          </div>
          <h3 class="text-lg font-semibold">¡Tu conductora ha llegado!</h3>
          <p class="text-sm text-gray-600 mt-2">Busca el vehículo: ${driver.vehicle}</p>
        </div>
        
        <div class="space-y-3">
          <div class="bg-green-50 rounded-lg p-3 text-center">
            <p class="text-green-700 font-medium">🚗 ${driver.vehicle}</p>
            <p class="text-green-600 text-sm">Conductora: ${driver.name}</p>
          </div>
          
          <div class="bg-yellow-50 rounded-lg p-3">
            <p class="text-yellow-700 text-sm font-medium">⚠️ Consejos de seguridad:</p>
            <ul class="text-yellow-600 text-xs mt-1 space-y-1">
              <li>• Verifica la placa del vehículo</li>
              <li>• Confirma el nombre de la conductora</li>
              <li>• Comparte tu ubicación con alguien de confianza</li>
            </ul>
          </div>
        </div>
        
        <div class="mt-6 space-y-2">
          <button id="call-driver-arrival-btn" class="w-full bg-blue-500 text-white py-2 rounded-lg font-medium">
            📞 Llamar Conductora
          </button>
          <button id="confirm-arrival-btn" class="w-full bg-green-500 text-white py-2 rounded-lg font-medium">
            ✅ Confirmar que subí al vehículo
          </button>
        </div>
      </div>
    `;

    this.showModal(modalHTML);

    setTimeout(() => {
      const callBtn = document.getElementById('call-driver-arrival-btn');
      const confirmBtn = document.getElementById('confirm-arrival-btn');

      if (callBtn) {
        callBtn.addEventListener('click', () => this.callDriver());
      }

      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          this.hideModal();
          this.showToast('✅ ¡Disfruta tu viaje!', 'success');
        });
      }
    }, 100);
  }

  showWaitingModal(destino) {
    const modalHTML = `
      <div class="bg-white rounded-lg p-6 max-w-sm mx-auto text-center">
        <div class="animate-spin w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <h3 class="text-lg font-semibold mb-2">Buscando conductora...</h3>
        <p class="text-gray-600 mb-4">Destino: ${destino}</p>
        <div class="bg-blue-50 rounded-lg p-3 mb-4">
          <p class="text-blue-600 text-sm">💡 Mientras esperas, asegúrate de estar en un lugar seguro y visible</p>
        </div>
        <button id="cancel-waiting-btn" class="w-full bg-red-500 text-white py-2 rounded-lg font-medium">
          Cancelar
        </button>
      </div>
    `;

    this.showModal(modalHTML);

    setTimeout(() => {
      const cancelBtn = document.getElementById('cancel-waiting-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.cancelCurrentTrip());
      }
    }, 100);
  }

  showLoadingModal(message) {
    this.showModal(`
      <div class="bg-white rounded-lg p-6 max-w-sm mx-auto text-center">
        <div class="animate-spin w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-gray-600">${message}</p>
      </div>
    `);
  }

  async cancelCurrentTrip() {
    if (!this.currentTrip) return;

    try {
      console.log('❌ Cancelando viaje:', this.currentTrip);
      await update(ref(database, `trips/${this.currentTrip}`), {
        status: 'cancelled',
        cancelReason: 'Cancelado por pasajera',
        cancelledAt: Date.now()
      });
      this.hideModal();
      this.showToast('❌ Viaje cancelado', 'info');
      this.resetTrip();
    } catch (error) {
      console.error('❌ Error cancelando viaje:', error);
      this.showToast('❌ Error al cancelar viaje', 'error');
    }
  }

  callDriver() {
    this.showToast('📞 Iniciando llamada...', 'info');
    // Aquí podrías integrar con una API de llamadas reales
  }

  resetTrip() {
    // Detener listeners
    if (this.tripListener && this.currentTrip) {
      off(ref(database, `trips/${this.currentTrip}`), 'value', this.tripListener);
      this.tripListener = null;
    }
    
    if (this.driverLocationListener && this.currentTrip) {
      off(ref(database, `trips/${this.currentTrip}/driver/location`), 'value', this.driverLocationListener);
      this.driverLocationListener = null;
    }
    
    this.currentTrip = null;
    
    // Limpiar mapa
    if (this.driverMarker && this.map) {
      this.map.removeLayer(this.driverMarker);
      this.driverMarker = null;
    }
    
    if (this.routeLine && this.map) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = null;
    }
  }

  handleTripCompleted(trip) {
    this.hideModal();
    this.showCompletionModal(trip);
    this.resetTrip();
  }

  showCompletionModal(trip) {
    const modalHTML = `
      <div class="bg-white rounded-lg p-6 max-w-sm mx-auto text-center">
        <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-white text-2xl">🎉</span>
        </div>
        <h3 class="text-lg font-semibold mb-2">¡Viaje Completado!</h3>
        <p class="text-gray-600 mb-4">Esperamos que hayas tenido un viaje seguro y cómodo</p>
        
        <div class="bg-gray-50 rounded-lg p-3 mb-4">
          <p class="text-sm text-gray-600">Tarifa del viaje:</p>
          <p class="text-lg font-bold text-green-600">$${trip.estimatedFare}</p>
        </div>
        
        <div class="space-y-2">
          <button id="rate-trip-btn" class="w-full bg-yellow-500 text-white py-2 rounded-lg font-medium">
            ⭐ Calificar Viaje
          </button>
          <button id="close-completion-btn" class="w-full bg-gray-500 text-white py-2 rounded-lg font-medium">
            ✅ Cerrar
          </button>
        </div>
      </div>
    `;

    this.showModal(modalHTML);

    setTimeout(() => {
      const rateBtn = document.getElementById('rate-trip-btn');
      const closeBtn = document.getElementById('close-completion-btn');

      if (rateBtn) {
        rateBtn.addEventListener('click', () => {
          this.hideModal();
          this.showToast('⭐ ¡Gracias por tu calificación!', 'success');
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.hideModal());
      }
    }, 100);
  }

  handleTripCancelled(trip) {
    this.hideModal();
    this.showToast('❌ Viaje cancelado', 'info');
    this.resetTrip();
  }

  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.warn('Geolocalización no disponible, usando Santa Cruz');
        resolve({ lat: -17.7833, lng: -63.1821 });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Error obteniendo ubicación GPS:', error);
          console.warn('Usando ubicación de Santa Cruz por defecto');
          resolve({ lat: -17.7833, lng: -63.1821 });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  showModal(content) {
    const existingModal = document.getElementById('trip-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'trip-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = content;
    document.body.appendChild(modal);
  }

  hideModal() {
    const modal = document.getElementById('trip-modal');
    if (modal) modal.remove();
  }

  hideWaitingModal() { this.hideModal(); }
  hideLoadingModal() { this.hideModal(); }

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

// Función global para toast (para compatibilidad)
window.showToast = function(message, type = 'info') {
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
};

// Inicializar sistema de viajes para pasajeras
const passengerTrip = new PassengerTripManager();
window.passengerTrip = passengerTrip;

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Inicializando sistema de pasajera...');
  passengerTrip.init();
});

console.log('📜 JavaScript de pasajera cargado');