const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// Create a new order
router.post('/', [
    body('customerName').notEmpty().trim(),
    body('phoneNumber').notEmpty().trim(),
    body('address').notEmpty().trim(),
    body('items').isArray().notEmpty(),
    body('deliveryTime').notEmpty().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { customerName, phoneNumber, address, items, deliveryTime } = req.body;

        // Calculate total amount and validate products
        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(400).json({ message: `Product not found: ${item.productId}` });
            }

            if (!product.isAvailable) {
                return res.status(400).json({ message: `Product not available: ${product.name}` });
            }

            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            orderItems.push({
                productId: product._id,
                quantity: item.quantity,
                price: product.price
            });
        }

        // Calculate delivery fee
        const deliveryFee = totalAmount >= 1000 ? 0 : 50;
        totalAmount += deliveryFee;

        const order = new Order({
            customerName,
            phoneNumber,
            address,
            items: orderItems,
            totalAmount,
            deliveryFee,
            deliveryTime
        });

        await order.save();

        // Send confirmation email (implement email service)
        // sendOrderConfirmationEmail(order);

        res.status(201).json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all orders (admin only)
router.get('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .populate('items.productId', 'name price');

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get order by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.productId', 'name price');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user is admin or the order belongs to the user
        if (req.user.role !== 'admin' && order.customerName !== req.user.name) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update order status (admin only)
router.patch('/:id/status', auth, [
    body('status').isIn(['pending', 'confirmed', 'processing', 'delivered', 'cancelled'])
], async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.status = req.body.status;
        await order.save();

        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 