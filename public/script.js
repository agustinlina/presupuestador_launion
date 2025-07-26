document.addEventListener('DOMContentLoaded', () => {
    const itemsBody = document.getElementById('itemsBody');
    const agregarFilaBtn = document.getElementById('agregarFila');
    const form = document.getElementById('presupuestoForm');

    // ✅ Fecha actual por defecto
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').value = hoy;

    // ✅ Función para agregar filas
    function agregarFila(cantidad = 1, descripcion = 'Producto de ejemplo', precio = 100) {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><input type="number" class="form-control cantidad" value="${cantidad}" required></td>
            <td><input type="text" class="form-control descripcion" value="${descripcion}" required></td>
            <td><input type="number" class="form-control precio" value="${precio}" required></td>
            <td><button type="button" class="btn btn-danger eliminarFila">Eliminar</button></td>
        `;
        fila.querySelector('.eliminarFila').addEventListener('click', () => {
            if (itemsBody.children.length > 1) {
                fila.remove();
            } else {
                alert('Debe haber al menos una fila.');
            }
        });
        itemsBody.appendChild(fila);
    }

    // ✅ Dos filas por defecto
    agregarFila(1, 'Producto ejemplo 1', 500);
    agregarFila(2, 'Producto ejemplo 2', 750);

    // ✅ Botón para agregar filas
    agregarFilaBtn.addEventListener('click', () => agregarFila());

    // ✅ Manejo del envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const cliente = document.getElementById('cliente').value.trim();
        const cuitCliente = document.getElementById('cuitCliente').value;
        const fecha = document.getElementById('fecha').value;
        const condiciones = document.getElementById('condiciones').value;

        const items = [...itemsBody.children].map(row => ({
            cantidad: row.querySelector('.cantidad').value,
            descripcion: row.querySelector('.descripcion').value,
            precio: row.querySelector('.precio').value
        }));

        // ✅ Llamada al backend en Vercel
        const res = await fetch('/api/generar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cliente, cuitCliente, fecha, condiciones, items })
        });

        if (!res.ok) {
            alert('Error al generar el presupuesto. Verifica la conexión con el servidor.');
            return;
        }

        const data = await res.json();

        // ✅ Nombre dinámico: Cliente-Fecha
        const clienteLimpio = cliente.replace(/\s+/g, '_');
        const nombrePDF = `${clienteLimpio}-${fecha}.pdf`;
        const nombreExcel = `${clienteLimpio}-${fecha}.xlsx`;

        // ✅ Crear blobs
        const excelBlob = b64toBlob(data.excel, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        const pdfBlob = b64toBlob(data.pdf, 'application/pdf');

        // ✅ Mostrar botones de descarga
        document.getElementById('resultados').innerHTML = `
            <a href="${URL.createObjectURL(excelBlob)}" class="btn btn-outline-primary" download="${nombreExcel}">Descargar Excel</a>
            <a href="${URL.createObjectURL(pdfBlob)}" class="btn btn-outline-danger" download="${nombrePDF}" id="descargarPDF">Descargar PDF</a>
        `;

        // ✅ Recargar la página al descargar el PDF
        document.getElementById('descargarPDF').addEventListener('click', () => {
            setTimeout(() => {
                window.location.reload(); // Simula F5
            }, 500); // Espera 0.5 segundos para iniciar la descarga
        });
    });

    // ✅ Conversión Base64 a Blob
    function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        return new Blob(byteArrays, { type: contentType });
    }
});
