const products = [
  {
    id: "pina-1",
    name: "Piña tropical",
    price: 14.5,
    description: "Piña fresca, dulce y lista para comer.",
    promotion: "2x1 en martes",
    image: ""
  },
  {
    id: "pina-2",
    name: "Jugo de piña loca",
    price: 8.75,
    description: "Refrescante jugo natural con un toque especial.",
    promotion: "Descuento 15%"
  },
  {
    id: "pina-3",
    name: "Mermelada de piña",
    price: 9.2,
    description: "Sabor intenso para tu pan o postre.",
    promotion: "Compra 3 y paga 2"
  }
];

const PRODUCTS_STORAGE_KEY = 'pinaLocaProducts';
const INVOICES_STORAGE_KEY = 'pinaLocaInvoices';

const API_BASE_URL = (window.API_BASE_URL !== undefined ? window.API_BASE_URL : getApiBaseUrl()).replace(/\/+$/, '');

if (window.API_BASE_URL === undefined && !['127.0.0.1', 'localhost'].includes(window.location.hostname)) {
  console.warn('No se detecta config.js con window.API_BASE_URL definido. Si tu backend está en la nube, edita config.js para apuntar a la URL pública del servidor.');
}

function getApiBaseUrl() {
  const host = window.location.hostname;
  if (host === '127.0.0.1' || host === 'localhost') {
    return 'http://127.0.0.1:5000';
  }
  return '';
}

function buildApiUrl(path) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

function loadProducts() {
  try {
    const saved = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) {
        // replace default products with saved ones
        products.length = 0;
        parsed.forEach(p => products.push(p));
      }
    }
  } catch (e) {
    console.warn('No se pudo cargar productos desde localStorage', e);
  }
}

function saveProducts() {
  try {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  } catch (e) {
    console.warn('No se pudo guardar productos en localStorage', e);
  }
}

loadProducts();

const invoices = [];

function loadInvoices() {
  try {
    const saved = localStorage.getItem(INVOICES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        invoices.length = 0;
        parsed.forEach(i => invoices.push(i));
      }
    }
  } catch (e) {
    console.warn('No se pudo cargar facturas desde localStorage', e);
  }
}

function saveInvoices() {
  try {
    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices));
  } catch (e) {
    console.warn('No se pudo guardar facturas en localStorage', e);
  }
}

loadInvoices();

const cart = [];

function parsePromotion(product, quantity) {
  const promotion = (product.promotion || '').trim();
  if (!promotion) {
    return { discount: 0, description: '' };
  }

  const lower = promotion.toLowerCase();
  let discount = 0;
  const description = promotion;

  if (!lower.includes('descuento')) {
    return { discount, description };
  }

  const percentMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
  if (percentMatch) {
    const percent = parseFloat(percentMatch[1]);
    discount = product.price * quantity * (percent / 100);
  }

  return { discount, description };
}

function renderPromotions() {
  const promoProducts = products.filter((product) => product.promotion && product.promotion.trim());
  if (!promoProducts.length) {
    promoCards.innerHTML = '<p class="info-text">No hay productos con promociones activas.</p>';
    return;
  }

  promoCards.innerHTML = promoProducts
    .map((product) => {
      const imageSection = product.image
        ? `<img src="${product.image}" alt="${product.name}" />`
        : `<div class="image-placeholder">Sin imagen</div>`;
      const promoText = product.promotion ? `<p class="product-promo">${product.promotion}</p>` : '';
      const promoData = parsePromotion(product, 1);
      const discountText = promoData.discount > 0 ? `<p class="product-discount">Descuento: ${formatPrice(promoData.discount)} en 1 unidad</p>` : '';
      return `
      <article class="product-card promo-card">
        ${imageSection}
        <h4>${product.name}</h4>
        <p>${product.description}</p>
        ${promoText}
        ${discountText}
        <div class="product-quantity">
          <label for="qty-${product.id}">Cantidad</label>
          <input id="qty-${product.id}" type="number" min="0" value="0" />
        </div>
        <div class="product-footer">
          <span><strong>${formatPrice(product.price)}</strong></span>
          <button class="primary-btn" onclick="addToCart('${product.id}', document.getElementById('qty-${product.id}').value)">Agregar</button>
        </div>
      </article>`;
    })
    .join('');
}
let editMode = false;
let currentUser = null;
let selectedInvoiceNumber = null;
let isAdmin = false;
const users = [];
const USERS_STORAGE_KEY = "pinaLocaUsers";

function loadUsers() {
  const saved = localStorage.getItem(USERS_STORAGE_KEY);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      parsed.forEach((user) => {
        if (user && user.email && user.password) {
          users.push(user);
        }
      });
    }
  } catch (err) {
    console.warn("No se pudo cargar usuarios guardados", err);
  }
}

function saveUsers() {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

loadUsers();

const authView = document.getElementById("authView");
const userView = document.getElementById("userView");
const adminView = document.getElementById("adminView");
const authMessage = document.getElementById("authMessage");
const sessionStatus = document.getElementById("sessionStatus");
const logoutBtn = document.getElementById("logoutBtn");
const userLoginForm = document.getElementById("userLoginForm");
const userEmailInput = document.getElementById("userEmail");
const userPasswordInput = document.getElementById("userPassword");
const createAccountBtn = document.getElementById("createAccountBtn");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminPasswordInput = document.getElementById("adminPassword");
const productImageUrlInput = document.getElementById("productImageUrl");
const productImageInput = document.getElementById("productImage");
const imagePreview = document.getElementById("imagePreview");
const productGrid = document.getElementById("productGrid");
const promoCards = document.getElementById("promoCards");
const cartList = document.getElementById("cartList");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const toastMessage = document.getElementById("toastMessage");
const checkoutBtn = document.getElementById("checkoutBtn");
const adminTableBody = document.getElementById("adminTableBody");
const userInvoicesContainer = document.getElementById("userInvoices");
const adminInvoiceTableBody = document.getElementById("adminInvoiceTableBody");
const productForm = document.getElementById("productForm");
const productIdInput = document.getElementById("productId");
const productNameInput = document.getElementById("productName");
const productPriceInput = document.getElementById("productPrice");
const productDescriptionInput = document.getElementById("productDescription");
const productPromoInput = document.getElementById("productPromo");
const cancelEditBtn = document.getElementById("cancelEditBtn");

function showAuthMessage(message, type = "info") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

function renderSessionStatus() {
  if (isAdmin) {
    sessionStatus.textContent = "Sesión de administrador activa";
  } else if (currentUser) {
    sessionStatus.textContent = `Usuario: ${currentUser.email}`;
  } else {
    sessionStatus.textContent = "Inicia sesión para comenzar";
  }
}

function clearAuthFields() {
  userLoginForm.reset();
  adminLoginForm.reset();
  authMessage.textContent = "";
}

function showView(view) {
  authView.classList.toggle("active", view === "auth");
  userView.classList.toggle("active", view === "user");
  adminView.classList.toggle("active", view === "admin");
  logoutBtn.classList.toggle("hidden", view === "auth");
  if (view === "auth") {
    clearAuthFields();
  }
  renderSessionStatus();
}

function formatPrice(price) {
  return `Q${price.toFixed(2)}`;
}

function renderProducts() {
  const regularProducts = products.filter((product) => !product.promotion || !product.promotion.trim());
  if (!regularProducts.length) {
    productGrid.innerHTML = '<p class="info-text">No hay productos sin promoción. Revisa las ofertas o crea nuevos productos.</p>';
  } else {
    productGrid.innerHTML = regularProducts
      .map((product) => {
        const imageSection = product.image
          ? `<img src="${product.image}" alt="${product.name}" />`
          : `<div class="image-placeholder">Sin imagen</div>`;

        return `
        <article class="product-card">
          ${imageSection}
          <h4>${product.name}</h4>
          <p>${product.description}</p>
          <div class="product-quantity">
            <label for="qty-${product.id}">Cantidad</label>
            <input id="qty-${product.id}" type="number" min="0" value="0" />
          </div>
          <div class="product-footer">
            <span><strong>${formatPrice(product.price)}</strong></span>
            <button class="primary-btn" onclick="addToCart('${product.id}', document.getElementById('qty-${product.id}').value)">Agregar</button>
          </div>
        </article>`;
      })
      .join("");
  }

  adminTableBody.innerHTML = products
    .map(
      (product) =>
        `<tr>
          <td>${product.name}</td>
          <td>${formatPrice(product.price)}</td>
          <td>${product.promotion || "-"}</td>
          <td>
            <button class="secondary-btn" onclick="editProduct('${product.id}')">Editar</button>
            <button class="secondary-btn" onclick="deleteProduct('${product.id}')">Eliminar</button>
          </td>
        </tr>`
    )
    .join("");

  renderPromotions();
}

function renderCart() {
  cartList.innerHTML = cart
    .map(
      (item) => {
        const { discount } = parsePromotion(item, item.quantity);
        const subtotal = item.price * item.quantity - discount;
        return `
          <li>
            <div class="cart-item-info">
              <span>${item.name} x${item.quantity}</span>
              <strong>${formatPrice(subtotal)}</strong>
            </div>
            <button class="remove-cart-btn" onclick="removeFromCart('${item.id}')">Eliminar</button>
          </li>`;
      }
    )
    .join("");

  const total = cart.reduce((sum, item) => {
    const { discount } = parsePromotion(item, item.quantity);
    return sum + item.price * item.quantity - discount;
  }, 0);
  cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartTotal.textContent = formatPrice(total);
  checkoutBtn.disabled = total === 0;
}

function removeFromCart(id) {
  const index = cart.findIndex((item) => item.id === id);
  if (index >= 0) {
    cart.splice(index, 1);
    renderCart();
  }
}

function formatInvoiceDate(date) {
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderUserInvoices() {
  if (!currentUser) {
    userInvoicesContainer.innerHTML = '<p class="info-text">Inicia sesión para ver tus facturas.</p>';
    renderInvoiceDetails(null);
    return;
  }

  const userInvoices = invoices.filter((invoice) => invoice.user === currentUser.email).sort((a, b) => b.timestamp - a.timestamp);
  if (!userInvoices.length) {
    userInvoicesContainer.innerHTML = '<p class="info-text">Aún no tienes facturas. Compra algo para generar una factura.</p>';
    renderInvoiceDetails(null);
    return;
  }

  if (!selectedInvoiceNumber || !userInvoices.some((invoice) => invoice.number === selectedInvoiceNumber)) {
    selectedInvoiceNumber = userInvoices[0].number;
  }

  userInvoicesContainer.innerHTML = userInvoices
    .map(
      (invoice) => `
      <div class="invoice-card${selectedInvoiceNumber === invoice.number ? ' active-invoice' : ''}">
        <div>
          <strong>Factura ${invoice.number}</strong>
          <p>${formatInvoiceDate(new Date(invoice.timestamp))}</p>
        </div>
        <div class="invoice-card-right">
          <span>${invoice.items.length} artículos</span>
          <strong>${formatPrice(invoice.total)}</strong>
        </div>
        <div class="invoice-card-actions">
          <button class="secondary-btn" onclick="selectInvoice('${invoice.number}')">Ver detalle</button>
          <button class="secondary-btn" onclick="downloadInvoice('${invoice.number}')">Descargar PDF</button>
        </div>
      </div>`
    )
    .join('');

  const selected = userInvoices.find((invoice) => invoice.number === selectedInvoiceNumber);
  renderInvoiceDetails(selected);
}

function renderInvoiceDetails(invoice) {
  const invoiceDetailContent = document.getElementById('invoiceDetailContent');
  if (!invoice) {
    invoiceDetailContent.innerHTML = '<p class="info-text">Selecciona una factura para ver aquí los datos completos de la factura.</p>';
    return;
  }

  invoiceDetailContent.innerHTML = `
    <div class="invoice-detail-header">
      <div class="invoice-detail-summary">
        <strong>Factura ${invoice.number}</strong>
        <p>Cliente: ${invoice.user}</p>
        <p>Fecha: ${formatInvoiceDate(new Date(invoice.timestamp))}</p>
      </div>
      <div class="invoice-detail-summary">
        <strong>Resumen</strong>
        <p>Artículos: ${invoice.items.length}</p>
        <p>Total: ${formatPrice(invoice.total)}</p>
        <button class="primary-btn" onclick="downloadInvoice('${invoice.number}')">Descargar PDF</button>
      </div>
    </div>
    <table class="invoice-detail-table">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Imagen</th>
          <th>Cantidad</th>
          <th>Precio</th>
          <th>Promoción</th>
          <th>Descuento</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items
          .map(
            (item) => `
          <tr>
            <td>${item.name}</td>
            <td>${item.image ? `<img src="${item.image}" alt="${item.name}" class="preview-thumb" />` : 'Sin imagen'}</td>
            <td>${item.quantity}</td>
            <td>${formatPrice(item.price)}</td>
            <td>${item.promotion ? `<span class="promotion-label">${item.promotion}</span>` : '---'}</td>
            <td>${(item.discount || 0) > 0 ? `-${formatPrice(item.discount || 0)}` : '---'}</td>
            <td>${formatPrice(item.lineTotal || item.price * item.quantity)}</td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function selectInvoice(number) {
  selectedInvoiceNumber = number;
  renderUserInvoices();
}

function renderAdminInvoices() {
  adminInvoiceTableBody.innerHTML = invoices
    .map(
      (invoice) => `
      <tr>
        <td>${invoice.number}</td>
        <td>${invoice.user}</td>
        <td>${formatInvoiceDate(new Date(invoice.timestamp))}</td>
        <td>${formatPrice(invoice.total)}</td>
        <td class="invoice-thumbnails">
          ${invoice.items
            .map(
              (item) => item.image
                ? `<div class="invoice-thumb"><img src="${item.image}" alt="${item.name}" /><span>${item.name}</span></div>`
                : `<span>Sin imagen</span>`
            )
            .join('')}
        </td>
        <td><button class="secondary-btn" onclick="downloadInvoice('${invoice.number}')">Descargar</button></td>
      </tr>`
    )
    .join('');
}

function pdfEscape(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function generateInvoicePdf(invoice) {
  const title = 'Piña Loca - Factura';
  const contentLines = [
    'BT',
    '/F1 18 Tf',
    `50 760 Td (${pdfEscape(title)}) Tj`,
    '0 -24 Td',
    '/F1 12 Tf',
    `(${pdfEscape(`Factura: ${invoice.number}`)}) Tj`,
    '0 -18 Td',
    `(${pdfEscape(`Cliente: ${invoice.user}`)}) Tj`,
    '0 -18 Td',
    `(${pdfEscape(`Fecha: ${formatInvoiceDate(new Date(invoice.timestamp))}`)}) Tj`,
    '0 -24 Td',
    `(${pdfEscape('----------------------------------------')}) Tj`,
    '0 -18 Td',
    `(${pdfEscape('Detalle de productos:')}) Tj`,
    '0 -18 Td',
    ...invoice.items.flatMap((item) => {
      const promoLabel = item.promotion ? ` (${item.promotion})` : '';
      const discountLine = item.discount > 0 ? ` Descuento: -${formatPrice(item.discount)}` : '';
      return [
        `(${pdfEscape(`${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}${promoLabel}${discountLine}`)}) Tj`,
        '0 -18 Td'
      ];
    }),
    `(${pdfEscape('----------------------------------------')}) Tj`,
    '0 -18 Td',
    `(${pdfEscape(`Total: ${formatPrice(invoice.total)}`)}) Tj`,
    '0 -24 Td',
    `(${pdfEscape('Gracias por tu compra en Piña Loca!')}) Tj`,
    'ET'
  ];

  const stream = contentLines.join('\n');
  const obj1 = `1 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`;
  const obj2 = '2 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n';
  const obj4 = '4 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 1 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  const header = '%PDF-1.3\n';
  const body = obj1 + obj2 + obj3 + obj4 + obj5;
  const offsets = [];
  let currentOffset = header.length;
  [obj1, obj2, obj3, obj4, obj5].forEach((obj) => {
    offsets.push(currentOffset);
    currentOffset += obj.length;
  });

  const xref = [
    'xref',
    '0 6',
    '0000000000 65535 f '
  ]
    .concat(offsets.map((offset) => String(offset).padStart(10, '0') + ' 00000 n '))
    .join('\n');

  const trailer = `trailer\n<< /Root 2 0 R /Size 6 >>\nstartxref\n${header.length + body.length}\n%%EOF`;
  const pdf = header + body + xref + '\n' + trailer;

  return new Blob([pdf], { type: 'application/pdf' });
}

function downloadInvoice(number) {
  const invoice = invoices.find((item) => item.number === number);
  if (!invoice) return;

  const blob = generateInvoicePdf(invoice);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `factura-${invoice.number}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function addToCart(id, quantity = 1) {
  const product = products.find((item) => item.id === id);
  if (!product) return;

  quantity = parseInt(quantity, 10);
  if (Number.isNaN(quantity) || quantity <= 0) {
    showCartMessage('Selecciona una cantidad mayor a 0');
    return;
  }

  const existing = cart.find((item) => item.id === id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ ...product, quantity });
  }

  resetAllQuantities();
  showCartMessage('Se ha agregado al carrito');
  renderCart();
}

function resetAllQuantities() {
  document.querySelectorAll('.product-quantity input[type="number"]').forEach((input) => {
    input.value = 0;
  });
}

function showCartMessage(message, duration = 2500) {
  if (!toastMessage) return;
  toastMessage.textContent = message;
  toastMessage.classList.add('visible');
  setTimeout(() => {
    toastMessage.classList.remove('visible');
  }, duration);
}

function checkout() {
  if (cart.length === 0) return;
  if (!currentUser) {
    showAuthMessage('Inicia sesión para generar una factura.', 'error');
    showView('auth');
    return;
  }

  const invoiceNumber = `F-${Date.now()}`;
  const invoice = {
    number: invoiceNumber,
    user: currentUser.email,
    timestamp: Date.now(),
    items: cart.map((item) => {
      const { discount, description } = parsePromotion(item, item.quantity);
      const lineTotal = item.price * item.quantity - discount;
      return {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image || '',
        promotion: item.promotion || '',
        discount,
        promotionLabel: description,
        lineTotal
      };
    }),
    total: cart.reduce((sum, item) => {
      const { discount } = parsePromotion(item, item.quantity);
      return sum + item.price * item.quantity - discount;
    }, 0)
  };
  invoices.push(invoice);
  saveInvoices();

  alert(`Gracias por tu compra. Total: ${formatPrice(invoice.total)}\nFactura generada: ${invoiceNumber}`);
  cart.length = 0;
  renderCart();
  renderUserInvoices();
  renderAdminInvoices();
}

function updateImagePreview(file) {
  if (!file) {
    imagePreview.innerHTML = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    imagePreview.innerHTML = `<img src="${e.target.result}" alt="Vista previa" />`;
  };
  reader.readAsDataURL(file);
}

function updateImagePreviewFromUrl() {
  const url = productImageUrlInput.value.trim();
  if (!url) {
    imagePreview.innerHTML = "";
    return;
  }

  const img = new Image();
  img.onload = () => {
    imagePreview.innerHTML = `<img src="${url}" alt="Vista previa" />`;
  };
  img.onerror = () => {
    imagePreview.innerHTML = '<div class="error-text">No se pudo cargar la imagen. Verifica el enlace.</div>';
  };
  img.src = url;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loginUser(event) {
  event.preventDefault();
  const email = userEmailInput.value.trim().toLowerCase();
  const password = userPasswordInput.value.trim();

  if (!email || !password) {
    showAuthMessage("Ingresa correo y contraseña", "error");
    return;
  }
  fetch(buildApiUrl('/api/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        currentUser = { email };
        isAdmin = false;
        try {
          localStorage.setItem('pinaLocaCurrentUser', JSON.stringify({ email, ts: Date.now() }));
        } catch (e) {
          console.warn('No se pudo guardar sesión en localStorage', e);
        }
        showView('user');
        showAuthMessage('Has iniciado sesión como usuario.', 'success');
        renderProducts();
        renderCart();
        renderUserInvoices();
        renderAdminInvoices();
      } else {
        showAuthMessage(data.message || 'Error en inicio de sesión', 'error');
      }
    })
    .catch((err) => {
      showAuthMessage('No se pudo conectar al servidor', 'error');
      console.error(err);
    });
}

function createAccount() {
  const email = userEmailInput.value.trim().toLowerCase();
  const password = userPasswordInput.value.trim();

  if (!email || !password) {
    showAuthMessage("Ingresa correo y contraseña para crear la cuenta", "error");
    return;
  }
  fetch(buildApiUrl('/api/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        // also keep a local copy for compatibility
        try {
          if (!users.some((u) => u.email === email)) {
            users.push({ email, password });
            saveUsers();
          }
        } catch (e) {
          console.warn('No se pudo guardar usuario localmente', e);
        }
        showAuthMessage('Cuenta creada. Ahora puedes ingresar.', 'success');
        userLoginForm.reset();
      } else {
        showAuthMessage(data.message || 'Error al crear cuenta', 'error');
      }
    })
    .catch((err) => {
      showAuthMessage('No se pudo conectar al servidor', 'error');
      console.error(err);
    });
}

function loginAdmin(event) {
  event.preventDefault();
  const password = adminPasswordInput.value.trim();

  if (password !== "bafu2008") {
    showAuthMessage("Contraseña de administrador incorrecta.", "error");
    return;
  }

  currentUser = null;
  isAdmin = true;
  showView("admin");
  showAuthMessage("Sesión de administrador activa.", "success");
  renderProducts();
}

function logout() {
  currentUser = null;
  isAdmin = false;
  cart.length = 0;
  renderCart();
  try {
    localStorage.removeItem('pinaLocaCurrentUser');
  } catch (e) {}
  showView("auth");
  showAuthMessage("Has cerrado sesión.", "info");
}

function resetForm() {
  editMode = false;
  productIdInput.value = "";
  productForm.reset();
  productImageInput.value = "";
  imagePreview.innerHTML = "";
}

function editProduct(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;

  editMode = true;
  productIdInput.value = product.id;
  productNameInput.value = product.name;
  productPriceInput.value = product.price;
  productDescriptionInput.value = product.description;
  productPromoInput.value = product.promotion;
  productImageUrlInput.value = product.image || "";
  productImageInput.value = "";
  if (product.image) {
    imagePreview.innerHTML = `<img src="${product.image}" alt="${product.name}" />`;
  } else {
    imagePreview.innerHTML = "";
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteProduct(id) {
  const index = products.findIndex((item) => item.id === id);
  if (index < 0) return;
  products.splice(index, 1);
  renderProducts();
  renderCart();
  saveProducts();
}

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = productIdInput.value;
  const name = productNameInput.value.trim();
  const price = parseFloat(productPriceInput.value);
  const description = productDescriptionInput.value.trim();
  const promotion = productPromoInput.value.trim();
  const url = productImageUrlInput.value.trim();
  const file = productImageInput.files[0];

  if (!name || Number.isNaN(price)) return;

  let image = null;
  try {
    if (url) {
      image = url;
    } else if (file) {
      image = await readFileAsDataURL(file);
    }
  } catch (e) {
    console.warn('No se pudo procesar la imagen', e);
  }

  if (editMode && id) {
    const product = products.find((item) => item.id === id);
    if (product) {
      product.name = name;
      product.price = price;
      product.description = description;
      product.promotion = promotion;
      if (image) {
        product.image = image;
      }
    }
    saveProducts();
  } else {
    products.push({
      id: `pina-${Date.now()}`,
      name,
      price,
      description,
      promotion,
      image: image || ""
    });
  }

  resetForm();
  saveProducts();
  renderProducts();
});

userLoginForm.addEventListener("submit", loginUser);
createAccountBtn.addEventListener("click", createAccount);
adminLoginForm.addEventListener("submit", loginAdmin);
productImageInput.addEventListener("change", (event) => {
  productImageUrlInput.value = "";
  updateImagePreview(event.target.files[0]);
});
productImageUrlInput.addEventListener("input", () => {
  productImageInput.value = "";
  updateImagePreviewFromUrl();
});
cancelEditBtn.addEventListener("click", resetForm);
logoutBtn.addEventListener("click", logout);
checkoutBtn.addEventListener("click", checkout);

renderPromotions();
renderProducts();
renderCart();
renderSessionStatus();
clearAuthFields();
// restore current user session if present
try {
  const saved = localStorage.getItem('pinaLocaCurrentUser');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed && parsed.email) {
      currentUser = { email: parsed.email };
    }
  }
} catch (e) {
  console.warn('No se pudo restaurar sesión desde localStorage', e);
}

renderUserInvoices();
renderAdminInvoices();

if (currentUser) {
  showView('user');
} else {
  showView('auth');
}
