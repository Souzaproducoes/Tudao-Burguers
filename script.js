document.addEventListener("DOMContentLoaded", () => {
  // --- STATE MANAGEMENT ---
  let cart = []
  const favorites = JSON.parse(localStorage.getItem("tudaoFavorites")) || []
  let notificationTimer
  let customerLocationUrl = null
  let connectedPrinter = null
  let printerService = null
  const WHATSAPP_NUMBER = "5562991265804"
  let currentProductForModal = {}

  // --- SELECTORS ---
  const body = document.body
  const header = document.querySelector(".header")
  const mobileMenuToggle = document.querySelector(".mobile-menu-toggle")
  const nav = document.querySelector(".nav")
  const addToCartButtons = document.querySelectorAll(".menu__item-button, .offer__button")
  const cartToggleButton = document.querySelector(".cart-toggle")
  const cartElement = document.querySelector(".cart")
  const closeCartButton = document.querySelector(".cart__close-button")
  const cartItemsContainer = document.getElementById("cart-items")
  const cartCountElement = document.getElementById("cart-count")
  const cartTotalElement = document.getElementById("cart-total")
  const cartSubtotalElement = document.getElementById("cart-subtotal")
  const checkoutButton = document.getElementById("checkout-button")
  const favoritesToggle = document.querySelector(".favorites-toggle")
  const favoritesCount = document.getElementById("favorites-count")
  const backToTopButton = document.querySelector(".back-to-top")
  const printerSetupBtn = document.getElementById("printer-setup-btn")
  const loadingScreen = document.getElementById("loading-screen")

  // --- INITIALIZATION ---
  const init = () => {
    hideLoadingScreen()
    setupEventListeners()
    setupModals()
    setupLightbox()
    setupIntersectionObserver()
    setupMenuFilters()
    setupPrinterService()
    loadCartFromStorage()
    updateFavoritesDisplay()
    setupCountdown()
    updateStoreStatus()
    setupBackToTop()

    // Update store status every minute
    setInterval(updateStoreStatus, 60000)
  }

  // --- LOADING SCREEN ---
  const hideLoadingScreen = () => {
    setTimeout(() => {
      if (loadingScreen) {
        loadingScreen.classList.add("hidden")
        setTimeout(() => {
          loadingScreen.remove()
        }, 500)
      }
    }, 1500)
  }

  // --- CART LOGIC ---

  const saveCartToStorage = () => {
    localStorage.setItem("tudaoBurguersCart", JSON.stringify(cart))
  }

  const loadCartFromStorage = () => {
    const savedCart = localStorage.getItem("tudaoBurguersCart")
    if (savedCart) {
      cart = JSON.parse(savedCart)
      updateCart()
    }
  }

  const addItemsToCart = (product, quantity) => {
    const existingItem = cart.find((item) => item.name === product.name)

    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      cart.push({ ...product, quantity })
    }
    updateCart()

    // Add pulse animation to cart button
    cartToggleButton.classList.add("pulse-animation")
    setTimeout(() => {
      cartToggleButton.classList.remove("pulse-animation")
    }, 1000)
  }

  const updateCartItemQuantity = (name, newQuantity) => {
    const itemInCart = cart.find((item) => item.name === name)
    if (itemInCart) {
      if (newQuantity > 0) {
        itemInCart.quantity = newQuantity
      } else {
        cart = cart.filter((item) => item.name !== name)
      }
    }
    updateCart()
  }

  const removeFromCart = (name) => {
    const item = cart.find((i) => i.name === name)
    if (item) {
      showNotification(`${item.name} foi removido do carrinho.`)
      cart = cart.filter((i) => i.name !== name)
      updateCart()
    }
  }

  const updateCart = () => {
    cartItemsContainer.innerHTML = ""

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-light);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🛒</div>
                    <p>Seu carrinho está vazio.</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">Adicione alguns itens deliciosos!</p>
                </div>
            `
    } else {
      cart.forEach((item) => {
        const itemElement = document.createElement("div")
        itemElement.className = "cart-item"
        const subtotal = item.price * item.quantity

        itemElement.innerHTML = `
                    <div class="cart-item__details">
                        <span class="cart-item__name">${item.name}</span>
                    </div>
                    <span class="cart-item__subtotal">R$ ${subtotal.toFixed(2).replace(".", ",")}</span>
                    <div class="cart-item__actions">
                        <div class="cart-item__quantity-selector">
                            <button class="cart-item__quantity-btn cart-quantity-decrease" data-name="${item.name}" aria-label="Diminuir quantidade">-</button>
                            <input type="number" class="cart-item__quantity-input" value="${item.quantity}" min="1" data-name="${item.name}" aria-label="Quantidade">
                            <button class="cart-item__quantity-btn cart-quantity-increase" data-name="${item.name}" aria-label="Aumentar quantidade">+</button>
                        </div>
                        <button class="cart-item__remove" data-name="${item.name}" aria-label="Remover ${item.name} do carrinho">×</button>
                    </div>
                `
        cartItemsContainer.appendChild(itemElement)
      })
    }

    const subtotalValue = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const deliveryFee = subtotalValue >= 30 ? 0 : 5
    const totalValue = subtotalValue + deliveryFee
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

    if (cartSubtotalElement) {
      cartSubtotalElement.textContent = `R$ ${subtotalValue.toFixed(2).replace(".", ",")}`
    }

    const deliveryElement = document.getElementById("cart-delivery")
    if (deliveryElement) {
      deliveryElement.textContent = deliveryFee === 0 ? "Grátis" : `R$ ${deliveryFee.toFixed(2).replace(".", ",")}`
      deliveryElement.style.color = deliveryFee === 0 ? "var(--primary-color)" : "var(--text-color)"
    }

    cartTotalElement.textContent = `R$ ${totalValue.toFixed(2).replace(".", ",")}`
    cartCountElement.textContent = totalItems
    checkoutButton.disabled = cart.length === 0

    // Update checkout button text
    const checkoutText = checkoutButton.querySelector(".checkout-text")
    if (checkoutText) {
      checkoutText.textContent = cart.length === 0 ? "Carrinho Vazio" : "Finalizar Pedido"
    }

    saveCartToStorage()
  }

  // --- FAVORITES LOGIC ---
  const toggleFavorite = (productName, button) => {
    const index = favorites.indexOf(productName)

    if (index > -1) {
      favorites.splice(index, 1)
      button.classList.remove("active")
      showNotification(`${productName} removido dos favoritos.`)
    } else {
      favorites.push(productName)
      button.classList.add("active")
      showNotification(`${productName} adicionado aos favoritos!`)
    }

    localStorage.setItem("tudaoFavorites", JSON.stringify(favorites))
    updateFavoritesDisplay()
  }

  const updateFavoritesDisplay = () => {
    favoritesCount.textContent = favorites.length

    // Update favorite buttons
    document.querySelectorAll(".menu__item-favorite").forEach((button) => {
      const menuItem = button.closest(".menu__item")
      const productName = menuItem.querySelector(".menu__item-title").textContent

      if (favorites.includes(productName)) {
        button.classList.add("active")
      } else {
        button.classList.remove("active")
      }
    })
  }

  // --- PRINTER SERVICE ---
  const setupPrinterService = () => {
    if ("bluetooth" in navigator) {
      printerSetupBtn.style.display = "block"
    } else {
      printerSetupBtn.style.display = "none"
    }
  }

  const connectToPrinter = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ["000018f0-0000-1000-8000-00805f9b34fb"] }, // Thermal printer service
          { namePrefix: "POS" },
          { namePrefix: "Printer" },
          { namePrefix: "BT" },
        ],
        optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
      })

      const server = await device.gatt.connect()
      const service = await server.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb")
      const characteristic = await service.getCharacteristic("00002af1-0000-1000-8000-00805f9b34fb")

      connectedPrinter = device
      printerService = characteristic

      showNotification("Impressora conectada com sucesso!")
      updatePrinterStatus("connected")

      device.addEventListener("gattserverdisconnected", () => {
        connectedPrinter = null
        printerService = null
        updatePrinterStatus("disconnected")
        showNotification("Impressora desconectada.")
      })
    } catch (error) {
      console.error("Erro ao conectar impressora:", error)
      showNotification("Erro ao conectar impressora. Tente novamente.")
      updatePrinterStatus("disconnected")
    }
  }

  const printOrder = async (orderData) => {
    if (!printerService) {
      showNotification("Nenhuma impressora conectada.")
      return false
    }

    try {
      // ESC/POS commands for thermal printer
      const commands = [
        0x1b,
        0x40, // Initialize printer
        0x1b,
        0x61,
        0x01, // Center alignment
        0x1b,
        0x21,
        0x30, // Double height and width
      ]

      // Add header
      const header = "TUDAO BURGUERS\n"
      const headerBytes = new TextEncoder().encode(header)
      commands.push(...headerBytes)

      // Reset formatting
      commands.push(0x1b, 0x21, 0x00) // Normal text
      commands.push(0x1b, 0x61, 0x00) // Left alignment

      // Add order details
      const orderText = `
PEDIDO #${Date.now().toString().slice(-6)}
${new Date().toLocaleString("pt-BR")}
--------------------------------
CLIENTE: ${orderData.customerName}
PAGAMENTO: ${orderData.paymentMethod}

ITENS:
${orderData.items
  .map((item) => `${item.quantity}x ${item.name}\n   R$ ${(item.price * item.quantity).toFixed(2).replace(".", ",")}`)
  .join("\n")}

--------------------------------
TOTAL: R$ ${orderData.total.toFixed(2).replace(".", ",")}

ENDERECO:
${orderData.address}

${orderData.notes ? `OBS: ${orderData.notes}` : ""}
--------------------------------
Obrigado pela preferencia!
`

      const textBytes = new TextEncoder().encode(orderText)
      commands.push(...textBytes)

      // Cut paper
      commands.push(0x1d, 0x56, 0x42, 0x00)

      // Send to printer
      const data = new Uint8Array(commands)
      await printerService.writeValue(data)

      showNotification("Pedido impresso com sucesso!")
      return true
    } catch (error) {
      console.error("Erro ao imprimir:", error)
      showNotification("Erro ao imprimir pedido.")
      return false
    }
  }

  const updatePrinterStatus = (status) => {
    const statusElement = document.querySelector(".printer-status")
    if (statusElement) {
      statusElement.className = `printer-status ${status}`

      switch (status) {
        case "connected":
          statusElement.textContent = "🟢 Impressora Conectada"
          break
        case "connecting":
          statusElement.textContent = "🟡 Conectando..."
          break
        default:
          statusElement.textContent = "🔴 Impressora Desconectada"
      }
    }
  }

  // --- UI & GENERAL FUNCTIONS ---
  const handleScroll = () => {
    const scrolled = window.scrollY > 50
    header.classList.toggle("scrolled", scrolled)

    // Show/hide back to top button
    if (window.scrollY > 300) {
      backToTopButton.classList.add("visible")
    } else {
      backToTopButton.classList.remove("visible")
    }
  }

  const toggleMobileMenu = () => {
    nav.classList.toggle("active")
    mobileMenuToggle.setAttribute("aria-expanded", nav.classList.contains("active"))

    // Animate hamburger menu
    const bars = mobileMenuToggle.querySelectorAll(".mobile-menu-toggle__bar")
    bars.forEach((bar, index) => {
      if (nav.classList.contains("active")) {
        if (index === 0) bar.style.transform = "rotate(45deg) translate(5px, 5px)"
        if (index === 1) bar.style.opacity = "0"
        if (index === 2) bar.style.transform = "rotate(-45deg) translate(7px, -6px)"
      } else {
        bar.style.transform = ""
        bar.style.opacity = ""
      }
    })
  }

  const showNotification = (message) => {
    clearTimeout(notificationTimer)
    document.querySelector(".notification")?.remove()

    const notification = document.createElement("div")
    notification.className = "notification"
    notification.textContent = message
    body.appendChild(notification)

    setTimeout(() => notification.classList.add("show"), 10)

    notificationTimer = setTimeout(() => {
      notification.classList.remove("show")
      notification.addEventListener("transitionend", () => notification.remove())
    }, 4000)
  }

  const showCart = () => {
    cartElement.classList.add("open")
    body.style.overflow = "hidden"
  }

  const hideCart = () => {
    cartElement.classList.remove("open")
    body.style.overflow = ""
  }

  const handleCheckout = () => {
    const orderModal = document.getElementById("order-modal")
    const savedName = localStorage.getItem("tudaoCustomerName")
    const customerNameInput = document.getElementById("customer-name")
    const welcomeMessage = document.getElementById("welcome-back-message")

    if (savedName) {
      customerNameInput.value = savedName
      welcomeMessage.textContent = `Que bom te ver de volta, ${savedName}! 😊`
      welcomeMessage.style.display = "block"
    } else {
      welcomeMessage.style.display = "none"
    }
    orderModal.style.display = "flex"
    body.style.overflow = "hidden"
  }

  const updateStoreStatus = () => {
    const now = new Date()
    const hour = now.getHours()
    const statusElement = document.getElementById("store-status")

    if (statusElement) {
      if (hour >= 18 && hour < 23) {
        statusElement.textContent = "🟢 Aberto agora"
        statusElement.style.color = "var(--primary-color)"
      } else {
        statusElement.textContent = "🔴 Fechado"
        statusElement.style.color = "var(--accent-color)"
      }
    }
  }

  const setupBackToTop = () => {
    if (backToTopButton) {
      backToTopButton.addEventListener("click", () => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        })
      })
    }
  }

  // --- INTERSECTION OBSERVER ---
  const setupIntersectionObserver = () => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      },
    )

    document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el))
  }

  // --- MENU FILTERS ---
  const setupMenuFilters = () => {
    const filterButtons = document.querySelectorAll(".menu__filter-btn")
    const menuItems = document.querySelectorAll(".menu__item")

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.filter

        // Update active button
        filterButtons.forEach((btn) => btn.classList.remove("active"))
        button.classList.add("active")

        // Filter items
        menuItems.forEach((item) => {
          const category = item.dataset.category

          if (filter === "all" || category === filter) {
            item.style.display = "block"
            setTimeout(() => {
              item.style.opacity = "1"
              item.style.transform = "translateY(0)"
            }, 100)
          } else {
            item.style.opacity = "0"
            item.style.transform = "translateY(20px)"
            setTimeout(() => {
              item.style.display = "none"
            }, 300)
          }
        })
      })
    })
  }

  // --- EVENT LISTENERS ---
  const setupEventListeners = () => {
    window.addEventListener("scroll", handleScroll)

    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener("click", toggleMobileMenu)
    }

    // Cart events
    if (cartToggleButton) {
      cartToggleButton.addEventListener("click", showCart)
    }

    if (closeCartButton) {
      closeCartButton.addEventListener("click", hideCart)
    }

    if (checkoutButton) {
      checkoutButton.addEventListener("click", handleCheckout)
    }

    // Favorites toggle
    if (favoritesToggle) {
      favoritesToggle.addEventListener("click", () => {
        showNotification("Funcionalidade de favoritos em desenvolvimento!")
      })
    }

    // Printer setup
    if (printerSetupBtn) {
      printerSetupBtn.addEventListener("click", () => {
        const printerModal = document.getElementById("printer-modal")
        if (printerModal) {
          printerModal.style.display = "flex"
          body.style.overflow = "hidden"
        }
      })
    }

    // Add to cart buttons
    document.addEventListener("click", (e) => {
      const button = e.target.closest(".menu__item-button, .offer__button")
      if (button) {
        const productCard = button.closest(".menu__item") || button.closest(".offer__content")
        const name = button.dataset.name.trim()
        const price = Number.parseFloat(button.dataset.price)
        const image = button.dataset.img
        const description = productCard.querySelector(".menu__item-description, .offer__description").textContent

        openQuantityModal({ name, price, image, description })
      }
    })

    // Favorite buttons
    document.addEventListener("click", (e) => {
      const favoriteBtn = e.target.closest(".menu__item-favorite")
      if (favoriteBtn) {
        e.preventDefault()
        const menuItem = favoriteBtn.closest(".menu__item")
        const productName = menuItem.querySelector(".menu__item-title").textContent
        toggleFavorite(productName, favoriteBtn)
      }
    })

    // Cart item events
    if (cartItemsContainer) {
      cartItemsContainer.addEventListener("click", (e) => {
        const target = e.target.closest("button")
        if (!target) return

        const name = target.dataset.name
        const item = cart.find((i) => i.name === name)

        if (!item) return

        if (target.classList.contains("cart-quantity-increase")) {
          updateCartItemQuantity(name, item.quantity + 1)
        } else if (target.classList.contains("cart-quantity-decrease")) {
          updateCartItemQuantity(name, item.quantity - 1)
        } else if (target.classList.contains("cart-item__remove")) {
          removeFromCart(name)
        }
      })

      cartItemsContainer.addEventListener("change", (e) => {
        if (e.target.classList.contains("cart-item__quantity-input")) {
          const name = e.target.dataset.name
          let newQuantity = Number.parseInt(e.target.value, 10)
          if (isNaN(newQuantity) || newQuantity < 1) {
            newQuantity = 1
            e.target.value = 1
          }
          updateCartItemQuantity(name, newQuantity)
        }
      })
    }

    // Close modals on outside click
    document.addEventListener("click", (e) => {
      if (
        e.target.classList.contains("order-modal-overlay") ||
        e.target.classList.contains("quantity-modal-overlay") ||
        e.target.classList.contains("printer-modal-overlay")
      ) {
        e.target.style.display = "none"
        body.style.overflow = ""
      }
    })

    // Navigation smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault()
        const target = document.querySelector(this.getAttribute("href"))
        if (target) {
          const headerHeight = header.offsetHeight
          const targetPosition = target.offsetTop - headerHeight

          window.scrollTo({
            top: targetPosition,
            behavior: "smooth",
          })

          // Close mobile menu if open
          if (nav.classList.contains("active")) {
            toggleMobileMenu()
          }
        }
      })
    })

    // Update active nav link on scroll
    const navLinks = document.querySelectorAll(".nav__link")
    const sections = document.querySelectorAll("section[id]")

    window.addEventListener("scroll", () => {
      let current = ""
      sections.forEach((section) => {
        const sectionTop = section.offsetTop - header.offsetHeight - 100
        if (window.scrollY >= sectionTop) {
          current = section.getAttribute("id")
        }
      })

      navLinks.forEach((link) => {
        link.classList.remove("active")
        if (link.getAttribute("href") === `#${current}`) {
          link.classList.add("active")
        }
      })
    })
  }

  // --- LIGHTBOX ---
  const setupLightbox = () => {
    const lightboxHTML = `
            <div id="image-lightbox" class="lightbox">
                <span class="lightbox-close" aria-label="Fechar">&times;</span>
                <img class="lightbox-content" id="lightbox-img" alt="">
            </div>`
    body.insertAdjacentHTML("beforeend", lightboxHTML)

    const lightbox = document.getElementById("image-lightbox")
    const lightboxImg = document.getElementById("lightbox-img")
    const lightboxClose = lightbox.querySelector(".lightbox-close")

    document.querySelectorAll(".menu__item-image").forEach((image) => {
      image.addEventListener("click", () => {
        lightbox.style.display = "flex"
        lightboxImg.src = image.src
        lightboxImg.alt = image.alt
        body.style.overflow = "hidden"
      })
    })

    const closeLightbox = () => {
      lightbox.style.display = "none"
      body.style.overflow = ""
    }

    lightboxClose.addEventListener("click", closeLightbox)
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox()
    })

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lightbox.style.display === "flex") {
        closeLightbox()
      }
    })
  }

  // --- QUANTITY MODAL ---
  const openQuantityModal = (product) => {
    currentProductForModal = product
    const modal = document.getElementById("quantity-modal")
    document.getElementById("modal-product-image").style.backgroundImage = `url('${product.image}')`
    document.getElementById("modal-product-name").textContent = product.name
    document.getElementById("modal-product-description").textContent = product.description
    document.getElementById("quantity-input").value = 1
    updateModalTotalPrice()
    modal.style.display = "flex"
    body.style.overflow = "hidden"
  }

  const updateModalTotalPrice = () => {
    const quantity = Number.parseInt(document.getElementById("quantity-input").value, 10)
    const total = quantity * currentProductForModal.price
    document.getElementById("modal-total-price").textContent = `R$ ${total.toFixed(2).replace(".", ",")}`
  }

  // --- MODALS SETUP ---
  const setupModals = () => {
    const orderModalHTML = `
            <div id="order-modal" class="order-modal-overlay">
                <div class="order-modal-content">
                    <h3 id="order-modal-title">Complete seu Pedido</h3>
                    <div id="welcome-back-message" class="welcome-back" style="display:none;"></div>
                    <form id="order-form" novalidate>
                        <div class="form-group">
                            <label for="customer-name">Seu Nome Completo</label>
                            <input type="text" id="customer-name" name="customer-name" required placeholder="Digite seu nome completo" autocomplete="name">
                        </div>
                        <div class="form-group">
                            <label>Endereço para Entrega</label>
                            <div class="address-options">
                                <button type="button" id="share-location-btn" class="location-button">📍 Compartilhar Localização</button>
                                <a href="#" id="toggle-manual-address" class="manual-address-toggle">Ou digite o endereço manualmente</a>
                            </div>
                            <div id="manual-address-container" class="form-group" style="display: none; margin-top: 1rem;">
                                <textarea id="manual-address" name="manual-address" placeholder="Ex: Rua das Flores, 123, Bairro Centro. Ponto de referência: Próximo à praça." rows="3"></textarea>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="order-notes">Observações (opcional)</label>
                            <textarea id="order-notes" name="order-notes" placeholder="Ex: Sem cebola, ponto da carne mal passado, etc." rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Forma de Pagamento</label>
                            <div class="radio-group">
                               <label><input type="radio" name="payment-method" value="Cartão" checked> 💳 Cartão</label>
                               <label><input type="radio" name="payment-method" value="Dinheiro"> 💵 Dinheiro</label>
                               <label><input type="radio" name="payment-method" value="Pix"> 📱 Pix</label>
                            </div>
                        </div>
                        <div class="modal-buttons">
                            <button type="button" id="cancel-order" class="modal-button secondary">Cancelar</button>
                            <button type="submit" class="modal-button primary">🚀 Enviar Pedido via WhatsApp</button>
                        </div>
                    </form>
                </div>
            </div>`

    const quantityModalHTML = `
            <div id="quantity-modal" class="quantity-modal-overlay">
                <div class="quantity-modal-content">
                    <button class="quantity-modal-close" aria-label="Fechar">&times;</button>
                    <div id="modal-product-image"></div>
                    <h3 id="modal-product-name">Nome do Produto</h3>
                    <p id="modal-product-description">Descrição do produto aqui.</p>
                    <div class="quantity-selector">
                        <button class="quantity-btn" id="decrease-quantity" aria-label="Diminuir quantidade">-</button>
                        <input type="number" id="quantity-input" value="1" min="1" aria-label="Quantidade">
                        <button class="quantity-btn" id="increase-quantity" aria-label="Aumentar quantidade">+</button>
                    </div>
                    <div class="modal-footer">
                        <span class="modal-total-price-label">Preço Total:</span>
                        <span id="modal-total-price">R$ 0,00</span>
                    </div>
                    <button id="add-to-cart-from-modal" class="cta-button">🛒 Adicionar ao Pedido</button>
                </div>
            </div>`

    const printerModalHTML = `
            <div id="printer-modal" class="printer-modal-overlay">
                <div class="printer-modal-content">
                    <h3>Configurar Impressora Bluetooth</h3>
                    <div class="printer-status disconnected">
                        🔴 Impressora Desconectada
                    </div>
                    <p>Conecte uma impressora térmica Bluetooth para imprimir pedidos automaticamente.</p>
                    <div class="modal-buttons">
                        <button type="button" id="cancel-printer" class="modal-button secondary">Cancelar</button>
                        <button type="button" id="connect-printer" class="modal-button primary">🔗 Conectar Impressora</button>
                    </div>
                </div>
            </div>`

    body.insertAdjacentHTML("beforeend", orderModalHTML + quantityModalHTML + printerModalHTML)

    // --- Order Modal Logic ---
    const orderModal = document.getElementById("order-modal")
    const orderForm = document.getElementById("order-form")
    const shareLocationBtn = document.getElementById("share-location-btn")
    const toggleManualAddressBtn = document.getElementById("toggle-manual-address")
    const manualAddressContainer = document.getElementById("manual-address-container")
    const manualAddressInput = document.getElementById("manual-address")

    const resetOrderModal = () => {
      orderForm.reset()
      customerLocationUrl = null
      shareLocationBtn.textContent = "📍 Compartilhar Localização"
      shareLocationBtn.disabled = false
      shareLocationBtn.classList.remove("success")
      manualAddressContainer.style.display = "none"
      document.getElementById("welcome-back-message").style.display = "none"
    }

    shareLocationBtn.addEventListener("click", () => {
      if (!navigator.geolocation) {
        showNotification("Geolocalização não é suportada pelo seu navegador.")
        return
      }

      shareLocationBtn.textContent = "📍 Obtendo localização..."
      shareLocationBtn.disabled = true
      updatePrinterStatus("connecting")

      navigator.geolocation.getCurrentPosition(
        (position) => {
          customerLocationUrl = `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`
          manualAddressInput.value = ""
          shareLocationBtn.textContent = "✅ Localização Compartilhada!"
          shareLocationBtn.classList.add("success")
          shareLocationBtn.disabled = false
          showNotification("Localização obtida com sucesso!")
        },
        (error) => {
          let errorMessage = "Não foi possível obter sua localização."
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Permissão de localização negada. Verifique as configurações do navegador."
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Localização indisponível. Tente novamente."
              break
            case error.TIMEOUT:
              errorMessage = "Tempo limite excedido. Tente novamente."
              break
          }
          showNotification(errorMessage)
          shareLocationBtn.textContent = "📍 Compartilhar Localização"
          shareLocationBtn.disabled = false
        },
        {
          timeout: 15000,
          enableHighAccuracy: true,
          maximumAge: 300000, // 5 minutes
        },
      )
    })

    toggleManualAddressBtn.addEventListener("click", (e) => {
      e.preventDefault()
      const isHidden = manualAddressContainer.style.display === "none"
      manualAddressContainer.style.display = isHidden ? "block" : "none"
      if (isHidden) {
        manualAddressInput.focus()
        customerLocationUrl = null
        shareLocationBtn.textContent = "📍 Compartilhar Localização"
        shareLocationBtn.classList.remove("success")
      }
    })

    document.getElementById("cancel-order").addEventListener("click", () => {
      orderModal.style.display = "none"
      body.style.overflow = ""
      resetOrderModal()
    })

    orderForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const customerName = document.getElementById("customer-name").value.trim()
      const manualAddressValue = manualAddressInput.value.trim()
      const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value
      const orderNotes = document.getElementById("order-notes").value.trim()

      // Validation
      if (customerName.length < 3) {
        showNotification("Por favor, digite seu nome completo.")
        return
      }

      if (!customerLocationUrl && manualAddressValue.length < 10) {
        showNotification("Por favor, compartilhe sua localização ou digite um endereço válido.")
        return
      }

      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const deliveryFee = subtotal >= 30 ? 0 : 5
      const total = subtotal + deliveryFee

      // Prepare order data
      const orderData = {
        customerName,
        paymentMethod,
        items: cart,
        subtotal,
        deliveryFee,
        total,
        address: customerLocationUrl || manualAddressValue,
        notes: orderNotes,
        timestamp: new Date().toLocaleString("pt-BR"),
      }

      // Create WhatsApp message
      let message = `🍔 *PEDIDO TUDÃO BURGUER'S* 🍔\n\n`
      message += `👤 *Cliente:* ${customerName}\n`
      message += `📅 *Data/Hora:* ${orderData.timestamp}\n\n`
      message += `*🛒 ITENS DO PEDIDO:*\n`
      message += `${"-".repeat(30)}\n`

      cart.forEach((item) => {
        const itemTotal = item.price * item.quantity
        message += `• ${item.quantity}x ${item.name}\n`
        message += `  💰 R$ ${itemTotal.toFixed(2).replace(".", ",")}\n\n`
      })

      message += `${"-".repeat(30)}\n`
      message += `💵 *Subtotal:* R$ ${subtotal.toFixed(2).replace(".", ",")}\n`
      message += `🚚 *Entrega:* ${deliveryFee === 0 ? "Grátis" : `R$ ${deliveryFee.toFixed(2).replace(".", ",")}`}\n`
      message += `💳 *Total:* R$ ${total.toFixed(2).replace(".", ",")}\n`
      message += `💰 *Pagamento:* ${paymentMethod}\n\n`

      if (orderNotes) {
        message += `📝 *Observações:* ${orderNotes}\n\n`
      }

      message += `📍 *Endereço para Entrega:*\n${customerLocationUrl || manualAddressValue}\n\n`
      message += `✅ *Aguardando confirmação do pedido!*\n`
      message += `🙏 Obrigado pela preferência!`

      // Try to print order if printer is connected
      if (connectedPrinter && printerService) {
        await printOrder(orderData)
      }

      // Save customer name and add to order history
      localStorage.setItem("tudaoCustomerName", customerName)

      const orderHistory = JSON.parse(localStorage.getItem("tudaoOrderHistory")) || []
      orderHistory.unshift(orderData)
      localStorage.setItem("tudaoOrderHistory", JSON.stringify(orderHistory.slice(0, 10))) // Keep last 10 orders

      // Open WhatsApp
      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, "_blank")

      // Clear cart and close modals
      cart = []
      updateCart()
      hideCart()
      orderModal.style.display = "none"
      body.style.overflow = ""
      resetOrderModal()

      showNotification("Pedido enviado! Aguarde a confirmação no WhatsApp.")
    })

    // --- Quantity Modal Logic ---
    const quantityModal = document.getElementById("quantity-modal")
    const quantityInput = document.getElementById("quantity-input")

    document.querySelector(".quantity-modal-close").addEventListener("click", () => {
      quantityModal.style.display = "none"
      body.style.overflow = ""
    })

    document.getElementById("decrease-quantity").addEventListener("click", () => {
      if (quantityInput.value > 1) {
        quantityInput.value--
        updateModalTotalPrice()
      }
    })

    document.getElementById("increase-quantity").addEventListener("click", () => {
      quantityInput.value++
      updateModalTotalPrice()
    })

    quantityInput.addEventListener("input", () => {
      if (quantityInput.value < 1) quantityInput.value = 1
      updateModalTotalPrice()
    })

    document.getElementById("add-to-cart-from-modal").addEventListener("click", () => {
      const quantity = Number.parseInt(quantityInput.value, 10)
      addItemsToCart(currentProductForModal, quantity)
      quantityModal.style.display = "none"
      body.style.overflow = ""
      showNotification(`${quantity}x ${currentProductForModal.name} adicionado${quantity > 1 ? "s" : ""}!`)
      showCart()
    })

    // --- Printer Modal Logic ---
    const printerModal = document.getElementById("printer-modal")

    document.getElementById("cancel-printer").addEventListener("click", () => {
      printerModal.style.display = "none"
      body.style.overflow = ""
    })

    document.getElementById("connect-printer").addEventListener("click", async () => {
      updatePrinterStatus("connecting")
      await connectToPrinter()
    })
  }

  // --- Countdown Logic ---
  const setupCountdown = () => {
    const countdownElement = document.getElementById("countdown")
    if (!countdownElement) return

    // Set target to next Sunday 23:00
    const targetDate = new Date()
    const daysUntilSunday = (7 - targetDate.getDay()) % 7
    targetDate.setDate(targetDate.getDate() + (daysUntilSunday || 7))
    targetDate.setHours(23, 0, 0, 0)

    const intervalId = setInterval(() => {
      const now = new Date().getTime()
      const distance = targetDate.getTime() - now

      if (distance < 0) {
        clearInterval(intervalId)
        countdownElement.innerHTML = `
                    <div style="text-align: center; padding: 2rem; background: rgba(233, 30, 99, 0.1); border-radius: var(--border-radius); color: var(--accent-color);">
                        <h3>⏰ OFERTA EXPIRADA!</h3>
                        <p>Mas não se preocupe, sempre temos promoções especiais!</p>
                    </div>
                `
        const offerBtn = document.querySelector(".offer__button")
        if (offerBtn) {
          offerBtn.disabled = true
          offerBtn.textContent = "Oferta Expirada"
          offerBtn.style.opacity = "0.6"
        }
        return
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24))
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((distance % (1000 * 60)) / 1000)

      document.getElementById("days").textContent = String(days).padStart(2, "0")
      document.getElementById("hours").textContent = String(hours).padStart(2, "0")
      document.getElementById("minutes").textContent = String(minutes).padStart(2, "0")
      document.getElementById("seconds").textContent = String(seconds).padStart(2, "0")
    }, 1000)
  }

  // --- INITIALIZATION ---
  init()
})

// --- SERVICE WORKER MESSAGING ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "CACHE_UPDATED") {
      window.showNotification("Nova versão disponível! Recarregue a página para atualizar.")
    }
  })
}

// --- PERFORMANCE MONITORING ---
window.addEventListener("load", () => {
  // Log performance metrics
  if ("performance" in window) {
    const perfData = performance.getEntriesByType("navigation")[0]
    console.log("Page Load Time:", perfData.loadEventEnd - perfData.loadEventStart, "ms")
  }
})

// --- ERROR HANDLING ---
window.addEventListener("error", (e) => {
  console.error("JavaScript Error:", e.error)
  // Could send to analytics service
})

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled Promise Rejection:", e.reason)
  // Could send to analytics service
})

window.showNotification = (message) => {
  clearTimeout(window.notificationTimer)
  document.querySelector(".notification")?.remove()

  const notification = document.createElement("div")
  notification.className = "notification"
  notification.textContent = message
  document.body.appendChild(notification)

  setTimeout(() => notification.classList.add("show"), 10)

  window.notificationTimer = setTimeout(() => {
    notification.classList.remove("show")
    notification.addEventListener("transitionend", () => notification.remove())
  }, 4000)
}
