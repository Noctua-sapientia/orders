const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    bookId: {
        type: Number,
        required: true
    },
    units: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    }
});

const orderSchema = new mongoose.Schema({
    orderId: Number,
    userId: {
        type: Number,
        required: true,
    },
    sellerId: {
        type: Number,
        required: true,
    },
    books: {
        type: [bookSchema],
        required: true,
    },
    status: {
        type: String,
        required: true,
    },
    deliveryAddress: {
        type: String,
        required: true,
    },
    maxDeliveryDate: {
        type: Date,
        required: true,
    },
    creationDatetime: {
        type: Date,
        default: Date.now
    },
    updateDatetime: {
        type: Date,
        required: true,
    },
    payment: {
        type: Number,
        required: true,
    }
});

orderSchema.methods.cleanup = function() {
    return {
        orderId: this.orderId,
        userId: this.userId,
        sellerId: this.sellerId,
        books: this.books,
        status: this.status,
        deliveryAddress: this.deliveryAddress,
        maxDeliveryDate: this.maxDeliveryDate,
        creationDatetime: this.creationDatetime,
        updateDatetime: this.updateDatetime,
        payment: this.payment
    };
}

const Orders = mongoose.model('Orders', orderSchema);

module.exports = Orders;