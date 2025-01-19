const PDFDocument = require('pdfkit');

function generateInvoice(order, user) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            doc.fillColor('#444444')
               .fontSize(30)
               .text('Comic Aura', 50, 45)
               .fontSize(10)
               .text('Comic Aura', 200, 50, { align: 'right' })
               .text('123 Comic Street', 200, 65, { align: 'right' })
               .text('New York, NY, 10025', 200, 80, { align: 'right' })
               .moveDown();

            doc.fontSize(20)
               .text('Invoice', 50, 160);
            
            generateHr(doc, 185);
            
            const customerInformationTop = 200;
            
            doc.fontSize(10)
               .text('Invoice Number:', 50, customerInformationTop)
               .font('Helvetica-Bold')
               .text(order._id.toString(), 150, customerInformationTop)
               .font('Helvetica')
               .text('Invoice Date:', 50, customerInformationTop + 15)
               .text(formatDate(order.orderDate), 150, customerInformationTop + 15)
               .text('Balance Due:', 50, customerInformationTop + 30)
               .text(formatCurrency(order.totalAmount), 150, customerInformationTop + 30)
               
               .font('Helvetica-Bold')
               .text(user.name, 300, customerInformationTop)
               .font('Helvetica')
               .text(order.shippingAddress.street, 300, customerInformationTop + 15)
               .text(
                   `${order.shippingAddress.city}, ${order.shippingAddress.state}, ${order.shippingAddress.pinCode}`,
                   300,
                   customerInformationTop + 30
               )
               .moveDown();
            
            generateHr(doc, 252);

            const invoiceTableTop = 330;
            
            doc.font('Helvetica-Bold');
            generateTableRow(
                doc,
                invoiceTableTop,
                'Item',
                'Description',
                'Unit Cost',
                'Quantity',
                'Line Total'
            );
            generateHr(doc, invoiceTableTop + 20);
            doc.font('Helvetica');
            
            let position = invoiceTableTop + 30;
            
            order.items.forEach(item => {
                position = generateTableRow(
                    doc,
                    position,
                    item.productId.name,
                    item.productId.description ? item.productId.description.substring(0, 30) + '...' : '',
                    formatCurrency(item.productId.salePrice || item.productId.regularPrice),
                    item.quantity,
                    formatCurrency((item.productId.salePrice || item.productId.regularPrice) * item.quantity)
                );
                generateHr(doc, position + 20);
            });
            
            const subtotalPosition = position + 30;
            generateTableRow(
                doc,
                subtotalPosition,
                '',
                '',
                'Subtotal',
                '',
                formatCurrency(order.totalAmount - (order.totalAmount * 0.05))
            );
            
            const taxPosition = subtotalPosition + 20;
            generateTableRow(
                doc,
                taxPosition,
                '',
                '',
                'Tax (5%)',
                '',
                formatCurrency(order.totalAmount * 0.05)
            );
            
            const totalPosition = taxPosition + 25;
            doc.font('Helvetica-Bold');
            generateTableRow(
                doc,
                totalPosition,
                '',
                '',
                'Total',
                '',
                formatCurrency(order.totalAmount)
            );
            
            // Footer
            doc.fontSize(10)
               .text(
                   'Payment is due within 15 days. Thank you for your business.',
                   50,
                   780,
                   { align: 'center', width: 500 }
               );
            
            doc.end();
        } catch (error) {
            console.error('Error generating invoice:', error);
            reject(error);
        }
    });
}

function generateHr(doc, y) {
    doc.strokeColor('#aaaaaa')
       .lineWidth(1)
       .moveTo(50, y)
       .lineTo(550, y)
       .stroke();
}

function formatCurrency(amount) {
    return '₹' + amount.toFixed(2);
}

function formatDate(date) {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function generateTableRow(doc, y, item, description, unitCost, quantity, lineTotal) {
    doc.fontSize(10)
       .text(item, 50, y)
       .text(description, 150, y)
       .text(unitCost, 280, y, { width: 90, align: 'right' })
       .text(quantity, 370, y, { width: 90, align: 'right' })
       .text(lineTotal, 0, y, { align: 'right' });
    
    return y + 30;
}

module.exports = generateInvoice;
