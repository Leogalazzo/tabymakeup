const listaCarrito = document.getElementById('lista-carrito');
const totalElemento = document.getElementById('total');
const btnWhatsApp = document.getElementById('btn-whatsapp');

let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

function renderizarCarrito() {
  listaCarrito.innerHTML = '';
  let total = 0;

  carrito.forEach((producto, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="nombre-producto">${producto.nombre}</span>
      <span class="precio-producto">$${producto.precio}</span>
      <div class="cantidad-controles">
        <button class="btn-restar" data-index="${index}">-</button>
        <span class="cantidad">${producto.cantidad}</span>
        <button class="btn-sumar" data-index="${index}">+</button>
      </div>
      <button class="btn-eliminar" onclick="eliminarProducto(${index})">
        <i class="fas fa-trash-alt"></i>
      </button>
    `;
    listaCarrito.appendChild(li);
    total += producto.precio * producto.cantidad;
  });

  totalElemento.textContent = total;
  actualizarWhatsApp();
}

function eliminarProducto(index) {
  const producto = carrito[index];
  
  Swal.fire({
    title: '¿Eliminar producto?',
    html: `¿Estás seguro que deseas eliminar <strong>${producto.nombre}</strong> del carrito? Esta acción eliminará todos los productos.`,
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
        'Los productos fueron eliminados del carrito',
        'success'
      );
    }
  });
}

function actualizarWhatsApp() {
  if (carrito.length === 0) {
    btnWhatsApp.disabled = true;
    btnWhatsApp.onclick = null;
    return;
  }

  let mensaje = "¡Hola! \n\nQuiero comprar los siguiente productos:\n\n";
  
  carrito.forEach(producto => {
    mensaje += `• ${producto.nombre}\n`;
    mensaje += `  Cantidad: ${producto.cantidad}\n`;
    mensaje += `  Precio: $${producto.precio} c/u\n`;
    mensaje += `  Subtotal: $${producto.precio * producto.cantidad}\n\n`;
  });

  let total = carrito.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
  mensaje += ` *Total del pedido:* $${total}\n\n`;
  mensaje += "¡Gracias! ";

  const telefono = "543735401893"; // Reemplazar con tu número real
  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

  btnWhatsApp.disabled = false;
  btnWhatsApp.onclick = () => window.open(url, '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
  renderizarCarrito();

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
        carrito.splice(index, 1);
      }
      localStorage.setItem('carrito', JSON.stringify(carrito));
      renderizarCarrito();
    }
  });
});
