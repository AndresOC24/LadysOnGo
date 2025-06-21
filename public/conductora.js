class DriverApp {
        constructor() {
          this.driver = {
            name: '',
            phone: '',
            vehicle: '',
            location: null
          };
          
          this.state = {
            isActive: false,
            currentTrip: null,
            pollInterval: null,
            connectionRetries: 0,
            maxRetries: 3
          };
          
          this.stats = {
            tripsCompleted: 0,
            earningsToday: 0,
            hoursOnline: 0,
            startTime: null
          };
          
          this.config = {
            apiBase: this.getApiBase(),
            pollIntervalMs: 3000,
            retryDelayMs: 5000
          };
          
          // Bind methods
          this.init = this.init.bind(this);
          this.startDriver = this.startDriver.bind(this);
          this.stopDriver = this.stopDriver.bind(this);
          this.acceptRide = this.acceptRide.bind(this);
          
          // Make methods globally available for onclick handlers
          window.driverApp = this;
          window.acceptRide = this.acceptRide;
          window.viewRideDetails = this.viewRideDetails.bind(this);
          window.startNavigation = this.startNavigation.bind(this);
          window.callPassenger = this.callPassenger.bind(this);
          window.completeTrip = this.completeTrip.bind(this);
          window.cancelTrip = this.cancelTrip.bind(this);
        }
        
        getApiBase() {
          return window.location.hostname === 'localhost' 
            ? 'http://localhost:8888/.netlify/functions'
            : 'https://ladysongo.netlify.app/.netlify/functions';
        }
        
        init() {
          console.log('🚀 Iniciando Driver App...');
          this.hideLoading();
          this.setupEventListeners();
          this.updateStatus('Desconectada', 'offline');
          this.validateBrowserSupport();
        }
        
        validateBrowserSupport() {
          if (!navigator.geolocation) {
            this.showToast('⚠️ Tu navegador no soporta geolocalización', 'warning');
          }
          
          if (!window.fetch) {
            this.showToast('❌ Tu navegador no es compatible', 'error');
            return false;
          }
          
          return true;
        }
        
        setupEventListeners() {
          // Formulario con validación mejorada
          const form = document.getElementById('driver-form');
          if (form) {
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
            
            // Validación en tiempo real
            ['driver-name', 'driver-phone', 'driver-vehicle'].forEach(fieldId => {
              const field = document.getElementById(fieldId);
              if (field) {
                field.addEventListener('blur', () => this.validateField(fieldId));
                field.addEventListener('input', () => this.clearFieldError(fieldId));
              }
            });
          }
          
          // Botones del dashboard
          const stopBtn = document.getElementById('stop-listening');
          if (stopBtn) stopBtn.addEventListener('click', this.stopDriver);
          
          const refreshBtn = document.getElementById('refresh-rides');
          if (refreshBtn) refreshBtn.addEventListener('click', this.manualRefresh.bind(this));
          
          // Manejo de errores de red globales
          window.addEventListener('online', () => {
            this.showToast('🟢 Conexión restaurada', 'success');
            if (this.state.isActive) this.searchForRides();
          });
          
          window.addEventListener('offline', () => {
            this.showToast('🔴 Sin conexión a internet', 'error');
          });
        }
        
        validateField(fieldId) {
          const field = document.getElementById(fieldId);
          const errorDiv = document.getElementById(fieldId.replace('driver-', '') + '-error');
          
          if (!field || !errorDiv) return;
          
          let isValid = true;
          let errorMessage = '';
          
          switch(fieldId) {
            case 'driver-name':
              if (field.value.trim().length < 3) {
                isValid = false;
                errorMessage = 'El nombre debe tener al menos 3 caracteres';
              }
              break;
              
            case 'driver-phone':
              const phoneRegex = /^\+?[0-9\s\-\(\)]{8,15}$/;
              if (!phoneRegex.test(field.value.trim())) {
                isValid = false;
                errorMessage = 'Formato de teléfono inválido';
              }
              break;
              
            case 'driver-vehicle':
              if (field.value.trim().length < 10) {
                isValid = false;
                errorMessage = 'Proporciona más detalles del vehículo';
              }
              break;
          }
          
          if (isValid) {
            field.classList.remove('error');
            errorDiv.textContent = '';
          } else {
            field.classList.add('error');
            errorDiv.textContent = errorMessage;
          }
          
          return isValid;
        }
        
        clearFieldError(fieldId) {
          const field = document.getElementById(fieldId);
          const errorDiv = document.getElementById(fieldId.replace('driver-', '') + '-error');
          
          if (field) field.classList.remove('error');
          if (errorDiv) errorDiv.textContent = '';
        }
        
        handleFormSubmit(e) {
          e.preventDefault();
          
          // Validar todos los campos
          const fields = ['driver-name', 'driver-phone', 'driver-vehicle'];
          let allValid = true;
          
          fields.forEach(fieldId => {
            if (!this.validateField(fieldId)) {
              allValid = false;
            }
          });
          
          if (allValid) {
            this.startDriver();
          } else {
            this.showToast('❌ Por favor corrige los errores en el formulario', 'error');
          }
        }
        
        async startDriver() {
          const nameInput = document.getElementById('driver-name');
          const phoneInput = document.getElementById('driver-phone');
          const vehicleInput = document.getElementById('driver-vehicle');
          const startBtn = document.getElementById('start-driver-btn');
          
          // Mostrar loading en botón
          this.setButtonLoading(startBtn, true);
          
          try {
            this.driver.name = nameInput.value.trim();
            this.driver.phone = phoneInput.value.trim();
            this.driver.vehicle = vehicleInput.value.trim();
            
            // Intentar obtener ubicación real
            try {
              this.driver.location = await this.getCurrentLocation();
            } catch (error) {
              console.warn('No se pudo obtener ubicación GPS, usando ubicación simulada');
              this.driver.location = this.generateRandomLocation();
            }
            
            console.log('👤 Conductora iniciada:', this.driver);
            
            // Actualizar UI
            this.updateDriverInfo();
            this.switchView('driver-setup', 'active-driver');
            
            // Inicializar estadísticas
            this.stats.startTime = new Date();
            this.updateStats();
            
            // Cambiar estado
            this.state.isActive = true;
            this.updateStatus('En línea - Buscando viajes', 'online');
            
            // Iniciar polling
            this.startPolling();
            
            this.showToast('✅ ¡Conectada exitosamente!', 'success');
            
          } catch (error) {
            console.error('Error iniciando conductora:', error);
            this.showToast('❌ Error al conectar: ' + error.message, 'error');
          } finally {
            this.setButtonLoading(startBtn, false);
          }
        }
        
        async getCurrentLocation() {
          return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
              reject(new Error('Geolocalización no disponible'));
              return;
            }
            
            navigator.geolocation.getCurrentPosition(
              position => {
                const location = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  address: 'Ubicación actual'
                };
                resolve(location);
              },
              error => reject(error),
              { timeout: 10000, enableHighAccuracy: true }
            );
          });
        }
        
        generateRandomLocation() {
          const santaCruzLat = -17.7833;
          const santaCruzLng = -63.1821;
          
          const randomLat = santaCruzLat + (Math.random() - 0.5) * 0.03;
          const randomLng = santaCruzLng + (Math.random() - 0.5) * 0.03;
          
          const zones = [
            'Zona Norte', 'Zona Sur', 'Zona Este', 'Zona Oeste', 
            'Centro', 'Plan 3000', 'Villa 1ro de Mayo', 'Equipetrol',
            'Las Palmas', 'Urbari'
          ];
          
          return { 
            lat: randomLat, 
            lng: randomLng,
            address: zones[Math.floor(Math.random() * zones.length)]
          };
        }
        
        updateDriverInfo() {
          document.getElementById('active-driver-name').textContent = this.driver.name;
          document.getElementById('active-driver-phone').textContent = this.driver.phone;
          document.getElementById('active-driver-vehicle').textContent = this.driver.vehicle;
          document.getElementById('driver-location').textContent = this.driver.location.address;
        }
        
        stopDriver() {
          if (confirm('¿Estás segura que quieres dejar de recibir viajes?')) {
            console.log('⏹️ Deteniendo conductora...');
            
            this.cleanup();
            this.switchView('active-driver', 'driver-setup');
            document.getElementById('driver-form').reset();
            this.resetState();
            
            this.updateStatus('Desconectada', 'offline');
            this.showToast('⏹️ Desconectada exitosamente', 'info');
          }
        }
        
        cleanup() {
          if (this.state.pollInterval) {
            clearInterval(this.state.pollInterval);
            this.state.pollInterval = null;
          }
        }
        
        resetState() {
          this.state.isActive = false;
          this.state.currentTrip = null;
          this.state.connectionRetries = 0;
          this.driver = { name: '', phone: '', vehicle: '', location: null };
          this.stats = { tripsCompleted: 0, earningsToday: 0, hoursOnline: 0, startTime: null };
        }
        
        startPolling() {
          console.log('📡 Iniciando polling para viajes...');
          
          document.getElementById('search-spinner').style.display = 'block';
          
          this.state.pollInterval = setInterval(() => {
            this.searchForRides();
          }, this.config.pollIntervalMs);
          
          // Primera búsqueda inmediata
          this.searchForRides();
        }
        
        async searchForRides() {
          if (!this.state.isActive) return;
          
          try {
            console.log('🔍 Buscando viajes disponibles...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(`${this.config.apiBase}/rides-list?status=pending`, {
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📋 Viajes encontrados:', result);
            
            // Reset connection retries on success
            this.state.connectionRetries = 0;
            
            this.updateLastUpdate();
            this.displayRides(result.rides || []);
            
          } catch (error) {
            console.error('❌ Error buscando viajes:', error);
            this.handleSearchError(error);
          } finally {
            document.getElementById('search-spinner').style.display = 'none';
          }
        }
        
        handleSearchError(error) {
          this.state.connectionRetries++;
          
          if (error.name === 'AbortError') {
            document.getElementById('last-update').textContent = '⏱️ Timeout de conexión';
          } else if (error.message.includes('Failed to fetch')) {
            document.getElementById('last-update').textContent = '❌ Error de conexión';
          } else {
            document.getElementById('last-update').textContent = '❌ Error del servidor';
          }
          
          // Si hay muchos errores consecutivos, reducir frecuencia de polling
          if (this.state.connectionRetries >= this.config.maxRetries) {
            console.warn('🔄 Muchos errores de conexión, reduciendo frecuencia de polling');
            if (this.state.pollInterval) {
              clearInterval(this.state.pollInterval);
              this.state.pollInterval = setInterval(() => {
                this.searchForRides();
              }, this.config.pollIntervalMs * 2); // Duplicar intervalo
            }
          }
        }
        
        updateLastUpdate() {
          document.getElementById('last-update').textContent = 
            `Última actualización: ${new Date().toLocaleTimeString()}`;
        }
        
        displayRides(rides) {
          const container = document.getElementById('rides-container');
          const noRidesMsg = document.getElementById('no-rides');
          
          if (rides.length === 0) {
            noRidesMsg.style.display = 'block';
            container.innerHTML = `
              <div id="no-rides" class="no-rides">
                <div class="empty-state">
                  <div class="empty-icon">🕐</div>
                  <p>No hay viajes disponibles</p>
                  <small>Los nuevos viajes aparecerán aquí automáticamente</small>
                </div>
              </div>
            `;
            return;
          }
          
          noRidesMsg.style.display = 'none';
          
          container.innerHTML = rides.map(ride => this.createRideCard(ride)).join('');
          
          // Animar entrada de las tarjetas
          const cards = container.querySelectorAll('.ride-card');
          cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in');
          });
        }
        
        createRideCard(ride) {
          const fare = this.calculateFare(ride);
          const timeAgo = this.getTimeAgo(ride.timestamp);
          
          return `
            <div class="ride-card" data-ride-id="${ride.id}">
              <div class="ride-info">
                <div class="ride-passenger">👤 ${ride.pasajera.nombre}</div>
                <div class="ride-details">
                  <p><strong>📍 Recoger en:</strong> ${ride.pasajera.lat.toFixed(4)}, ${ride.pasajera.lng.toFixed(4)}</p>
                  <p><strong>🎯 Destino:</strong> ${ride.destino}</p>
                  <p><strong>⏰ Solicitado:</strong> ${timeAgo}</p>
                  <p><strong>💰 Tarifa estimada:</strong> Bs${fare}</p>
                </div>
              </div>
              <div class="ride-actions">
                <button onclick="driverApp.acceptRide('${ride.id}')" class="btn-success">
                  ✅ Aceptar Viaje
                </button>
                <button onclick="driverApp.viewRideDetails('${ride.id}')" class="btn-secondary">
                  👁️ Ver Detalles
                </button>
              </div>
            </div>
          `;
        }
        
        getTimeAgo(timestamp) {
          const now = new Date();
          const rideTime = new Date(timestamp);
          const diffMs = now - rideTime;
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          
          if (diffMinutes < 1) return 'Hace menos de 1 minuto';
          if (diffMinutes === 1) return 'Hace 1 minuto';
          if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`;
          
          const diffHours = Math.floor(diffMinutes / 60);
          if (diffHours === 1) return 'Hace 1 hora';
          if (diffHours < 24) return `Hace ${diffHours} horas`;
          
          return rideTime.toLocaleDateString();
        }
        
        calculateFare(ride) {
          const distance = Math.random() * 10 + 2;
          const baseFare = 15;
          const perKm = 2;
          return Math.round(baseFare + (distance * perKm));
        }
        
        async acceptRide(rideId) {
          if (!this.state.isActive || this.state.currentTrip) {
            this.showToast('❌ No puedes aceptar viajes en este momento', 'error');
            return;
          }
          
          const rideCard = document.querySelector(`[data-ride-id="${rideId}"]`);
          const acceptBtn = rideCard?.querySelector('.btn-success');
          
          if (acceptBtn) this.setButtonLoading(acceptBtn, true);
          
          try {
            console.log('✅ Aceptando viaje:', rideId);
            
            const response = await fetch(`${this.config.apiBase}/rides-update/${rideId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: 'accepted',
                conductora_nombre: this.driver.name,
                conductora_lat: this.driver.location.lat,
                conductora_lng: this.driver.location.lng
              })
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Viaje aceptado:', result);
            
            if (result.success) {
              this.state.currentTrip = result.ride;
              this.showTripInProgress(result.ride);
              
              this.cleanup(); // Detener polling
              
              this.stats.tripsCompleted++;
              this.stats.earningsToday += this.calculateFare(result.ride);
              this.updateStats();
              
              this.showToast('🎉 ¡Viaje aceptado exitosamente!', 'success');
            } else {
              throw new Error(result.error || 'Error desconocido');
            }
            
          } catch (error) {
            console.error('❌ Error aceptando viaje:', error);
            this.showToast('❌ Error: ' + error.message, 'error');
          } finally {
            if (acceptBtn) this.setButtonLoading(acceptBtn, false);
          }
        }
        
        showTripInProgress(ride) {
          console.log('🚗 Mostrando viaje en progreso:', ride);
          
          this.switchView('active-driver', 'trip-in-progress');
          
          const detailsContainer = document.getElementById('trip-details');
          const distance = (Math.random() * 5 + 1).toFixed(1);
          const time = Math.floor(Math.random() * 10 + 5);
          
          detailsContainer.innerHTML = `
            <div class="trip-passenger">
              <h4>👤 Información de la Pasajera</h4>
              <p><strong>Nombre:</strong> ${ride.pasajera.nombre}</p>
              <p><strong>Ubicación:</strong> ${ride.pasajera.lat.toFixed(4)}, ${ride.pasajera.lng.toFixed(4)}</p>
              <p><strong>Destino:</strong> ${ride.destino}</p>
            </div>
            
            <div class="trip-route">
              <h4>🗺️ Información de Ruta</h4>
              <p><strong>Tu ubicación:</strong> ${this.driver.location.address}</p>
              <p><strong>Distancia estimada:</strong> ${distance} km</p>
              <p><strong>Tiempo estimado:</strong> ${time} minutos</p>
            </div>
            
            <div class="trip-actions">
              <button onclick="driverApp.startNavigation()" class="btn-primary">
                🧭 Iniciar Navegación
              </button>
              <button onclick="driverApp.callPassenger()" class="btn-secondary">
                📞 Llamar Pasajera
              </button>
              <button onclick="driverApp.completeTrip()" class="btn-success">
                ✅ Completar Viaje
              </button>
              <button onclick="driverApp.cancelTrip()" class="btn-danger">
                ❌ Cancelar Viaje
              </button>
            </div>
          `;
          
          this.updateStatus('En viaje', 'online');
        }
        
        viewRideDetails(rideId) {
          console.log('👁️ Viendo detalles del viaje:', rideId);
          
          const rideCard = document.querySelector(`[data-ride-id="${rideId}"]`);
          if (rideCard) {
            rideCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            rideCard.classList.add('highlighted');
            
            setTimeout(() => {
              rideCard.classList.remove('highlighted');
            }, 2000);
          }
          
          this.showToast('ℹ️ Detalles del viaje resaltados', 'info');
        }
        
        startNavigation() {
          console.log('🧭 Iniciando navegación...');
          
          if (this.state.currentTrip) {
            const passengerLat = this.state.currentTrip.pasajera.lat;
            const passengerLng = this.state.currentTrip.pasajera.lng;
            
            const mapsUrl = `https://www.google.com/maps/dir/${this.driver.location.lat},${this.driver.location.lng}/${passengerLat},${passengerLng}`;
            
            if (confirm('¿Abrir Google Maps para navegar hacia la pasajera?')) {
              window.open(mapsUrl, '_blank');
            }
          }
          
          this.showToast('🧭 Navegación iniciada', 'success');
        }
        
        callPassenger() {
          console.log('📞 Llamando a la pasajera...');
          
          if (this.state.currentTrip) {
            this.showToast('📞 Iniciando llamada a ' + this.state.currentTrip.pasajera.nombre, 'info');
            
            setTimeout(() => {
              this.showToast('📞 Llamada finalizada', 'success');
            }, 3000);
          }
        }
        
        completeTrip() {
          if (!this.state.currentTrip) return;
          
          if (confirm('¿Confirmas que has completado el viaje exitosamente?')) {
            console.log('✅ Completando viaje...');
            
            this.showToast('🎉 ¡Viaje completado exitosamente!', 'success');
            
            this.stats.earningsToday += this.calculateFare(this.state.currentTrip);
            this.updateStats();
            
            this.returnToDashboard();
          }
        }
        
        cancelTrip() {
          if (!this.state.currentTrip) return;
          
          if (confirm('¿Estás segura que quieres cancelar este viaje?')) {
            console.log('❌ Cancelando viaje...');
            this.showToast('❌ Viaje cancelado', 'info');
            this.returnToDashboard();
          }
        }
        
        returnToDashboard() {
          console.log('🔄 Volviendo al dashboard...');
          
          this.switchView('trip-in-progress', 'active-driver');
          this.state.currentTrip = null;
          this.updateStatus('En línea - Buscando viajes', 'online');
          
          if (this.state.isActive) {
            this.startPolling();
          }
        }
        
        manualRefresh() {
          console.log('🔄 Actualización manual solicitada...');
          
          if (this.state.isActive && !this.state.currentTrip) {
            this.showToast('🔄 Actualizando lista de viajes...', 'info');
            this.searchForRides();
          } else {
            this.showToast('ℹ️ No se puede actualizar en este momento', 'info');
          }
        }
        
        updateStatus(text, type) {
          const statusText = document.getElementById('status-text');
          const statusDot = document.getElementById('status-dot');
          
          if (statusText) statusText.textContent = text;
          if (statusDot) {
            statusDot.className = `status-dot ${type}`;
          }
          
          console.log(`📊 Estado actualizado: ${text} (${type})`);
        }
        
        updateStats() {
          if (this.stats.startTime) {
            const now = new Date();
            const diffMs = now - this.stats.startTime;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            this.stats.hoursOnline = diffHours + (diffMinutes / 60);
          }
          
          const elements = {
            'trips-completed': this.stats.tripsCompleted,
            'earnings-today': `${this.stats.earningsToday}`,
            'hours-online': `${this.stats.hoursOnline.toFixed(1)}h`
          };
          
          Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
              // Animación de cambio de número
              element.style.transform = 'scale(1.1)';
              element.textContent = value;
              setTimeout(() => {
                element.style.transform = 'scale(1)';
              }, 200);
            }
          });
          
          console.log('📊 Estadísticas actualizadas:', this.stats);
        }
        
        // Utility methods
        switchView(hideId, showId) {
          const hideElement = document.getElementById(hideId);
          const showElement = document.getElementById(showId);
          
          if (hideElement) {
            hideElement.style.opacity = '0';
            setTimeout(() => {
              hideElement.style.display = 'none';
              if (showElement) {
                showElement.style.display = 'block';
                setTimeout(() => {
                  showElement.style.opacity = '1';
                }, 50);
              }
            }, 300);
          }
        }
        
        setButtonLoading(button, loading) {
          if (!button) return;
          
          const text = button.querySelector('.btn-text') || button;
          const spinner = button.querySelector('.btn-spinner');
          
          if (loading) {
            button.disabled = true;
            if (text) text.style.opacity = '0.7';
            if (spinner) spinner.style.display = 'inline-block';
          } else {
            button.disabled = false;
            if (text) text.style.opacity = '1';
            if (spinner) spinner.style.display = 'none';
          }
        }
        
        hideLoading() {
          const overlay = document.getElementById('loading-overlay');
          if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
              overlay.style.display = 'none';
            }, 500);
          }
        }
        
        showToast(message, type = 'info') {
          console.log(`📢 Notificación [${type}]: ${message}`);
          
          const container = document.getElementById('toast-container');
          if (!container) return;
          
          const toast = document.createElement('div');
          toast.className = `toast toast-${type}`;
          
          const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
          };
          
          toast.innerHTML = `
            <div class="toast-content">
              <span class="toast-icon">${icons[type] || icons.info}</span>
              <span class="toast-message">${message}</span>
              <button class="toast-close" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
            <div class="toast-progress"></div>
          `;
          
          container.appendChild(toast);
          
          // Animar entrada
          setTimeout(() => toast.classList.add('toast-show'), 100);
          
          // Auto remove
          setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => {
              if (toast.parentElement) {
                toast.remove();
              }
            }, 300);
          }, 5000);
          
          return toast;
        }
      }
      
      // Initialize app when DOM is loaded
      document.addEventListener('DOMContentLoaded', () => {
        const app = new DriverApp();
        app.init();
      });
      
      console.log('🚗 Driver App JavaScript optimizado cargado completamente');