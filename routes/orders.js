var express = require('express');
var router = express.Router();


// ---------------- DATA MODEL -------------------
let orders = [
  {
    'orderId': 1,
    'userId': 1,

    'sellerId': 2,
    'books': [
      { 'bookId': 2, 'units': 1, 'price': 6 },
      { 'bookId': 1, 'units': 2, 'price': 5 },
    ],
    'status': 'In preparation',                                     // In preparation, Sent, Delivered, Confirmed, Cancelled

    'deliveryAddress': '4 Privet Drive, Little Whinging, Surrey', // Harry Potter's address
    
    'maxDeliveryDate': '2023-12-25',
    'creationDatetime': '2023-11-20T08:30:00',
    'updateDatetime': '2023-11-21T09:45:00',
    'payment': 16
  },
  {
    'orderId': 2,
    'userId': 1,

    'sellerId': 1,
    'books': [
      { 'bookId': 3, 'units': 1, 'price': 10},
      { 'bookId': 4, 'units': 2, 'price': 5},
    ],
    'status': 'Delivered',                                        

    'deliveryAddress': '221B Baker Street, London',              // Sherlock Holmes' address
    
    'maxDeliveryDate': '2023-11-30',
    'creationDatetime': '2023-11-15T10:00:00',
    'updateDatetime': '2023-11-16T11:15:00',
    'payment': 20
  },
  {
    'orderId': 3,
    'userId': 1,

    'sellerId': 3,
    'books':  [
      { 'bookId': 5, 'units': 3, 'price': 7},
    ],
    'status': 'In preparation',

    'deliveryAddress': '20-2 Yohga, Setagaya-ku, Tokyo',        // Katsuragi Misato's address (Neon Genesis Evangelion)
    
    'maxDeliveryDate': '2023-11-30',
    'creationDatetime': '2023-11-15T11:00:00',
    'updateDatetime': '2023-11-16T11:21:00',
    'payment': 21
  }
]


// ---------------- GET -----------------------

router.get('/', function(req, res, next) {

  let selectedOrders = orders;

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
    res.status(200).send(selectedOrders);
  }

});



router.get('/:orderId', function(req, res, next) {

  let orderId = req.params.orderId;
  let order = orders.find(order => order.orderId == orderId);

  // Errors checking
  if (order){
    res.status(200).send(order);
  }
  else {
    res.status(404).send({error: 'Order not found.'});
  }

});

// ---------------- POST -----------------------

router.post('/', function(req, res, next) {

  // Check if required fields are provided
  if (!(req.body.userId && req.body.sellerId && req.body.books && req.body.deliveryAddress && req.body.payment)) {
    return res.status(400).send({ error: "Missing required fields" });
  }

  // Check if all the books fields are provided
  if (!(req.body.books.every(book => book.bookId && book.units && book.price))) {
    return res.status(400).send({ error: "Missing required fields in books" });
  }



  // Create object to push
  let order = req.body;  // Add userId, sellerId, books, deliveryAddress, payment

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
    orders.push(order);
    res.status(201).send({ message: `New order id=${order.orderId} created successfully`});
  } 
  catch (error) {
    return res.status(500).send({ error: "An error occurred while creating the order" });
  }
  // Cuando se hace un pedido se debe de modificar el stock de los libros (comunicacion Libros --> Pedidos)
  // Completar con llamada a microservicio de libros
  // +++++++++++++++++++++++++++++++++++++++++++++++++++++
});

module.exports = router;