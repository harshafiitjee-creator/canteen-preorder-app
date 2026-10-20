// AL-9: Kitchen view of incoming orders (manager only)
// Orders come from localStorage "orders" (saved by the student app).
// NOTE: the PIN is a demo-only gate. A real app needs proper staff login on a server.
document.addEventListener('DOMContentLoaded', () => {
  const MANAGER_PIN = '1234';
  const SESSION_KEY = 'kitchenUnlocked';

  const pinSection = document.getElementById('pin-section');
  const pinForm = document.getElementById('pin-form');
  const pinInput = document.getElementById('pin-input');
  const pinError = document.getElementById('pin-error');
  const kitchenSection = document.getElementById('kitchen-section');
  const kitchenList = document.getElementById('kitchen-list');
  const kitchenSummary = document.getElementById('kitchen-summary');
  const refreshBtn = document.getElementById('refresh-btn');
  const lockBtn = document.getElementById('lock-btn');

  let refreshTimer = null;

  function isUnlocked() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === 'yes';
    } catch (error) {
      return false;
    }
  }

  function setUnlocked(value) {
    try {
      if (value) {
        sessionStorage.setItem(SESSION_KEY, 'yes');
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch (error) {
      // sessionStorage unavailable: the gate simply resets on reload
    }
  }

  function getSavedOrders() {
    try {
      const raw = localStorage.getItem('orders');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function getLocalDateKey(date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function slotToMinutes(slot) {
    if (typeof slot !== 'string' || !/^\d{2}:\d{2}$/.test(slot)) {
      return Number.POSITIVE_INFINITY; // orders without a slot go last
    }
    const [h, m] = slot.split(':').map(Number);
    return h * 60 + m;
  }

  function formatPrice(amount) {
    return '₹' + Number(amount || 0).toLocaleString('en-IN');
  }

  // Today's orders, sorted by pickup slot (earliest first), then by time placed
  function getTodaysOrdersSorted() {
    const todayKey = getLocalDateKey(new Date());
    return getSavedOrders()
      .filter((order) => order && getLocalDateKey(order.createdAt) === todayKey && order.status !== 'Cancelled')
      .sort((a, b) => {
        const bySlot = slotToMinutes(a.pickupSlot) - slotToMinutes(b.pickupSlot);
        if (bySlot !== 0) {
          return bySlot;
        }
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
  }

  function renderKitchen() {
    const orders = getTodaysOrdersSorted();
    kitchenList.innerHTML = '';

    const slotCount = new Set(orders.map((o) => o.pickupSlot || 'none')).size;
    kitchenSummary.textContent = orders.length
      ? `${orders.length} order${orders.length === 1 ? '' : 's'} today across ${slotCount} pickup time${slotCount === 1 ? '' : 's'}`
      : '';

    if (!orders.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-orders';
      empty.textContent = 'No orders yet today.';
      kitchenList.appendChild(empty);
      return;
    }

    let currentSlot = null;
    let group = null;

    orders.forEach((order) => {
      const slotLabel = order.pickupSlot || 'No pickup time';

      if (slotLabel !== currentSlot) {
        currentSlot = slotLabel;
        const slotOrders = orders.filter((o) => (o.pickupSlot || 'No pickup time') === slotLabel);

        group = document.createElement('section');
        group.className = 'slot-group';

        const heading = document.createElement('h2');
        heading.className = 'slot-heading';
        heading.textContent = `${slotLabel} · ${slotOrders.length} order${slotOrders.length === 1 ? '' : 's'}`;
        group.appendChild(heading);

        kitchenList.appendChild(group);
      }

      const card = document.createElement('article');
      card.className = 'kitchen-order';

      const top = document.createElement('div');
      top.className = 'kitchen-order-top';

      const number = document.createElement('span');
      number.className = 'kitchen-order-number';
      number.textContent = `#${order.id}`;

      const name = document.createElement('span');
      name.className = 'kitchen-order-name';
      name.textContent = order.name || 'Unknown';

      const status = document.createElement('span');
      status.className = 'order-status';
      status.textContent = order.status || 'Received';

      top.appendChild(number);
      top.appendChild(name);
      top.appendChild(status);

      const items = document.createElement('ul');
      items.className = 'kitchen-items';
      (Array.isArray(order.items) ? order.items : []).forEach((item) => {
        const li = document.createElement('li');
        const qty = document.createElement('strong');
        qty.textContent = `${item.qty} ×`;
        li.appendChild(qty);
        li.appendChild(document.createTextNode(` ${item.name}`));
        items.appendChild(li);
      });

      const total = document.createElement('p');
      total.className = 'kitchen-order-total';
      total.textContent = `Total ${formatPrice(order.total)}`;

      card.appendChild(top);
      card.appendChild(items);
      card.appendChild(total);
      group.appendChild(card);
    });
  }

  function showKitchen() {
    pinSection.hidden = true;
    kitchenSection.hidden = false;
    lockBtn.hidden = false;
    renderKitchen();
    clearInterval(refreshTimer);
    refreshTimer = setInterval(renderKitchen, 30000); // keep the list fresh during rush hour
  }

  function showPin() {
    clearInterval(refreshTimer);
    kitchenList.innerHTML = '';
    kitchenSection.hidden = true;
    lockBtn.hidden = true;
    pinSection.hidden = false;
    pinInput.value = '';
  }

  pinForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (pinInput.value.trim() === MANAGER_PIN) {
      pinError.hidden = true;
      setUnlocked(true);
      showKitchen();
    } else {
      pinError.hidden = false;
      pinInput.value = '';
      pinInput.focus();
    }
  });

  refreshBtn.addEventListener('click', renderKitchen);

  lockBtn.addEventListener('click', () => {
    setUnlocked(false);
    showPin();
  });

  // Update instantly when an order is placed in another tab on this device
  window.addEventListener('storage', (event) => {
    if (event.key === 'orders' && isUnlocked()) {
      renderKitchen();
    }
  });

  if (isUnlocked()) {
    showKitchen();
  } else {
    showPin();
  }
});
