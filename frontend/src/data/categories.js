// Category → Subcategory → Attribute schema, used to render dynamic
// "Post an Ad" forms (Jiji-style). Each attribute renders a form field.
// type: 'select' | 'select-dependent' | 'text' | 'textarea' | 'number' | 'boolean'
// 'select-dependent' options come from optionsByParent[value of dependsOn]

export const CATEGORIES = [
  {
    id: 'electronics',
    name: 'Electronics',
    icon: 'cpu',
    subcategories: [
      {
        id: 'phones',
        name: 'Phones & Tablets',
        attributes: [
          { key: 'brand', label: 'Brand', type: 'select', required: true,
            options: ['Samsung', 'Apple', 'Tecno', 'Infinix', 'Huawei', 'Xiaomi', 'Itel', 'Oppo', 'Other'] },
          { key: 'model', label: 'Model', type: 'select-dependent', dependsOn: 'brand', required: true,
            optionsByParent: {
              Samsung: ['Galaxy S24 Ultra', 'Galaxy S23', 'Galaxy S22', 'Galaxy A54', 'Galaxy A34', 'Galaxy A14', 'Galaxy Note 20', 'Galaxy Z Flip 5', 'Other'],
              Apple: ['iPhone 15 Pro Max', 'iPhone 15', 'iPhone 14', 'iPhone 13', 'iPhone 12', 'iPhone 11', 'iPhone SE', 'iPad Air', 'iPad Pro', 'Other'],
              Tecno: ['Camon 20', 'Spark 10', 'Phantom X2', 'Pova 5', 'Pop 7', 'Other'],
              Infinix: ['Note 30', 'Note 12', 'Hot 40', 'Zero 30', 'Smart 8', 'Other'],
              Huawei: ['P50', 'Mate 40', 'Nova 9', 'Y9', 'Y7', 'Other'],
              Xiaomi: ['Redmi Note 12', 'Redmi 10', 'Mi 11', 'Poco X5', 'Other'],
              Itel: ['A60', 'P40', 'Vision 3', 'Other'],
              Oppo: ['Reno 8', 'A78', 'A57', 'Other'],
              Other: ['Other'],
            } },
          { key: 'storage', label: 'Storage', type: 'select', required: true,
            options: ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB'] },
          { key: 'ram', label: 'RAM', type: 'select', required: false,
            options: ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB'] },
          { key: 'screenSize', label: 'Screen Size (inches)', type: 'number', required: false },
          { key: 'color', label: 'Color', type: 'text', required: false },
          { key: 'condition', label: 'Condition', type: 'select', required: true,
            options: ['New', 'Used - Like New', 'Used - Good', 'Used - Fair'] },
        ],
      },
      {
        id: 'laptops',
        name: 'Laptops & Computers',
        attributes: [
          { key: 'brand', label: 'Brand', type: 'select', required: true,
            options: ['Dell', 'HP', 'Lenovo', 'Apple', 'Asus', 'Acer', 'Toshiba', 'MSI', 'Other'] },
          { key: 'model', label: 'Model', type: 'text', required: false, placeholder: 'e.g. Latitude 5490, MacBook Pro 14"' },
          { key: 'processor', label: 'Processor', type: 'select', required: true,
            options: ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'Intel Celeron', 'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'Apple M1', 'Apple M2', 'Apple M3', 'Other'] },
          { key: 'ram', label: 'RAM', type: 'select', required: true,
            options: ['4GB', '8GB', '16GB', '32GB', '64GB'] },
          { key: 'storageType', label: 'Storage Type', type: 'select', required: true, options: ['HDD', 'SSD', 'HDD + SSD'] },
          { key: 'storage', label: 'Storage Capacity', type: 'select', required: true,
            options: ['128GB', '256GB', '512GB', '1TB', '2TB'] },
          { key: 'screenSize', label: 'Screen Size (inches)', type: 'number', required: false },
          { key: 'condition', label: 'Condition', type: 'select', required: true,
            options: ['New', 'Used - Like New', 'Used - Good', 'Used - Fair'] },
        ],
      },
      {
        id: 'tvs', name: 'TVs',
        attributes: [
          { key: 'brand', label: 'Brand', type: 'select', required: true, options: ['Samsung', 'LG', 'Sony', 'Hisense', 'TCL', 'Astar', 'Other'] },
          { key: 'screenSize', label: 'Screen Size (inches)', type: 'number', required: true },
          { key: 'resolution', label: 'Resolution', type: 'select', required: true, options: ['HD', 'Full HD', '4K UHD', '8K'] },
          { key: 'smartTv', label: 'Smart TV', type: 'boolean', required: false },
          { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['New', 'Used - Good', 'Used - Fair'] },
        ],
      },
      {
        id: 'cameras', name: 'Cameras',
        attributes: [
          { key: 'brand', label: 'Brand', type: 'select', required: true, options: ['Canon', 'Nikon', 'Sony', 'Fujifilm', 'GoPro', 'Other'] },
          { key: 'type', label: 'Type', type: 'select', required: true, options: ['DSLR', 'Mirrorless', 'Point & Shoot', 'Action Camera'] },
          { key: 'megapixels', label: 'Megapixels', type: 'number', required: false },
          { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['New', 'Used - Good', 'Used - Fair'] },
        ],
      },
      {
        id: 'accessories', name: 'Electronics Accessories',
        attributes: [
          { key: 'type', label: 'Item Type', type: 'text', required: true, placeholder: 'e.g. Charger, Headphones, Power Bank' },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
          { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['New', 'Used - Good', 'Used - Fair'] },
        ],
      },
    ],
  },
  {
    id: 'vehicles', name: 'Vehicles', icon: 'car',
    subcategories: [
      {
        id: 'cars', name: 'Cars',
        attributes: [
          { key: 'brand', label: 'Make', type: 'select', required: true, options: ['Toyota', 'Hyundai', 'Suzuki', 'Nissan', 'Mitsubishi', 'Lada', 'Volkswagen', 'Other'] },
          { key: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g. Vitz, Corolla, Yaris' },
          { key: 'year', label: 'Year', type: 'number', required: true },
          { key: 'transmission', label: 'Transmission', type: 'select', required: true, options: ['Automatic', 'Manual'] },
          { key: 'fuelType', label: 'Fuel Type', type: 'select', required: true, options: ['Petrol', 'Diesel', 'Hybrid', 'Electric'] },
          { key: 'mileage', label: 'Mileage (km)', type: 'number', required: false },
          { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['New', 'Used - Good', 'Used - Fair', 'Needs Repair'] },
        ],
      },
      {
        id: 'motorcycles', name: 'Motorcycles',
        attributes: [
          { key: 'brand', label: 'Brand', type: 'select', required: true, options: ['Bajaj', 'TVS', 'Sanya', 'Haojue', 'Other'] },
          { key: 'model', label: 'Model', type: 'text', required: false },
          { key: 'year', label: 'Year', type: 'number', required: false },
          { key: 'engineCC', label: 'Engine (cc)', type: 'number', required: false },
          { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['New', 'Used - Good', 'Used - Fair'] },
        ],
      },
    ],
  },
  {
    id: 'fashion', name: 'Fashion', icon: 'shirt',
    subcategories: [
      {
        id: 'clothing', name: 'Clothing',
        attributes: [
          { key: 'gender', label: 'For', type: 'select', required: true, options: ['Men', 'Women', 'Unisex', 'Kids'] },
          { key: 'itemType', label: 'Item Type', type: 'text', required: true, placeholder: 'e.g. Jacket, Dress, Suit' },
          { key: 'size', label: 'Size', type: 'select', required: false, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
          { key: 'color', label: 'Color', type: 'text', required: false },
          { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['New', 'Used - Good', 'Used - Fair'] },
        ],
      },
      {
        id: 'shoes', name: 'Shoes',
        attributes: [
          { key: 'gender', label: 'For', type: 'select', required: true, options: ['Men', 'Women', 'Unisex', 'Kids'] },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
          { key: 'size', label: 'Size (EU)', type: 'number', required: false },
          { key: 'color', label: 'Color', type: 'text', required: false },
          { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['New', 'Used - Good', 'Used - Fair'] },
        ],
      },
    ],
  },
  {
    id: 'home', name: 'Home & Furniture', icon: 'home',
    subcategories: [
      {
        id: 'furniture', name: 'Furniture',
        attributes: [
          { key: 'itemType', label: 'Item Type', type: 'text', required: true, placeholder: 'e.g. Sofa, Bed, Table' },
          { key: 'material', label: 'Material', type: 'text', required: false },
          { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['New', 'Used - Good', 'Used - Fair'] },
        ],
      },
      {
        id: 'appliances', name: 'Home Appliances',
        attributes: [
          { key: 'itemType', label: 'Item Type', type: 'text', required: true, placeholder: 'e.g. Fridge, Washing Machine' },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
          { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['New', 'Used - Good', 'Used - Fair'] },
        ],
      },
    ],
  },
  {
    id: 'other', name: 'Other', icon: 'grid',
    subcategories: [
      { id: 'general', name: 'General Item', attributes: [
        { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['New', 'Used - Good', 'Used - Fair'] },
      ] },
    ],
  },
];

export function getSubcategory(categoryId, subcategoryId) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return null;
  return cat.subcategories.find((s) => s.id === subcategoryId) || null;
}
