let panicActivated = false;

function goBack() {
    console.log('Volviendo a la pantalla anterior');
    alert('Volviendo atrás');
}

function activatePanic() {
    if (!panicActivated) {
        panicActivated = true;

        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }

        const button = document.querySelector('.panic-button');
        button.style.background = 'linear-gradient(135deg, #db2777, #be185d)';
        button.innerHTML = 'ACTIVADO';

        sendEmergencyAlert();

        alert('¡ALERTA DE EMERGENCIA ACTIVADA!\n\nSe ha enviado tu ubicación y mensaje de emergencia a tu contacto de confianza.');

        setTimeout(() => {
            panicActivated = false;
            button.style.background = 'linear-gradient(135deg, #ec4899, #db2777)';
            button.innerHTML = 'Presiona';
        }, 3000);
    }
}

function sendEmergencyAlert() {
    console.log('Enviando alerta de emergencia...');

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            console.log(`Ubicación enviada: ${lat}, ${lng}`);
        }, function (error) {
            console.log('No se pudo obtener la ubicación');
        });
    }
}

function changeEmergencyContact() {
    const newContact = prompt('Ingresa el nuevo número de contacto de emergencia:', '+591 69014020');
    if (newContact && newContact.trim() !== '') {
        document.querySelector('.setting-item .setting-value').textContent = newContact;
        console.log(`Contacto de emergencia actualizado: ${newContact}`);
    }
}

function changeAlertMessage() {
    const newMessage = prompt('Ingresa el nuevo mensaje de alerta:', 'Estoy en peligro, mi ubicación es Mi ubicación');
    if (newMessage && newMessage.trim() !== '') {
        document.querySelectorAll('.setting-item .setting-value')[1].innerHTML = newMessage;
        console.log(`Mensaje de alerta actualizado: ${newMessage}`);
    }
}

function toggleLocationSharing() {
    const toggle = event.target;
    const value = toggle.checked ? 'Activado' : 'Desactivado';
    document.querySelectorAll('.setting-item .setting-value')[2].textContent = value;
    console.log(`Envío automático de ubicación: ${value}`);
}

function toggleAudioRecording() {
    const toggle = event.target;
    const value = toggle.checked ? 'Activado' : 'Desactivado';
    document.querySelectorAll('.setting-item .setting-value')[3].textContent = value;
    console.log(`Grabación de audio automática: ${value}`);
}

const navButtons = document.querySelectorAll('.nav-btn');
navButtons.forEach(button => {
    button.addEventListener('click', function () {
        navButtons.forEach(btn => {
            btn.classList.remove('text-pink-500');
            btn.classList.add('text-gray-600');
        });

        this.classList.remove('text-gray-600');
        this.classList.add('text-pink-500');

        const tab = this.getAttribute('data-tab');
        console.log(`Navegando a: ${tab}`);
    });
});

document.querySelector('.panic-button').addEventListener('selectstart', function (e) {
    e.preventDefault();
});