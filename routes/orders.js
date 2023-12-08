var express = require('express');
var router = express.Router();
var Order = require('../models/order');
var debug = require('debug')('orders-2:server');

// ---------------- GET -----------------------

router.get('/', async function(req, res, next) {

  let selectedOrders;
  try {
    selectedOrders = await Order.find();
  }
  catch (error) { 
    debug("Database error", e);
    return res.status(500).send({ error: "Database error" });
  }

  // selected orders made by a certain user
  if (req.query.userId) {
    selectedOrders = selectedOrders.filter(order => order.userId == req.query.userId);
  }

  // selected orders made to a certain seller
  if (req.query.sellerId) {
    selectedOrders = selectedOrders.filter(order => order.sellerId == req.query.sellerId);
  }

  // selected orders with a certain status
  if (req.query.status) {
    selectedOrders = selectedOrders.filter(order => order.status == req.query.status);
  }

  // selected orders containing a certain book
  if (req.query.bookId) {
    selectedOrders = selectedOrders.filter(order => 
      order.books.some(book => book.bookId === req.query.bookId)
    );
  }

  // selected orders sorted by dates
  if (req.query.sort == 'creationDate') {
    selectedOrders = selectedOrders.sort((a, b) => (a.creationDatetime > b.creationDatetime) ? 1 : -1);
  }

  if (req.query.sort == 'updateDatetime') {
    selectedOrders = selectedOrders.sort((a, b) => (a.updateDatetime > b.updateDatetime) ? 1 : -1);
  }

  if (req.query.sort == 'maxDeliveryDate') {
    selectedOrders = selectedOrders.sort((a, b) => (a.maxDeliveryDate > b.maxDeliveryDate) ? 1 : -1);
  }

  if (req.query.sort == 'payment') {
    selectedOrders = selectedOrders.sort((a, b) => (a.payment > b.payment) ? 1 : -1);
  }

  // selected orders in a payment range minPayment-maxPayment
  if (req.query.minPayment && req.query.maxPayment) {
    selectedOrders = selectedOrders.filter(order => 
      order.payment >= req.query.minPayment && order.payment <= req.query.maxPayment
    );
  }

  // Errors checking
  if (selectedOrders.length == 0) {
    res.status(404).send({error: 'No orders found.'});
  }
  else {
    res.status(200).send(selectedOrders.map(order => order.cleanup()));
  }

});



router.get('/:orderId', async function(req, res, next) {

  const orderId = req.params.orderId;
  let orders;

  try{
    orders = await Order.find();
  }
  catch(e){
    debug("Database error", e);
    return res.status(500).send({ error: "Database error" });
  }
  
  let order = orders.find(order => order.orderId == orderId);

  // Errors checking
  if (order){
    res.status(200).send(order.cleanup());

  }
  else {
    res.status(404).send({error: 'Order not found.'});
  }

});


// ---------------- POST -----------------------

router.post('/', async function(req, res, next) {

  // Check if required fields are provided
  if (!(req.body.userId && req.body.sellerId && req.body.books && req.body.deliveryAddress && req.body.payment)) {
    return res.status(400).send({ error: "Missing required fields" });
  }

  // Check if all the books fields are provided
  if (!(req.body.books.every(book => book.bookId && book.units && book.price))) {
    return res.status(400).send({ error: "Missing required fields in books" });
  }

  // Create object to push
  let order = new Order(req.body);    // Add userId, sellerId, books, deliveryAddress, payment
  let orders = await Order.find();

  let maxId = 0;
  orders.forEach(order => {
    if (order.orderId > maxId) {
      maxId = order.orderId;
    }});
  order.orderId = maxId + 1;  // Add orderId

  order.status = 'In preparation';  // Add status
  order.creationDatetime = new Date().toISOString();  // Add creationDatetime
  order.updateDatetime = new Date().toISOString();  // Add updateDatetime

  let maxDeliveryDate = new Date(order.creationDatetime);  // Add max delivery date 
  maxDeliveryDate.setDate(maxDeliveryDate.getDate() + 15);
  order.maxDeliveryDate = maxDeliveryDate.toISOString().split('T')[0];

  // Errors checking
  try {
    await order.save();
    res.status(201).send({ message: `New order id=${order.orderId} created successfully`});
  } catch (error) {
      if (error.errors){
        return res.status(400).send({ error: error.errors });
      }
      else{
        return res.status(500).send({ error: "An error occurred while creating the order" });
      }
    
  }
  // Cuando se hace un pedido se debe de modificar el stock de los libros (comunicacion Libros --> Pedidos)
  // Completar con llamada a microservicio de libros
  // +++++++++++++++++++++++++++++++++++++++++++++++++++++
});


// ---------------- PUT -----------------------
router.put('/:orderId', async function(req, res, next) {
  
  const orderId = req.params.orderId;
  let orders;

  try{
    orders = await Order.find();
  }
  catch(e){
    debug("Database error", e);
    return res.status(500).send({ error: "Database error" });
  }
  
  let order = orders.find(order => order.orderId == orderId);

  if (order) {
    // Temporal object that stores the updates
    let temporalOrder = {};

    if (req.body.userId) {
      temporalOrder.userId = req.body.userId;
    }
    if (req.body.sellerId) {
      temporalOrder.sellerId = req.body.sellerId;
    }
    if (req.body.books) {
      if (!(req.body.books.every(book => book.bookId && book.units && book.price))) {
        return res.status(400).send({ error: "Order not updated. Missing required fields in books" });
      }    
      temporalOrder.books = req.body.books;
    }
    if (req.body.status) {
      if (! ['In preparation', 'Sent', 'Delivered', 'Confirmed', 'Cancelled'].includes(req.body.status)) {
        return res.status(400).send('Order not updated. Invalid status format');
      }
      temporalOrder.status = req.body.status;
    }
    if (req.body.deliveryAddress) {
      temporalOrder.deliveryAddress = req.body.deliveryAddress;
    }
    if (req.body.maxDeliveryDate) {
      if (!check_date_format(req.body.maxDeliveryDate)) {
        return res.status(400).send('Order not updated. Invalid date format');
      }
      temporalOrder.maxDeliveryDate = new Date(req.body.maxDeliveryDate).toISOString();
    }

    if (req.body.payment) {
      temporalOrder.payment = req.body.payment;
    }
    
    temporalOrder.updateDatetime = new Date().toISOString();

    // Apply all updates if no errors found
    Object.assign(order, temporalOrder);

    try {
      await order.save();
      res.status(200).send({ message: `Order id=${orderId} updated successfully` });
    }
    catch (error) {
      if (error.errors){
        return res.status(400).send({ error: error.errors });
      }
      else{
        return res.status(500).send({ error: "An error occurred while updating the order" });
      }
    }

    // Si se cancela el pedido se debe de modificar el stock de los libros (comunicacion Libros --> Pedidos)
    // Completar con llamada a microservicio de libros   
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++

    // Si se completa un pedido se debe de modificar el numero de pedidos del vendedor (comunicacion Libros --> Usuarios)
    // Completar con llamada a microservicio de usuarios 
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++

  } else {
    res.status(404).send({ error: "Order not found" });
  }
});


// ---------------- DELETE -----------------------

router.delete('/:orderId', async function(req, res, next) {
  try {
    // Eliminar el pedido por orderId
    const result = await Order.deleteOne({ "orderId": req.params.orderId });

    // Si no se eliminó ningún documento, significa que no se encontró el pedido
    if (result.deletedCount === 0) {
      return res.status(404).send({ error: 'Order not found' });
    }

    // Enviar una respuesta de éxito
    res.status(200).send({ message: `Order id=${req.params.orderId} deleted successfully` });
  } catch (error) {
    // Manejar errores inesperados
    return res.status(500).send({ error: 'An error occurred while deleting the order' });
  }
});

// ---------------- AUXILIARY FUNCTIONS -----------------------

function check_date_format(date) {
  let date_regex = /^\d{4}-\d{2}-\d{2}$/;
  return date_regex.test(date);
}

module.exports = router;