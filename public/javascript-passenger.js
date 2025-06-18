// public/javascript-passenger.js - Sistema de viajes para pasajeras
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

// Clase para manejar viajes de pasajeras
class PassengerTripManager {
  constructor() {
    this.currentTrip = null;
    this.tripListener = null;
    this.map = null;
    this.passengerMarker = null;
    this.driverMarker = null;
    this.routeLine = null;
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
      slideMenu.classList.add('active');
      menuOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      slideMenu.classList.remove('active');
      menuOverlay.classList.remove('active');
      document.body.style.overflow = 'auto';
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
        
        // Mostrar mensaje temporal
        this.showToast(`Abriendo: ${text}`, 'info');
      });
    });
  }

  async initMap() {
    try {
      const userLocation = await this.getCurrentLocation();
      
      this.map = L.map('map').setView([userLocation.lat, userLocation.lng], 15);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      this.passengerMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: this.createPassengerIcon()
      }).addTo(this.map).bindPopup('📍 Tu ubicación');

      console.log('🗺️ Mapa inicializado');
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
      html: `<div style="width: 30px; height: 30px; background: #059669; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">🚗</div>`,
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

      const newTripRef = await push(ref(database, 'trips'), tripData);
      this.currentTrip = newTripRef.key;
      
      this.hideLoadingModal();
      this.showWaitingModal(destino);
      this.startListeningToTrip(newTripRef.key);
      
      this.showToast('✅ Viaje solicitado, buscando conductora...', 'success');

    } catch (error) {
      console.error('❌ Error solicitando viaje:', error);
      this.hideLoadingModal();
      this.showToast('❌ Error al solicitar viaje', 'error');
    }
  }

  startListeningToTrip(tripId) {
    const tripRef = ref(database, `trips/${tripId}`);
    
    this.tripListener = onValue(tripRef, (snapshot) => {
      if (snapshot.exists()) {
        const trip = { id: tripId, ...snapshot.val() };
        this.handleTripUpdate(trip);
      }
    });
  }

  handleTripUpdate(trip) {
    console.log('📱 Estado del viaje:', trip.status);

    switch (trip.status) {
      case 'accepted':
        this.handleTripAccepted(trip);
        break;
      case 'completed':
        this.handleTripCompleted(trip);
        break;
      case 'cancelled':
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
  }

  addDriverToMap(driverLocation) {
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
      opacity: 0.8
    }).addTo(this.map);
  }

  showDriverInfo(driver) {
    this.showModal(`
      <div class="bg-white rounded-lg p-6 max-w-sm mx-auto">
        <div class="text-center mb-4">
          <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <span class="text-white text-2xl">👩‍💼</span>
          </div>
          <h3 class="text-lg font-semibold">¡Viaje Aceptado!</h3>
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
        </div>
        
        <div class="mt-6 space-y-2">
          <button onclick="passengerTrip.callDriver()" class="w-full bg-green-500 text-white py-2 rounded-lg font-medium">
            📞 Llamar Conductora
          </button>
          <button onclick="passengerTrip.cancelCurrentTrip()" class="w-full bg-red-500 text-white py-2 rounded-lg font-medium">
            ❌ Cancelar Viaje
          </button>
        </div>
      </div>
    `);
  }

  showWaitingModal(destino) {
    this.showModal(`
      <div class="bg-white rounded-lg p-6 max-w-sm mx-auto text-center">
        <div class="animate-spin w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <h3 class="text-lg font-semibold mb-2">Buscando conductora...</h3>
        <p class="text-gray-600 mb-4">Destino: ${destino}</p>
        <button onclick="passengerTrip.cancelCurrentTrip()" class="w-full bg-red-500 text-white py-2 rounded-lg font-medium">
          Cancelar
        </button>
      </div>
    `);
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
  }

  resetTrip() {
    if (this.tripListener) {
      off(ref(database, `trips/${this.currentTrip}`), 'value', this.tripListener);
      this.tripListener = null;
    }
    
    this.currentTrip = null;
    
    if (this.driverMarker) {
      this.map.removeLayer(this.driverMarker);
      this.driverMarker = null;
    }
    
    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = null;
    }
  }

  handleTripCompleted(trip) {
    this.hideModal();
    this.showToast('✅ ¡Viaje completado!', 'success');
    this.resetTrip();
  }

  handleTripCancelled(trip) {
    this.hideModal();
    this.showToast('❌ Viaje cancelado', 'info');
    this.resetTrip();
  }

  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        resolve({ lat: -17.7833, lng: -63.1821 }); // Santa Cruz por defecto
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
          console.warn('Error obteniendo ubicación, usando ubicación de Santa Cruz');
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

// Inicializar sistema de viajes para pasajeras
const passengerTrip = new PassengerTripManager();
window.passengerTrip = passengerTrip;

document.addEventListener('DOMContentLoaded', () => {
  passengerTrip.init();
});