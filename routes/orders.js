var express = require('express');
var router = express.Router();
var Order = require('../models/order');
var debug = require('debug')('orders-2:server');

// ---------------- GET -----------------------
// GET /orders :: Gives all books and allows to filter with certain criteria
/**
 * @openapi
 * /api/v1/orders:
 *   get:
 *     tags:
 *       - Orders
 *     description: Request all orders allowing filters based on different criteria
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: false
 *         description: User ID to filter orders.
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sellerId
 *         required: false
 *         description: Seller ID to filter orders.
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         required: false
 *         description: Status to filter orders.
 *         schema:
 *           type: string
 *       - in: query
 *         name: bookId
 *         required: false
 *         description: Book ID to filter orders.
 *         schema:
 *           type: integer
 *       - in: query
 *         name: minPayment
 *         required: false
 *         description: Minimum payment to filter orders.
 *         schema:
 *           type: integer
 *       - in: query
 *         name: maxPayment
 *         required: false
 *         description: Minimum payment to filter orders.
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sort
 *         required: false
 *         description: Sorting criteria (creationDate, updateDatetime, maxDeliveryDate, payment).
 *         schema:
 *           type: string
 * 
 *     responses:
 *       200:
 *         description: Filtered orders returned successfully.
 *       404:
 *         description: No orders found.
 *       500:
 *        description: Database error.
 */
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


// GET /orders/{orderId} :: Request one order by id 
/**
 * @openapi
 * /api/v1/orders/{orderId}:
 *   get:
 *     tags:
 *       - Orders
 *     description: Request one order by its ID
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         description: Numeric ID of the order to get.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order data returned successfully.
 *       404:
 *         description: Not found.
 *       500:
 *         description: Database error.
 */
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

// POST /orders :: Create a new order
/**
* @openapi
* /api/v1/orders:
*   post:
*     tags:
*       - Orders
*     description: Create a new order.
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               userId:
*                 type: integer
*               sellerId:
*                 type: integer
*               books:
*                 type: array
*                 items:
*                   type: object
*                   properties:
*                     bookId:
*                       type: integer
*                     units:
*                       type: integer
*                     price:
*                       type: integer
*                   required:
*                     - bookId
*                     - units
*               deliveryAddress:
*                 type: string
*               maxDeliveryDate:
*                 type: string
*                 format: date format: YYYY-MM-DD
*               payment:
*                 type: number
*     responses:
*       201:
*         description: New order created successfully.
*       400:
*         description: Missing required fields. / Missing required fields in books. / Invalid date format.
*       500:
*         description: Database error.
*/
router.post('/', async function(req, res, next) {

  // Check if required fields are provided
  if (!(req.body.userId && req.body.sellerId && req.body.books && req.body.deliveryAddress && req.body.payment)) {
    return res.status(400).send({ error: "Order not posted. Missing required fields" });
  }

  // Check if all the books fields are provided
  if (!(req.body.books.every(book => book.bookId && book.units && book.price))) {
    return res.status(400).send({ error: "Order not posted. Missing required fields in books" });
  }

  let orders = await Order.find();

  let order = new Order();              // Create object to push
  order.userId = req.body.userId;       // Add userId, sellerId, books, deliveryAddress, payment  
  order.sellerId = req.body.sellerId;
  order.books = req.body.books;
  order.deliveryAddress = req.body.deliveryAddress;
  order.payment = req.body.payment;

  let maxId = 0;
  orders.forEach(order => {
    if (order.orderId > maxId) {
      maxId = order.orderId;
    }});
  order.orderId = maxId + 1;  // Add orderId

  order.status = 'In preparation';  // Add status
  order.creationDatetime = new Date().toISOString();  // Add creationDatetime
  order.updateDatetime = new Date().toISOString();  // Add updateDatetime

  if (!check_date_format(req.body.maxDeliveryDate)) {
    return res.status(400).send({error: 'Order not posted. Invalid date format (format: YYYY-MM-DD)'});
  }
  order.maxDeliveryDate = new Date(req.body.maxDeliveryDate);  // Add maxDeliveryDate

  // Errors checking
  try {
    await order.save();
    res.status(201).send({ message: `New order id=${order.orderId} created successfully`});
  } catch (error) {
      if (error.errors){
        return res.status(400).send({ error: error.errors });
      }
      else{
        return res.status(500).send({ error: "Database error" });
      }
    
  }
  // Cuando se hace un pedido se debe de modificar el stock de los libros (comunicacion Libros --> Pedidos)
  // Completar con llamada a microservicio de libros
  // +++++++++++++++++++++++++++++++++++++++++++++++++++++
});


// ---------------- PUT -----------------------

// PUT /orders/{orderId} :: Update an order
/**
* @openapi
* /api/v1/orders/{orderId}:
*   put:
*     tags:
*        - Orders
*     description: Update an existing order.
*     parameters:
*       - in: path
*         name: orderId
*         required: true
*         description: Numeric ID of the order to update.
*         schema:
*           type: integer
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               userId:
*                 type: integer
*               sellerId:
*                 type: integer
*               books:
*                 type: array
*                 items:
*                   type: object
*                   properties:
*                     bookId:
*                       type: integer
*                     units:
*                       type: integer
*                     price:
*                       type: integer
*                   required:
*                     - bookId
*                     - units
*               status:
*                 type: string
*               deliveryAddress:
*                type: string
*               maxDeliveryDate:
*                 type: string
*                 format: date format: YYYY-MM-DD
*               payment:
*                 type: number
*     responses:
*       200:
*         description: Order updated successfully.
*       400:
*         description: Order not updated. Invalid status format. / Missing required fields in books.
*       404:
*         description: Order not found.
*       500:
*         description: Database error.
*/
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

// DELETE /orders/{orderId} :: Delete an order
/**
* @openapi
* /api/v1/orders/{orderId}:
*   delete:
*     tags:
*      - Orders
*     description: Delete a specific order by its id.
*     parameters:
*       - in: path
*         name: orderId
*         required: true
*         description: Numeric ID of the order to delete.
*         schema:
*           type: integer
*     responses:
*       200:
*         description: Order deleted successfully.
*       404:
*         description: Order not found.
*       500:
*         description: Database error.
*/
router.delete('/:orderId', async function(req, res, next) {
  try {
    const result = await Order.deleteOne({ "orderId": req.params.orderId });

    if (result.deletedCount === 0) {
      return res.status(404).send({ error: 'Order not found' });
    }

    res.status(200).send({ message: `Order id=${req.params.orderId} deleted successfully` });
  } catch (error) {
    return res.status(500).send({ error: 'Database error.' });
  }
});

// ---------------- AUXILIARY FUNCTIONS -----------------------

function check_date_format(date) {
  let date_regex = /^\d{4}-\d{2}-\d{2}$/;
  return date_regex.test(date);
}

module.exports = router;