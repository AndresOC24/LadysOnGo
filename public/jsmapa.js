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