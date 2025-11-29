// --- Utils ---
const norm = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const concernAliases = {
  // filtre -> liste de mots clés acceptés dans products.json
  "hydratation": ["hydratation", "dehydr", "barriere", "confort", "glyc", "hyaluron"],
  "eclat": ["eclat", "taches", "tache", "lum", "glow", "teint terne", "hibiscus", "citron"],
  "imperfections": ["imperfection", "acne", "pores", "brillance", "seb", "charbon", "argile"],
  "anti-age": ["anti-age", "fermete", "rides", "lissant", "collag", "niacinamide"] // élargi
};

function matchesConcern(productConcerns = [], selected) {
  if (selected === "all") return true;
  const want = norm(selected);
  const words = concernAliases[selected] || [selected];

  // on regarde dans product.concerns ET dans longDesc/shortDesc pour être tolérant
  const hay = [
    ...(productConcerns || []).map(norm),
  ].join(" ");

  const hitList = words.map(norm);
  if (hitList.some((w) => hay.includes(w))) return true;

  return false;
}

function matchesSkin(productSkinTypes = [], selected) {
  if (selected === "all") return true;
  return (productSkinTypes || []).map(norm).includes(norm(selected));
}

// --- Boutique: charger + filtrer les produits ---
async function loadProducts() {
  const grid = document.getElementById("products-grid");
  if (!grid) return;

  const [filterSkin, filterConcern] = [
    document.getElementById("filter-skin"),
    document.getElementById("filter-concern"),
  ];

  let products = [];
  try {
    const response = await fetch("products.json", { cache: "no-store" });
    products = await response.json();
  } catch (e) {
    grid.innerHTML = "<p>Erreur de chargement des produits.</p>";
    return;
  }

  function displayProducts() {
    const skin = (filterSkin?.value) || "all";
    const concern = (filterConcern?.value) || "all";

    const filtered = products.filter((p) => {
      const okSkin = matchesSkin(p.skinTypes, skin);
      const okConcern = matchesConcern(p.concerns, concern);
      return okSkin && okConcern;
    });

    grid.innerHTML = "";
    if (!filtered.length) {
      grid.innerHTML = "<p>Aucun produit ne correspond à ces filtres.</p>";
      return;
    }

    filtered.forEach((product) => {
      const card = document.createElement("div");
      card.className = "product-card";
      const img = (product.images && product.images[0]) || "assets/placeholder.jpg";

      card.innerHTML = `
        <img src="${img}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p>${product.shortDesc || ""}</p>
        <a href="produit.html?id=${product.slug}" class="btn-secondary">Voir le produit</a>
      `;
      grid.appendChild(card);
    });
  }

  displayProducts();
  filterSkin?.addEventListener("change", displayProducts);
  filterConcern?.addEventListener("change", displayProducts);
}

// --- Détail Produit ---
async function loadSingleProduct() {
  const container = document.getElementById("product-detail");
  if (!container) return; // pas sur produit.html

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    container.innerHTML = "<p>Produit introuvable.</p>";
    return;
  }

  try {
    const res = await fetch("products.json", { cache: "no-store" });
    const products = await res.json();
    const p = products.find((x) => x.slug === id);

    if (!p) {
      container.innerHTML = "<p>Produit introuvable.</p>";
      return;
    }

    document.title = `${p.name} – NÜWA`;

    container.innerHTML = `
      <div class="product-images">
        <img src="${(p.images && p.images[0]) || "assets/placeholder.jpg"}" alt="${p.name}">
      </div>
      <div class="product-info">
        <nav class="breadcrumbs">
          <a href="index.html">Accueil</a> › <a href="boutique.html">Boutique</a> › <span>${p.name}</span>
        </nav>
        <h1>${p.name}</h1>
        ${p.price ? `<p class="price">${p.price} €</p>` : ""}
        <p>${p.longDesc || p.shortDesc || ""}</p>

        ${Array.isArray(p.actives) && p.actives.length ? `
          <h3>Actifs clés</h3>
          <ul>${p.actives.map((a) => `<li>${a}</li>`).join("")}</ul>` : ""}

        ${Array.isArray(p.howTo) && p.howTo.length ? `
          <h3>Conseils d'utilisation</h3>
          <ul>${p.howTo.map((h) => `<li>${h}</li>`).join("")}</ul>` : ""}

        ${(p.skinTypes?.length || p.concerns?.length) ? `
          <div class="tags">
            ${p.skinTypes?.length ? `<span><strong>Types de peau :</strong> ${p.skinTypes.join(", ")}</span>` : ""}
            ${p.concerns?.length ? `<span><strong>Besoins :</strong> ${p.concerns.join(", ")}</span>` : ""}
          </div>` : ""}

        <div class="cta">
          <a href="kits.html" class="btn-secondary">Voir les kits</a>
          <a href="boutique.html" class="btn">Tous les produits</a>
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = "<p>Erreur de chargement du produit.</p>";
  }
}

// --- Liste des Kits ---
// Chargement des kits (avec prix)
async function loadKits() {
  const grid = document.getElementById('kits-grid');
  if (!grid) return;

  try {
    const response = await fetch('kits.json', { cache: 'no-store' });
    const kits = await response.json();

    grid.innerHTML = '';
    kits.forEach(kit => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="${kit.image}" alt="${kit.name}">
        <h3>${kit.name}</h3>
        <p class="price">${kit.price} €</p>
        <p>${kit.shortDesc}</p>
        <a href="kit.html?id=${kit.slug}" class="btn-secondary">Voir le kit</a>
      `;
      grid.appendChild(card);
    });
  } catch (e) {
    grid.innerHTML = '<p>Erreur de chargement des kits.</p>';
  }
}


// --- Détail Kit ---
async function loadSingleKit() {
  const container = document.getElementById("kit-detail");
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    container.innerHTML = "<p>Kit introuvable.</p>";
    return;
  }

  try {
    const response = await fetch("kits.json", { cache: "no-store" });
    const kits = await response.json();
    const kit = kits.find((k) => k.slug === id);

    if (!kit) {
      container.innerHTML = "<p>Kit introuvable.</p>";
      return;
    }

    document.title = `${kit.name} – NÜWA`;

    container.innerHTML = `
      <div class="product-images">
        <img src="${kit.image}" alt="${kit.name}">
      </div>
      <div class="product-info">
        <nav class="breadcrumbs">
          <a href="index.html">Accueil</a> › <a href="kits.html">Kits</a> › <span>${kit.name}</span>
        </nav>
        <h1>${kit.name}</h1>
        ${kit.price ? `<p class="price">${kit.price} €</p>` : ""}
        <p>${kit.longDesc || kit.shortDesc || ""}</p>

        ${Array.isArray(kit.products) && kit.products.length ? `
          <h3>Contenu du kit</h3>
          <ul>${kit.products.map((p) => `<li>${p}</li>`).join("")}</ul>` : ""}

        ${Array.isArray(kit.howTo) && kit.howTo.length ? `
          <h3>Conseils d'utilisation</h3>
          <ul>${kit.howTo.map((h) => `<li>${h}</li>`).join("")}</ul>` : ""}

        <div class="cta">
          <a href="boutique.html" class="btn">Tous les produits</a>
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = "<p>Erreur de chargement du kit.</p>";
  }
}

// --- INIT (une seule fois) ---
window.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  loadSingleProduct();
  loadKits();
  loadSingleKit();
});
