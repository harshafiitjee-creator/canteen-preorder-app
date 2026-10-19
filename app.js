// Render available menu items from data/menu.js (MENU array)
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('menu-list');
  const noItemsEl = document.getElementById('no-items');

  if (!window.MENU || !Array.isArray(MENU)) {
    noItemsEl.hidden = false;
    noItemsEl.textContent = 'Menu data not found.';
    return;
  }

  // Filter to only available items
  const availableItems = MENU.filter(it => it && it.available === true);

  // If none available, show message
  if (availableItems.length === 0) {
    noItemsEl.hidden = false;
    noItemsEl.textContent = 'No items available right now.';
    return;
  } else {
    noItemsEl.hidden = true;
  }

  // Optional: sort by category then name for predictable ordering
  availableItems.sort((a, b) => {
    if (a.category === b.category) return a.name.localeCompare(b.name);
    return a.category.localeCompare(b.category);
  });

  // Render each item
  availableItems.forEach(item => {
    const card = document.createElement('article');
    card.className = 'item';
    card.setAttribute('data-id', item.id);
    card.setAttribute('aria-label', `${item.name}, ₹${item.price}`);

    const left = document.createElement('div');
    left.className = 'item-left';

    const vegDot = document.createElement('div');
    vegDot.className = 'veg-dot ' + (item.veg ? 'veg' : 'nonveg');
    vegDot.title = item.veg ? 'Vegetarian' : 'Non-vegetarian';

    const info = document.createElement('div');
    info.className = 'item-info';

    const name = document.createElement('h3');
    name.className = 'item-name';
    name.textContent = item.name;

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    meta.textContent = item.category;

    info.appendChild(name);
    info.appendChild(meta);

    left.appendChild(vegDot);
    left.appendChild(info);

    const right = document.createElement('div');
    right.className = 'item-right';

    const price = document.createElement('div');
    price.className = 'price';
    // Use the rupee symbol and a simple formatted number
    price.textContent = '₹' + Number(item.price).toLocaleString('en-IN');

    const orderBtn = document.createElement('button');
    orderBtn.className = 'btn';
    orderBtn.type = 'button';
    orderBtn.textContent = 'Order';
    orderBtn.addEventListener('click', () => {
      // No backend — show a quick order confirmation
      const previously = orderBtn.dataset.ordered === '1';
      if (!previously) {
        orderBtn.textContent = 'Added';
        orderBtn.dataset.ordered = '1';
        orderBtn.style.opacity = '0.95';
        setTimeout(() => {
          orderBtn.textContent = 'Order';
          orderBtn.dataset.ordered = '0';
        }, 1200);
      }
    });

    right.appendChild(price);
    right.appendChild(orderBtn);

    card.appendChild(left);
    card.appendChild(right);

    container.appendChild(card);
  });
});
