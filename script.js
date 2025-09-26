import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', function() {
  // Agregar modal para imágenes ampliadas al DOM
  document.body.insertAdjacentHTML('beforeend', `
    <div id="modalImagen" class="modal-imagen">
      <span class="cerrar-imagen">×</span>
      <img class="contenido-imagen" id="imagenAmpliada">
      <div class="pie-imagen"></div>
    </div>
  `);

  // Configuración de Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyD-P5-GOlwT-Ax51u3giJm1G-oXmfOf9-g",
    authDomain: "tabymakeup-of.firebaseapp.com",
    projectId: "tabymakeup-of",
    storageBucket: "tabymakeup-of.appspot.com",
    messagingSenderId: "548834143470",
    appId: "1:548834143470:web:54812e64324b3629f617ff"
  };

  // Inicializar Firebase y Firestore
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Variables globales
  let todosProductos = [];
  let productoSeleccionado = null;
  let tonoSeleccionado = '';

  // Función para debounce
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Función para obtener el nombre de visualización de una categoría
  function getCategoriaDisplayName(categoria) {
    const categorias = {
      'iluminadores': 'Iluminadores y contornos',
      'base': 'Base',
      'brochas': 'Brochas',
      'delineadores': 'Delineadores',
      'fijador': 'Fijador',
      'mascara': 'Máscara de pestañas',
      'polvos': 'Polvos',
      'rubor': 'Rubor',
      'sombras': 'Sombras',
      'arqueadores': 'Arqueadores',
      'brillos': 'Brillos/Glitter',
      'correctores': 'Correctores',
      'esponjitas': 'Esponjitas',
      'labiales': 'Labiales',
      'pestanas-cejas': 'Pestañas/Cejas',
      'primer': 'Primer',
      'skincare': 'Skincare',
      'uñas': 'Uñas',
      'skalas': 'Skalas',
      'varios': 'Varios'
    };
    return categorias[categoria] || categoria;
  }

  // Función para obtener sugerencias de búsqueda
  function getSugerenciaBusqueda(termino) {
    const sugerencias = {
      'base': 'bases',
      'sombra': 'sombras',
      'delineador': 'delineadores',
      'mascara': 'máscaras',
      'rubor': 'rubores',
      'labial': 'labiales',
      'brocha': 'brochas',
      'esponjita': 'esponjitas',
      'corrector': 'correctores',
      'primer': 'primers',
      'fijador': 'fijadores',
      'polvo': 'polvos',
      'arqueador': 'arqueadores',
      'brillo': 'brillos',
      'glitter': 'brillos',
      'skincare': 'cuidado de la piel',
      'uña': 'uñas',
      'skala': 'skalas'
    };
    
    const terminoLower = termino.toLowerCase();
    for (const [key, value] of Object.entries(sugerencias)) {
      if (terminoLower.includes(key)) {
        return value;
      }
    }
    return termino;
  }

  // Función para configurar sugerencias de búsqueda
  function configurarSugerenciasBusqueda() {
    document.querySelectorAll('.sugerencia-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const sugerencia = this.getAttribute('data-sugerencia');
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.value = sugerencia;
          searchInput.dispatchEvent(new Event('input'));
        }
      });
    });
  }

  // Función principal para cargar y renderizar productos (optimizada)
  async function cargarProductos() {
    try {
      // Mostrar indicador de carga
      const loadingIndicator = document.getElementById("loadingIndicator");
      if (loadingIndicator) {
        loadingIndicator.style.display = "block";
      }
      
      const snapshot = await getDocs(collection(db, "productos"));
      todosProductos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordenar productos: nuevos primero, sin stock al final
      todosProductos = ordenarProductos(todosProductos);
      
      // Limpiar cache cuando se cargan nuevos productos
      cacheProductos.clear();
      
      // Renderizar productos
      renderizarProductos();
      
      // Configurar buscador y filtros solo una vez
      if (!window.buscadorConfigurado) {
      configurarBuscador();
      configurarFiltros();
        window.buscadorConfigurado = true;
      }
      
    } catch (error) {
      console.error("Error al cargar productos:", error);
      // Mostrar mensaje de error al usuario
      const contenedorTodos = document.getElementById("contenedor-todos");
      if (contenedorTodos) {
        contenedorTodos.innerHTML = `
          <div class="error-carga">
            <p>Error al cargar los productos. Por favor, recarga la página.</p>
          </div>
        `;
      }
    }
  }

  // Función para ordenar productos inteligentemente
  // Prioridad de ordenamiento:
  // 1. Productos marcados como "Nuevo" (esNuevo = true) aparecen primero
  // 2. Entre productos nuevos, se ordenan por fecha de subida (más reciente primero)
  // 3. Productos con stock aparecen antes que productos sin stock
  // 4. Entre productos con el mismo estado de stock, se ordenan por fecha de subida
  function ordenarProductos(productos) {
    return [...productos].sort((a, b) => {
      // 1. Productos nuevos primero (esNuevo = true)
      if (a.esNuevo && !b.esNuevo) return -1;
      if (!a.esNuevo && b.esNuevo) return 1;
      
      // 2. Si ambos son nuevos, ordenar por fecha de subida (más reciente primero)
      if (a.esNuevo && b.esNuevo) {
        const fechaA = a.fechaSubida ? new Date(a.fechaSubida) : new Date(0);
        const fechaB = b.fechaSubida ? new Date(b.fechaSubida) : new Date(0);
        return fechaB - fechaA;
      }
      
      // 3. Productos con stock antes que productos sin stock
      if (a.disponible && !b.disponible) return -1;
      if (!a.disponible && b.disponible) return 1;
      
      // 4. Si ambos tienen el mismo estado de stock, ordenar por fecha de subida
      const fechaA = a.fechaSubida ? new Date(a.fechaSubida) : new Date(0);
      const fechaB = b.fechaSubida ? new Date(b.fechaSubida) : new Date(0);
      return fechaB - fechaA;
    });
  }

  // Función para reordenar productos cuando se actualicen
  function reordenarProductos() {
    todosProductos = ordenarProductos(todosProductos);
    renderizarProductos();
  }

  // Configurar listener para cambios en tiempo real (opcional)
  function configurarListenerTiempoReal() {
    // Esta función se puede usar en el futuro para actualizaciones en tiempo real
    // Por ahora, el reordenamiento se hace cada vez que se cargan los productos
  }

    // Función para renderizar productos con filtrado
  // Función para renderizar productos con filtrado
function renderizarProductos(filtro = "", categoria = "all", disponible = "all") {
  const contenedorTodos = document.getElementById("contenedor-todos");
  const secciones = document.querySelectorAll(".seccion-productos");
  const loadingIndicator = document.getElementById("loadingIndicator");

  if (!contenedorTodos || !secciones.length) return;

  if (loadingIndicator) loadingIndicator.style.display = "block";

  // Limpiar contenedores
  contenedorTodos.innerHTML = "";
  contenedorTodos.classList.remove('sin-resultados');
  secciones.forEach(seccion => {
    const contenedor = seccion.querySelector(".productos-container");
    if (contenedor) contenedor.innerHTML = "";
  });

  // Crear o actualizar el contenedor de resultados de búsqueda
  let resultadosTitulo = document.getElementById("resultados-titulo");
  if (!resultadosTitulo) {
    resultadosTitulo = document.createElement("div");
    resultadosTitulo.id = "resultados-titulo";
    resultadosTitulo.className = "resultados-busqueda";
    const sectionTodos = document.getElementById("todos");
    sectionTodos.insertBefore(resultadosTitulo, contenedorTodos);
  }

  // Filtrar productos de manera más eficiente
  let productosFiltrados = todosProductos;
  
  if (filtro || categoria !== "all" || disponible !== "all") {
    const filtroLower = filtro ? filtro.toLowerCase() : '';
    productosFiltrados = productosFiltrados.filter(producto => {
      if (filtro && !(
        producto.nombre.toLowerCase().includes(filtroLower) ||
        (producto.categoria && producto.categoria.toLowerCase().includes(filtroLower)) ||
        (producto.descripcion && producto.descripcion.toLowerCase().includes(filtroLower))
      )) {
        return false;
      }
      if (categoria !== "all" && producto.categoria !== categoria) return false;
      if (disponible === "available" && !producto.disponible) return false;
      if (disponible === "unavailable" && producto.disponible) return false;
      return true;
    });
  }

  // Mostrar u ocultar el título de resultados según el filtro
  const tituloTodos = document.querySelector("#todos h2:not(#resultados-titulo)");
  if (filtro || categoria !== "all" || disponible !== "all") {
    const totalResultados = productosFiltrados.length;
    const terminoBusqueda = filtro || 'todos los productos';
    const categoriaFiltro = categoria !== "all" ? ` en ${getCategoriaDisplayName(categoria)}` : '';
    const disponibilidadFiltro = disponible !== "all" ? ` (${disponible === "available" ? "disponibles" : "no disponibles"})` : '';
    
    resultadosTitulo.innerHTML = `
      <div class="resultados-header">
        <div class="resultados-info">
          <i class="fas fa-search"></i>
          <span class="resultados-texto">
            ${totalResultados === 1 ? '1 producto encontrado' : `${totalResultados} productos encontrados`}
          </span>
        </div>
        <div class="resultados-filtros">
          <span class="termino-busqueda">"${terminoBusqueda}"</span>
          ${categoriaFiltro ? `<span class="filtro-categoria">${categoriaFiltro}</span>` : ''}
          ${disponibilidadFiltro ? `<span class="filtro-disponibilidad">${disponibilidadFiltro}</span>` : ''}
        </div>
      </div>
      ${filtro ? `<div class="sugerencias-busqueda">
        <span>Sugerencias:</span>
        <button class="sugerencia-btn" data-sugerencia="${getSugerenciaBusqueda(filtro)}">${getSugerenciaBusqueda(filtro)}</button>
      </div>` : ''}
    `;
    resultadosTitulo.style.display = "block";
    if (tituloTodos) tituloTodos.style.display = "none";
    configurarSugerenciasBusqueda();
  } else {
    resultadosTitulo.style.display = "none";
    if (tituloTodos) tituloTodos.style.display = "block";
  }

  // Renderizar productos o mensaje de no resultados
  if (productosFiltrados.length === 0) {
    const terminoBusqueda = filtro || 'los filtros seleccionados';
    const categoriaFiltro = categoria !== "all" ? ` en ${getCategoriaDisplayName(categoria)}` : '';
    const disponibilidadFiltro = disponible !== "all" ? ` (${disponible === "available" ? "disponibles" : "no disponibles"})` : '';
    
    contenedorTodos.innerHTML = `
      <div class="sin-resultados-container">
        <div class="sin-resultados-icono">
          <i class="fas fa-search"></i>
        </div>
        <h3 class="sin-resultados-titulo">No se encontraron productos</h3>
        <p class="sin-resultados-texto">
          No hay productos que coincidan con <strong>"${terminoBusqueda}"</strong>${categoriaFiltro}${disponibilidadFiltro}
        </p>
        <div class="sin-resultados-sugerencias">
          <p>Sugerencias:</p>
          <ul>
            <li>Verifica que las palabras estén escritas correctamente</li>
            <li>Intenta con términos más generales</li>
            <li>Prueba con sinónimos</li>
            <li>Revisa los filtros aplicados</li>
          </ul>
        </div>
        <button class="btn-limpiar-busqueda" onclick="limpiarBusqueda()">
          <i class="fas fa-times"></i> Limpiar búsqueda
        </button>
      </div>
    `;
    contenedorTodos.classList.add('sin-resultados');
  } else {
    contenedorTodos.classList.remove('sin-resultados');
    const fragmentTodos = document.createDocumentFragment();
    const fragmentosSecciones = {};
    
    productosFiltrados.forEach(producto => {
      const productoHTML = crearHTMLProducto(producto);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = productoHTML;
      const productoElement = tempDiv.firstElementChild;
      fragmentTodos.appendChild(productoElement);
      
      if (!filtro && categoria === "all" && disponible === "all") {
        const seccion = document.getElementById(producto.categoria);
        if (seccion) {
          const contenedor = seccion.querySelector(".productos-container");
          if (contenedor) {
            if (!fragmentosSecciones[producto.categoria]) {
              fragmentosSecciones[producto.categoria] = document.createDocumentFragment();
            }
            fragmentosSecciones[producto.categoria].appendChild(productoElement.cloneNode(true));
          }
        }
      }
      if (producto.categoria === 'ofertas') {
        const seccionOfertas = document.getElementById('ofertas');
        if (seccionOfertas) {
          const contenedorOfertas = seccionOfertas.querySelector(".productos-container");
          if (contenedorOfertas) {
            if (!fragmentosSecciones['ofertas']) {
              fragmentosSecciones['ofertas'] = document.createDocumentFragment();
            }
            fragmentosSecciones['ofertas'].appendChild(productoElement.cloneNode(true));
          }
        }
      }
    });

    contenedorTodos.innerHTML = "";
    const seccionTodos = document.getElementById("todos");
    if (seccionTodos) {
      const controlesExistentesTodos = seccionTodos.querySelector('.controles-ver-mas');
      if (controlesExistentesTodos) controlesExistentesTodos.remove();
    }

    const productosVisiblesTodos = productosFiltrados.slice(0, 7);
    const fragmentoTodos = document.createDocumentFragment();
    productosVisiblesTodos.forEach(producto => {
      const productoHTML = crearHTMLProducto(producto);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = productoHTML;
      fragmentoTodos.appendChild(tempDiv.firstElementChild);
    });
    contenedorTodos.appendChild(fragmentoTodos);

    if (productosFiltrados.length > 7 && seccionTodos) {
      const contenedorControlesTodos = document.createElement('div');
      contenedorControlesTodos.className = 'controles-ver-mas';
      contenedorControlesTodos.innerHTML = `
        <div class="contador-productos">
          Mostrando ${productosVisiblesTodos.length} de ${productosFiltrados.length} productos
        </div>
        <button class="btn-ver-mas" data-categoria="todos" data-mostrando="7">
          Ver más productos
        </button>
      `;
      seccionTodos.appendChild(contenedorControlesTodos);
    }

    Object.keys(fragmentosSecciones).forEach(categoria => {
      const seccion = document.getElementById(categoria);
      if (seccion) {
        const contenedor = seccion.querySelector(".productos-container");
        if (contenedor) {
          contenedor.innerHTML = "";
          const controlesExistentes = seccion.querySelector('.controles-ver-mas');
          if (controlesExistentes) controlesExistentes.remove();
          const productosCategoria = productosFiltrados.filter(p => p.categoria === categoria);
          const totalProductos = productosCategoria.length;
          if (totalProductos > 0) {
            const productosVisibles = productosCategoria.slice(0, 7);
            const fragmentoVisible = document.createDocumentFragment();
            productosVisibles.forEach(producto => {
              const productoHTML = crearHTMLProducto(producto);
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = productoHTML;
              fragmentoVisible.appendChild(tempDiv.firstElementChild);
            });
            contenedor.appendChild(fragmentoVisible);
            if (totalProductos > 7) {
              const contenedorControles = document.createElement('div');
              contenedorControles.className = 'controles-ver-mas';
              contenedorControles.innerHTML = `
                <div class="contador-productos">
                  Mostrando ${productosVisibles.length} de ${totalProductos} productos
                </div>
                <button class="btn-ver-mas" data-categoria="${categoria}" data-mostrando="7">
                  Ver más productos
                </button>
              `;
              seccion.appendChild(contenedorControles);
            }
          }
        }
      }
    });
  }

  // Mostrar u ocultar mensaje en la sección de ofertas
  const seccionOfertas = document.getElementById('ofertas');
  if (seccionOfertas) {
    let mensajeSinOfertas = seccionOfertas.querySelector('.mensaje-sin-ofertas');
    if (!mensajeSinOfertas) {
      mensajeSinOfertas = document.createElement('p');
      mensajeSinOfertas.className = 'mensaje-sin-ofertas';
      mensajeSinOfertas.textContent = 'No hay ofertas disponibles en este momento.';
      mensajeSinOfertas.style.display = 'none';
      seccionOfertas.insertBefore(mensajeSinOfertas, seccionOfertas.querySelector('.productos-container'));
    }
    const contenedorOfertas = seccionOfertas.querySelector('.productos-container');
    if (contenedorOfertas && contenedorOfertas.children.length === 0) {
      mensajeSinOfertas.style.display = 'block';
    } else {
      mensajeSinOfertas.style.display = 'none';
    }
  }

  // Ocultar secciones vacías o no relevantes
  secciones.forEach(seccion => {
    const contenedor = seccion.querySelector(".productos-container");
    if (contenedor) {
      seccion.style.display = (filtro || categoria !== "all" || disponible !== "all") && seccion.id !== "todos" && contenedor.children.length === 0 ? "none" : "block";
    }
  });

  // 🔥 Configurar eventos SIEMPRE después de renderizar
  setupProductosConTonos();
  configurarBotonesAgregar();
  configurarBotonesVerMas();

  if (loadingIndicator) loadingIndicator.style.display = "none";
}


  // Cache para evitar cálculos repetitivos
  const cacheProductos = new Map();
  
  // Función para crear el HTML de un producto (optimizada)
  function crearHTMLProducto(producto) {
    // Verificar cache primero
    if (cacheProductos.has(producto.id)) {
      return cacheProductos.get(producto.id);
    }
    
  const esNuevoPorFecha = producto.fechaSubida 
    ? (Date.now() - new Date(producto.fechaSubida).getTime()) / (1000 * 60 * 60 * 24) <= 15
    : false;
  const esNuevo = producto.esNuevo || esNuevoPorFecha;
    
    // Pre-calcular strings para evitar concatenaciones repetitivas
    const claseProducto = !producto.disponible ? 'no-disponible' : '';
    const claseBoton = producto.tonos && producto.tonos.length > 0 ? 'con-tonos' : '';
    const imagenSrc = producto.imagen || 'placeholder.jpg';
    const imagenHref = producto.imagen || '';
    const disabledAttr = !producto.disponible ? 'disabled' : '';
    
    // Pre-calcular datos de tonos si existen
    let tonosData = '';
    if (producto.tonos && producto.tonos.length > 0) {
      const tonosNombres = producto.tonos.map(t => t.nombre).join(',');
      const tonosImagenes = producto.tonos.map(t => t.imagen).join(',');
      tonosData = `data-tonos="${tonosNombres}" data-imagenes-tonos="${tonosImagenes}"`;
    }
    
    const html = `
      <div class="producto ${claseProducto}">
        <div class="producto-imagen-container">
          <a href="${imagenHref}" class="ampliar-imagen" data-nombre="${producto.nombre}" data-precio="${producto.precio}" title="${producto.nombre} · $${producto.precio}">
            <img src="${imagenSrc}" alt="${producto.nombre}" class="imagen-producto" loading="lazy">
          </a>
          ${esNuevo ? '<span class="badge-nuevo">Nuevo</span>' : ''}
        </div>
        <h3>${producto.nombre}</h3>
        ${producto.disponible ? `<p class="precio">$${producto.precio}</p>` : '<p class="no-disponible-text">Sin stock</p>'}
        <button class="agregar-carrito ${claseBoton}"
          data-id="${producto.id}"
          data-nombre="${producto.nombre}"
          data-precio="${producto.precio}"
          ${tonosData}
          ${disabledAttr}>
          Agregar al carrito
        </button>
      </div>
    `;
    
    // Guardar en cache
    cacheProductos.set(producto.id, html);
    return html;
  }

  // Configurar el buscador
  function configurarBuscador() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
      console.error('El elemento #searchInput no se encontró en el DOM');
      return;
    }

    const debouncedRender = debounce(() => {
      const searchTerm = searchInput.value.trim();
      const categoriaFiltro = document.getElementById('categoriaFiltro')?.value || 'all';
      const disponibilidadFiltro = document.getElementById('disponibilidadFiltro')?.value || 'all';
      renderizarProductos(searchTerm, categoriaFiltro, disponibilidadFiltro);
    }, 300);

    searchInput.addEventListener('input', debouncedRender);
  }

  // Configurar filtros
  function configurarFiltros() {
    const categoriaFiltro = document.getElementById('categoriaFiltro');
    const disponibilidadFiltro = document.getElementById('disponibilidadFiltro');

    if (categoriaFiltro && disponibilidadFiltro) {
      const debouncedRender = debounce(() => {
        const searchTerm = document.getElementById('searchInput')?.value.trim() || '';
        const categoria = categoriaFiltro.value;
        const disponible = disponibilidadFiltro.value;
        renderizarProductos(searchTerm, categoria, disponible);
      }, 300);

      categoriaFiltro.addEventListener('change', debouncedRender);
      disponibilidadFiltro.addEventListener('change', debouncedRender);
    }
  }

  // Configurar botones "Agregar al carrito" sin tonos
  function configurarBotonesAgregar() {
    document.querySelectorAll('.agregar-carrito:not(.con-tonos)').forEach(boton => {
      // Limpiar listeners previos
      const nuevoBoton = boton.cloneNode(true);
      boton.parentNode.replaceChild(nuevoBoton, boton);

      nuevoBoton.addEventListener('click', function() {
        // Estado de carga visual
        this.classList.add('cargando');
        const textoOriginal = this.textContent;
        this.textContent = 'Agregando...';

        agregarAlCarrito(
          this.getAttribute('data-id'),
          this.getAttribute('data-nombre'),
          this.getAttribute('data-precio'),
          '',
          true // silenciar notificación interna
        );

        // Cambiar a "Agregado" y luego mostrar la notificación
        setTimeout(() => {
          this.classList.remove('cargando');
          this.textContent = 'Agregado ✓';
          const nombre = this.getAttribute('data-nombre');
          mostrarNotificacion(`¡${nombre} agregado al carrito!`);
          setTimeout(() => {
            this.textContent = textoOriginal;
          }, 1200);
        }, 500);
      });
    });
  }

  // Configurar botones "Ver más" y "Ver menos"
  function configurarBotonesVerMas() {
    document.addEventListener('click', function(e) {
      // Verificar si el clic es en un botón o dentro de controles-ver-mas
      const btnVerMas = e.target.closest('.btn-ver-mas');
      if (btnVerMas) {
        const categoria = btnVerMas.getAttribute('data-categoria');
        const mostrando = parseInt(btnVerMas.getAttribute('data-mostrando'));
        const seccion = document.getElementById(categoria);
        
        if (seccion) {
          let contenedor, productosCategoria, totalProductos;
          
          if (categoria === 'todos') {
            // Para la sección "todos"
            contenedor = seccion.querySelector('#contenedor-todos');
            // Aplicar filtros actuales (con verificación de existencia)
            const buscador = document.getElementById('buscador');
            const categoriaFiltroSelect = document.getElementById('categoriaFiltro');
            const disponibilidadFiltroSelect = document.getElementById('disponibilidadFiltro');
            
            const filtro = buscador ? buscador.value : '';
            const categoriaFiltro = categoriaFiltroSelect ? categoriaFiltroSelect.value : 'all';
            const disponibilidadFiltro = disponibilidadFiltroSelect ? disponibilidadFiltroSelect.value : 'all';
            
            productosCategoria = todosProductos.filter(producto => {
              const cumpleFiltro = !filtro || producto.nombre.toLowerCase().includes(filtro.toLowerCase());
              const cumpleCategoria = categoriaFiltro === "all" || producto.categoria === categoriaFiltro;
              const cumpleDisponibilidad = disponibilidadFiltro === "all" || 
                (disponibilidadFiltro === "disponible" && producto.disponible) ||
                (disponibilidadFiltro === "agotado" && !producto.disponible);
              return cumpleFiltro && cumpleCategoria && cumpleDisponibilidad;
            });
            totalProductos = productosCategoria.length;
          } else if (categoria === 'ofertas') {
            // Para la sección "ofertas" - tratarla como categoría normal
            contenedor = seccion.querySelector('.productos-container');
            productosCategoria = todosProductos.filter(p => p.categoria === 'ofertas');
            totalProductos = productosCategoria.length;
          } else {
            // Para secciones específicas
            contenedor = seccion.querySelector('.productos-container');
            productosCategoria = todosProductos.filter(p => p.categoria === categoria);
            totalProductos = productosCategoria.length;
          }
          
          const controles = seccion.querySelector('.controles-ver-mas');
          
          if (contenedor && controles) {
            
            // Mostrar 7 productos más
            const nuevosProductos = productosCategoria.slice(mostrando, mostrando + 7);
            const fragmentoNuevos = document.createDocumentFragment();
            
            nuevosProductos.forEach(producto => {
              const productoHTML = crearHTMLProducto(producto);
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = productoHTML;
              fragmentoNuevos.appendChild(tempDiv.firstElementChild);
            });
            
            contenedor.appendChild(fragmentoNuevos);
            
            const nuevosMostrando = mostrando + 7;
            
            if (nuevosMostrando >= totalProductos) {
              // Mostrar todos los productos, cambiar a "Ver menos"
              controles.innerHTML = `
                <div class="contador-productos">
                  Mostrando todos los ${totalProductos} productos
                </div>
                <button class="btn-ver-menos" data-categoria="${categoria}">
                  Ver menos productos
                </button>
              `;
            } else {
              // Actualizar contador y mantener "Ver más"
              controles.innerHTML = `
                <div class="contador-productos">
                  Mostrando ${nuevosMostrando} de ${totalProductos} productos
                </div>
                <button class="btn-ver-mas" data-categoria="${categoria}" data-mostrando="${nuevosMostrando}">
                  Ver más productos
                </button>
              `;
            }
            
            // Reconfigurar eventos para los nuevos productos
            configurarBotonesAgregar();
            setupProductosConTonos();
          }
        }
      }
      
      // Verificar si el clic es en un botón "Ver menos"
      const btnVerMenos = e.target.closest('.btn-ver-menos');
      if (btnVerMenos) {
        const categoria = btnVerMenos.getAttribute('data-categoria');
        const seccion = document.getElementById(categoria);
        
        if (seccion) {
          let contenedor, productosCategoria, totalProductos;
          
          if (categoria === 'todos') {
            // Para la sección "todos"
            contenedor = seccion.querySelector('#contenedor-todos');
            // Aplicar filtros actuales (con verificación de existencia)
            const buscador = document.getElementById('buscador');
            const categoriaFiltroSelect = document.getElementById('categoriaFiltro');
            const disponibilidadFiltroSelect = document.getElementById('disponibilidadFiltro');
            
            const filtro = buscador ? buscador.value : '';
            const categoriaFiltro = categoriaFiltroSelect ? categoriaFiltroSelect.value : 'all';
            const disponibilidadFiltro = disponibilidadFiltroSelect ? disponibilidadFiltroSelect.value : 'all';
            
            productosCategoria = todosProductos.filter(producto => {
              const cumpleFiltro = !filtro || producto.nombre.toLowerCase().includes(filtro.toLowerCase());
              const cumpleCategoria = categoriaFiltro === "all" || producto.categoria === categoriaFiltro;
              const cumpleDisponibilidad = disponibilidadFiltro === "all" || 
                (disponibilidadFiltro === "disponible" && producto.disponible) ||
                (disponibilidadFiltro === "agotado" && !producto.disponible);
              return cumpleFiltro && cumpleCategoria && cumpleDisponibilidad;
            });
            totalProductos = productosCategoria.length;
          } else if (categoria === 'ofertas') {
            // Para la sección "ofertas" - tratarla como categoría normal
            contenedor = seccion.querySelector('.productos-container');
            productosCategoria = todosProductos.filter(p => p.categoria === 'ofertas');
            totalProductos = productosCategoria.length;
          } else {
            // Para secciones específicas
            contenedor = seccion.querySelector('.productos-container');
            productosCategoria = todosProductos.filter(p => p.categoria === categoria);
            totalProductos = productosCategoria.length;
          }
          
          const controles = seccion.querySelector('.controles-ver-mas');
          
          if (contenedor && controles) {
            
            // Mostrar solo los primeros 7 productos
            const productosVisibles = productosCategoria.slice(0, 7);
            const fragmentoVisible = document.createDocumentFragment();
            
            productosVisibles.forEach(producto => {
              const productoHTML = crearHTMLProducto(producto);
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = productoHTML;
              fragmentoVisible.appendChild(tempDiv.firstElementChild);
            });
            
            // Limpiar y mostrar solo los primeros 7
            contenedor.innerHTML = "";
            contenedor.appendChild(fragmentoVisible);
            
            // Actualizar controles
            controles.innerHTML = `
              <div class="contador-productos">
                Mostrando ${productosVisibles.length} de ${totalProductos} productos
              </div>
              <button class="btn-ver-mas" data-categoria="${categoria}" data-mostrando="7">
                Ver más productos
              </button>
            `;
            
            // Reconfigurar eventos
            configurarBotonesAgregar();
            setupProductosConTonos();
          }
        }
      }
    });
  }

  // Configurar productos con tonos
  function setupProductosConTonos() {
    const modal = document.getElementById('modalTonos');
    if (!modal) return;

    const tonosContainer = modal.querySelector('.tonos-container');
    const imagenVistaPrevia = document.getElementById('imagenVistaPrevia');
    const vistaPreviaContainer = modal.querySelector('.vista-previa');

    // Botón Agregar en modal (re-bind seguro)
    const botonAgregarModal = modal.querySelector('.modal-contenido button');
    const nuevoBotonAgregar = botonAgregarModal.cloneNode(true);
    botonAgregarModal.parentNode.replaceChild(nuevoBotonAgregar, botonAgregarModal);

    // Delegación de eventos: un solo listener para abrir modal de tonos
    if (!window.tonosHandlerAdded) {
      document.addEventListener('click', (ev) => {
        const boton = ev.target.closest('.agregar-carrito.con-tonos');
        if (!boton) return;
        ev.preventDefault();

        productoSeleccionado = {
          id: boton.getAttribute('data-id'),
          nombre: boton.getAttribute('data-nombre'),
          precio: boton.getAttribute('data-precio')
        };

        const tonosStr = boton.getAttribute('data-tonos') || '';
        const imagenesStr = boton.getAttribute('data-imagenes-tonos') || '';
        const tonos = tonosStr.split(',');
        const imagenesTonos = imagenesStr.split(',');

        tonosContainer.innerHTML = '';
        if (vistaPreviaContainer) vistaPreviaContainer.style.display = 'none';
        if (imagenVistaPrevia) imagenVistaPrevia.style.display = 'none';

        const producto = todosProductos.find(p => p.id === productoSeleccionado.id);
        const frag = document.createDocumentFragment();

        tonos.forEach((tono, index) => {
          const tonoData = producto?.tonos?.[index] || { disponible: true };
          const divTono = document.createElement('div');
          divTono.className = 'tono-item';
          
          const nombreTono = document.createElement('span');
          nombreTono.className = 'nombre-tono';
          nombreTono.textContent = (tono || '').trim();
          if (!tonoData.disponible) nombreTono.classList.add('no-disponible');
          divTono.appendChild(nombreTono);

          if (!tonoData.disponible) {
            const spanNoDisponible = document.createElement('span');
            spanNoDisponible.className = 'no-disponible-text';
            spanNoDisponible.textContent = 'Sin stock';
            divTono.appendChild(spanNoDisponible);
          } else {
            const botonTono = document.createElement('button');
            botonTono.className = 'tono';
            botonTono.setAttribute('data-tono', (tono || '').trim());
            const imgSrc = (imagenesTonos[index] || '').trim();
            if (imgSrc) botonTono.setAttribute('data-imagen', imgSrc);
            botonTono.textContent = 'Seleccionar';
            divTono.appendChild(botonTono);
          }

          frag.appendChild(divTono);
        });

        tonosContainer.appendChild(frag);
        modal.style.display = 'block';
        tonoSeleccionado = '';
      });
      // Delegación para seleccionar tono y vista previa
      document.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.tono');
        if (!btn) return;
        document.querySelectorAll('.tono').forEach(t => t.classList.remove('seleccionado'));
        btn.classList.add('seleccionado');
        tonoSeleccionado = btn.getAttribute('data-tono');
        const imagen = btn.getAttribute('data-imagen');
              if (imagen && imagenVistaPrevia && vistaPreviaContainer) {
                imagenVistaPrevia.src = imagen;
                imagenVistaPrevia.alt = `Vista previa de ${tonoSeleccionado}`;
                imagenVistaPrevia.style.display = 'block';
                vistaPreviaContainer.style.display = 'flex';
              }
            });
      window.tonosHandlerAdded = true;
    }

    // Confirmación en modal con efecto de carga y cierre
    nuevoBotonAgregar.addEventListener('click', function() {
      if (tonoSeleccionado && productoSeleccionado) {
        const btn = this;
        const textoOriginal = btn.textContent;
        btn.classList.add('cargando');
        btn.textContent = 'Agregando...';

        agregarAlCarrito(
          productoSeleccionado.id,
          productoSeleccionado.nombre,
          productoSeleccionado.precio,
          tonoSeleccionado,
          true
        );

        setTimeout(() => {
          btn.classList.remove('cargando');
          btn.textContent = 'Agregado ✓';
          // notificación visible
          const nombreNotif = `${productoSeleccionado.nombre}${tonoSeleccionado ? ' - ' + tonoSeleccionado : ''}`;
          mostrarNotificacion(`¡${nombreNotif} agregado al carrito!`);
          // cerrar modal luego de mostrar el estado
          setTimeout(() => {
        modal.style.display = 'none';
            btn.textContent = textoOriginal;
          }, 700);
        }, 500);
      } else {
        // Garantizar configuración consistente del popup
        Swal.fire({
          title: '¡Atención!',
          text: 'Por favor selecciona una variante antes de agregar al carrito',
          icon: 'warning',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#d85a7f',
          background: '#fff9fa',
          color: '#333333',
          customClass: {
            popup: 'swal-popup-custom',
            title: 'swal-title-custom',
            content: 'swal-content-custom'
          },
          allowOutsideClick: true,
          allowEscapeKey: true,
          heightAuto: false,
          didOpen: () => {
            // Prevenir scroll del body y asegurar centrado
            document.body.style.overflow = 'hidden';
          },
          willClose: () => {
            document.body.style.overflow = '';
          }
        });
      }
    });

    // Cierre del modal
    modal.querySelector('.cerrar').addEventListener('click', function() {
      modal.style.display = 'none';
    });

    // Configurar vista previa ampliable
    if (imagenVistaPrevia) {
      imagenVistaPrevia.addEventListener('click', function() {
        if (!this.src || this.style.display === 'none') return;

        const modalImagen = document.getElementById('modalImagen');
        const imagenAmpliada = document.getElementById('imagenAmpliada');
        const pieImagen = document.querySelector('.pie-imagen');

        if (modalImagen && imagenAmpliada && pieImagen) {
          imagenAmpliada.src = this.src;
          pieImagen.textContent = this.alt;
          modalImagen.style.display = "block";
          document.body.style.overflow = "hidden";
        }
      });
    }
  }

  // Función para agregar al carrito
  function agregarAlCarrito(id, nombre, precio, tonoSeleccionado = '', silenciarNotificacion = false) {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const productoExistente = carrito.find(item => item.id === id && item.tono === tonoSeleccionado);

    if (productoExistente) {
      productoExistente.cantidad = (productoExistente.cantidad || 1) + 1;
    } else {
      carrito.push({ 
        id, 
        nombre: nombre + (tonoSeleccionado ? ` - ${tonoSeleccionado}` : ''), 
        precio: parseFloat(precio), 
        cantidad: 1, 
        tono: tonoSeleccionado,
        imagen: todosProductos.find(p => p.id === id)?.imagen || 'placeholder.jpg',
        disponible: true
      });
    }

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
    if (!silenciarNotificacion) {
    mostrarNotificacion(`¡${nombre}${tonoSeleccionado ? ' - ' + tonoSeleccionado : ''} agregado al carrito!`);
    }
  }

  // Función para actualizar el carrito
  function actualizarCarrito() {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    let totalItems = carrito.reduce((total, item) => total + (item.cantidad || 1), 0);

    // Actualizar contador flotante
    const contadorFlotante = document.querySelector('.carrito-contador');
    const carritoFlotante = document.querySelector('.carrito-flotante');

    if (contadorFlotante && carritoFlotante) {
      contadorFlotante.textContent = totalItems;
      carritoFlotante.setAttribute('data-count', totalItems);
      contadorFlotante.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    // Actualizar página de carrito si existe
    if (document.getElementById('lista-carrito')) {
      const listaCarrito = document.getElementById('lista-carrito');
      const totalElement = document.getElementById('total');
      listaCarrito.innerHTML = '';

      if (carrito.length === 0) {
        listaCarrito.innerHTML = '';
        if (totalElement) totalElement.textContent = '0';
      } else {
        let total = 0;
        carrito.forEach((producto, index) => {
          const li = document.createElement('li');
          li.innerHTML = `
            <img src="${producto.imagen}" alt="${producto.nombre}" class="producto-imagen">
            <span class="nombre-producto">${producto.nombre}</span>
            <span class="precio-producto">$${producto.precio}</span>
            <div class="cantidad-controles">
              <button class="btn-restar" data-index="${index}">-</button>
              <span class="cantidad">${producto.cantidad}</span>
              <button class="btn-sumar" data-index="${index}">+</button>
            </div>
            <button class="btn-eliminar" data-index="${index}">
              <i class="fas fa-trash-alt"></i>
            </button>
          `;
          listaCarrito.appendChild(li);
          total += producto.precio * producto.cantidad;
        });

        if (totalElement) totalElement.textContent = total.toFixed(2);

        // Configurar botones de eliminar y controles de cantidad
        listaCarrito.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index);

          if (e.target.classList.contains('btn-sumar')) {
            carrito[index].cantidad++;
            localStorage.setItem('carrito', JSON.stringify(carrito));
            actualizarCarrito();
          }

          if (e.target.classList.contains('btn-restar')) {
            carrito[index].cantidad--;
            if (carrito[index].cantidad < 1) {
              carrito.splice(index, 1);
            }
            localStorage.setItem('carrito', JSON.stringify(carrito));
            actualizarCarrito();
          }

          if (e.target.classList.contains('btn-eliminar') || e.target.parentElement.classList.contains('btn-eliminar')) {
            const idx = e.target.dataset.index || e.target.parentElement.dataset.index;
            const producto = carrito[idx];
            Swal.fire({
              title: '¿Eliminar producto?',
              html: `¿Estás seguro que deseas eliminar <strong>${producto.nombre}</strong> del carrito?`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33',
              confirmButtonText: 'Sí, eliminar',
              cancelButtonText: 'Cancelar'
            }).then((result) => {
              if (result.isConfirmed) {
                carrito.splice(idx, 1);
                localStorage.setItem('carrito', JSON.stringify(carrito));
                actualizarCarrito();
                mostrarNotificacion(`${producto.nombre} eliminado del carrito`);
              }
            });
          }
        });
      }
    }
  }

  // Función para mostrar notificaciones
  function mostrarNotificacion(mensaje) {
    const notificacion = document.createElement('div');
    notificacion.className = 'notificacion-carrito';
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);

    setTimeout(() => notificacion.classList.add('mostrar'), 10);
    setTimeout(() => {
      notificacion.classList.remove('mostrar');
      setTimeout(() => document.body.removeChild(notificacion), 300);
    }, 3000);
  }

  // Configurar modal de imagen ampliada
  const modalImagen = document.getElementById('modalImagen');
  if (modalImagen) {
    const cerrarImagen = document.querySelector('.cerrar-imagen');
    const imagenAmpliada = document.getElementById('imagenAmpliada');
    const pieImagen = document.querySelector('.pie-imagen');

    // Apertura con nuestro sistema propio
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a.ampliar-imagen');
      if (!link) return;
      e.preventDefault();
      const src = link.getAttribute('href');
      const nombre = link.getAttribute('data-nombre') || '';
      const precio = link.getAttribute('data-precio') || '';
      if (imagenAmpliada && pieImagen) {
        imagenAmpliada.src = src;
        pieImagen.textContent = `${nombre}${precio ? ' · $' + precio : ''}`;
        modalImagen.style.display = 'block';
        document.body.style.overflow = 'hidden';
      }
    });

    if (cerrarImagen) {
      cerrarImagen.addEventListener('click', function() {
        modalImagen.style.display = "none";
        document.body.style.overflow = "auto";
      });
    }

    modalImagen.addEventListener('click', function(event) {
      if (event.target === modalImagen) {
        modalImagen.style.display = "none";
        document.body.style.overflow = "auto";
      }
    });

    document.addEventListener('keydown', function(event) {
      if (event.key === "Escape" && modalImagen.style.display === "block") {
        modalImagen.style.display = "none";
        document.body.style.overflow = "auto";
      }
    });
  }

  // Configurar botón de WhatsApp en la página de carrito
  if (document.getElementById('btn-whatsapp')) {
    document.getElementById('btn-whatsapp').addEventListener('click', function() {
      const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
      const total = document.getElementById('total')?.textContent || '0.00';

      if (carrito.length === 0) {
        mostrarNotificacion('Tu carrito está vacío');
        return;
      }

      let mensaje = '¡Hola! Quiero hacer este pedido:\n\n';
      carrito.forEach(item => {
        mensaje += `- ${item.nombre} (${item.cantidad}x): $${item.precio}\n`;
      });
      mensaje += `\nTotal: $${total}\n\nGracias!`;

      const encoded = encodeURIComponent(mensaje);
      window.open(`https://wa.me/5493735401893?text=${encoded}`, '_blank');
    });
  }

  // Función para limpiar búsqueda (debe ser global)
  window.limpiarBusqueda = function() {
    const searchInput = document.getElementById('searchInput');
    const categoriaFiltro = document.getElementById('categoriaFiltro');
    const disponibilidadFiltro = document.getElementById('disponibilidadFiltro');
    
    if (searchInput) searchInput.value = '';
    if (categoriaFiltro) categoriaFiltro.value = 'all';
    if (disponibilidadFiltro) disponibilidadFiltro.value = 'all';
    
    renderizarProductos();
  };

  // Inicializar
  cargarProductos();
  actualizarCarrito();
});
