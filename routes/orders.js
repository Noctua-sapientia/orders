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


// ---------------- PUT -----------------------
router.put('/:orderId', function(req, res, next) {
  let orderId = req.params.orderId;
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

    res.status(200).send({ message: `Order id=${orderId} updated successfully` });

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


router.put('/books/:bookId/cancelledRemove', function(req, res, next) {
  const bookId = parseInt(req.params.bookId);
  
  let suppressions = 0;
  orders.forEach(order => {
    let order_booksIds = order.books.map(book => book.bookId);

    if (order_booksIds.includes(bookId) && order.status === 'In preparation') {
      if (order_booksIds === 1) {
        order.status = 'Cancelled';
        order.updateDatetime = new Date().toISOString();
        suppressions++;
      } else {
        order.books = order.books.filter(book => book.bookId !== bookId);
        order.updateDatetime = new Date().toISOString();
        suppressions++;
      }
    }
  });
  
  if (suppressions > 0) {
    res.status(200).send(`Suppressed book id=${bookId} from ${suppressions} orders succesfully.`);
  } else {
    res.status(404).send(`No orders in progress for book id=${bookId}`);
  }
  
}); 

router.put('/sellers/:sellerId/cancelled', function(req, res, next) {
  let sellerId = parseInt(req.params.sellerId);
  
  let cancelledOrders = 0;
  orders.forEach(order => {
    if (order.sellerId === sellerId && order.status === 'In preparation') {
      order.status = 'Cancelled';
      order.updateDatetime = new Date().toISOString();
      cancelledOrders++;
  
      // Si se cancela el pedido se debe de modificar el stock de los libros (comunicacion Libros --> Pedidos)
      // Completar con llamada a microservicio de libros   
      // +++++++++++++++++++++++++++++++++++++++++++++++++++++
    }
  });
  
  if (cancelledOrders > 0) {
    res.status(200).send(`Cancelled ${cancelledOrders} orders succesfully for seller id=${sellerId}.`);
  } else {
    res.status(404).send(`No orders in progress for  seller id=${sellerId}`);
  }
});





// ---------------- DELETE -----------------------

router.delete('/:orderId', function(req, res, next) {

  var orderId = req.params.orderId;
  var order = orders.find(order => order.orderId == orderId);
  if (order){
    orders = orders.filter(order => order.orderId != orderId);
    res.status(200).send({ message: `Order id=${orderId} deleted successfully`});
  }
  else {
    res.status(404).send({ error: "Order not found" });
  }

});

module.exports = router;