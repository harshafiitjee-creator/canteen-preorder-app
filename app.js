document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('menu-list');
  const noItemsEl = document.getElementById('no-items');
  const tabs = Array.from(document.querySelectorAll('.category-tab'));
  const categories = ['Snacks', 'Meals', 'Beverages'];

  if (typeof MENU === 'undefined' || !Array.isArray(MENU)) {
    noItemsEl.hidden = false;
    noItemsEl.textContent = 'Menu data not found.';
    return;
  }

  function selectTab(category) {
    tabs.forEach((tab) => {
      const isSelected = tab.dataset.category === category;
      tab.classList.toggle('active', isSelected);
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
    });
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
      card.setAttribute('aria-label', `${item.name}, ₹${item.price}`);

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
      price.textContent = '₹' + Number(item.price).toLocaleString('en-IN');

      right.appendChild(price);
      card.appendChild(left);
      card.appendChild(right);
      container.appendChild(card);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const category = tab.dataset.category;
      selectTab(category);
      renderItems(category);
    });
  });

  selectTab('Snacks');
  renderItems('Snacks');

  if (!categories.includes('Snacks')) {
    noItemsEl.hidden = false;
    noItemsEl.textContent = 'No items available right now.';
  }
});
