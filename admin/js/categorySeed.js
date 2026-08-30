// Starter data for the "Import starter categories" button in the
// Categories tab — a one-time convenience seed, converted from what
// used to be the static frontend/src/data/categories.js (see #hog001
// in memory). Only used by dashboard.js's import handler; never
// loaded by the main app.
const CATEGORY_SEED = [
  {
    "id": "electronics",
    "name": "Electronics",
    "icon": "cpu",
    "popular": true,
    "order": 0,
    "subcategories": [
      {
        "id": "phones",
        "name": "Phones & Tablets",
        "attributes": [
          {
            "key": "brand",
            "label": "Brand",
            "type": "select",
            "required": true,
            "refCollection": "phoneModels"
          },
          {
            "key": "model",
            "label": "Model",
            "type": "select-dependent",
            "required": true,
            "dependsOn": "brand",
            "refCollection": "phoneModels"
          },
          {
            "key": "storage",
            "label": "Storage",
            "type": "select-dependent",
            "required": true,
            "dependsOn": "model",
            "refCollection": "phoneModels",
            "fallbackOptions": [
              "32GB",
              "64GB",
              "128GB",
              "256GB",
              "512GB"
            ]
          },
          {
            "key": "ram",
            "label": "RAM",
            "type": "select-dependent",
            "required": false,
            "dependsOn": "model",
            "refCollection": "phoneModels",
            "fallbackOptions": [
              "2GB",
              "3GB",
              "4GB",
              "6GB",
              "8GB",
              "12GB"
            ]
          },
          {
            "key": "color",
            "label": "Color",
            "type": "color",
            "required": false,
            "dependsOn": "model",
            "refCollection": "phoneModels",
            "fallbackOptions": [
              "Black",
              "White",
              "Blue",
              "Gray",
              "Silver",
              "Gold"
            ]
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "required": true,
            "options": [
              "New",
              "Used - Like New",
              "Used - Good",
              "Used - Fair"
            ]
          }
        ]
      },
      {
        "id": "laptops",
        "name": "Laptops & Computers",
        "attributes": [
          {
            "key": "brand",
            "label": "Brand",
            "type": "select",
            "required": true,
            "options": [
              "Dell",
              "HP",
              "Lenovo",
              "Apple",
              "Asus",
              "Acer",
              "Toshiba",
              "MSI",
              "Other"
            ]
          },
          {
            "key": "model",
            "label": "Model",
            "type": "text",
            "required": false,
            "placeholder": "e.g. Latitude 5490, MacBook Pro 14\""
          },
          {
            "key": "processor",
            "label": "Processor",
            "type": "select",
            "required": true,
            "options": [
              "Intel Core i3",
              "Intel Core i5",
              "Intel Core i7",
              "Intel Core i9",
              "Intel Celeron",
              "AMD Ryzen 3",
              "AMD Ryzen 5",
              "AMD Ryzen 7",
              "Apple M1",
              "Apple M2",
              "Apple M3",
              "Other"
            ]
          },
          {
            "key": "ram",
            "label": "RAM",
            "type": "select",
            "required": true,
            "options": [
              "4GB",
              "8GB",
              "16GB",
              "32GB",
              "64GB"
            ]
          },
          {
            "key": "storageType",
            "label": "Storage Type",
            "type": "select",
            "required": true,
            "options": [
              "HDD",
              "SSD",
              "HDD + SSD"
            ]
          },
          {
            "key": "storage",
            "label": "Storage Capacity",
            "type": "select",
            "required": true,
            "options": [
              "128GB",
              "256GB",
              "512GB",
              "1TB",
              "2TB"
            ]
          },
          {
            "key": "screenSize",
            "label": "Screen Size (inches)",
            "type": "number",
            "required": false
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "required": true,
            "options": [
              "New",
              "Used - Like New",
              "Used - Good",
              "Used - Fair"
            ]
          }
        ]
      },
      {
        "id": "tvs",
        "name": "TVs",
        "attributes": [
          {
            "key": "brand",
            "label": "Brand",
            "type": "select",
            "required": true,
            "options": [
              "Samsung",
              "LG",
              "Sony",
              "Hisense",
              "TCL",
              "Astar",
              "Other"
            ]
          },
          {
            "key": "screenSize",
            "label": "Screen Size (inches)",
            "type": "number",
            "required": true
          },
          {
            "key": "resolution",
            "label": "Resolution",
            "type": "select",
            "required": true,
            "options": [
              "HD",
              "Full HD",
              "4K UHD",
              "8K"
            ]
          },
          {
            "key": "smartTv",
            "label": "Smart TV",
            "type": "boolean",
            "required": false
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "required": true,
            "options": [
              "New",
              "Used - Good",
              "Used - Fair"
            ]
          }
        ]
      },
      {
        "id": "cameras",
        "name": "Cameras",
        "attributes": [
          {
            "key": "brand",
            "label": "Brand",
            "type": "select",
            "required": true,
            "options": [
              "Canon",
              "Nikon",
              "Sony",
              "Fujifilm",
              "GoPro",
              "Other"
            ]
          },
          {
            "key": "type",
            "label": "Type",
            "type": "select",
            "required": true,
            "options": [
              "DSLR",
              "Mirrorless",
              "Point & Shoot",
              "Action Camera"
            ]
          },
          {
            "key": "megapixels",
            "label": "Megapixels",
            "type": "number",
            "required": false
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "required": true,
            "options": [
              "New",
              "Used - Good",
              "Used - Fair"
            ]
          }
        ]
      },
      {
        "id": "accessories",
        "name": "Electronics Accessories",
        "attributes": [
          {
            "key": "type",
            "label": "Item Type",
            "type": "text",
            "required": true,
            "placeholder": "e.g. Charger, Headphones, Power Bank"
          },
          {
            "key": "brand",
            "label": "Brand",
            "type": "text",
            "required": false
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "required": true,
            "options": [
              "New",
              "Used - Good",
              "Used - Fair"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "vehicles",
    "name": "Vehicles",
    "icon": "car",
    "popular": false,
    "order": 1,
    "subcategories": [
      {
        "id": "cars",
        "name": "Cars",
        "attributes": [
          {
            "key": "brand",
            "label": "Make",
            "type": "select",
            "required": true,
            "options": [
              "Toyota",
              "Hyundai",
              "Suzuki",
              "Nissan",
              "Mitsubishi",
              "Lada",
              "Volkswagen",
              "Other"
            ]
          },
          {
            "key": "model",
            "label": "Model",
            "type": "text",
            "required": true,
            "placeholder": "e.g. Vitz, Corolla, Yaris"
          },
          {
            "key": "year",
            "label": "Year",
            "type": "number",
            "required": true
          },
          {
            "key": "transmission",
            "label": "Transmission",
            "type": "select",
            "required": true,
            "options": [
              "Automatic",
              "Manual"
            ]
          },
          {
            "key": "fuelType",
            "label": "Fuel Type",
            "type": "select",
            "required": true,
            "options": [
              "Petrol",
              "Diesel",
              "Hybrid",
              "Electric"
            ]
          },
          {
            "key": "mileage",
            "label": "Mileage (km)",
            "type": "number",
            "required": false
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "required": true,
            "options": [
              "New",
              "Used - Good",
              "Used - Fair",
              "Needs Repair"
            ]
          }
        ]
      },
      {
        "id": "motorcycles",
        "name": "Motorcycles",
        "attributes": [
          {
            "key": "brand",
            "label": "Brand",
            "type": "select",
            "required": true,
            "options": [
              "Bajaj",
              "TVS",
              "Sanya",
              "Haojue",
              "Other"
            ]
          },
          {
            "key": "model",
            "label": "Model",
            "type": "text",
            "required": false
          },
          {
            "key": "year",
            "label": "Year",
            "type": "number",
            "required": false
          },
          {
            "key": "engineCC",
            "label": "Engine (cc)",
            "type": "number",
            "required": false
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "required": true,
            "options": [
              "New",
              "Used - Good",
              "Used - Fair"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "fashion",
    "name": "Fashion",
    "icon": "shirt",
    "popular": true,
    "order": 2,
    "subcategories": [
      {
        "id": "clothing",
        "name": "Clothing",
        "attributes": [
          {
            "key": "gender",
            "label": "For",
            "type": "select",
            "required": true,
            "options": [
              "Men",
              "Women",
              "Kids"
            ]
          },
          {
            "key": "ageRange",
            "label": "Age Range",
            "type": "select",
            "required": false,
            "options": [
              "Baby (0-2)",
              "Kids (2-12)",
              "Teen (13-19)",
              "Adult"
            ]
          },
          {
            "key": "itemType",
            "label": "Item Type",
            "type": "text",
            "required": true,
            "placeholder": "e.g. Jacket, Dress, Suit"
          },
          {
            "key": "size",
            "label": "Size",
            "type": "select",
            "required": false,
            "options": [
              "XS",
              "S",
              "M",
              "L",
              "XL",
              "XXL"
            ]
          },
          {
            "key": "color",
            "label": "Color",
            "type": "text",
            "required": false
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "required": true,
            "options": [
              "New",
              "Used - Good",
              "Used - Fair"
            ]
          }
        ]
      },
      {
        "id": "shoes",
        "name": "Shoes",
        "attributes": [
          {
            "key": "gender",
            "label": "For",
            "type": "select",
            "required": true,
            "options": [
              "Men",
              "Women",
              "Kids"
            ]
          },
          {
            "key": "ageRange",
            "label": "Age Range",
            "type": "select",
            "required": false,
            "options": [
              "Baby (0-2)",
              "Kids (2-12)",
              "Teen (13-19)",
              "Adult"
            ]
          },
          {
            "key": "brand",
            "label": "Brand",
            "type": "text",
            "required": false
          },
          {
            "key": "size",
            "label": "Size (EU)",
            "type": "number",
            "required": false
          },
          {
            "key": "color",
            "label": "Color",
            "type": "text",
            "required": false
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "required": true,
            "options": [
              "New",
              "Used - Good",
              "Used - Fair"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "home",
    "name": "Home & Furniture",
    "icon": "home",
    "popular": true,
    "order": 3,
    "subcategories": [
      {
        "id": "furniture",
        "name": "Furniture",
        "attributes": [
          {
            "key": "itemType",
            "label": "Item Type",
            "type": "text",
            "required": true,
            "placeholder": "e.g. Sofa, Bed, Table"
          },
          {
            "key": "material",
            "label": "Material",
            "type": "text",
            "required": false
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "required": true,
            "options": [
              "New",
              "Used - Good",
              "Used - Fair"
            ]
          }
        ]
      },
      {
        "id": "appliances",
        "name": "Home Appliances",
        "attributes": [
          {
            "key": "itemType",
            "label": "Item Type",
            "type": "text",
            "required": true,
            "placeholder": "e.g. Fridge, Washing Machine"
          },
          {
            "key": "brand",
            "label": "Brand",
            "type": "text",
            "required": false
          },
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "required": true,
            "options": [
              "New",
              "Used - Good",
              "Used - Fair"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "other",
    "name": "Other",
    "icon": "grid",
    "popular": false,
    "order": 4,
    "subcategories": [
      {
        "id": "general",
        "name": "General Item",
        "attributes": [
          {
            "key": "condition",
            "label": "Condition",
            "type": "select",
            "required": true,
            "options": [
              "New",
              "Used - Good",
              "Used - Fair"
            ]
          }
        ]
      }
    ]
  }
];

// { [refId]: { [brandName]: [{ model, storage, ram, color }, ...] } }
const REFERENCE_SEED = {
  "phoneModels": {
    "Samsung": [
      {
        "model": "Galaxy S24 Ultra",
        "storage": [
          "256GB",
          "512GB",
          "1TB"
        ],
        "ram": [
          "12GB"
        ],
        "color": [
          "Titanium Black",
          "Titanium Gray",
          "Titanium Violet",
          "Titanium Yellow"
        ]
      },
      {
        "model": "Galaxy S23",
        "storage": [
          "128GB",
          "256GB",
          "512GB"
        ],
        "ram": [
          "8GB"
        ],
        "color": [
          "Phantom Black",
          "Cream",
          "Green",
          "Lavender"
        ]
      },
      {
        "model": "Galaxy S22",
        "storage": [
          "128GB",
          "256GB"
        ],
        "ram": [
          "8GB"
        ],
        "color": [
          "Phantom Black",
          "Phantom White",
          "Green",
          "Pink Gold"
        ]
      },
      {
        "model": "Galaxy A54",
        "storage": [
          "128GB",
          "256GB"
        ],
        "ram": [
          "6GB",
          "8GB"
        ],
        "color": [
          "Awesome Black",
          "Awesome White",
          "Awesome Violet",
          "Awesome Lime"
        ]
      },
      {
        "model": "Galaxy A34",
        "storage": [
          "128GB",
          "256GB"
        ],
        "ram": [
          "6GB",
          "8GB"
        ],
        "color": [
          "Awesome Black",
          "Awesome Silver",
          "Awesome Violet",
          "Awesome Lime"
        ]
      },
      {
        "model": "Galaxy A16",
        "storage": [
          "128GB",
          "256GB"
        ],
        "ram": [
          "4GB",
          "6GB",
          "8GB"
        ],
        "color": [
          "Black",
          "Gray",
          "Light Green",
          "Blue Black"
        ]
      },
      {
        "model": "Galaxy A15",
        "storage": [
          "128GB",
          "256GB"
        ],
        "ram": [
          "4GB",
          "6GB",
          "8GB"
        ],
        "color": [
          "Blue Black",
          "Light Blue",
          "Gray",
          "Yellow"
        ]
      },
      {
        "model": "Galaxy A14",
        "storage": [
          "64GB",
          "128GB"
        ],
        "ram": [
          "4GB",
          "6GB"
        ],
        "color": [
          "Black",
          "Silver",
          "Light Green",
          "Dark Red"
        ]
      },
      {
        "model": "Galaxy A05",
        "storage": [
          "64GB",
          "128GB"
        ],
        "ram": [
          "4GB",
          "6GB"
        ],
        "color": [
          "Black",
          "Silver",
          "Light Green"
        ]
      },
      {
        "model": "Galaxy A05s",
        "storage": [
          "64GB",
          "128GB"
        ],
        "ram": [
          "4GB",
          "6GB"
        ],
        "color": [
          "Black",
          "Silver",
          "Light Green"
        ]
      },
      {
        "model": "Galaxy Note 20",
        "storage": [
          "256GB"
        ],
        "ram": [
          "8GB"
        ],
        "color": [
          "Mystic Bronze",
          "Mystic Gray",
          "Mystic Green"
        ]
      },
      {
        "model": "Galaxy Z Flip 5",
        "storage": [
          "256GB",
          "512GB"
        ],
        "ram": [
          "8GB"
        ],
        "color": [
          "Mint",
          "Graphite",
          "Cream",
          "Lavender"
        ]
      }
    ],
    "Apple": [
      {
        "model": "iPhone 15 Pro Max",
        "storage": [
          "256GB",
          "512GB",
          "1TB"
        ],
        "ram": [],
        "color": [
          "Black Titanium",
          "White Titanium",
          "Blue Titanium",
          "Natural Titanium"
        ]
      },
      {
        "model": "iPhone 15",
        "storage": [
          "128GB",
          "256GB",
          "512GB"
        ],
        "ram": [],
        "color": [
          "Black",
          "Blue",
          "Green",
          "Yellow",
          "Pink"
        ]
      },
      {
        "model": "iPhone 14",
        "storage": [
          "128GB",
          "256GB",
          "512GB"
        ],
        "ram": [],
        "color": [
          "Midnight",
          "Starlight",
          "Blue",
          "Purple",
          "(PRODUCT)RED"
        ]
      },
      {
        "model": "iPhone 13",
        "storage": [
          "128GB",
          "256GB",
          "512GB"
        ],
        "ram": [],
        "color": [
          "Midnight",
          "Starlight",
          "Blue",
          "Pink",
          "(PRODUCT)RED",
          "Green"
        ]
      },
      {
        "model": "iPhone 12",
        "storage": [
          "64GB",
          "128GB",
          "256GB"
        ],
        "ram": [],
        "color": [
          "Black",
          "White",
          "Blue",
          "Green",
          "(PRODUCT)RED"
        ]
      },
      {
        "model": "iPhone 11",
        "storage": [
          "64GB",
          "128GB",
          "256GB"
        ],
        "ram": [],
        "color": [
          "Black",
          "White",
          "Green",
          "Yellow",
          "Purple",
          "(PRODUCT)RED"
        ]
      },
      {
        "model": "iPhone SE",
        "storage": [
          "64GB",
          "128GB",
          "256GB"
        ],
        "ram": [],
        "color": [
          "Black",
          "White",
          "(PRODUCT)RED"
        ]
      },
      {
        "model": "iPad Air",
        "storage": [
          "64GB",
          "256GB"
        ],
        "ram": [],
        "color": [
          "Space Gray",
          "Starlight",
          "Pink",
          "Purple",
          "Blue"
        ]
      },
      {
        "model": "iPad Pro",
        "storage": [
          "128GB",
          "256GB",
          "512GB",
          "1TB",
          "2TB"
        ],
        "ram": [],
        "color": [
          "Space Gray",
          "Silver"
        ]
      }
    ],
    "Tecno": [
      {
        "model": "Camon 20",
        "storage": [
          "256GB"
        ],
        "ram": [
          "8GB"
        ],
        "color": [
          "Predawn Black",
          "Glacier Glow",
          "Serenity Blue"
        ]
      },
      {
        "model": "Camon 20 Pro",
        "storage": [
          "256GB"
        ],
        "ram": [
          "8GB"
        ],
        "color": [
          "Predawn Black",
          "Glacier Glow",
          "Serenity Blue"
        ]
      },
      {
        "model": "Spark 10",
        "storage": [],
        "ram": [],
        "color": []
      },
      {
        "model": "Spark 20",
        "storage": [],
        "ram": [],
        "color": []
      },
      {
        "model": "Phantom X2",
        "storage": [],
        "ram": [],
        "color": []
      },
      {
        "model": "Pova 5",
        "storage": [],
        "ram": [],
        "color": []
      },
      {
        "model": "Pop 7",
        "storage": [],
        "ram": [],
        "color": []
      }
    ],
    "Infinix": [
      {
        "model": "Note 30",
        "storage": [
          "256GB"
        ],
        "ram": [
          "8GB"
        ],
        "color": []
      },
      {
        "model": "Note 30 Pro",
        "storage": [
          "256GB"
        ],
        "ram": [
          "8GB"
        ],
        "color": []
      },
      {
        "model": "Hot 40",
        "storage": [
          "128GB",
          "256GB"
        ],
        "ram": [
          "8GB"
        ],
        "color": [
          "Palm Blue",
          "Horizon Gold",
          "Starlit Black",
          "Starfall Green"
        ]
      },
      {
        "model": "Hot 40 Pro",
        "storage": [
          "128GB",
          "256GB"
        ],
        "ram": [
          "8GB"
        ],
        "color": [
          "Palm Blue",
          "Horizon Gold",
          "Starlit Black",
          "Starfall Green"
        ]
      },
      {
        "model": "Hot 30",
        "storage": [
          "128GB",
          "256GB"
        ],
        "ram": [
          "4GB",
          "8GB"
        ],
        "color": [
          "Racing Black",
          "Surfing Green",
          "Sonic White"
        ]
      },
      {
        "model": "Zero 30",
        "storage": [],
        "ram": [],
        "color": []
      },
      {
        "model": "Smart 8",
        "storage": [],
        "ram": [],
        "color": []
      }
    ],
    "Huawei": [
      {
        "model": "P50",
        "storage": [],
        "ram": [],
        "color": []
      },
      {
        "model": "Mate 40",
        "storage": [],
        "ram": [],
        "color": []
      },
      {
        "model": "Nova 9",
        "storage": [],
        "ram": [],
        "color": []
      },
      {
        "model": "Y9",
        "storage": [],
        "ram": [],
        "color": []
      },
      {
        "model": "Y7",
        "storage": [],
        "ram": [],
        "color": []
      }
    ],
    "Xiaomi": [
      {
        "model": "Redmi Note 12",
        "storage": [],
        "ram": [],
        "color": []
      },
      {
        "model": "Redmi 10",
        "storage": [],
        "ram": [],
        "color": []
      },
      {
        "model": "Mi 11",
        "storage": [],
        "ram": [],
        "color": []
      },
      {
        "model": "Poco X5",
        "storage": [],
        "ram": [],
        "color": []
      }
    ],
    "Itel": [
      {
        "model": "A70",
        "storage": [
          "64GB",
          "128GB",
          "256GB"
        ],
        "ram": [
          "3GB",
          "4GB"
        ],
        "color": [
          "Brilliant Gold",
          "Stylish Black",
          "Field Green",
          "Azure Blue"
        ]
      },
      {
        "model": "A60",
        "storage": [
          "32GB"
        ],
        "ram": [
          "2GB"
        ],
        "color": [
          "Dawn Blue",
          "Vert Menthe",
          "Sapphire Black"
        ]
      },
      {
        "model": "A60s",
        "storage": [
          "64GB",
          "128GB"
        ],
        "ram": [
          "4GB"
        ],
        "color": [
          "Shadow Black",
          "Glacier Green",
          "Moonlit Violet"
        ]
      },
      {
        "model": "P40",
        "storage": [],
        "ram": [],
        "color": []
      },
      {
        "model": "Vision 3",
        "storage": [],
        "ram": [],
        "color": []
      }
    ],
    "Oppo": [
      {
        "model": "Reno 8",
        "storage": [],
        "ram": [],
        "color": []
      },
      {
        "model": "A78",
        "storage": [],
        "ram": [],
        "color": []
      },
      {
        "model": "A57",
        "storage": [],
        "ram": [],
        "color": []
      }
    ],
    "Other": []
  }
};
