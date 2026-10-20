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
  const checkoutErrorEl = document.getElementById('checkout-error');
  const pickupSlotButtonsEl = document.getElementById('pickup-slot-buttons');
  const testFillSlotBtn = document.getElementById('test-fill-slot-btn');

  let activeTab = 'Snacks';
  let cart = [];
  let selectedPickupSlot = null;

  function getSavedOrders() {
    try {
      const raw = localStorage.getItem('orders');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function getCurrentTimeOverride() {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('time');
    return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : null;
  }

  function toMinutes(timeString) {
    const [hours, minutes] = String(timeString).split(':').map(Number);
    return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
  }

  function getCurrentTimeString() {
    const override = getCurrentTimeOverride();
    if (override) {
      return override;
    }

    const now = new Date();
    return now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  function getPickupSlotOptions() {
    const slots = [];
    for (let totalMinutes = 12 * 60; totalMinutes <= 13 * 60 + 45; totalMinutes += 15) {
      const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const minutes = String(totalMinutes % 60).padStart(2, '0');
      slots.push(`${hours}:${minutes}`);
    }
    return slots;
  }

  const SLOT_CAPACITY = 20;

  function getLocalDateKey(date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  // AL-54: count only today's orders (not cancelled) so capacity resets every day
  function getPickupSlotCount(slot) {
    const todayKey = getLocalDateKey(new Date());
    return getSavedOrders().filter((order) => {
      return order
        && order.pickupSlot === slot
        && order.status !== 'Cancelled'
        && getLocalDateKey(order.createdAt) === todayKey;
    }).length;
  }

  function isSlotFull(slot) {
    return getPickupSlotCount(slot) >= SLOT_CAPACITY;
  }

  function renderPickupSlots() {
    pickupSlotButtonsEl.innerHTML = '';

    const currentMinutes = toMinutes(getCurrentTimeString());
    const availableSlots = getPickupSlotOptions().filter((slot) => toMinutes(slot) > currentMinutes);

    if (!availableSlots.length) {
      const empty = document.createElement('div');
      empty.className = 'pickup-slot-empty';
      empty.textContent = 'No more pickup slots today.';
      pickupSlotButtonsEl.appendChild(empty);
      selectedPickupSlot = null;
      return;
    }

    // AL-54: drop the selection if that slot has passed or has become full
    if (selectedPickupSlot && (!availableSlots.includes(selectedPickupSlot) || isSlotFull(selectedPickupSlot))) {
      selectedPickupSlot = null;
    }

    availableSlots.forEach((slot) => {
      const count = getPickupSlotCount(slot);
      const isFull = count >= 20;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pickup-slot-btn';

      if (isFull) {
        button.classList.add('full');
        button.disabled = true;
      } else if (selectedPickupSlot === slot) {
        button.classList.add('selected');
      }

      const slotText = document.createElement('span');
      slotText.className = 'pickup-slot-time';
      slotText.textContent = slot;
      button.appendChild(slotText);

      if (isFull) {
        const status = document.createElement('span');
        status.className = 'pickup-slot-status full';
        status.textContent = 'Full';
        button.appendChild(status);
      } else if (selectedPickupSlot === slot) {
        const status = document.createElement('span');
        status.className = 'pickup-slot-status';
        status.textContent = 'Selected';
        button.appendChild(status);
      }

      if (!isFull) {
        button.addEventListener('click', () => {
          selectedPickupSlot = slot;
          renderPickupSlots();
        });
      }

      pickupSlotButtonsEl.appendChild(button);
    });
  }

  function fill12ThirtySlotForTest() {
    const orders = getSavedOrders();
    const dummyOrders = Array.from({ length: 20 }, (_, index) => ({
      id: `test-${Date.now()}-${index}`,
      name: `Test Student ${index + 1}`,
      items: [{ id: `test-item-${index}`, name: 'Test Item', qty: 1, price: 0 }],
      total: 0,
      pickupSlot: '12:30',
      status: 'Received',
      createdAt: new Date().toISOString(),
    }));

    localStorage.setItem('orders', JSON.stringify([...orders, ...dummyOrders]));
    renderPickupSlots();
    renderOrders();
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
    orderMessageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showCheckoutError(message) {
    if (!message) {
      checkoutErrorEl.textContent = '';
      checkoutErrorEl.hidden = true;
      return;
    }

    checkoutErrorEl.textContent = message;
    checkoutErrorEl.hidden = false;
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

      const pickup = document.createElement('p');
      pickup.textContent = `Pickup: ${order.pickupSlot || 'Not selected'}`;

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
      card.appendChild(pickup);
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
      orderMessageEl.hidden = true;
      showCheckoutError('Your cart is empty. Add an item before placing an order.');
      return;
    }

    const name = customerNameInput.value.trim();
    if (!name) {
      orderMessageEl.hidden = true;
      showCheckoutError('Please enter your name before placing the order.');
      customerNameInput.focus();
      return;
    }

    if (!selectedPickupSlot) {
      orderMessageEl.hidden = true;
      showCheckoutError('Please choose a pickup time');
      return;
    }

    // AL-54: re-check capacity at the moment of ordering, not just when the buttons were drawn
    if (isSlotFull(selectedPickupSlot)) {
      selectedPickupSlot = null;
      renderPickupSlots();
      orderMessageEl.hidden = true;
      showCheckoutError('Sorry, that pickup time just became full. Please choose another time.');
      return;
    }

    const chosenPickupSlot = selectedPickupSlot;
    selectedPickupSlot = null;

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
      pickupSlot: chosenPickupSlot,
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
    renderPickupSlots();
    showCheckoutError('');
    selectTab('Snacks');
    showOrderMessage(`Order #${order.id} has been placed successfully for pickup at ${chosenPickupSlot}.`, 'success', { showViewOrders: true });
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

  if (new URLSearchParams(window.location.search).get('test') === '1') {
    testFillSlotBtn.hidden = false;
    testFillSlotBtn.addEventListener('click', fill12ThirtySlotForTest);
  }

  selectTab('Snacks');
  renderPickupSlots();
  renderCart();
  renderOrders();
});

