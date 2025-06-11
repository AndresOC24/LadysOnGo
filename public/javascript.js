//SCRIPT INICIO

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
        // Remover clase activa de todos los botones
        navButtons.forEach(btn => btn.classList.remove('text-pink-500'));
        // Agregar clase activa al botón clickeado
        this.classList.add('text-pink-500');
    });
});

// Manejar el botón de solicitar viaje
document.querySelector('button.bg-pink-300').addEventListener('click', function () {
    const destino = document.querySelector('input').value;
    if (destino.trim() === '') {
        alert('Por favor ingresa un destino');
    } else {
        alert(`Solicitando viaje a: ${destino}`);
    }
});
