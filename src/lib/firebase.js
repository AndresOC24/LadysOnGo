// src/lib/firebase.js - Configuración completa para Astro
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, off, update, remove } from 'firebase/database';

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

// Clase para manejar el sistema de viajes
class TripManager {
  constructor() {
    this.database = database;
    this.tripsRef = ref(database, 'trips');
    this.driversRef = ref(database, 'drivers');
  }

  // Generar ubicación simulada cerca de Santa Cruz
  generateSimulatedLocation() {
    const santaCruzLat = -17.7833;
    const santaCruzLng = -63.1821;
    
    // Generar ubicación aleatoria en un radio de ~5km
    const randomLat = santaCruzLat + (Math.random() - 0.5) * 0.05;
    const randomLng = santaCruzLng + (Math.random() - 0.5) * 0.05;
    
    return {
      lat: randomLat,
      lng: randomLng
    };
  }

  // Crear un nuevo viaje
  async createTrip(passengerData, destination) {
    try {
      const tripData = {
        id: Date.now().toString(),
        passenger: {
          name: passengerData.name || 'Pasajera',
          location: passengerData.location,
          phone: passengerData.phone || ''
        },
        destination: destination,
        status: 'pending', // pending, accepted, in_progress, completed, cancelled
        timestamp: Date.now(),
        driver: null,
        estimatedFare: this.calculateEstimatedFare()
      };

      const newTripRef = await push(this.tripsRef, tripData);
      console.log('✅ Viaje creado:', newTripRef.key);
      return newTripRef.key;
    } catch (error) {
      console.error('❌ Error creando viaje:', error);
      throw error;
    }
  }

  // Calcular tarifa estimada (simulada)
  calculateEstimatedFare() {
    return Math.floor(Math.random() * 25) + 15; // Entre 15 y 40 Bs
  }

  // Aceptar un viaje (para conductoras)
  async acceptTrip(tripId, driverData) {
    try {
      const driverLocation = this.generateSimulatedLocation();
      
      const updates = {
        [`trips/${tripId}/status`]: 'accepted',
        [`trips/${tripId}/driver`]: {
          name: driverData.name || 'Conductora',
          location: driverLocation,
          vehicle: driverData.vehicle || 'Vehículo',
          phone: driverData.phone || '',
          id: driverData.id || Date.now().toString()
        },
        [`trips/${tripId}/acceptedAt`]: Date.now()
      };

      await update(ref(this.database), updates);
      console.log('✅ Viaje aceptado:', tripId);
      return driverLocation;
    } catch (error) {
      console.error('❌ Error aceptando viaje:', error);
      throw error;
    }
  }

  // Actualizar estado del viaje
  async updateTripStatus(tripId, status) {
    try {
      await update(ref(this.database, `trips/${tripId}`), {
        status: status,
        updatedAt: Date.now()
      });
      console.log('✅ Estado actualizado:', status);
    } catch (error) {
      console.error('❌ Error actualizando estado:', error);
      throw error;
    }
  }

  // Escuchar viajes pendientes (para conductoras)
  listenForPendingTrips(callback) {
    const pendingTripsRef = ref(this.database, 'trips');
    
    const unsubscribe = onValue(pendingTripsRef, (snapshot) => {
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
      callback(trips);
    });

    return () => off(pendingTripsRef, 'value', unsubscribe);
  }

  // Escuchar estado de un viaje específico (para pasajeras)
  listenToTrip(tripId, callback) {
    const tripRef = ref(this.database, `trips/${tripId}`);
    
    const unsubscribe = onValue(tripRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({
          id: tripId,
          ...snapshot.val()
        });
      } else {
        callback(null);
      }
    });

    return () => off(tripRef, 'value', unsubscribe);
  }

  // Cancelar viaje
  async cancelTrip(tripId, reason = 'Cancelado por usuario') {
    try {
      await update(ref(this.database, `trips/${tripId}`), {
        status: 'cancelled',
        cancelReason: reason,
        cancelledAt: Date.now()
      });
      console.log('✅ Viaje cancelado');
    } catch (error) {
      console.error('❌ Error cancelando viaje:', error);
      throw error;
    }
  }

  // Obtener ubicación actual del usuario
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada'));
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
          // Si falla, usar ubicación simulada en Santa Cruz
          console.warn('Error obteniendo ubicación, usando ubicación simulada');
          resolve({
            lat: -17.7833,
            lng: -63.1821
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }

  // Registrar conductora online
  async setDriverOnline(driverData) {
    try {
      const driverLocation = this.generateSimulatedLocation();
      const driverRef = ref(this.database, `drivers/${driverData.id}`);
      
      await update(driverRef, {
        ...driverData,
        location: driverLocation,
        status: 'online',
        lastSeen: Date.now()
      });
      
      console.log('✅ Conductora online:', driverData.name);
      return driverLocation;
    } catch (error) {
      console.error('❌ Error registrando conductora:', error);
      throw error;
    }
  }

  // Poner conductora offline
  async setDriverOffline(driverId) {
    try {
      await update(ref(this.database, `drivers/${driverId}`), {
        status: 'offline',
        lastSeen: Date.now()
      });
      console.log('✅ Conductora offline');
    } catch (error) {
      console.error('❌ Error poniendo conductora offline:', error);
      throw error;
    }
  }
}

// Crear instancia global
const tripManager = new TripManager();

// Exportar para uso en otras partes de la aplicación
export { tripManager, database };
export default tripManager;