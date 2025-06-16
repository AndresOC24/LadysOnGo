// Inicializar el mapa
let map = L.map('map').setView([-17.783333, -63.182222], 13); // Santa Cruz de la Sierra

// Añadir capa de mapa
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Marcador de ubicación actual
let currentLocationMarker = null;

// Funciones de zoom
function zoomIn() {
    map.zoomIn();
}

function zoomOut() {
    map.zoomOut();
}

// Función para centrar el mapa en la ubicación del usuario
function centerToMyLocation() {
    // Verificar si el navegador soporta geolocalización
    if (!navigator.geolocation) {
        alert('Tu navegador no soporta geolocalización');
        return;
    }

    // Opciones para la geolocalización
    const options = {
        enableHighAccuracy: true, // Usar GPS si está disponible
        timeout: 10000, // Timeout de 10 segundos
        maximumAge: 60000 // Cache la ubicación por 1 minuto
    };

    // Obtener la ubicación actual
    navigator.geolocation.getCurrentPosition(
        // Función de éxito
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            console.log(`Ubicación obtenida: ${lat}, ${lng} (precisión: ${accuracy}m)`);

            // Centrar el mapa en la ubicación del usuario
            map.setView([lat, lng], 16);

            // Remover marcador anterior si existe
            if (currentLocationMarker) {
                map.removeLayer(currentLocationMarker);
            }

            // Crear un icono personalizado para la ubicación actual
            const myLocationIcon = L.divIcon({
                html: `
                    <div style="
                        width: 20px;
                        height: 20px;
                        background: #3b82f6;
                        border: 3px solid white;
                        border-radius: 50%;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        position: relative;
                    ">
                        <div style="
                            position: absolute;
                            top: -10px;
                            left: -10px;
                            width: 40px;
                            height: 40px;
                            background: rgba(59, 130, 246, 0.2);
                            border-radius: 50%;
                            animation: pulse 2s infinite;
                        "></div>
                    </div>
                `,
                className: 'my-location-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            // Añadir marcador de ubicación actual
            currentLocationMarker = L.marker([lat, lng], {
                icon: myLocationIcon
            }).addTo(map)
            .bindPopup(`
                <div style="text-align: center;">
                    <strong>📍 Tu ubicación</strong><br>
                    <small>Precisión: ~${Math.round(accuracy)}m</small>
                </div>
            `);

            // Opcional: Añadir círculo de precisión
            const accuracyCircle = L.circle([lat, lng], {
                radius: accuracy,
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 1
            }).addTo(map);

            // Remover el círculo después de 3 segundos
            setTimeout(() => {
                map.removeLayer(accuracyCircle);
            }, 3000);
        },
        // Función de error
        function(error) {
            let errorMessage = '';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Acceso a la ubicación denegado. Por favor, permite el acceso a tu ubicación.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Información de ubicación no disponible.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Tiempo agotado al obtener la ubicación.';
                    break;
                default:
                    errorMessage = 'Error desconocido al obtener la ubicación.';
                    break;
            }
            
            console.error('Error de geolocalización:', error);
            alert(errorMessage);
        },
        options
    );
}

// Función para rastrear la ubicación en tiempo real (opcional)
function startLocationTracking() {
    if (!navigator.geolocation) {
        alert('Tu navegador no soporta geolocalización');
        return;
    }

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000 // Cache por 5 segundos para tracking
    };

    const watchId = navigator.geolocation.watchPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // Actualizar la posición del marcador
            if (currentLocationMarker) {
                currentLocationMarker.setLatLng([lat, lng]);
            }

            console.log(`Ubicación actualizada: ${lat}, ${lng}`);
        },
        function(error) {
            console.error('Error en el tracking de ubicación:', error);
        },
        options
    );

    // Guardar el ID para poder detener el tracking después
    window.locationWatchId = watchId;
}

// Función para detener el tracking (opcional)
function stopLocationTracking() {
    if (window.locationWatchId) {
        navigator.geolocation.clearWatch(window.locationWatchId);
        window.locationWatchId = null;
        console.log('Tracking de ubicación detenido');
    }
}

// Función para mostrar ayuda
function showHelp() {
    alert('Funcionalidad de ayuda/información');
}

// Manejar búsqueda
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const query = this.value;
        if (query.trim() !== '') {
            alert(`Buscando: ${query}`);
        }
    }
});

// Manejar navegación inferior
const navButtons = document.querySelectorAll('.nav-btn');
navButtons.forEach(button => {
    button.addEventListener('click', function () {
        // Remover clase activa de todos los botones
        navButtons.forEach(btn => {
            btn.classList.remove('text-pink-500');
            btn.classList.add('text-gray-600');
        });

        // Añadir clase activa al botón clickeado
        this.classList.remove('text-gray-600');
        this.classList.add('text-pink-500');

        // Obtener el tab seleccionado
        const tab = this.getAttribute('data-tab');
        console.log(`Navegando a: ${tab}`);
    });
});

// Ajustar el tamaño del mapa cuando cambie el tamaño de la ventana
window.addEventListener('resize', function () {
    map.invalidateSize();
});

// Centrar en ubicación actual al cargar (después de un pequeño delay)
setTimeout(function () {
    centerToMyLocation();
}, 1000);