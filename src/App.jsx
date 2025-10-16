// src/App.jsx
import React, { useEffect, useState, createContext, useContext } from "react";

/*
  App.jsx completo:
  - Consume https://api.escuelajs.co/api/v1/products
  - Pestañas: Productos, Buscar, Favoritos, Original, Info
  - Menú lateral
  - Filtro por categoría / rango de precio
  - Buscador (por título)
  - Detalle en modal
  - Favoritos guardados en localStorage
  - Objeto compartido (SharedContext) para demostrar estado compartido
*/

/* ---------- Shared Context (Objeto compartido) ---------- */
const SharedContext = createContext();
const useShared = () => useContext(SharedContext);

/* ---------- Helper: localStorage favorites ---------- */
const FAVORITES_KEY = "my_app_favorites_v1";
const loadFavorites = () => {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};
const saveFavorites = (list) => {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  } catch {}
};

/* ---------- Small UI components ---------- */
const IconMenu = ({ onClick }) => (
  <button onClick={onClick} aria-label="menu" style={styles.iconButton}>
    ☰
  </button>
);

const CloseButton = ({ onClick }) => (
  <button onClick={onClick} aria-label="cerrar" style={styles.iconButton}>
    ✕
  </button>
);

const Loader = () => <div style={{ padding: 20 }}>Cargando…</div>;

/* ---------- App ---------- */
export default function App() {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("productos"); // productos | buscar | favoritos | original | info
  // Shared state example: contador simple y usuario ficticio
  const [shared, setShared] = useState({ counter: 0, user: { name: "Invitado" } });

  return (
    <SharedContext.Provider value={{ shared, setShared }}>
      <div style={styles.app}>
        <Header onMenu={() => setMenuOpen(true)} title="Mi Tienda App" />
        <div style={styles.content}>
          {isMenuOpen && <SideMenu onClose={() => setMenuOpen(false)} setActiveTab={setActiveTab} />}
          <main style={styles.main}>
            {activeTab === "productos" && <ProductosTab />}
            {activeTab === "buscar" && <BuscarTab />}
            {activeTab === "favoritos" && <FavoritosTab />}
            {activeTab === "original" && <OriginalTab />}
            {activeTab === "info" && <InfoTab />}
          </main>
        </div>
        <BottomTabs active={activeTab} onChange={setActiveTab} />
      </div>
    </SharedContext.Provider>
  );
}

/* ---------- Header ---------- */
function Header({ onMenu, title }) {
  const { shared } = useShared();
  return (
    <header style={styles.header}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <IconMenu onClick={onMenu} />
        <h1 style={styles.title}>{title}</h1>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <small>Usuario: {shared.user?.name}</small>
        <small>Contador: {shared.counter}</small>
      </div>
    </header>
  );
}

/* ---------- SideMenu (Menú) ---------- */
function SideMenu({ onClose, setActiveTab }) {
  const menuGo = (tab) => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <div style={styles.sideMenuBackdrop}>
      <aside style={styles.sideMenu}>
        <div style={styles.sideMenuHeader}>
          <strong>Menú</strong>
          <CloseButton onClick={onClose} />
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button style={styles.menuButton} onClick={() => menuGo("productos")}>Productos</button>
          <button style={styles.menuButton} onClick={() => menuGo("buscar")}>Buscar</button>
          <button style={styles.menuButton} onClick={() => menuGo("favoritos")}>Favoritos</button>
          <button style={styles.menuButton} onClick={() => menuGo("original")}>Pestaña original</button>
          <button style={styles.menuButton} onClick={() => menuGo("info")}>Información</button>
        </nav>
      </aside>
    </div>
  );
}

/* ---------- BottomTabs (5 pestañas) ---------- */
function BottomTabs({ active, onChange }) {
  const tabs = [
    { id: "productos", label: "Productos" },
    { id: "buscar", label: "Buscar" },
    { id: "favoritos", label: "Favoritos" },
    { id: "original", label: "Original" },
    { id: "info", label: "Info" },
  ];
  return (
    <footer style={styles.bottomTabs}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={t.id === active ? styles.tabActive : styles.tab}
        >
          {t.label}
        </button>
      ))}
    </footer>
  );
}

/* ---------- ProductosTab: lista + filtros + detalle ---------- */
function ProductosTab() {
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceMax, setPriceMax] = useState("");
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [favorites, setFavorites] = useState(loadFavorites());

  // fetch products (simple)
  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        const res = await fetch("https://api.escuelajs.co/api/v1/products");
        const data = await res.json();
        if (!mounted) return;
        setProducts(data);
        // extract categories
        const cats = Array.from(new Set(data.map((p) => (p.category && p.category.name) || "Sin categoría")));
        setCategories(cats);
      } catch (err) {
        console.error("Error fetching products", err);
        setProducts([]);
      }
    }
    fetchData();
    return () => (mounted = false);
  }, []);

  useEffect(() => saveFavorites(favorites), [favorites]);

  const toggleFavorite = (product) => {
    const exists = favorites.find((f) => f.id === product.id);
    let next;
    if (exists) next = favorites.filter((f) => f.id !== product.id);
    else next = [...favorites, { id: product.id, title: product.title, price: product.price, images: product.images }];
    setFavorites(next);
  };

  const filtered = (products || [])
    .filter((p) => {
      if (selectedCategory !== "all") {
        const name = p.category?.name || "Sin categoría";
        if (name !== selectedCategory) return false;
      }
      if (priceMax) {
        const maxVal = Number(priceMax);
        if (!Number.isNaN(maxVal) && p.price > maxVal) return false;
      }
      if (query) {
        return p.title.toLowerCase().includes(query.toLowerCase());
      }
      return true;
    });

  if (products === null) return <Loader />;

  return (
    <div style={{ padding: 16 }}>
      <h2>Productos</h2>

      <div style={styles.filterRow}>
        <div>
          <label>Buscar: </label>
          <input placeholder="Título..." value={query} onChange={(e) => setQuery(e.target.value)} style={styles.input} />
        </div>

        <div>
          <label>Categoría: </label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={styles.input}>
            <option value="all">Todas</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label>Precio máximo: </label>
          <input
            placeholder="ej. 100"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            style={{ ...styles.input, width: 100 }}
          />
        </div>
      </div>

      <div style={styles.list}>
        {filtered.length === 0 && <div>No hay productos que mostrar.</div>}
        {filtered.map((p) => (
          <article key={p.id} style={styles.card}>
            <img src={p.images?.[0] || ""} alt={p.title} style={styles.thumb} onError={(e)=>{e.target.style.display='none'}}/>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: "0 0 8px 0" }}>{p.title}</h3>
              <div style={{ fontSize: 14, color: "#555" }}>{p.category?.name || "Sin categoría"}</div>
              <div style={{ marginTop: 8, fontWeight: "600" }}>${p.price}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button style={styles.smallButton} onClick={() => setSelectedProduct(p)}>Ver</button>
              <button style={styles.smallButton} onClick={() => toggleFavorite(p)}>
                {favorites.find((f) => f.id === p.id) ? "❤️" : "🤍"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onToggleFav={toggleFavorite}
          isFav={!!favorites.find((f) => f.id === selectedProduct.id)}
        />
      )}
    </div>
  );
}

/* ---------- BuscarTab (puede reutilizar mecanismos de productos pero separado UI) ---------- */
function BuscarTab() {
  // We'll do a simple search-by-term against the same API endpoint, filtering client-side for simplicity
  const [term, setTerm] = useState("");
  const [results, setResults] = useState(null);
  const [favorites, setFavorites] = useState(loadFavorites());
  const [selected, setSelected] = useState(null);

  useEffect(() => saveFavorites(favorites), [favorites]);

  const performSearch = async () => {
    setResults(null);
    try {
      const res = await fetch("https://api.escuelajs.co/api/v1/products");
      const data = await res.json();
      const filtered = data.filter((p) => p.title.toLowerCase().includes(term.toLowerCase()));
      setResults(filtered);
    } catch (err) {
      setResults([]);
    }
  };

  const toggleFavorite = (product) => {
    const exists = favorites.find((f) => f.id === product.id);
    let next;
    if (exists) next = favorites.filter((f) => f.id !== product.id);
    else next = [...favorites, { id: product.id, title: product.title, price: product.price, images: product.images }];
    setFavorites(next);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Buscar</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input placeholder="Buscar por título..." value={term} onChange={(e) => setTerm(e.target.value)} style={styles.input} />
        <button style={styles.button} onClick={performSearch}>Buscar</button>
      </div>

      {!results && <div>Realiza una búsqueda para ver resultados.</div>}
      {results && results.length === 0 && <div>No se encontraron resultados.</div>}
      {results && results.length > 0 && (
        <div style={styles.list}>
          {results.map((p) => (
            <article key={p.id} style={styles.card}>
              <img src={p.images?.[0] || ""} alt={p.title} style={styles.thumb} onError={(e)=>{e.target.style.display='none'}}/>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 8px 0" }}>{p.title}</h3>
                <div>${p.price}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button style={styles.smallButton} onClick={() => setSelected(p)}>Ver</button>
                <button style={styles.smallButton} onClick={() => toggleFavorite(p)}>
                  {favorites.find((f) => f.id === p.id) ? "❤️" : "🤍"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} onToggleFav={toggleFavorite} isFav={!!favorites.find(f=>f.id===selected.id)} />}
    </div>
  );
}

/* ---------- Favoritos Tab ---------- */
function FavoritosTab() {
  const [favorites, setFavorites] = useState(loadFavorites());
  const [selected, setSelected] = useState(null);

  useEffect(() => saveFavorites(favorites), [favorites]);

  const removeFav = (id) => {
    setFavorites(favorites.filter((f) => f.id !== id));
  };

  if (favorites.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Favoritos</h2>
        <div>No tienes favoritos aún. Marca con ❤️ desde la lista de productos.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Favoritos</h2>
      <div style={styles.list}>
        {favorites.map((f) => (
          <article key={f.id} style={styles.card}>
            <img src={f.images?.[0] || ""} alt={f.title} style={styles.thumb} onError={(e)=>{e.target.style.display='none'}}/>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0 }}>{f.title}</h3>
              <div style={{ marginTop: 8 }}>${f.price}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button style={styles.smallButton} onClick={() => setSelected(f)}>Ver</button>
              <button style={styles.smallButton} onClick={() => removeFav(f.id)}>Eliminar</button>
            </div>
          </article>
        ))}
      </div>

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} onToggleFav={() => removeFav(selected.id)} isFav={true} />}
    </div>
  );
}

/* ---------- OriginalTab (pestaña original) ---------- */
function OriginalTab() {
  const { shared, setShared } = useShared();
  // Pestaña original: demostración creativa (ej: contador + mini galería)
  return (
    <div style={{ padding: 16 }}>
      <h2>Pestaña Original</h2>
      <p>Idea original: contador compartido + tarjetas creativas.</p>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button style={styles.button} onClick={() => setShared({ ...shared, counter: shared.counter + 1 })}>Incrementar contador</button>
        <button style={styles.button} onClick={() => setShared({ ...shared, counter: 0 })}>Reset</button>
        <div>Valor: <strong>{shared.counter}</strong></div>
      </div>

      <div style={{ marginTop: 16 }}>
        <small>Mini galería: imágenes aleatorias de la API (3 primeros productos)</small>
        <GalleryPreview />
      </div>
    </div>
  );
}

function GalleryPreview() {
  const [sample, setSample] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("https://api.escuelajs.co/api/v1/products?offset=0&limit=6");
        const data = await res.json();
        if (!mounted) return;
        setSample(data.slice(0, 3));
      } catch {
        setSample([]);
      }
    })();
    return () => (mounted = false);
  }, []);
  if (!sample) return <Loader />;
  return (
    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
      {sample.map((p) => (
        <div key={p.id} style={{ width: 120, textAlign: "center" }}>
          <img src={p.images?.[0]} alt={p.title} style={{ width: 120, height: 80, objectFit: "cover" }} onError={(e)=>{e.target.style.display='none'}}/>
          <div style={{ fontSize: 12 }}>{p.title}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- InfoTab (Página informativa) ---------- */
function InfoTab() {
  return (
    <div style={{ padding: 16 }}>
      <h2>Información</h2>
      <p>Aplicación demo creada con React + Vite. API usada: <code>https://api.escuelajs.co/api/v1/products</code></p>
      <ul>
        <li>Autor: Estudiante / Equipo</li>
        <li>Características: lista, filtro, búsqueda, favoritos (localStorage), detalle, pestaña original</li>
        <li>Generar APK: usar Capacitor (instrucciones abajo)</li>
      </ul>

      <h3>Instrucciones breves para generar APK (resumen)</h3>
      <ol>
        <li>Instala Capacitor en proyecto si no lo hiciste:
          <pre style={styles.code}>npm install @capacitor/core @capacitor/cli</pre>
        </li>
        <li>Inicializa Capacitor:
          <pre style={styles.code}>npx cap init &lt;appId&gt; &lt;appName&gt;</pre>
        </li>
        <li>Construye web:
          <pre style={styles.code}>npm run build</pre>
        </li>
        <li>Agrega plataforma Android:
          <pre style={styles.code}>npx cap add android</pre>
        </li>
        <li>Sincroniza assets:
          <pre style={styles.code}>npx cap copy</pre>
        </li>
        <li>Abrir Android Studio:
          <pre style={styles.code}>npx cap open android</pre>
        </li>
        <li>En Android Studio: build → Generate Signed Bundle / APK → seguir pasos para generar APK.</li>
      </ol>
    </div>
  );
}

/* ---------- ProductModal (Detalle del elemento) ---------- */
function ProductModal({ product, onClose, onToggleFav, isFav }) {
  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>{product.title}</h3>
          <CloseButton onClick={onClose} />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          {product.images?.[0] && <img src={product.images[0]} alt={product.title} style={{ width: 160, height: 160, objectFit: "cover" }} onError={(e)=>{e.target.style.display='none'}}/>}
          <div style={{ flex: 1 }}>
            <p><strong>Precio:</strong> ${product.price}</p>
            <p><strong>Categoría:</strong> {product.category?.name || "Sin categoría"}</p>
            <p style={{ marginTop: 8 }}>{product.description}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button style={styles.button} onClick={() => { onToggleFav(product); }}> {isFav ? "Eliminar de favoritos" : "Agregar a favoritos"} </button>
              <a style={{ ...styles.button, textDecoration: "none" }} href={`mailto:?subject=${encodeURIComponent(product.title)}&body=${encodeURIComponent(window.location.href + "\n\nProducto: " + product.title)}`}>
                Compartir por email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Estilos simples ---------- */
const styles = {
  app: { display: "flex", flexDirection: "column", height: "100vh", fontFamily: "system-ui, Arial, sans-serif" },
  header: { padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee" },
  title: { margin: 0, fontSize: 18 },
  content: { display: "flex", flex: 1, position: "relative" },
  main: { flex: 1, overflow: "auto" },

  sideMenuBackdrop: { position: "absolute", left: 0, top: 0, bottom: 0, width: "100%", background: "rgba(0,0,0,0.2)", display: "flex" },
  sideMenu: { width: 260, background: "#fff", padding: 12, boxShadow: "2px 0 6px rgba(0,0,0,0.12)" },
  sideMenuHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },

  bottomTabs: { display: "flex", gap: 2, borderTop: "1px solid #eee", padding: 6, justifyContent: "space-around" },
  tab: { padding: "8px 12px", background: "transparent", border: "none" },
  tabActive: { padding: "8px 12px", background: "#007bff", color: "#fff", border: "none", borderRadius: 6 },

  filterRow: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, alignItems: "center" },
  list: { display: "flex", flexDirection: "column", gap: 12, marginTop: 12 },
  card: { display: "flex", gap: 12, alignItems: "center", padding: 12, border: "1px solid #eee", borderRadius: 8 },
  thumb: { width: 96, height: 72, objectFit: "cover", borderRadius: 6 },

  input: { padding: 8, borderRadius: 6, border: "1px solid #ddd" },
  button: { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#f7f7f7", cursor: "pointer" },
  smallButton: { padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: "pointer" },

  modalBackdrop: { position: "fixed", left: 0, right: 0, top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", zIndex: 60 },
  modal: { width: "92%", maxWidth: 820, background: "#fff", padding: 16, borderRadius: 8 },

  iconButton: { border: "none", background: "transparent", fontSize: 20, cursor: "pointer" },

  code: { background: "#f3f3f3", padding: 8, borderRadius: 6, display: "inline-block" },

  menuButton: { padding: 8, borderRadius: 6, border: "1px solid #ddd", background: "#fff", textAlign: "left" }
};
