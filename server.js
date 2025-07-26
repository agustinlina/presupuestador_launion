const express = require('express');
const bodyParser = require('body-parser');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const empresa = {
    nombre: "Reconstructora Unión S.A",
    cuit: "30716717565",
    direccion: "Buenos Aires, Olavarría, Av Pellegrini 5900",
    email: "olavarria@reconstructoraunion.com"
};

// ✅ Formato numérico estilo AR
function formatoNumero(num) {
    return num.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

app.post('/generar', (req, res) => {
    const { cliente, cuitCliente, fecha, condiciones, items } = req.body;

    // Calcular precios y total
    items.forEach(item => {
        item.precioTotal = parseFloat(item.precio) * parseInt(item.cantidad);
    });
    const total = items.reduce((sum, item) => sum + item.precioTotal, 0);

    // ✅ Excel básico
    const datosExcel = [
        [empresa.nombre, '', '', '', cliente],
        [`Cuit: ${empresa.cuit}`, '', '', '', `CUIT: ${cuitCliente}`],
        [empresa.direccion],
        [empresa.email],
        [],
        ['Fecha de emisión:', fecha],
        [],
        ['Cantidad', 'Descripción', 'Precio Unitario', 'Precio Total']
    ];

    items.forEach(item => {
        datosExcel.push([
            item.cantidad,
            item.descripcion,
            formatoNumero(item.precio),
            formatoNumero(item.precioTotal)
        ]);
    });

    datosExcel.push([]);
    datosExcel.push(['', '', 'TOTAL', formatoNumero(total)]);
    datosExcel.push([]);
    datosExcel.push(['Condiciones de pago:', condiciones]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(datosExcel);
    ws['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // ✅ Generar PDF
    const doc = new PDFDocument({ margin: 40 });
    let pdfChunks = [];
    doc.on('data', chunk => pdfChunks.push(chunk));
    doc.on('end', () => {
        const pdfBuffer = Buffer.concat(pdfChunks);
        res.json({
            excel: excelBuffer.toString('base64'),
            pdf: pdfBuffer.toString('base64')
        });
    });

    const headerLogoPath = 'public/logo.png';
    const watermarkLogoPath = 'public/logo_union.png';

    // ✅ Marca de agua en todas las páginas
    doc.on('pageAdded', () => {
        if (fs.existsSync(watermarkLogoPath)) {
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            doc.save();
            doc.opacity(0.1);
            doc.image(watermarkLogoPath, pageWidth / 4, pageHeight / 4, {
                width: pageWidth / 2
            });
            doc.restore();
        }
    });

    // ✅ Primera página: marca de agua
    if (fs.existsSync(watermarkLogoPath)) {
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        doc.save();
        doc.opacity(0.1);
        doc.image(watermarkLogoPath, pageWidth / 4, pageHeight / 4, {
            width: pageWidth / 2
        });
        doc.restore();
    }

    // ✅ Logo encabezado
    if (fs.existsSync(headerLogoPath)) {
        doc.image(headerLogoPath, 250, 40, { width: 100 });
    }

    // ✅ Datos empresa (nombre en negrita)
    doc.font('Helvetica-Bold').fontSize(16).text(empresa.nombre, 40, 40);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Cuit: ${empresa.cuit}`, 40, 60);
    doc.text(empresa.direccion, 40, 75);
    doc.text(empresa.email, 40, 90);

    // ✅ Datos del cliente
    let clienteY = 40;
    doc.fontSize(12).font('Helvetica').text(cliente, 400, clienteY);
    clienteY += 15;
    doc.text(`CUIT: ${cuitCliente}`, 400, clienteY);
    clienteY += 15;
    doc.text(`Fecha de emisión: ${fecha}`, 400, clienteY);

    // ✅ Título
    const titleTop = 150;
    doc.fontSize(18).font('Helvetica-Bold').text('Presupuesto por Ud. requerido', 40, titleTop);

    // ✅ Tabla
    const tableTop = titleTop + 30;
    const colWidths = [80, 250, 90, 90];
    const colX = [40, 40 + colWidths[0], 40 + colWidths[0] + colWidths[1], 40 + colWidths[0] + colWidths[1] + colWidths[2]];
    const rowHeight = 25;

    // ✅ Encabezado tabla
    doc.fontSize(12).font('Helvetica-Bold');
    doc.rect(40, tableTop, colWidths.reduce((a, b) => a + b), rowHeight).stroke();
    doc.text('Cantidad', colX[0] + 10, tableTop + 7);
    doc.text('Descripción', colX[1] + 10, tableTop + 7);
    doc.text('Precio U.', colX[2] + 10, tableTop + 7);
    doc.text('Precio Total', colX[3] + 10, tableTop + 7);

    // ✅ Filas productos (fuente más pequeña: 10 pt)
    doc.fontSize(10).font('Helvetica');
    let y = tableTop + rowHeight;
    items.forEach(item => {
        doc.rect(40, y, colWidths.reduce((a, b) => a + b), rowHeight).stroke();
        doc.text(item.cantidad, colX[0] + 10, y + 7);
        doc.text(item.descripcion, colX[1] + 10, y + 7);
        doc.text(`$${formatoNumero(item.precio)}`, colX[2] + 10, y + 7);
        doc.text(`$${formatoNumero(item.precioTotal)}`, colX[3] + 10, y + 7);
        y += rowHeight;
    });

    // ✅ Fila TOTAL amarilla
    doc.rect(colX[2], y, colWidths[2], rowHeight).fillAndStroke('#FFFF00', '#000');
    doc.fillColor('black').fontSize(11).font('Helvetica-Bold')
        .text('TOTAL:', colX[2] + 10, y + 7);

    doc.rect(colX[3], y, colWidths[3], rowHeight).fillAndStroke('#FFFF00', '#000');
    doc.fillColor('black').fontSize(11).font('Helvetica-Bold')
        .text(`$${formatoNumero(total)}`, colX[3] + 10, y + 7);

    doc.fillColor('black');
    y += rowHeight + 20;

    // ✅ Condiciones de pago
    doc.font('Helvetica-Bold').fontSize(11).text(`Condiciones de pago: `, 40, y, { continued: true });
    doc.font('Helvetica').text(condiciones);

    doc.end();
});

app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
