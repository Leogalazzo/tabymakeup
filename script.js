document.addEventListener('DOMContentLoaded', function() {
  // Agregar modal para imágenes ampliadas al DOM
  document.body.insertAdjacentHTML('beforeend', `
    <div id="modalImagen" class="modal-imagen">
      <span class="cerrar-imagen">&times;</span>
      <img class="contenido-imagen" id="imagenAmpliada">
      <div class="pie-imagen"></div>
    </div>
  `);

  // Función para actualizar el carrito en todas las páginas
  function actualizarCarrito() {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    let totalItems = carrito.reduce((total, item) => total + (item.cantidad || 1), 0);

    const contadorFlotante = document.querySelector('.carrito-contador');
    const carritoFlotante = document.querySelector('.carrito-flotante');

    if (contadorFlotante && carritoFlotante) {
      contadorFlotante.textContent = totalItems;
      carritoFlotante.setAttribute('data-count', totalItems);
      contadorFlotante.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    if (document.getElementById('lista-carrito')) {
      const listaCarrito = document.getElementById('lista-carrito');
      const totalElement = document.getElementById('total');
      listaCarrito.innerHTML = '';
      let total = 0;

      carrito.forEach((producto, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span class="nombre-producto">${producto.nombre}</span>
          <span class="precio-producto">$${producto.precio}</span>
          <button class="eliminar-producto" data-index="${index}">×</button>
        `;
        listaCarrito.appendChild(li);
        total += parseFloat(producto.precio) * (producto.cantidad || 1);
      });

      totalElement.textContent = total.toFixed(2);

      document.querySelectorAll('.eliminar-producto').forEach(boton => {
        boton.addEventListener('click', function () {
          const index = parseInt(this.getAttribute('data-index'));
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
              actualizarCarrito();
              mostrarNotificacion(`${producto.nombre} eliminado del carrito`);
            }
          });
        });
      });
    }
  }

  // Función para agregar al carrito
  function agregarAlCarrito(id, nombre, precio, tonoSeleccionado = '') {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const productoExistente = carrito.find(item => item.id === id && item.tono === tonoSeleccionado);

    if (productoExistente) {
      productoExistente.cantidad = (productoExistente.cantidad || 1) + 1;
    } else {
      carrito.push({ id, nombre: nombre + (tonoSeleccionado ? ` - ${tonoSeleccionado}` : ''), precio, cantidad: 1, tono: tonoSeleccionado });
    }

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
    mostrarNotificacion(`¡${nombre}${tonoSeleccionado ? ' - ' + tonoSeleccionado : ''} agregado al carrito!`);
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
      setTimeout(() => {
        document.body.removeChild(notificacion);
      }, 300);
    }, 3000);
  }

  // Configurar productos con tonos
function setupProductosConTonos() {
  const modal = document.getElementById('modalTonos');
  const tonosContainer = modal.querySelector('.tonos-container');
  const imagenVistaPrevia = document.getElementById('imagenVistaPrevia');
  const vistaPreviaContainer = modal.querySelector('.vista-previa');
  let productoSeleccionado = null;
  let tonoSeleccionado = '';

  // Asegurarnos que el contenedor de vista previa existe
  if (!vistaPreviaContainer) {
    console.error('No se encontró el contenedor de vista previa');
    return;
  }

  // Configurar la imagen como ampliable
  if (imagenVistaPrevia) {
    imagenVistaPrevia.classList.add('imagen-ampliable');
    imagenVistaPrevia.style.display = 'none'; // Ocultar inicialmente
  }

  document.querySelectorAll('.agregar-carrito.con-tonos').forEach(boton => {
    boton.addEventListener('click', function() {
      productoSeleccionado = {
        id: this.getAttribute('data-id'),
        nombre: this.getAttribute('data-nombre'),
        precio: this.getAttribute('data-precio')
      };

      const tonos = this.getAttribute('data-tonos').split(',');
      const imagenesTonos = this.getAttribute('data-imagenes-tonos').split(',');

      // Limpiar contenedor
      tonosContainer.innerHTML = '';
      vistaPreviaContainer.style.display = 'none'; // Ocultar vista previa inicialmente

      // Crear botones de tono
      tonos.forEach((tono, index) => {
        const botonTono = document.createElement('button');
        botonTono.className = 'tono';
        botonTono.setAttribute('data-tono', tono.trim());
        
        // Verificar si hay imagen para este tono
        if (imagenesTonos[index] && imagenesTonos[index].trim() !== '') {
          botonTono.setAttribute('data-imagen', imagenesTonos[index].trim());
        }
        
        botonTono.textContent = tono.trim();

        botonTono.addEventListener('click', function() {
          // Deseleccionar todos los tonos
          document.querySelectorAll('.tono').forEach(t => t.classList.remove('seleccionado'));
          
          // Seleccionar este tono
          this.classList.add('seleccionado');
          tonoSeleccionado = this.getAttribute('data-tono');

          // Mostrar imagen si existe
          const imagen = this.getAttribute('data-imagen');
          if (imagen && imagenVistaPrevia) {
            imagenVistaPrevia.src = imagen;
            imagenVistaPrevia.alt = `Vista previa de ${tonoSeleccionado}`;
            imagenVistaPrevia.style.display = 'block';
            vistaPreviaContainer.style.display = 'flex'; // Mostrar contenedor
          } else {
            imagenVistaPrevia.style.display = 'none';
            vistaPreviaContainer.style.display = 'none';
          }
        });

        tonosContainer.appendChild(botonTono);
      });

      // Mostrar el modal
      modal.style.display = 'block';
      tonoSeleccionado = '';
    });
  });

  // Evento para hacer zoom en la imagen (solo si existe)
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

  // Confirmar selección de tono
  modal.querySelector('.modal-contenido button').addEventListener('click', function() {
    if (tonoSeleccionado && productoSeleccionado) {
      agregarAlCarrito(
        productoSeleccionado.id,
        productoSeleccionado.nombre,
        productoSeleccionado.precio,
        tonoSeleccionado
      );
      modal.style.display = 'none';
    } else {
      Swal.fire('Selección requerida', 'Por favor selecciona un tono', 'warning');
    }
  });

  // Cerrar modal
  modal.querySelector('.cerrar').addEventListener('click', function() {
    modal.style.display = 'none';
  });
}

  // Configurar productos sin tonos
  document.querySelectorAll('.agregar-carrito:not(.con-tonos)').forEach(boton => {
    boton.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      const nombre = this.getAttribute('data-nombre');
      const precio = this.getAttribute('data-precio');
      agregarAlCarrito(id, nombre, precio);
    });
  });

  // Enviar pedido por WhatsApp
  if (document.getElementById('btn-whatsapp')) {
    document.getElementById('btn-whatsapp').addEventListener('click', function () {
      const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
      const total = document.getElementById('total').textContent;

      if (carrito.length === 0) {
        mostrarNotificacion('Tu carrito está vacío');
        return;
      }

      let mensaje = '¡Hola! Quiero hacer este pedido:\n\n';
      carrito.forEach(item => {
        mensaje += `- ${item.nombre} (${item.cantidad || 1}x): $${item.precio}\n`;
      });
      mensaje += `\nTotal: $${total}\n\nGracias!`;

      const encoded = encodeURIComponent(mensaje);
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    });
  }

  // CLONAR productos a la sección "Todos" y volver a asignar eventos
  const contenedorTodos = document.getElementById("contenedor-todos");
  const secciones = document.querySelectorAll(".seccion-productos");

  if (contenedorTodos && secciones) {
    secciones.forEach(seccion => {
      if (seccion.id !== "todos") {
        const productos = seccion.querySelectorAll(".producto");
        productos.forEach(producto => {
          const copia = producto.cloneNode(true);

          // Asegurar que los botones clonados tengan el mismo funcionamiento
          const boton = copia.querySelector('.agregar-carrito');
          if (boton) {
            const id = boton.getAttribute('data-id');
            const nombre = boton.getAttribute('data-nombre');
            const precio = boton.getAttribute('data-precio');

            // Asignar evento según si tiene tonos o no
            if (boton.classList.contains('con-tonos')) {
              boton.addEventListener('click', function () {
                const modal = document.getElementById('modalTonos');
                productoSeleccionado = { id, nombre, precio };
                modal.style.display = 'block';
                document.querySelectorAll('.tono').forEach(t => t.classList.remove('seleccionado'));
              });
            } else {
              boton.addEventListener('click', function () {
                agregarAlCarrito(id, nombre, precio);
              });
            }
          }

          contenedorTodos.appendChild(copia);
        });
      }
    });
  }

  // BUSCADOR con productos clonados
  const searchInput = document.getElementById('searchInput');
  const todos = document.getElementById('todos');
  const productosTodos = contenedorTodos ? contenedorTodos.querySelectorAll('.producto') : [];

  if (searchInput && todos && productosTodos.length) {
    searchInput.addEventListener('input', function () {
      const searchTerm = this.value.toLowerCase().trim();
      let resultadosEncontrados = false;
      let mensajeNoResultados = document.getElementById('noResultados');

      if (searchTerm === '') {
        secciones.forEach(seccion => seccion.classList.remove('ocultar-seccion'));
        productosTodos.forEach(p => p.classList.remove('oculto'));
        if (mensajeNoResultados) mensajeNoResultados.remove();
        return;
      }

      // Mostrar solo la sección "todos"
      secciones.forEach(seccion => {
        if (seccion.id !== 'todos') {
          seccion.classList.add('ocultar-seccion');
        } else {
          seccion.classList.remove('ocultar-seccion');
        }
      });

      productosTodos.forEach(producto => {
        const nombre = producto.querySelector("h3").textContent.toLowerCase();
        if (nombre.includes(searchTerm)) {
          producto.classList.remove('oculto');
          resultadosEncontrados = true;
        } else {
          producto.classList.add('oculto');
        }
      });

      if (!resultadosEncontrados) {
        if (!mensajeNoResultados) {
          const mensaje = document.createElement("p");
          mensaje.id = "noResultados";
          mensaje.textContent = "No se encontraron productos.";
          mensaje.style.textAlign = "center";
          mensaje.style.margin = "20px 0";
          contenedorTodos.appendChild(mensaje);
        }
      } else if (mensajeNoResultados) {
        mensajeNoResultados.remove();
      }
    });
  }

  // Manejadores para el modal de imagen ampliada
  const modalImagen = document.getElementById('modalImagen');
  const cerrarImagen = document.querySelector('.cerrar-imagen');

  if (cerrarImagen) {
    cerrarImagen.addEventListener('click', function() {
      modalImagen.style.display = "none";
      document.body.style.overflow = "auto";
    });
  }

  if (modalImagen) {
    modalImagen.addEventListener('click', function(event) {
      if (event.target == modalImagen) {
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

  // Inicializar
  actualizarCarrito();
  setupProductosConTonos();
});
