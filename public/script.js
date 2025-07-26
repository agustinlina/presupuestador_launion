document.addEventListener('DOMContentLoaded', () => {
    const itemsBody = document.getElementById('itemsBody');
    const agregarFilaBtn = document.getElementById('agregarFila');
    const form = document.getElementById('presupuestoForm');

    // Fecha actual por defecto
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').value = hoy;

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

    // Solo 2 filas iniciales
    agregarFila(1, 'Producto ejemplo 1', 500);
    agregarFila(2, 'Producto ejemplo 2', 750);

    agregarFilaBtn.addEventListener('click', () => agregarFila());

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cliente = document.getElementById('cliente').value;
        const cuitCliente = document.getElementById('cuitCliente').value;
        const fecha = document.getElementById('fecha').value;
        const condiciones = document.getElementById('condiciones').value;

        const items = [...itemsBody.children].map(row => ({
            cantidad: row.querySelector('.cantidad').value,
            descripcion: row.querySelector('.descripcion').value,
            precio: row.querySelector('.precio').value
        }));

        const res = await fetch('/generar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cliente, cuitCliente, fecha, condiciones, items })
        });

        const data = await res.json();

        // ✅ Nombre dinámico: Empresa_Cliente
        const nombreEmpresa = 'ReconstructoraUnionSA';
        const clienteLimpio = cliente.trim().replace(/\s+/g, '_');
        const nombrePDF = `${nombreEmpresa}_${clienteLimpio}.pdf`;
        const nombreExcel = `${nombreEmpresa}_${clienteLimpio}.xlsx`;

        // Crear enlaces de descarga
        const excelBlob = b64toBlob(data.excel, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        const pdfBlob = b64toBlob(data.pdf, 'application/pdf');

        document.getElementById('resultados').innerHTML = `
            <a href="${URL.createObjectURL(excelBlob)}" class="btn btn-outline-primary descargar" download="${nombreExcel}">Descargar Excel</a>
            <a href="${URL.createObjectURL(pdfBlob)}" class="btn btn-outline-danger descargar" download="${nombrePDF}">Descargar PDF</a>
        `;

        // ✅ Recargar la página después de descargar
        document.querySelectorAll('.descargar').forEach(btn => {
            btn.addEventListener('click', () => {
                setTimeout(() => {
                    location.reload();
                }, 1500); // espera 1.5 segundos
            });
        });
    });

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
