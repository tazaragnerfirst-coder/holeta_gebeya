// Visual icon picker for the Categories admin tab (#hog054).
//
// Icon field remains free-text (frontend still reads it as an
// Icon.jsx COMPONENTS key), but typing/remembering exact names was
// error-prone — this renders the same curated marketplace icon set
// as a searchable grid so you pick by sight instead.
//
// IMPORTANT: `key` below must exactly match a key in
// frontend/src/components/Icon.jsx's COMPONENTS map, or picking it
// here will save a name the app can't render. `pascal` is only used
// to compute the Phosphor web-font CSS class for *displaying* the
// icon in this picker (admin loads the full Phosphor icon font from
// a CDN — admin is an internal tool, not the customer-facing bundle,
// so the font's full size doesn't matter here the way it would in
// frontend/'s tree-shaken component approach).
const ICON_CATALOG = [
  // Already in use elsewhere in the app — safe, existing picks
  { key: 'cpu', pascal: 'Cpu', label: 'Electronics (general)' },
  { key: 'shirt', pascal: 'TShirt', label: 'Fashion (general)' },
  { key: 'car', pascal: 'Car', label: 'Car' },
  { key: 'home', pascal: 'House', label: 'Home' },
  { key: 'briefcase', pascal: 'Briefcase', label: 'Job / work' },

  // Electronics & computers
  { key: 'laptop', pascal: 'Laptop', label: 'Laptop' },
  { key: 'mobile', pascal: 'DeviceMobile', label: 'Phone' },
  { key: 'tablet', pascal: 'DeviceTablet', label: 'Tablet' },
  { key: 'headphones', pascal: 'Headphones', label: 'Headphones' },
  { key: 'tv', pascal: 'Television', label: 'TV' },
  { key: 'gameController', pascal: 'GameController', label: 'Gaming' },
  { key: 'printer', pascal: 'Printer', label: 'Printer' },
  { key: 'hardDrive', pascal: 'HardDrive', label: 'Storage / hard drive' },
  { key: 'keyboard', pascal: 'Keyboard', label: 'Keyboard' },
  { key: 'mouse', pascal: 'Mouse', label: 'Mouse' },
  { key: 'watch', pascal: 'Watch', label: 'Watch' },
  { key: 'videoCamera', pascal: 'VideoCamera', label: 'Video camera' },
  { key: 'microphone', pascal: 'Microphone', label: 'Microphone' },
  { key: 'speaker', pascal: 'SpeakerHigh', label: 'Speaker' },
  { key: 'battery', pascal: 'BatteryFull', label: 'Battery' },
  { key: 'drone', pascal: 'Drone', label: 'Drone' },
  { key: 'gauge', pascal: 'Gauge', label: 'Gauge / meter' },

  // Vehicles
  { key: 'motorcycle', pascal: 'Motorcycle', label: 'Motorcycle' },
  { key: 'bicycle', pascal: 'Bicycle', label: 'Bicycle' },
  { key: 'truck', pascal: 'Truck', label: 'Truck' },
  { key: 'bus', pascal: 'Bus', label: 'Bus' },
  { key: 'airplane', pascal: 'Airplane', label: 'Airplane' },
  { key: 'boat', pascal: 'Boat', label: 'Boat' },
  { key: 'van', pascal: 'Van', label: 'Van' },
  { key: 'steeringWheel', pascal: 'SteeringWheel', label: 'Auto parts' },
  { key: 'gasPump', pascal: 'GasPump', label: 'Fuel' },

  // Fashion
  { key: 'backpack', pascal: 'Backpack', label: 'Backpack' },
  { key: 'handbag', pascal: 'Handbag', label: 'Handbag' },
  { key: 'sneaker', pascal: 'Sneaker', label: 'Shoes' },
  { key: 'sunglasses', pascal: 'Sunglasses', label: 'Sunglasses' },
  { key: 'diamond', pascal: 'Diamond', label: 'Jewelry' },
  { key: 'umbrella', pascal: 'Umbrella', label: 'Umbrella' },

  // Home & furniture
  { key: 'armchair', pascal: 'Armchair', label: 'Armchair' },
  { key: 'bed', pascal: 'Bed', label: 'Bed' },
  { key: 'lamp', pascal: 'Lamp', label: 'Lamp' },
  { key: 'couch', pascal: 'Couch', label: 'Couch / sofa' },
  { key: 'door', pascal: 'Door', label: 'Door' },
  { key: 'toilet', pascal: 'Toilet', label: 'Bathroom' },
  { key: 'bathtub', pascal: 'Bathtub', label: 'Bathtub' },
  { key: 'cookingPot', pascal: 'CookingPot', label: 'Cookware' },
  { key: 'forkKnife', pascal: 'ForkKnife', label: 'Kitchen / dining' },
  { key: 'oven', pascal: 'Oven', label: 'Oven' },
  { key: 'broom', pascal: 'Broom', label: 'Cleaning' },
  { key: 'washingMachine', pascal: 'WashingMachine', label: 'Washing machine' },
  { key: 'paintRoller', pascal: 'PaintRoller', label: 'Home improvement' },
  { key: 'fan', pascal: 'Fan', label: 'Fan' },

  // Food & drinks
  { key: 'coffee', pascal: 'Coffee', label: 'Coffee' },
  { key: 'coffeeBean', pascal: 'CoffeeBean', label: 'Coffee beans' },
  { key: 'wine', pascal: 'Wine', label: 'Wine' },
  { key: 'beer', pascal: 'BeerBottle', label: 'Beer / drinks' },
  { key: 'bread', pascal: 'Bread', label: 'Bakery' },
  { key: 'pizza', pascal: 'Pizza', label: 'Pizza / fast food' },
  { key: 'hamburger', pascal: 'Hamburger', label: 'Burger / fast food' },
  { key: 'fish', pascal: 'Fish', label: 'Fish / seafood' },

  // Baby & pets
  { key: 'baby', pascal: 'Baby', label: 'Baby & kids' },
  { key: 'dog', pascal: 'Dog', label: 'Dog' },
  { key: 'cat', pascal: 'Cat', label: 'Cat' },
  { key: 'pawPrint', pascal: 'PawPrint', label: 'Pets (general)' },
  { key: 'bird', pascal: 'Bird', label: 'Bird' },
  { key: 'rabbit', pascal: 'Rabbit', label: 'Rabbit' },
  { key: 'horse', pascal: 'Horse', label: 'Horse / livestock' },
  { key: 'cow', pascal: 'Cow', label: 'Cattle / livestock' },

  // Sports & outdoors
  { key: 'barbell', pascal: 'Barbell', label: 'Gym / fitness' },
  { key: 'basketball', pascal: 'Basketball', label: 'Basketball' },
  { key: 'football', pascal: 'Football', label: 'American football' },
  { key: 'soccerBall', pascal: 'SoccerBall', label: 'Football (soccer)' },
  { key: 'tennisBall', pascal: 'TennisBall', label: 'Tennis' },
  { key: 'tent', pascal: 'Tent', label: 'Camping' },
  { key: 'campfire', pascal: 'Campfire', label: 'Outdoors' },
  { key: 'wheelchair', pascal: 'Wheelchair', label: 'Mobility aids' },

  // Tools & hardware
  { key: 'wrench', pascal: 'Wrench', label: 'Tools (general)' },
  { key: 'hammer', pascal: 'Hammer', label: 'Hammer' },
  { key: 'toolbox', pascal: 'Toolbox', label: 'Toolbox' },
  { key: 'paintBrush', pascal: 'PaintBrush', label: 'Paint / brush' },
  { key: 'paintBucket', pascal: 'PaintBucket', label: 'Paint bucket' },

  // Music & instruments
  { key: 'guitar', pascal: 'Guitar', label: 'Guitar' },
  { key: 'piano', pascal: 'PianoKeys', label: 'Piano' },
  { key: 'musicNote', pascal: 'MusicNote', label: 'Music (general)' },

  // Books & education
  { key: 'book', pascal: 'Book', label: 'Book' },
  { key: 'books', pascal: 'Books', label: 'Books' },
  { key: 'notebook', pascal: 'Notebook', label: 'Notebook / stationery' },
  { key: 'pencil', pascal: 'Pencil', label: 'Pencil / stationery' },
  { key: 'ruler', pascal: 'Ruler', label: 'Ruler' },
  { key: 'graduationCap', pascal: 'GraduationCap', label: 'Education' },
  { key: 'puzzlePiece', pascal: 'PuzzlePiece', label: 'Toys & games' },

  // Health & beauty
  { key: 'stethoscope', pascal: 'Stethoscope', label: 'Medical' },
  { key: 'firstAid', pascal: 'FirstAid', label: 'First aid' },
  { key: 'pill', pascal: 'Pill', label: 'Medicine' },
  { key: 'syringe', pascal: 'Syringe', label: 'Syringe' },
  { key: 'scissors', pascal: 'Scissors', label: 'Beauty / salon' },

  // Real estate & buildings
  { key: 'building', pascal: 'Building', label: 'Building' },
  { key: 'buildings', pascal: 'Buildings', label: 'Real estate' },
  { key: 'warehouse', pascal: 'Warehouse', label: 'Warehouse' },
  { key: 'factory', pascal: 'Factory', label: 'Factory / industrial' },
  { key: 'barn', pascal: 'Barn', label: 'Farm' },
  { key: 'tree', pascal: 'Tree', label: 'Garden / plants' },
  { key: 'flower', pascal: 'Flower', label: 'Flowers' },

  // Misc / commerce
  { key: 'gift', pascal: 'Gift', label: 'Gifts' },
  { key: 'ticket', pascal: 'Ticket', label: 'Tickets / events' },
  { key: 'tag', pascal: 'Tag', label: 'Price tag' },
  { key: 'money', pascal: 'Money', label: 'Money / finance' },
];

function iconPascalToKebab(pascal) {
  return pascal
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

let iconPickerTargetInput = null;

function ensureIconPickerModal() {
  if (document.getElementById('icon-picker-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'icon-picker-modal';
  modal.className = 'icon-picker-overlay';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="icon-picker-box">
      <div class="icon-picker-header">
        <input class="field" type="text" id="icon-picker-search" placeholder="Search icons (e.g. car, food, phone)" />
        <button type="button" class="icon-btn" id="icon-picker-close">✕</button>
      </div>
      <div class="icon-picker-grid" id="icon-picker-grid"></div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('icon-picker-close').addEventListener('click', closeIconPicker);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeIconPicker(); });
  document.getElementById('icon-picker-search').addEventListener('input', (e) => {
    renderIconPickerGrid(e.target.value.trim().toLowerCase());
  });

  renderIconPickerGrid('');
}

function renderIconPickerGrid(filter) {
  const grid = document.getElementById('icon-picker-grid');
  const items = ICON_CATALOG.filter((it) => !filter
    || it.key.toLowerCase().includes(filter)
    || it.label.toLowerCase().includes(filter));
  grid.innerHTML = items.map((it) => `
    <button type="button" class="icon-picker-item" data-key="${it.key}" title="${it.label}">
      <i class="ph ph-${iconPascalToKebab(it.pascal)}"></i>
      <span>${it.key}</span>
    </button>
  `).join('') || '<div class="muted">No matching icons.</div>';
  grid.querySelectorAll('.icon-picker-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (iconPickerTargetInput) {
        iconPickerTargetInput.value = btn.dataset.key;
        iconPickerTargetInput.dispatchEvent(new Event('input'));
      }
      closeIconPicker();
    });
  });
}

function openIconPicker(inputEl) {
  ensureIconPickerModal();
  iconPickerTargetInput = inputEl;
  document.getElementById('icon-picker-search').value = '';
  renderIconPickerGrid('');
  document.getElementById('icon-picker-modal').hidden = false;
}

function closeIconPicker() {
  const modal = document.getElementById('icon-picker-modal');
  if (modal) modal.hidden = true;
  iconPickerTargetInput = null;
}
