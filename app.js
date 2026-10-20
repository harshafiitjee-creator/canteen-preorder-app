document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('menu-list');
  const noItemsEl = document.getElementById('no-items');
  const tabs = Array.from(document.querySelectorAll('.category-tab'));
  const cartSection = document.getElementById('cart-section');
  const cartItemsEl = document.getElementById('cart-items');
  const cartTotalEl = document.getElementById('cart-total');
  const cartCountEl = document.getElementById('cart-count');
  const customerNameInput = document.getElementById('customer-name');
  const placeOrderBtn = document.getElementById('place-order-btn');
  const orderMessageEl = document.getElementById('order-message');
  const orderMessageTextEl = document.getElementById('order-message-text');
  const viewOrdersBtn = document.getElementById('view-orders-btn');
  const ordersSection = document.getElementById('orders-section');
  const ordersListEl = document.getElementById('orders-list');
  const cartBar = document.getElementById('cart-bar');
  const cartBarText = document.getElementById('cart-bar-text');

  let activeTab = 'Snacks';
  let cart = [];

  function getSavedOrders() {
    try {
      const raw = localStorage.getItem('orders');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function showOrderMessage(message, type, options = {}) {
    orderMessageTextEl.textContent = message;
    orderMessageEl.hidden = false;
    orderMessageEl.classList.remove('error', 'success');

    if (type === 'error') {
      orderMessageEl.classList.add('error');
    } else if (type === 'success') {
      orderMessageEl.classList.add('success');
    }

    viewOrdersBtn.hidden = !options.showViewOrders;
  }

  function formatPrice(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN');
  }

  function getCartTotal() {
    return cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.qty)), 0);
  }

  function getCartItemCount() {
    return cart.reduce((sum, item) => sum + Number(item.qty), 0);
  }

  function updateCartBar() {
    const itemCount = getCartItemCount();
    const total = getCartTotal();
    const hasItems = itemCount > 0;

    cartBar.hidden = !hasItems;
    cartBarText.textContent = `${itemCount} item${itemCount === 1 ? '' : 's'} · ${formatPrice(total)} — View cart`;
    document.body.classList.toggle('has-cart-bar', hasItems);
  }

  function renderCart() {
    if (!cart.length) {
      cartSection.hidden = true;
      cartItemsEl.innerHTML = '';
      cartCountEl.textContent = '0 items';
      cartTotalEl.textContent = '₹0';
      updateCartBar();
      return;
    }

    cartSection.hidden = false;
    const itemCount = getCartItemCount();
    cartCountEl.textContent = `${itemCount} item${itemCount === 1 ? '' : 's'}`;
    cartTotalEl.textContent = formatPrice(getCartTotal());
    cartItemsEl.innerHTML = '';

    cart.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'cart-item-row';

      const left = document.createElement('div');
      left.className = 'cart-item-meta';

      const name = document.createElement('span');
      name.className = 'cart-item-name';
      name.textContent = item.name;

      const controls = document.createElement('div');
      controls.className = 'qty-controls';

      const minusBtn = document.createElement('button');
      minusBtn.type = 'button';
      minusBtn.className = 'qty-btn';
      minusBtn.textContent = '−';
      minusBtn.setAttribute('aria-label', `Decrease quantity for ${item.name}`);
      minusBtn.addEventListener('click', () => {
        updateCartItem(item.id, -1);
      });

      const qtyValue = document.createElement('span');
      qtyValue.className = 'qty-value';
      qtyValue.textContent = String(item.qty);

      const plusBtn = document.createElement('button');
      plusBtn.type = 'button';
      plusBtn.className = 'qty-btn';
      plusBtn.textContent = '+';
      plusBtn.setAttribute('aria-label', `Increase quantity for ${item.name}`);
      plusBtn.addEventListener('click', () => {
        updateCartItem(item.id, 1);
      });

      controls.appendChild(minusBtn);
      controls.appendChild(qtyValue);
      controls.appendChild(plusBtn);

      left.appendChild(name);
      row.appendChild(left);
      row.appendChild(controls);

      const price = document.createElement('strong');
      price.textContent = formatPrice(item.price * item.qty);
      row.appendChild(price);

      cartItemsEl.appendChild(row);
    });

    updateCartBar();
  }

  function updateCartItem(itemId, delta) {
    const itemIndex = cart.findIndex((item) => item.id === itemId);

    if (itemIndex === -1) {
      return;
    }

    cart[itemIndex].qty += delta;

    if (cart[itemIndex].qty <= 0) {
      cart.splice(itemIndex, 1);
    }

    renderCart();
    if (activeTab === 'My Orders') {
      ordersSection.hidden = false;
    }
  }

  function addToCart(itemId) {
    const menuItem = MENU.find((item) => Number(item.id) === Number(itemId));

    if (!menuItem) {
      return;
    }

    const itemInCart = cart.find((item) => Number(item.id) === Number(itemId));

    if (itemInCart) {
      itemInCart.qty += 1;
    } else {
      cart.push({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        qty: 1,
      });
    }

    renderCart();
    orderMessageEl.hidden = true;
  }

  function flashAddedButton(button) {
    const originalText = button.dataset.originalText || 'Add';
    button.textContent = 'Added ✓';
    button.classList.add('added');
    button.disabled = true;

    clearTimeout(button._addedTimeoutId);
    button._addedTimeoutId = setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('added');
      button.disabled = false;
    }, 1000);
  }

  function selectTab(category) {
    activeTab = category;

    tabs.forEach((tab) => {
      const isSelected = tab.dataset.category === category;
      tab.classList.toggle('active', isSelected);
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
    });

    if (category === 'My Orders') {
      container.hidden = true;
      noItemsEl.hidden = true;
      ordersSection.hidden = false;
      cartSection.hidden = true;
      renderOrders();
      return;
    }

    container.hidden = false;
    ordersSection.hidden = true;
    renderItems(category);
    renderCart();
  }

  function renderItems(category) {
    container.innerHTML = '';

    const items = MENU.filter((item) => {
      return item && item.available === true && item.category === category;
    });

    if (items.length === 0) {
      noItemsEl.hidden = false;
      noItemsEl.textContent = 'No items available right now.';
      return;
    }

    noItemsEl.hidden = true;

    items.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'item';
      card.setAttribute('data-id', item.id);
      card.setAttribute('aria-label', `${item.name}, ${formatPrice(item.price)}`);

      const left = document.createElement('div');
      left.className = 'item-left';

      const info = document.createElement('div');
      info.className = 'item-info';

      const name = document.createElement('h3');
      name.className = 'item-name';
      name.textContent = item.name;

      const meta = document.createElement('div');
      meta.className = 'item-meta';

      const badge = document.createElement('span');
      badge.className = 'diet-badge ' + (item.veg ? 'veg' : 'nonveg');
      badge.textContent = item.veg ? 'Veg' : 'Non-veg';

      meta.appendChild(badge);
      info.appendChild(name);
      info.appendChild(meta);
      left.appendChild(info);

      const right = document.createElement('div');
      right.className = 'item-right';

      const price = document.createElement('div');
      price.className = 'price';
      price.textContent = formatPrice(item.price);

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'add-btn';
      addButton.dataset.originalText = 'Add';
      addButton.textContent = 'Add';
      addButton.addEventListener('click', () => {
        addToCart(item.id);
        flashAddedButton(addButton);
      });

      right.appendChild(price);
      right.appendChild(addButton);
      card.appendChild(left);
      card.appendChild(right);
      container.appendChild(card);
    });
  }

  function renderOrders() {
    const orders = getSavedOrders().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    ordersListEl.innerHTML = '';

    if (!orders.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-orders';
      empty.textContent = 'No orders yet. Your saved orders will appear here.';
      ordersListEl.appendChild(empty);
      return;
    }

    orders.forEach((order) => {
      const card = document.createElement('article');
      card.className = 'order-card';

      const header = document.createElement('div');
      header.className = 'order-row-meta';

      const title = document.createElement('h3');
      title.textContent = `Order #${order.id}`;

      const status = document.createElement('span');
      status.className = 'order-status';
      status.textContent = order.status || 'Received';

      header.appendChild(title);
      header.appendChild(status);

      const customer = document.createElement('p');
      customer.textContent = `Name: ${order.name}`;

      const itemList = document.createElement('ul');
      itemList.className = 'order-items';
      order.items.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = `${item.name} x${item.qty}`;
        itemList.appendChild(li);
      });

      const total = document.createElement('p');
      total.textContent = `Total: ${formatPrice(order.total)}`;

      const date = document.createElement('p');
      date.textContent = `Placed: ${new Date(order.createdAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })}`;

      card.appendChild(header);
      card.appendChild(customer);
      card.appendChild(itemList);
      card.appendChild(total);
      card.appendChild(date);
      ordersListEl.appendChild(card);
    });
  }

  function getNextOrderNumber() {
    const orders = getSavedOrders();
    return 1000 + orders.length + 1;
  }

  function placeOrder() {
    if (!cart.length) {
      showOrderMessage('Your cart is empty. Add an item before placing an order.', 'error');
      return;
    }

    const name = customerNameInput.value.trim();
    if (!name) {
      showOrderMessage('Please enter your name before placing the order.', 'error');
      customerNameInput.focus();
      return;
    }

    const order = {
      id: getNextOrderNumber(),
      name,
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        price: item.price,
      })),
      total: getCartTotal(),
      pickupSlot: null,
      status: 'Received',
      createdAt: new Date().toISOString(),
    };

    const orders = getSavedOrders();
    orders.unshift(order);
    localStorage.setItem('orders', JSON.stringify(orders));

    cart = [];
    customerNameInput.value = '';
    renderCart();
    renderOrders();
    showOrderMessage(`Order #${order.id} has been placed successfully.`, 'success', { showViewOrders: true });
    selectTab('Snacks');
  }

  if (typeof MENU === 'undefined' || !Array.isArray(MENU)) {
    noItemsEl.hidden = false;
    noItemsEl.textContent = 'Menu data not found.';
    return;
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const category = tab.dataset.category;
      selectTab(category);
    });
  });

  placeOrderBtn.addEventListener('click', placeOrder);
  viewOrdersBtn.addEventListener('click', () => {
    selectTab('My Orders');
  });

  cartBar.addEventListener('click', () => {
    if (activeTab === 'My Orders') {
      selectTab('Snacks');
    }

    requestAnimationFrame(() => {
      cartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  selectTab('Snacks');
  renderCart();
  renderOrders();
});
