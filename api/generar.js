import PDFDocument from 'pdfkit';
import XLSX from 'xlsx';
import { existsSync } from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { cliente, cuitCliente, fecha, condiciones, items } = req.body;

    const empresa = {
        nombre: "Reconstructora Unión S.A",
        cuit: "30716717565",
        direccion: "Buenos Aires, Olavarría, Av Pellegrini 5900",
        email: "olavarria@reconstructoraunion.com"
    };

    const formatoNumero = (num) =>
        num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Calcular total
    items.forEach(item => item.precioTotal = parseFloat(item.precio) * parseInt(item.cantidad));
    const total = items.reduce((sum, item) => sum + item.precioTotal, 0);

    // ✅ Generar Excel
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

    items.forEach(item =>
        datosExcel.push([
            item.cantidad,
            item.descripcion,
            formatoNumero(item.precio),
            formatoNumero(item.precioTotal)
        ])
    );

    datosExcel.push([]);
    datosExcel.push(['', '', 'TOTAL', formatoNumero(total)]);
    datosExcel.push([]);
    datosExcel.push(['Condiciones de pago:', condiciones]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(datosExcel);
    XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // ✅ Generar PDF
    const doc = new PDFDocument({ margin: 40 });
    const pdfChunks = [];
    doc.on('data', chunk => pdfChunks.push(chunk));
    doc.on('end', () => {
        const pdfBuffer = Buffer.concat(pdfChunks);
        res.status(200).json({
            excel: excelBuffer.toString('base64'),
            pdf: pdfBuffer.toString('base64')
        });
    });

    // Logos
    const watermarkPath = path.resolve('./public/logo_union.png');
    const headerPath = path.resolve('./public/logo.png');

    // Marca de agua
    if (existsSync(watermarkPath)) {
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        doc.opacity(0.1).image(watermarkPath, pageWidth / 4, pageHeight / 4, { width: pageWidth / 2 }).opacity(1);
    }

    // Logo encabezado
    if (existsSync(headerPath)) {
        doc.image(headerPath, 250, 40, { width: 100 });
    }

    // Datos empresa
    doc.font('Helvetica-Bold').fontSize(16).text(empresa.nombre, 40, 40);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Cuit: ${empresa.cuit}`, 40, 60);
    doc.text(empresa.direccion, 40, 75);
    doc.text(empresa.email, 40, 90);

    // Cliente
    let clienteY = 40;
    doc.fontSize(12).text(cliente, 400, clienteY);
    clienteY += 15;
    doc.text(`CUIT: ${cuitCliente}`, 400, clienteY);
    clienteY += 15;
    doc.text(`Fecha de emisión: ${fecha}`, 400, clienteY);

    // Título
    const titleTop = 150;
    doc.fontSize(18).font('Helvetica-Bold').text('Presupuesto por Ud. requerido', 40, titleTop);

    // Tabla
    const tableTop = titleTop + 30;
    const colWidths = [80, 250, 90, 90];
    const colX = [40, 40 + colWidths[0], 40 + colWidths[0] + colWidths[1], 40 + colWidths[0] + colWidths[1] + colWidths[2]];
    const rowHeight = 25;

    // Encabezado
    doc.fontSize(12).font('Helvetica-Bold');
    doc.rect(40, tableTop, colWidths.reduce((a, b) => a + b), rowHeight).stroke();
    doc.text('Cantidad', colX[0] + 10, tableTop + 7);
    doc.text('Descripción', colX[1] + 10, tableTop + 7);
    doc.text('Precio U.', colX[2] + 10, tableTop + 7);
    doc.text('Precio Total', colX[3] + 10, tableTop + 7);

    // Filas
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

    // Total
    doc.rect(colX[2], y, colWidths[2], rowHeight).fillAndStroke('#FFFF00', '#000');
    doc.fillColor('black').fontSize(14).font('Helvetica-Bold').text('TOTAL:', colX[2] + 10, y + 7);
    doc.rect(colX[3], y, colWidths[3], rowHeight).fillAndStroke('#FFFF00', '#000');
    doc.fillColor('black').fontSize(14).font('Helvetica-Bold').text(`$${formatoNumero(total)}`, colX[3] + 10, y + 7);

    y += rowHeight + 20;
    doc.font('Helvetica-Bold').fontSize(12).text(`Condiciones de pago: `, 40, y, { continued: true });
    doc.font('Helvetica').text(condiciones);

    doc.end();
}
