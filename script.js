// Função para definir altura real da viewport (correção para mobile)
function setRealViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Executa a função quando a página carrega e quando a janela é redimensionada
window.addEventListener('resize', setRealViewportHeight);
window.addEventListener('load', setRealViewportHeight);

// Chama a função uma vez no início
setRealViewportHeight();

document.addEventListener('DOMContentLoaded', () => {
    
    // --- STATE ---
    let cart = []; // Agora irá agrupar itens: [{ name, price, image, quantity }]
    let notificationTimer;
    let customerLocationUrl = null; 
    const WHATSAPP_NUMBER = "5562991265804";
    let currentProductForModal = {};

    // --- SELECTORS ---
    const body = document.body;
    const header = document.querySelector('.header');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.nav');
    const addToCartButtons = document.querySelectorAll('.menu__item-button, .offer__button');
    const cartToggleButton = document.querySelector('.cart-toggle');
    const cartElement = document.querySelector('.cart');
    const closeCartButton = document.querySelector('.cart__close-button');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartCountElement = document.getElementById('cart-count');
    const cartTotalElement = document.getElementById('cart-total');
    const checkoutButton = document.getElementById('checkout-button');

    // --- CART LOGIC ---
    
    const saveCartToStorage = () => {
        localStorage.setItem('tudaoBurguersCart', JSON.stringify(cart));
    };

    const loadCartFromStorage = () => {
        const savedCart = localStorage.getItem('tudaoBurguersCart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
            updateCart();
        }
    };

    const addItemsToCart = (product, quantity) => {
        const existingItem = cart.find(item => item.name === product.name);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({ ...product, quantity });
        }
        updateCart();
    };

    const updateCartItemQuantity = (name, newQuantity) => {
        const itemInCart = cart.find(item => item.name === name);
        if (itemInCart) {
            if (newQuantity > 0) {
                itemInCart.quantity = newQuantity;
            } else {
                cart = cart.filter(item => item.name !== name);
            }
        }
        updateCart();
    };
    
    const removeFromCart = (name) => {
        const item = cart.find(i => i.name === name);
        if (item) {
            showNotification(`${item.name} foi removido.`);
            cart = cart.filter(i => i.name !== name);
            updateCart();
        }
    };

    const updateCart = () => {
        cartItemsContainer.innerHTML = '';
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p style="text-align: center; color: var(--text-light);">Seu carrinho está vazio.</p>';
        } else {
            cart.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'cart-item';
                const subtotal = item.price * item.quantity;

                itemElement.innerHTML = `
                    <div class="cart-item__details">
                        <span class="cart-item__name">${item.name}</span>
                    </div>
                    <span class="cart-item__subtotal">R$ ${subtotal.toFixed(2).replace('.', ',')}</span>
                    <div class="cart-item__actions">
                        <div class="cart-item__quantity-selector">
                            <button class="cart-item__quantity-btn cart-quantity-decrease" data-name="${item.name}">-</button>
                            <input type="number" class="cart-item__quantity-input" value="${item.quantity}" min="1" data-name="${item.name}">
                            <button class="cart-item__quantity-btn cart-quantity-increase" data-name="${item.name}">+</button>
                        </div>
                        <button class="cart-item__remove" data-name="${item.name}" aria-label="Remover ${item.name} do carrinho">×</button>
                    </div>
                `;
                cartItemsContainer.appendChild(itemElement);
            });
        }
        
        const totalValue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

        cartTotalElement.textContent = `R$ ${totalValue.toFixed(2).replace('.', ',')}`;
        cartCountElement.textContent = totalItems;
        checkoutButton.disabled = cart.length === 0;
        
        saveCartToStorage();
    };

    // --- UI & GENERAL FUNCTIONS ---
    
    const handleScroll = () => {
        header.classList.toggle('scrolled', window.scrollY > 50);
    };

    const toggleMobileMenu = () => {
        nav.classList.toggle('active');
        mobileMenuToggle.setAttribute('aria-expanded', nav.classList.contains('active'));
    };

    const showNotification = (message) => {
        clearTimeout(notificationTimer);
        document.querySelector('.notification')?.remove();

        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        body.appendChild(notification);

        // Trigger the slide-in animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Set timer to slide out
        notificationTimer = setTimeout(() => {
            notification.classList.remove('show');
            // Remove from DOM after transition ends
            notification.addEventListener('transitionend', () => notification.remove());
        }, 3000);
    };

    const showCart = () => cartElement.classList.add('open');
    const hideCart = () => cartElement.classList.remove('open');
    
    const handleCheckout = () => {
        const orderModal = document.getElementById('order-modal');
        const savedName = localStorage.getItem('tudaoCustomerName');
        const customerNameInput = document.getElementById('customer-name');
        const welcomeMessage = document.getElementById('welcome-back-message');
        
        if (savedName) {
            customerNameInput.value = savedName;
            welcomeMessage.textContent = `Que bom te ver de volta, ${savedName}!`;
            welcomeMessage.style.display = 'block';
        } else {
             welcomeMessage.style.display = 'none';
        }
        orderModal.style.display = 'flex';
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    // --- EVENT LISTENERS ---
    window.addEventListener('scroll', handleScroll);
    mobileMenuToggle.addEventListener('click', toggleMobileMenu);

    addToCartButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const buttonEl = e.currentTarget;
            const productCard = buttonEl.closest('.menu__item') || buttonEl.closest('.offer__content');
            const name = buttonEl.dataset.name.trim();
            const price = parseFloat(buttonEl.dataset.price);
            const image = buttonEl.dataset.img;
            const description = productCard.querySelector('.menu__item-description, .offer__description').textContent;
            
            openQuantityModal({ name, price, image, description });
        });
    });

    cartToggleButton.addEventListener('click', showCart);
    closeCartButton.addEventListener('click', hideCart);
    
    cartItemsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const name = target.dataset.name;
        const item = cart.find(i => i.name === name);

        if (!item) return;

        if (target.classList.contains('cart-quantity-increase')) {
            updateCartItemQuantity(name, item.quantity + 1);
        } else if (target.classList.contains('cart-quantity-decrease')) {
            updateCartItemQuantity(name, item.quantity - 1);
        } else if (target.classList.contains('cart-item__remove')) {
            removeFromCart(name);
        }
    });

    cartItemsContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('cart-item__quantity-input')) {
            const name = e.target.dataset.name;
            let newQuantity = parseInt(e.target.value, 10);
            if (isNaN(newQuantity) || newQuantity < 1) {
                newQuantity = 1;
                e.target.value = 1; // Correct the input field visually
            }
            updateCartItemQuantity(name, newQuantity);
        }
    });

    checkoutButton.addEventListener('click', handleCheckout);

    // --- DYNAMIC CONTENT CREATION & INITIALIZATION ---

    const setupLightbox = () => {
        const lightboxHTML = `
            <div id="image-lightbox" class="lightbox">
                <span class="lightbox-close">&times;</span>
                <img class="lightbox-content" id="lightbox-img">
            </div>`;
        body.insertAdjacentHTML('beforeend', lightboxHTML);
        
        const lightbox = document.getElementById('image-lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        const lightboxClose = lightbox.querySelector('.lightbox-close');

        document.querySelectorAll('.menu__item-image').forEach(image => {
            image.addEventListener('click', () => {
                lightbox.style.display = 'flex';
                lightboxImg.src = image.src;
                lightboxImg.alt = image.alt;
            });
        });

        const closeLightbox = () => { lightbox.style.display = 'none'; };
        lightboxClose.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    };

    const openQuantityModal = (product) => {
        currentProductForModal = product;
        const modal = document.getElementById('quantity-modal');
        document.getElementById('modal-product-image').style.backgroundImage = `url('${product.image}')`;
        document.getElementById('modal-product-name').textContent = product.name;
        document.getElementById('modal-product-description').textContent = product.description;
        document.getElementById('quantity-input').value = 1;
        updateModalTotalPrice();
        modal.style.display = 'flex';
    };

    const updateModalTotalPrice = () => {
        const quantity = parseInt(document.getElementById('quantity-input').value, 10);
        const total = quantity * currentProductForModal.price;
        document.getElementById('modal-total-price').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    };

    const setupModals = () => {
        const orderModalHTML = `
            <div id="order-modal" class="order-modal-overlay">
                <div class="order-modal-content">
                    <h3 id="order-modal-title">Complete seu Pedido</h3>
                    <div id="welcome-back-message" class="welcome-back" style="display:none;"></div>
                    <form id="order-form" novalidate>
                        <div class="form-group">
                            <label for="customer-name">Seu Nome</label>
                            <input type="text" id="customer-name" name="customer-name" required placeholder="Digite seu nome completo">
                        </div>
                        <div class="form-group">
                            <label>Endereço para Entrega</label>
                            <div class="address-options">
                                <button type="button" id="share-location-btn" class="location-button">📍 Compartilhar Localização</button>
                                <a href="#" id="toggle-manual-address" class="manual-address-toggle">Ou digite o endereço manualmente</a>
                            </div>
                            <div id="manual-address-container" class="form-group" style="display: none; margin-top: 1rem;">
                                <textarea id="manual-address" name="manual-address" placeholder="Ex: Rua das Flores, 123, Bairro Centro. Ponto de referência: Próximo à praça."></textarea>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="order-notes">Observações (opcional)</label>
                            <textarea id="order-notes" name="order-notes" placeholder="Ex: Sem cebola, ponto da carne mal passado, etc."></textarea>
                        </div>
                        <div class="form-group">
                            <label>Forma de Pagamento</label>
                            <div class="radio-group">
                               <label><input type="radio" name="payment-method" value="Cartão" checked> Cartão</label>
                               <label><input type="radio" name="payment-method" value="Dinheiro"> Dinheiro</label>
                               <label><input type="radio" name="payment-method" value="Pix"> Pix</label>
                            </div>
                        </div>
                        <div class="modal-buttons">
                            <button type="button" id="cancel-order" class="modal-button secondary">Cancelar</button>
                            <button type="submit" class="modal-button primary">Enviar Pedido via WhatsApp</button>
                        </div>
                    </form>
                </div>
            </div>`;

        const quantityModalHTML = `
            <div id="quantity-modal" class="quantity-modal-overlay">
                <div class="quantity-modal-content">
                    <button class="quantity-modal-close">&times;</button>
                    <div id="modal-product-image"></div>
                    <h3 id="modal-product-name">Nome do Produto</h3>
                    <p id="modal-product-description">Descrição do produto aqui.</p>
                    <div class="quantity-selector">
                        <button class="quantity-btn" id="decrease-quantity">-</button>
                        <input type="number" id="quantity-input" value="1" min="1">
                        <button class="quantity-btn" id="increase-quantity">+</button>
                    </div>
                    <div class="modal-footer">
                        <span class="modal-total-price-label">Preço Total:</span>
                        <span id="modal-total-price">R$ 0,00</span>
                    </div>
                    <button id="add-to-cart-from-modal" class="cta-button">Adicionar ao Pedido</button>
                </div>
            </div>`;

        body.insertAdjacentHTML('beforeend', orderModalHTML + quantityModalHTML);
        
        // --- Order Modal Logic & Listeners ---
        const orderModal = document.getElementById('order-modal');
        const orderForm = document.getElementById('order-form');
        const shareLocationBtn = document.getElementById('share-location-btn');
        const toggleManualAddressBtn = document.getElementById('toggle-manual-address');
        const manualAddressContainer = document.getElementById('manual-address-container');
        const manualAddressInput = document.getElementById('manual-address');

        const resetOrderModal = () => {
            orderForm.reset();
            customerLocationUrl = null;
            shareLocationBtn.textContent = '📍 Compartilhar Localização';
            shareLocationBtn.disabled = false;
            shareLocationBtn.classList.remove('success');
            manualAddressContainer.style.display = 'none';
            document.getElementById('welcome-back-message').style.display = 'none';
        };

        shareLocationBtn.addEventListener('click', () => {
            if (!navigator.geolocation) return alert('Geolocalização não é suportada pelo seu navegador.');
            shareLocationBtn.textContent = 'Obtendo localização...';
            shareLocationBtn.disabled = true;
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    customerLocationUrl = `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`;
                    manualAddressInput.value = ''; 
                    shareLocationBtn.textContent = '✅ Localização Compartilhada!';
                    shareLocationBtn.classList.add('success');
                    shareLocationBtn.disabled = false;
                },
                () => {
                    alert('Não foi possível obter sua localização. Por favor, verifique as permissões do seu navegador ou digite o endereço manualmente.');
                    shareLocationBtn.textContent = '📍 Compartilhar Localização';
                    shareLocationBtn.disabled = false;
                },
                { timeout: 10000, enableHighAccuracy: true }
            );
        });
        
        toggleManualAddressBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isHidden = manualAddressContainer.style.display === 'none';
            manualAddressContainer.style.display = isHidden ? 'block' : 'none';
            if (isHidden) {
                manualAddressInput.focus();
                customerLocationUrl = null;
                shareLocationBtn.textContent = '📍 Compartilhar Localização';
                shareLocationBtn.classList.remove('success');
            }
        });
        
        document.getElementById('cancel-order').addEventListener('click', () => { orderModal.style.display = 'none'; resetOrderModal(); });
        orderModal.addEventListener('click', (e) => { if (e.target === orderModal) { orderModal.style.display = 'none'; resetOrderModal(); } });
        
        orderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const customerName = document.getElementById('customer-name').value.trim();
            const manualAddressValue = manualAddressInput.value.trim();

            if (customerName.length < 3) return alert('Por favor, digite seu nome completo.');
            if (!customerLocationUrl && manualAddressValue.length < 10) return alert('Por favor, compartilhe sua localização ou digite um endereço válido.');

            const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
            const orderNotes = document.getElementById('order-notes').value.trim();
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            let message = `Olá, Tudão Burguer's! 🍔\n*Gostaria de fazer um pedido:*\n\n`;
            message += `*Cliente:* ${customerName}\n\n`;
            message += `*--- MEU PEDIDO ---*\n`;
            cart.forEach(item => {
                const subtotal = item.price * item.quantity;
                message += `• ${item.quantity}x ${item.name} - R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
            });
            message += `\n*TOTAL:* R$ ${total.toFixed(2).replace('.', ',')}\n`;
            message += `*Pagamento:* ${paymentMethod}\n`;
            if (orderNotes) message += `*Observações:* ${orderNotes}\n`;
            message += `\n*Endereço:*\n${customerLocationUrl ? customerLocationUrl : manualAddressValue}\n\n`;
            message += `Aguardando confirmação. Obrigado!`;

            localStorage.setItem('tudaoCustomerName', customerName);
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
            
            cart = [];
            updateCart();
            hideCart();
            orderModal.style.display = 'none';
            resetOrderModal();
        });

        // --- Quantity Modal Logic & Listeners ---
        const quantityModal = document.getElementById('quantity-modal');
        const quantityInput = document.getElementById('quantity-input');
        
        document.querySelector('.quantity-modal-close').addEventListener('click', () => quantityModal.style.display = 'none');
        quantityModal.addEventListener('click', (e) => { if (e.target === quantityModal) quantityModal.style.display = 'none'; });
        
        document.getElementById('decrease-quantity').addEventListener('click', () => { if (quantityInput.value > 1) { quantityInput.value--; updateModalTotalPrice(); } });
        document.getElementById('increase-quantity').addEventListener('click', () => { quantityInput.value++; updateModalTotalPrice(); });
        quantityInput.addEventListener('input', () => { if(quantityInput.value < 1) quantityInput.value = 1; updateModalTotalPrice(); });
        
        document.getElementById('add-to-cart-from-modal').addEventListener('click', () => {
            const quantity = parseInt(quantityInput.value, 10);
            addItemsToCart(currentProductForModal, quantity);
            quantityModal.style.display = 'none';
            showNotification(`${quantity}x ${currentProductForModal.name} adicionado(s)!`);
            showCart();
        });
    };
    
    // --- Countdown Logic ---
    const setupCountdown = () => {
        const countdownElement = document.getElementById('countdown');
        if (!countdownElement) return;

        let targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + (7 - targetDate.getDay()) % 7);
        targetDate.setHours(23, 0, 0, 0);
        if (new Date() > targetDate) targetDate.setDate(targetDate.getDate() + 7);

        const intervalId = setInterval(() => {
            const distance = targetDate - new Date().getTime();

            if (distance < 0) {
                clearInterval(intervalId);
                countdownElement.innerHTML = "<p>A OFERTA DA SEMANA EXPIROU!</p>";
                const offerBtn = document.querySelector('.offer__button');
                if(offerBtn) offerBtn.disabled = true;
                return;
            }
            
            const d = String(Math.floor(distance / (1000*60*60*24))).padStart(2, '0');
            const h = String(Math.floor((distance % (1000*60*60*24)) / (1000*60*60))).padStart(2, '0');
            const m = String(Math.floor((distance % (1000*60*60)) / (1000*60))).padStart(2, '0');
            const s = String(Math.floor((distance % (1000*60)) / 1000)).padStart(2, '0');

            document.getElementById('days').innerText = d;
            document.getElementById('hours').innerText = h;
            document.getElementById('minutes').innerText = m;
            document.getElementById('seconds').innerText = s;
        }, 1000);
    };

    // --- INITIALIZATION ---
    setupModals();
    setupLightbox(); // Initialize Lightbox
    loadCartFromStorage();
    setupCountdown();
});

