const API_BASE_URL = "https://fakestoreapi.com/products";
const CART_STORAGE_KEY = "swiftcart_cart_v1";

let cartCount = 0;
let cartItems = [];
let modalSelectedProductId = null;

const productCache = new Map();

const categoryContainer = document.getElementById("categoryContainer");
const productsContainer = document.getElementById("productsContainer");
const trendingContainer = document.getElementById("trendingContainer");
const loadingSpinner = document.getElementById("loadingSpinner");
const cartCountElement = document.getElementById("cartCount");
const shopNowBtn = document.getElementById("shopNowBtn");
const openCartBtn = document.getElementById("openCartBtn");

const productModal = document.getElementById("productModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalAddToCart = document.getElementById("modalAddToCart");
const modalTitle = document.getElementById("modalTitle");
const modalImage = document.getElementById("modalImage");
const modalDescription = document.getElementById("modalDescription");
const modalPrice = document.getElementById("modalPrice");
const modalRating = document.getElementById("modalRating");

const cartModal = document.getElementById("cartModal");
const closeCartBtn = document.getElementById("closeCartBtn");
const clearCartBtn = document.getElementById("clearCartBtn");
const checkoutBtn = document.getElementById("checkoutBtn");
const cartItemsContainer = document.getElementById("cartItemsContainer");
const cartEmptyState = document.getElementById("cartEmptyState");
const cartTotalItems = document.getElementById("cartTotalItems");
const cartTotalPrice = document.getElementById("cartTotalPrice");

const newsletterForm = document.getElementById("newsletterForm");
const newsletterMessage = document.getElementById("newsletterMessage");

/**
 * Truncates long product titles to keep cards clean.
 */
function truncateTitle(title, maxLength = 40) {
  return title.length > maxLength ? `${title.slice(0, maxLength).trim()}...` : title;
}

/**
 * Converts raw category text into title-cased display text.
 */
function formatCategory(category) {
  return category
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Standard currency formatting for prices.
 */
function formatCurrency(value) {
  return `$${Number(value).toFixed(2)}`;
}

/**
 * Loads cart state from LocalStorage (if present).
 */
function loadCartFromStorage() {
  try {
    const storedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    if (Array.isArray(storedCart)) {
      cartItems = storedCart
        .filter((item) => item && typeof item.id !== "undefined")
        .map((item) => ({
          id: Number(item.id),
          title: String(item.title || ""),
          image: String(item.image || ""),
          price: Number(item.price || 0),
          quantity: Math.max(1, Number(item.quantity || 1))
        }));
    }
  } catch (error) {
    console.error("Could not parse stored cart data:", error);
    cartItems = [];
  }
}

/**
 * Persists cart state in LocalStorage.
 */
function saveCartToStorage() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
}

/**
 * Updates cart counter badge and persists state.
 */
function updateCart() {
  cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  cartCountElement.textContent = cartCount;
  saveCartToStorage();
  renderCart();
}

/**
 * Sets spinner visibility while product data is loading.
 */
function setLoading(isLoading) {
  loadingSpinner.classList.toggle("hidden", !isLoading);
}

/**
 * Adds products to in-memory cache to avoid duplicate requests.
 */
function cacheProducts(products) {
  products.forEach((product) => productCache.set(Number(product.id), product));
}

/**
 * Gets product object by ID from cache or API.
 */
async function getProductById(productId) {
  const id = Number(productId);
  if (productCache.has(id)) {
    return productCache.get(id);
  }

  const response = await fetch(`${API_BASE_URL}/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch product by ID");
  }

  const product = await response.json();
  productCache.set(id, product);
  return product;
}

/**
 * Adds one product to cart or increases quantity if it exists.
 */
function addProductToCart(product) {
  const existingItem = cartItems.find((item) => item.id === Number(product.id));

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cartItems.push({
      id: Number(product.id),
      title: product.title,
      image: product.image,
      price: Number(product.price),
      quantity: 1
    });
  }

  updateCart();
}

/**
 * Handles "Add" click by resolving product then updating cart.
 */
async function addToCartById(productId) {
  try {
    const product = await getProductById(productId);
    addProductToCart(product);
  } catch (error) {
    console.error("Add to cart error:", error);
    alert("Could not add product to cart. Please try again.");
  }
}

/**
 * Keeps the selected category button visually highlighted.
 */
function setActiveCategory(activeCategory) {
  const categoryButtons = categoryContainer.querySelectorAll(".category-btn");
  categoryButtons.forEach((button) => {
    const isActive = button.dataset.category === activeCategory;
    button.classList.toggle("btn-primary", isActive);
    button.classList.toggle("btn-outline", !isActive);
  });
}

/**
 * Handles category button click and loads selected category data.
 */
function handleCategorySelection(event) {
  const button = event.target.closest(".category-btn");
  if (!button) return;

  const selectedCategory = button.dataset.category;
  setActiveCategory(selectedCategory);
  loadProducts(selectedCategory);
}

/**
 * Product card HTML template for product/trending sections.
 */
function createProductCard(product) {
  const ratingValue = product.rating?.rate ?? "N/A";
  const ratingCount = product.rating?.count ?? 0;

  return `
    <article class="product-card card h-full border border-base-300 bg-base-100 shadow-sm">
      <figure class="product-image-wrap h-56 p-4">
        <img
          src="${product.image}"
          alt="${product.title}"
          class="h-full w-full object-contain"
          loading="lazy"
        />
      </figure>
      <div class="card-body p-4">
        <div class="flex items-center justify-between gap-2">
          <span class="badge badge-outline badge-sm">${formatCategory(product.category)}</span>
          <span class="text-xs text-base-content/70">
            <i class="fa-solid fa-star text-amber-400"></i> ${ratingValue} (${ratingCount})
          </span>
        </div>
        <h3 class="min-h-[48px] text-[15px] font-semibold leading-6">${truncateTitle(product.title)}</h3>
        <p class="text-xl font-bold text-primary">${formatCurrency(product.price)}</p>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <button class="btn btn-sm btn-outline" data-action="details" data-id="${product.id}">
            <i class="fa-regular fa-eye"></i>
            Details
          </button>
          <button class="btn btn-sm btn-primary" data-action="add" data-id="${product.id}">
            <i class="fa-solid fa-cart-plus"></i>
            Add
          </button>
        </div>
      </div>
    </article>
  `;
}

/**
 * Fetches all categories and renders category filter buttons.
 */
async function fetchCategories() {
  try {
    const response = await fetch(`${API_BASE_URL}/categories`);
    if (!response.ok) {
      throw new Error("Failed to fetch categories");
    }

    const categories = await response.json();
    const categoryList = ["All", ...categories];

    categoryContainer.innerHTML = categoryList
      .map(
        (category) => `
          <button
            class="category-btn btn btn-sm btn-outline"
            data-category="${category}"
          >
            ${formatCategory(category)}
          </button>
        `
      )
      .join("");

    setActiveCategory("All");
  } catch (error) {
    console.error("Category loading error:", error);
    categoryContainer.innerHTML = `
      <button class="category-btn btn btn-sm btn-primary" data-category="All">All</button>
      <p class="w-full text-center text-sm text-error">Could not load categories. Showing all products.</p>
    `;
  }
}

/**
 * Loads products by category ("All" fetches all products).
 */
async function loadProducts(category) {
  setLoading(true);
  productsContainer.innerHTML = "";

  const endpoint =
    category === "All" ? API_BASE_URL : `${API_BASE_URL}/category/${encodeURIComponent(category)}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error("Failed to fetch products");
    }

    const products = await response.json();
    cacheProducts(products);
    displayProducts(products);
  } catch (error) {
    console.error("Product loading error:", error);
    productsContainer.innerHTML = `
      <div class="col-span-full rounded-lg border border-error/40 bg-error/10 p-4 text-center text-error">
        Something went wrong while loading products. Please try again.
      </div>
    `;
  } finally {
    setLoading(false);
  }
}

/**
 * Renders API product cards into the main product grid.
 */
function displayProducts(products) {
  if (!products.length) {
    productsContainer.innerHTML = `
      <div class="col-span-full rounded-lg border border-base-300 bg-base-100 p-6 text-center">
        No products found in this category.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products.map((product) => createProductCard(product)).join("");
}

/**
 * Fetches product details and opens the details modal.
 */
async function showDetails(productId) {
  try {
    const product = await getProductById(productId);
    modalSelectedProductId = Number(product.id);

    modalTitle.textContent = product.title;
    modalImage.src = product.image;
    modalImage.alt = product.title;
    modalDescription.textContent = product.description;
    modalPrice.textContent = `Price: ${formatCurrency(product.price)}`;
    modalRating.textContent = `Rating: ${product.rating?.rate ?? "N/A"} (${product.rating?.count ?? 0} reviews)`;

    productModal.showModal();
  } catch (error) {
    console.error("Details loading error:", error);
    alert("Could not load product details. Please try again.");
  }
}

/**
 * Renders cart list and summary values (total qty + total price).
 */
function renderCart() {
  if (!cartItems.length) {
    cartItemsContainer.innerHTML = "";
    cartEmptyState.classList.remove("hidden");
    cartTotalItems.textContent = "0";
    cartTotalPrice.textContent = "$0.00";
    return;
  }

  cartEmptyState.classList.add("hidden");

  cartItemsContainer.innerHTML = cartItems
    .map(
      (item) => `
        <article class="cart-item">
          <img src="${item.image}" alt="${item.title}" class="h-16 w-16 rounded bg-base-200 object-contain p-1" />
          <div>
            <h4 class="text-sm font-semibold">${truncateTitle(item.title, 50)}</h4>
            <p class="mt-1 text-sm text-base-content/70">
              ${formatCurrency(item.price)} x ${item.quantity} = <span class="font-semibold">${formatCurrency(item.price * item.quantity)}</span>
            </p>
          </div>
          <div class="cart-item-actions">
            <button class="btn btn-xs" data-cart-action="decrease" data-id="${item.id}">-</button>
            <span class="min-w-6 text-center text-sm font-semibold">${item.quantity}</span>
            <button class="btn btn-xs" data-cart-action="increase" data-id="${item.id}">+</button>
            <button class="btn btn-xs btn-error btn-outline" data-cart-action="remove" data-id="${item.id}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </article>
      `
    )
    .join("");

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  cartTotalItems.textContent = String(totalItems);
  cartTotalPrice.textContent = formatCurrency(totalPrice);
}

/**
 * Handles quantity updates and remove actions for cart items.
 */
function handleCartItemActions(event) {
  const actionButton = event.target.closest("[data-cart-action]");
  if (!actionButton) return;

  const action = actionButton.dataset.cartAction;
  const id = Number(actionButton.dataset.id);
  const item = cartItems.find((cartItem) => cartItem.id === id);
  if (!item) return;

  if (action === "increase") {
    item.quantity += 1;
  } else if (action === "decrease") {
    if (item.quantity > 1) {
      item.quantity -= 1;
    } else {
      cartItems = cartItems.filter((cartItem) => cartItem.id !== id);
    }
  } else if (action === "remove") {
    cartItems = cartItems.filter((cartItem) => cartItem.id !== id);
  }

  updateCart();
}

/**
 * Loads top rated products into "Trending Now" section.
 */
async function loadTrendingProducts() {
  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) {
      throw new Error("Failed to fetch trending products");
    }

    const products = await response.json();
    cacheProducts(products);

    const trendingProducts = [...products]
      .sort((a, b) => (b.rating?.rate || 0) - (a.rating?.rate || 0))
      .slice(0, 3);

    trendingContainer.innerHTML = trendingProducts.map((product) => createProductCard(product)).join("");
  } catch (error) {
    console.error("Trending loading error:", error);
    trendingContainer.innerHTML = `
      <div class="col-span-full rounded-lg border border-error/40 bg-error/10 p-4 text-center text-error">
        Could not load trending products right now.
      </div>
    `;
  }
}

/**
 * Handles Details/Add actions for both product and trending cards.
 */
function handleCardActions(event) {
  const detailsButton = event.target.closest("[data-action='details']");
  if (detailsButton) {
    showDetails(detailsButton.dataset.id);
    return;
  }

  const addButton = event.target.closest("[data-action='add']");
  if (addButton) {
    addToCartById(addButton.dataset.id);
  }
}

/**
 * Handles newsletter form submit without page refresh.
 */
function handleNewsletterSubmit(event) {
  event.preventDefault();
  newsletterForm.reset();
  newsletterMessage.textContent = "Thanks for subscribing to SwiftCart newsletter!";
  setTimeout(() => {
    newsletterMessage.textContent = "";
  }, 3000);
}

/**
 * Handles checkout interaction.
 */
function handleCheckout() {
  if (!cartItems.length) {
    alert("Your cart is empty.");
    return;
  }

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  alert(`Order placed successfully! Total: ${formatCurrency(totalPrice)}`);
  cartItems = [];
  updateCart();
  cartModal.close();
}

/**
 * Bootstraps the app and attaches all event handlers.
 */
async function init() {
  document.getElementById("currentYear").textContent = new Date().getFullYear();

  loadCartFromStorage();
  updateCart();

  shopNowBtn.addEventListener("click", () => {
    document.getElementById("productsSection").scrollIntoView({ behavior: "smooth" });
  });

  closeModalBtn.addEventListener("click", () => productModal.close());
  modalAddToCart.addEventListener("click", async () => {
    if (!modalSelectedProductId) return;
    await addToCartById(modalSelectedProductId);
    productModal.close();
  });

  openCartBtn.addEventListener("click", () => {
    renderCart();
    cartModal.showModal();
  });

  closeCartBtn.addEventListener("click", () => cartModal.close());
  clearCartBtn.addEventListener("click", () => {
    cartItems = [];
    updateCart();
  });
  checkoutBtn.addEventListener("click", handleCheckout);

  categoryContainer.addEventListener("click", handleCategorySelection);
  productsContainer.addEventListener("click", handleCardActions);
  trendingContainer.addEventListener("click", handleCardActions);
  cartItemsContainer.addEventListener("click", handleCartItemActions);
  newsletterForm.addEventListener("submit", handleNewsletterSubmit);

  await fetchCategories();
  await Promise.all([loadProducts("All"), loadTrendingProducts()]);
}

init();
