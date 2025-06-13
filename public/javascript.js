       // Funcionalidad del menú hamburguesa
        const menuButton = document.getElementById('menuButton');
        const slideMenu = document.getElementById('slideMenu');
        const menuOverlay = document.getElementById('menuOverlay');

        function openMenu() {
            slideMenu.classList.add('active');
            menuOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeMenu() {
            slideMenu.classList.remove('active');
            menuOverlay.classList.remove('active');
            document.body.style.overflow = 'auto';
        }

        menuButton.addEventListener('click', openMenu);
        menuOverlay.addEventListener('click', closeMenu);

        // Cerrar menú con tecla Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && slideMenu.classList.contains('active')) {
                closeMenu();
            }
        });

        // Manejar click en los elementos del menú
        const menuItems = document.querySelectorAll('.slide-menu a');
        menuItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const text = this.querySelector('span').textContent;
                
                // Aquí puedes agregar la lógica para navegar a cada sección
                console.log('Navegando a:', text);
                
                // Cerrar menú después de seleccionar
                closeMenu();
                
                // Mostrar mensaje temporal (puedes quitar esto en producción)
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-pink-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
                notification.textContent = `Abriendo: ${text}`;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 2000);
            });
        });

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

        // Manejar el botón de solicitar viaje
        // const solicitarViaje = document.querySelector('a[href="/mapa"]');
        // if (solicitarViaje) {
        //     solicitarViaje.addEventListener('click', function (e) {
        //         e.preventDefault();
        //         const destino = document.querySelector('input').value;
        //         if (destino.trim() === '') {
        //             alert('Por favor ingresa un destino');
        //         } else {
        //             alert(`Solicitando viaje a: ${destino}`);
        //         }
        //     });
        // }