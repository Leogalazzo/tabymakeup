import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Elementos del DOM
const listaCarrito = document.getElementById('lista-carrito');
const totalElemento = document.getElementById('total');
const btnWhatsApp = document.getElementById('btn-whatsapp');

// Carrito desde localStorage
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD-P5-GOlwT-Ax51u3giJm1G-oXmfOf9-g",
  authDomain: "tabymakeup-of.firebaseapp.com",
  projectId: "tabymakeup-of",
  storageBucket: "tabymakeup-of.appspot.com",
  messagingSenderId: "548834143470",
  appId: "1:548834143470:web:54812e64324b3629f617ff"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Imagen por defecto
const imagenPlaceholder = 'https://plabi.justicia.es/o/subastas-theme/images/image-not-available.png';

// Configuración personalizada de SweetAlert
const swalCustomStyle = Swal.mixin({
  background: '#fff5f7',
  color: '#333333',
  confirmButtonColor: '#d85a7f',
  cancelButtonColor: '#999999',
  backdrop: `
    rgba(255, 192, 203, 0.4)
    url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ff9bb3' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")
  `,
  customClass: {
    container: 'swal-container',
    popup: 'swal-popup',
    title: 'swal-title',
    content: 'swal-content',
    confirmButton: 'swal-confirm',
    cancelButton: 'swal-cancel'
  },
  buttonsStyling: false
});

// Función para cargar productos desde Firestore
async function cargarProductos() {
  try {
    const snapshot = await getDocs(collection(db, "productos"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al cargar productos desde Firestore:", error);
    return [];
  }
}

// Actualizar carrito con datos de Firestore
async function actualizarCarrito() {
  let productosFirestore = [];
  try {
    productosFirestore = await cargarProductos();
  } catch (error) {
    console.error("Firestore no disponible, usando datos de localStorage:", error);
  }

  const productosActualizados = [];
  let hayProductosNoDisponibles = false;
  let mensajesCambio = [];
  let mensajesPrecio = [];

  for (const item of carrito) {
    const productoFirestore = productosFirestore.find(p => p.id === item.id);
    if (productoFirestore) {
      let disponible = productoFirestore.disponible;
      let mensajeNoDisponible = '';

      if (item.tono && productoFirestore.tonos) {
        const tonoEncontrado = productoFirestore.tonos.find(t => t.nombre === item.tono);
        if (!tonoEncontrado || !tonoEncontrado.disponible) {
          disponible = false;
          mensajeNoDisponible = ` (Tono no disponible)`;
          mensajesCambio.push(`${item.nombre}${mensajeNoDisponible}`);
        }
      }

      if (!disponible) {
        hayProductosNoDisponibles = true;
        productosActualizados.push({
          ...item,
          precio: productoFirestore.precio || item.precio,
          nombre: item.nombre,
          imagen: item.imagen || productoFirestore.imagen || imagenPlaceholder,
          disponible: false
        });
        continue;
      }

      const nuevoPrecio = parseFloat(productoFirestore.precio);
      const precioAnterior = parseFloat(item.precio);
      const nombreActualizado = productoFirestore.nombre + (item.tono ? ` - ${item.tono}` : '');

      if (nuevoPrecio !== precioAnterior) {
        const mensaje = `${nombreActualizado} cambió de $${precioAnterior.toFixed(2)} a $${nuevoPrecio.toFixed(2)}`;
        mensajesCambio.push(mensaje);
        mensajesPrecio.push(mensaje);
      }

      productosActualizados.push({
        ...item,
        precio: nuevoPrecio,
        nombre: item.nombre,
        imagen: item.imagen || productoFirestore.imagen || imagenPlaceholder,
        disponible: true
      });

    } else {
      productosActualizados.push({
        ...item,
        disponible: false,
        imagen: item.imagen || imagenPlaceholder,
        nombre: item.nombre
      });
      hayProductosNoDisponibles = true;
      mensajesCambio.push(`${item.nombre} ya no está disponible (eliminado del catálogo)`);
    }
  }

  carrito = productosActualizados;
  localStorage.setItem('carrito', JSON.stringify(carrito));

  if (mensajesCambio.length > 0) {
    console.log("Cambios en el carrito:\n" + mensajesCambio.join('\n'));
  }

  if (mensajesPrecio.length > 0) {
    swalCustomStyle.fire({
      title: 'Precios actualizados',
      html: mensajesPrecio.join('<br>'),
      icon: 'info',
      confirmButtonText: 'Aceptar'
    });
  }

  renderizarCarrito();
}

// Renderizar el carrito en el DOM
function renderizarCarrito() {
  listaCarrito.innerHTML = '';
  let total = 0;
  let hayProductosNoDisponibles = false;

  if (carrito.length === 0) {
    listaCarrito.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío</p>';
    totalElemento.textContent = '0';
    if (btnWhatsApp) btnWhatsApp.disabled = true;
    actualizarWhatsApp();
    return;
  }

  carrito.forEach((producto, index) => {
    const li = document.createElement('li');
    li.className = producto.disponible ? '' : 'no-disponible';

    li.innerHTML = `
      <img src="${producto.imagen || imagenPlaceholder}" alt="${producto.nombre}" class="producto-imagen">
      <div class="producto-info">
        <span class="nombre-producto">${producto.nombre}</span>
        <span class="precio-producto">$${producto.precio}</span>
      </div>
      <div class="cantidad-controles">
        <button class="btn-restar" data-index="${index}">-</button>
        <span class="cantidad">${producto.cantidad}</span>
        <button class="btn-sumar" data-index="${index}" ${!producto.disponible ? 'disabled' : ''}>+</button>
      </div>
      <button class="btn-eliminar" data-index="${index}">
        <i class="fas fa-trash-alt"></i>
      </button>
      ${!producto.disponible ? '<span class="no-disponible-badge">No disponible</span>' : ''}
    `;

    listaCarrito.appendChild(li);

    if (producto.disponible) {
      total += producto.precio * producto.cantidad;
    } else {
      hayProductosNoDisponibles = true;
    }
  });

  totalElemento.textContent = total.toFixed(2);

  if (hayProductosNoDisponibles) {
    const advertencia = document.createElement('div');
    advertencia.className = 'advertencia-no-disponible';
    advertencia.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <span>Hay productos no disponibles en tu carrito. Elimínalos para continuar.</span>
    `;
    listaCarrito.insertBefore(advertencia, listaCarrito.firstChild);
  }

  if (btnWhatsApp) {
    btnWhatsApp.disabled = hayProductosNoDisponibles || carrito.length === 0;
  }

  actualizarWhatsApp();
}

// Eliminar producto individual
function eliminarProducto(index) {
  const producto = carrito[index];
  
  swalCustomStyle.fire({
    title: '¿Eliminar producto?',
    html: `¿Seguro que deseas eliminar <strong>${producto.nombre}</strong> del carrito?`,
    icon: 'warning',
    showCancelButton: true,
    cancelButtonText: 'Cancelar',
    confirmButtonText: 'Sí, eliminar',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      carrito.splice(index, 1);
      localStorage.setItem('carrito', JSON.stringify(carrito));
      renderizarCarrito();
      
      swalCustomStyle.fire({
        title: '¡Eliminado!',
        text: 'El producto fue removido del carrito',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    }
  });
}

// Configurar botón de vaciar carrito
function setupVaciarCarrito() {
  const btnEliminarTodo = document.getElementById('btn-eliminar-todo');
  
  if (btnEliminarTodo) {
    btnEliminarTodo.addEventListener('click', () => {
      if (carrito.length === 0) {
        swalCustomStyle.fire({
          title: 'Carrito vacío',
          text: 'No hay productos para eliminar',
          icon: 'info',
          timer: 1500,
          showConfirmButton: false
        });
        return;
      }

      swalCustomStyle.fire({
        title: '¿Vaciar carrito?',
        html: `Esta acción eliminará <strong>${carrito.length}</strong> producto(s) del carrito.<br>¿Deseas eliminar?`,
        icon: 'warning',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Sí, vaciar todo',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          carrito = [];
          localStorage.removeItem('carrito');
          renderizarCarrito();

          swalCustomStyle.fire({
            title: '¡Carrito vaciado!',
            text: 'Todos los productos fueron eliminados',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        }
      });
    });
  }
}

// Actualizar el botón de WhatsApp
function actualizarWhatsApp() {
  if (!btnWhatsApp) return;

  if (carrito.length === 0 || carrito.some(p => !p.disponible)) {
    btnWhatsApp.disabled = true;
    return;
  }

  let mensaje = "¡Hola! \n\nTe envío mi compra:\n\n";
  carrito.forEach(producto => {
    mensaje += `• ${producto.nombre}\n`;
    mensaje += `  Cantidad: ${producto.cantidad}\n`;
    mensaje += `  Precio: $${producto.precio} c/u\n`;
    mensaje += `  Subtotal: $${producto.precio * producto.cantidad}\n\n`;
  });

  const total = carrito.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
  mensaje += `*Total del pedido:* $${total.toFixed(2)}\n\n¡Gracias!`;

  const telefono = "5493735401893";
  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

  btnWhatsApp.disabled = false;
  btnWhatsApp.onclick = () => {
    swalCustomStyle.fire({
      title: 'Enviando pedido...',
      html: '<div class="swal-whatsapp-loader"><i class="fab fa-whatsapp" style="color:#25D366;font-size:2rem;margin-bottom:1rem;"></i><p>Redirigiendo a WhatsApp</p></div>',
      allowOutsideClick: false,
      showConfirmButton: false,
      timer: 2000,
      didOpen: () => {
        const timerInterval = setInterval(() => {
          const content = Swal.getHtmlContainer();
          if (content) {
            const p = content.querySelector('p');
            if (p) {
              p.textContent = p.textContent.includes('...') 
                ? 'Redirigiendo a WhatsApp' 
                : p.textContent + '.';
            }
          }
        }, 400);
        
        Swal.getTimerLeft() > 0 && Swal.showLoading();
        
        setTimeout(() => {
          clearInterval(timerInterval);
        }, 2000);
      },
      willClose: () => {
        window.open(url, '_blank');
        setTimeout(() => {
          carrito = [];
          localStorage.removeItem('carrito');
          renderizarCarrito();
        }, 500);
      }
    });
  };
}

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', async () => {
  // Configurar el botón de vaciar carrito
  setupVaciarCarrito();
  
  // Cargar y renderizar el carrito
  try {
    await actualizarCarrito();
  } catch (error) {
    console.error("Error en la inicialización:", error);
    renderizarCarrito();
    actualizarWhatsApp();
  }

  // Event listeners para los botones del carrito
  listaCarrito.addEventListener('click', (e) => {
    const index = parseInt(e.target.dataset.index);

    if (e.target.classList.contains('btn-sumar')) {
      carrito[index].cantidad++;
      localStorage.setItem('carrito', JSON.stringify(carrito));
      renderizarCarrito();
    }

    if (e.target.classList.contains('btn-restar')) {
      carrito[index].cantidad--;
      if (carrito[index].cantidad < 1) {
        eliminarProducto(index);
      } else {
        localStorage.setItem('carrito', JSON.stringify(carrito));
        renderizarCarrito();
      }
    }

    if (e.target.classList.contains('btn-eliminar') || e.target.parentElement.classList.contains('btn-eliminar')) {
      const idx = parseInt(e.target.dataset.index || e.target.parentElement.dataset.index);
      eliminarProducto(idx);
    }
  });
});
