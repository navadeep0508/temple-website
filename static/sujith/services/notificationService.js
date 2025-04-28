const nodemailer = require('nodemailer');
const Order = require('../models/Order');

class NotificationService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    async sendOrderNotification(order) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM,
                to: process.env.DEVELOPER_EMAIL,
                subject: 'New Order Received - Nature\'s Poultry',
                html: this.generateOrderEmail(order)
            };

            await this.transporter.sendMail(mailOptions);
            
            // Update order notification status
            order.notificationSent = true;
            order.notificationSentAt = new Date();
            order.notificationStatus = 'sent';
            await order.save();

            return true;
        } catch (error) {
            console.error('Error sending notification:', error);
            
            // Update order notification status
            order.notificationStatus = 'failed';
            await order.save();

            return false;
        }
    }

    generateOrderEmail(order) {
        return `
            <h2>New Order Received</h2>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Customer Name:</strong> ${order.customerName}</p>
            <p><strong>Phone Number:</strong> ${order.phoneNumber}</p>
            <p><strong>Delivery Address:</strong> ${order.address}</p>
            <p><strong>Delivery Time:</strong> ${order.deliveryTime}</p>
            
            <h3>Order Items:</h3>
            <ul>
                ${order.items.map(item => `
                    <li>${item.name} - ${item.quantity} x ₹${item.price} = ₹${item.quantity * item.price}</li>
                `).join('')}
            </ul>
            
            <p><strong>Subtotal:</strong> ₹${order.totalAmount - order.deliveryFee}</p>
            <p><strong>Delivery Fee:</strong> ₹${order.deliveryFee}</p>
            <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
            
            <p><strong>Order Source:</strong> ${order.orderSource}</p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
            
            <p>Order placed at: ${order.createdAt}</p>
            
            <p>Please process this order as soon as possible.</p>
        `;
    }

    async sendWhatsAppNotification(order) {
        // Implement WhatsApp notification using WhatsApp Business API
        // This is a placeholder for WhatsApp integration
        try {
            // WhatsApp notification logic here
            return true;
        } catch (error) {
            console.error('Error sending WhatsApp notification:', error);
            return false;
        }
    }
}

module.exports = new NotificationService(); 