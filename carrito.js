import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const listaCarrito = document.getElementById('lista-carrito');
const totalElemento = document.getElementById('total');
const btnWhatsApp = document.getElementById('btn-whatsapp');
const btnEliminarTodo = document.getElementById('btn-eliminar-todo');

let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD-P5-GOlwT-Ax51u3giJm1G-oXmfOf9-g",
  authDomain: "tabymakeup-of.firebaseapp.com",
  projectId: "tabymakeup-of",
  storageBucket: "tabymakeup-of.firebasestorage.app",
  messagingSenderId: "548834143470",
  appId: "1:548834143470:web:54812e64324b3629f617ff"
};

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Función para cargar productos desde Firestore
async function cargarProductos() {
  const snapshot = await getDocs(collection(db, "productos"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Verificar y actualizar el carrito con los datos actuales de Firestore
async function actualizarCarrito() {
  const productosFirestore = await cargarProductos();
  const productosActualizados = [];
  let mensajesCambio = [];

  for (const item of carrito) {
    const productoFirestore = productosFirestore.find(p => p.id === item.id);
    if (productoFirestore) {
      if (productoFirestore.disponible) {
        // Verificar cambios en precio
        if (parseFloat(item.precio) !== parseFloat(productoFirestore.precio)) {
          mensajesCambio.push(`${item.nombre} cambió de $${item.precio} a $${productoFirestore.precio}`);
        }
        // Actualizar datos, preservando el tono
        productosActualizados.push({
          ...item,
          precio: productoFirestore.precio,
          nombre: productoFirestore.nombre + (item.tono ? ` - ${item.tono}` : ''),
          imagen: productoFirestore.imagen || 'placeholder.jpg'
        });
      } else {
        mensajesCambio.push(`${item.nombre} ya no está disponible`);
      }
    } else {
      mensajesCambio.push(`${item.nombre} ya no existe`);
    }
  }

  // Actualizar el carrito solo si hay cambios
  if (JSON.stringify(carrito) !== JSON.stringify(productosActualizados)) {
    carrito = productosActualizados;
    localStorage.setItem('carrito', JSON.stringify(carrito));
  }

  // Mostrar notificaciones solo si hay cambios
  if (mensajesCambio.length > 0) {
    Swal.fire({
      title: 'Cambios en el carrito',
      html: mensajesCambio.join('<br>'),
      icon: 'info',
      confirmButtonText: 'Aceptar'
    });
  }

  renderizarCarrito();
}

function renderizarCarrito() {
  listaCarrito.innerHTML = '';
  let total = 0;

  if (carrito.length === 0) {
    // No mostrar nada cuando el carrito está vacío
    listaCarrito.innerHTML = '';
    totalElemento.textContent = '0';
    actualizarWhatsApp();
    return;
  }

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

  totalElemento.textContent = total.toFixed(2);
  actualizarWhatsApp();
}

function eliminarProducto(index) {
  const producto = carrito[index];

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
      carrito.splice(index, 1);
      localStorage.setItem('carrito', JSON.stringify(carrito));
      renderizarCarrito();

      Swal.fire(
        'Eliminado',
        'El producto fue eliminado del carrito',
        'success'
      );
    }
  });
}

// Botón eliminar todo
if (btnEliminarTodo) {
  btnEliminarTodo.addEventListener('click', () => {
    if (carrito.length === 0) return;

    Swal.fire({
      title: '¿Vaciar carrito?',
      text: 'Esta acción eliminará todos los productos del carrito.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, vaciar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        carrito = [];
        localStorage.removeItem('carrito');
        renderizarCarrito();

        Swal.fire(
          'Carrito vacío',
          'Todos los productos fueron eliminados',
          'success'
        );
      }
    });
  });
}

function actualizarWhatsApp() {
  if (carrito.length === 0) {
    btnWhatsApp.disabled = true;
    btnWhatsApp.onclick = null;
    return;
  }

  let mensaje = "¡Hola! \n\nQuiero comprar los siguientes productos:\n\n";

  carrito.forEach(producto => {
    mensaje += `• ${producto.nombre}\n`;
    mensaje += `  Cantidad: ${producto.cantidad}\n`;
    mensaje += `  Precio: $${producto.precio} c/u\n`;
    mensaje += `  Subtotal: $${producto.precio * producto.cantidad}\n\n`;
  });

  let total = carrito.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
  mensaje += `*Total del pedido:* $${total.toFixed(2)}\n\n`;
  mensaje += "¡Gracias! ";

  const telefono = "543735401893";
  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

  btnWhatsApp.disabled = false;
  btnWhatsApp.onclick = () => {
    Swal.fire({
      title: 'Enviando pedido...',
      text: 'Redirigiendo a WhatsApp',
      icon: 'info',
      allowOutsideClick: false,
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      didOpen: () => {
        Swal.showLoading();
      },
      didClose: () => {
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

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar y actualizar el carrito al cargar la página
  await actualizarCarrito();

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
      const idx = e.target.dataset.index || e.target.parentElement.dataset.index;
      eliminarProducto(parseInt(idx));
    }
  });
});
