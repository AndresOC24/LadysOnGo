// public/javascript.js - Funcionalidad básica del menú
// Funcionalidad del menú hamburguesa
const menuButton = document.getElementById('menuButton');
const slideMenu = document.getElementById('slideMenu');
const menuOverlay = document.getElementById('menuOverlay');

function openMenu() {
    if (slideMenu && menuOverlay) {
        slideMenu.classList.add('active');
        menuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeMenu() {
    if (slideMenu && menuOverlay) {
        slideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

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
        showToast(`Abriendo: ${text}`, 'info');
    });
});

// Función auxiliar para mostrar notificaciones
function showToast(message, type = 'info') {
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

// Prevenir el zoom en iOS cuando se hace foco en el input
document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
});

// Ajustar altura para dispositivos móviles
function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

setViewportHeight();
window.addEventListener('resize', setViewportHeight);

// Manejar click en los botones de navegación
const navButtons = document.querySelectorAll('nav button');
navButtons.forEach(button => {
    button.addEventListener('click', function () {
        navButtons.forEach(btn => btn.classList.remove('text-pink-500'));
        this.classList.add('text-pink-500');
    });
});

console.log('✅ JavaScript básico cargado');