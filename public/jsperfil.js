// Función para volver atrás
function goBack() {
    console.log('Volviendo a la pantalla anterior');
    // Aquí puedes implementar la navegación real
    alert('Volviendo atrás');
}

// Funciones para cada opción del menú
function editProfile() {
    console.log('Editando perfil');
    alert('Abrir edición de perfil');
}

function emergencyContact() {
    console.log('Contacto de emergencia');
    alert('Configurar contacto de emergencia');
}

function paymentMethods() {
    console.log('Métodos de pago');
    alert('Gestionar métodos de pago');
}

function notifications() {
    console.log('Configuración de notificaciones');
    alert('Configurar notificaciones');
}

function privacy() {
    console.log('Configuración de privacidad');
    alert('Configurar privacidad');
}

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