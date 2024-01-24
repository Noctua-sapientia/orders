var express = require('express');
var router = express.Router();
var Order = require('../models/order');
var debug = require('debug')('orders-2:server');
const verificarToken = require('./verificarToken');
const cors = require('cors');
const axios = require('axios');

const formData = require('form-data');
const Mailgun = require('mailgun.js');



// Funciones auxiliares envio de email
MAILGUN_API_KEY = "TOKEN_DE_MAIL_GUN";
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
	username: 'api',
	key: MAILGUN_API_KEY,
});


router.use(cors());


// --------------- Generate invoice -------------------

// router.get('/generateInvoice', async function(req, res, next) {

//   // Check if required fields are provided
//   if (!(req.body.orderId && req.body.user && req.body.seller && req.body.deliveryAddress 
//     && req.body.creationDatetime
//     && req.body.shippingCost && req.body.subtotal && req.body.total)) {
//     console.log("Error fields");
//     return res.status(400).send({ error: "Could not generate invoice. Missing fields." });
//   }

//   const dropboxFilePath = `/invoice${req.body.orderId}.pdf`;
//   const html = `
//     <html>
//         <head>
//             <title>Factura</title>
//         </head>
//         <body>
//             <h1>Factura de compra</h1>
//             <p>Identificador del pedido: ${req.body.orderId}</p>
//             <p>Vendedor: ${req.body.seller}</p>
//             <p>Comprador: ${req.body.user}</p>
//             <p>Fecha de compra: ${req.body.creationDatetime}</p>
//             <p>Direccion de entrega: ${req.body.deliveryAddress}</p>
//             <p>Coste de envio: ${req.body.shippingCost} €</p>
//             <p>Subtotal: ${req.body.subtotal} €</p>
//             <p>Total: ${req.body.total} €</p>
//         </body>
//     </html>`; // Asegúrate de cerrar la etiqueta </html>

//   try {
//     // Crear PDF con Puppeteer
//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();
//     await page.setContent(html);
//     const pdfBuffer = await page.pdf(); // Genera el PDF 
//     await browser.close();

//     // Subir el PDF a Dropbox
//     const DROPBOX_KEY = '7i3bups8si6bmzs';
//     const DROPBOX_SECRET = 'mgvc0nzwey92gwl';
//     const refreshToken = 'IkpIndctV_4AAAAAAAAAAYDpLYO4t940iPXSU77Y6vK80xcNzdEY1r24xIFY5esg';

//     const dbx = new Dropbox({ 
//       clientId: DROPBOX_KEY,
//       clientSecret: DROPBOX_SECRET,
//       refreshToken: refreshToken
//     });

//     await dbx.filesUpload({
//         path: dropboxFilePath,
//         contents: pdfBuffer,
//         mode: { '.tag': 'overwrite' }
//     });        
//     console.log('PDF uploaded to Dropbox successfully!');

//     let sharedLinkResponse = await dbx.sharingListSharedLinks({ path: dropboxFilePath });
//     let sharedLinks = sharedLinkResponse.result.links;

//     if (!sharedLinks || sharedLinks.length === 0) {
//         sharedLinkResponse = await dbx.sharingCreateSharedLinkWithSettings({ path: dropboxFilePath });
//         sharedLinks = [sharedLinkResponse.result];
//     }

//     if (sharedLinks && sharedLinks.length > 0) {
//       console.log('Shared Link:', sharedLinks[0].url);
//       return res.status(200).send({ url: sharedLinks[0].url });
//     } else {
//         console.log('No se pudo obtener ni crear un enlace compartido.');
//         return res.status(500).send({ error: 'No se pudo obtener ni crear un enlace compartido.' });
//     }
//   } catch (error) {
//       console.error('Error en el proceso con Dropbox:', error);
//       return res.status(500).send({ error: 'Error en el proceso con Dropbox' });
//   }
// });


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
router.get('/', verificarToken, async function(req, res, next) {

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
    const bookIdQuery = parseInt(req.query.bookId);
    selectedOrders = selectedOrders.filter(order => 
      order.books.some(book => parseInt(book.bookId) === bookIdQuery)
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

  if (req.query.sort == 'shippingCost') {
    selectedOrders = selectedOrders.sort((a, b) => (a.shippingCost > b.shippingCost) ? 1 : -1);
  }

  // selected orders sorted by total price

  selectedOrders = selectedOrders.map(order => {
    let totalBooksPrice = order.books.reduce((sum, book) => sum + (book.price * book.units), 0);
    order.totalPrice = totalBooksPrice + order.shippingCost;
    return order;
  });

  if (req.query.sort == 'price') {
    selectedOrders.sort((a, b) => a.totalPrice - b.totalPrice);
  }

  // selected orders in a payment range minPayment-maxPayment
  if (req.query.minPayment && req.query.maxPayment) {
    selectedOrders = selectedOrders.filter(order => 
      order.payment >= req.query.minPayment && order.payment <= req.query.maxPayment
    );
  }

  // selected orders in a total price range minPrice-maxPrice
  if (req.query.minPrice && req.query.maxPrice) {
    selectedOrders = selectedOrders.filter(order => 
      order.totalPrice >= req.query.minPrice && order.totalPrice <= req.query.maxPrice
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


// GET /orders/price/{orderId} :: Request total price of an order by its ID
/**
 * @openapi
 * /api/v1/orders/price/{orderId}:
 *   get:
 *     tags:
 *       - Orders
 *     description: Request the total price of an order by its ID.
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         description: Numeric ID of the order for which the total price is requested.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Total price of the order returned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orderId:
 *                   type: integer
 *                 totalPrice:
 *                   type: number
 *                   format: float
 *                   description: Total price of the order including the price of books and shipping cost.
 *       404:
 *         description: Order not found.
 *       500:
 *         description: Database error.
 */
router.get('/price/:orderId', verificarToken, async function(req, res, next) {
  const orderId = parseInt(req.params.orderId);
  let orders;

  try {
    orders = await Order.find();
  }
  catch (error) {
    debug("Database error", error);
    return res.status(500).send({ error: "Database error" });
  }

  let order = orders.find(order => order.orderId === orderId);

  if (order) {
    let totalBooksPrice = order.books.reduce((sum, book) => sum + (book.price * book.units), 0);
    let totalPrice = totalBooksPrice + order.shippingCost;
    
    res.status(200).send({ orderId: orderId, totalPrice: totalPrice });
  } else {
    res.status(404).send({ error: 'Order not found.' });
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
router.get('/:orderId', verificarToken, async function(req, res, next) {

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
*                     - price
*               deliveryAddress:
*                 type: string
*               maxDeliveryDate:
*                 type: string
*                 format: YYYY-MM-DD
*     responses:
*       201:
*         description: New order created successfully.
*       400:
*         description: Missing required fields. / Missing required fields in books. / Invalid date format.
*       500:
*         description: Database error.
*/
router.post('/', verificarToken, async function(req, res, next) {
  // Check if required fields are provided
  if (!(req.body.userId && req.body.sellerId && req.body.books && req.body.deliveryAddress && req.body.shippingCost)) {
    console.log("Error fields");
    return res.status(400).send({ error: "Order not posted. Missing required fields" });
  }


  // Check if all the books fields are provided
  if (!(req.body.books.every(book => book.bookId && book.units && book.price))) {
    console.log("Error books");
    return res.status(400).send({ error: "Order not posted. Missing required fields in books" });
  }

  let orders = await Order.find();

  let order = new Order();              // Create object to push
  order.userId = req.body.userId;       // Add userId, sellerId, books, deliveryAddress, payment  
  order.sellerId = req.body.sellerId;
  order.books = req.body.books;
  order.deliveryAddress = req.body.deliveryAddress;
  order.shippingCost = req.body.shippingCost;

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
    console.log("Error date");
    return res.status(400).send({error: 'Order not posted. Invalid date format (format: YYYY-MM-DD)'});
  }
  order.maxDeliveryDate = new Date(req.body.maxDeliveryDate);  // Add maxDeliveryDate

  // Errors checking
  try {
    await order.save();
    res.status(201).send({ message: `New order id=${order.orderId} created successfully`});
    if (process.env.NODE_ENV != 'test') {

      const accessToken = req.headers.authorization;
      
      const headers = {
        Authorization: accessToken
      };
      const config = {
        headers: headers,
      };

      // Update stock of books
      for (const book of req.body.books) {
        let response = await axios.put(`http://localhost:4002/api/v1/books/${book.bookId}/${order.sellerId}/stock`, 
                        { units: -book.units }, 
                        config);
      }

      // Send email
      let totalBooksPrice = order.books.reduce((sum, book) => sum + (book.price * book.units), 0);
      let totalPrice = totalBooksPrice + order.shippingCost;
      let response = await axios.get(`http://localhost:4001/api/v1/customers/${order.userId}`, config);
      let customer = response.data;

      mg.messages.create("sandbox9644c07ab97248e4b758caaac87f97eb.mailgun.org", {
      from: "Mailgun Sandbox <postmaster@sandbox9644c07ab97248e4b758caaac87f97eb.mailgun.org>",
      to: [customer.email], // Cambiar a peticion de back
      subject: "Inicio de pedido",
      text: `Se ha creado con exito su pedido con un valor de ${totalPrice}€ el dia ${order.creationDatetime}`,

    }).then(msg => console.log(msg)).catch(err => console.log(err)); // logs any error`;
    }
  } catch (error) {
    if (!res.headersSent) {
      if (error.errors) {
        res.status(400).send({ error: error.errors });
      } else {
        res.status(500).send({ error: "Database error" });
      }
    }
  }
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
*                     - price
*               status:
*                 type: string
*               deliveryAddress:
*                type: string
*               maxDeliveryDate:
*                 type: string
*                 format: YYYY-MM-DD
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
router.put('/:orderId', verificarToken, async function(req, res, next) {
  
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

      if (process.env.NODE_ENV != 'test') {

        const accessToken = req.headers.authorization;
      
        const headers = {
          Authorization: accessToken
        };
        const config = {
          headers: headers,
        };

        // Lógica adicional para comunicarse con otros microservicios
        if (temporalOrder.status === 'Cancelled') {
          // Iterar sobre cada libro en el pedido y actualizar el stock
          for (const book of order.books) {
            await axios.put(`http://localhost:4002/api/v1/books/${book.bookId}/${order.sellerId}/stock`, {units: book.units}, config);
          }
        } else if (temporalOrder.status === 'Delivered') {
          // Llamar al microservicio de usuarios para actualizar el contador de pedidos
            for (const book of order.books) {
              await axios.put(`http://localhost:4001/api/v1/sellers/${order.sellerId}/increaseOrders`, { units: book.units }, config);
          }
            
        }
      }
    }
    catch (error) {
      if (error.errors){
        return res.status(400).send({ error: error.errors });
      }
      else{
        return res.status(500).send({ error: "An error occurred while updating the order" });
      }
    }

  } else {
    res.status(404).send({ error: "Order not found" });
  }
});


/**
 * @openapi
 * /api/v1/orders/books/{bookId}/cancelledRemove:
 *   put:
 *     tags:
 *       - Orders
 *     description: Remove a book from all orders or cancel the order if it only contains that book.
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         description: Numeric ID of the book to be removed from orders.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Book removed from orders or orders cancelled successfully.
 *       404:
 *         description: No orders in progress for the specified book.
 *       500:
 *         description: Database error.
 */
router.put('/books/:bookId/sellers/:sellerId/cancelledRemove', verificarToken, async function(req, res, next) {
  const bookId = parseInt(req.params.bookId);
  const sellerId = parseInt(req.params.sellerId);
  let suppressions = 0;
  

  try {
    // Encuentra órdenes con el libro y estado 'In preparation'
    let orders = await Order.find({ "books.bookId": bookId, sellerId: sellerId, status: 'In preparation' });
    for (let order of orders) {
      if (order.books.length === 1 && order.books[0].bookId === bookId) {
        // Si el pedido solo contiene ese libro, cancela el pedido
        order.status = 'Cancelled';
      } else {
        // Si no, elimina el libro del pedido
        order.books = order.books.filter(book => book.bookId !== bookId);
      }
      order.updateDatetime = new Date().toISOString();
      await order.save();
      suppressions++;
    }

    if (suppressions > 0) {
      res.status(200).send(`Suppressed book id=${bookId} from ${suppressions} orders successfully.`);
    } else {
      res.status(404).send(`No orders in progress for book id=${bookId}`);
    }
  } catch (error) {
    debug("Database error", error);
    return res.status(500).send({ error: "Database error" });
  }
});


/**
 * @openapi
 * /api/v1/orders/sellers/{sellerId}/cancelled:
 *   put:
 *     tags:
 *       - Orders
 *     description: Cancel all orders in preparation for a specific seller.
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         description: Numeric ID of the seller whose orders need to be cancelled.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: All orders in preparation for the specified seller cancelled successfully.
 *       404:
 *         description: No orders in progress for the specified seller.
 *       500:
 *         description: Database error.
 */
router.put('/sellers/:sellerId/cancelled', verificarToken, async function(req, res, next) {
  const sellerId = parseInt(req.params.sellerId);

  try {
    // Actualizar el estado de las órdenes a 'Cancelled'
    const updateResult = await Order.updateMany(
      { sellerId: sellerId, status: 'In preparation' },
      { $set: { status: 'Cancelled', updateDatetime: new Date().toISOString() } }
    );

    if (updateResult.matchedCount > 0) {
      res.status(200).send(`Cancelled ${updateResult.modifiedCount} orders successfully for seller id=${sellerId}.`);
    } else {
      res.status(404).send(`No orders in progress for seller id=${sellerId}`);
    }
  } catch (error) {
    debug("Database error", error);
    return res.status(500).send({ error: "Database error" });
  }
});


/**
 * @openapi
 * /api/v1/orders/users/{userId}/cancelled:
 *   put:
 *     tags:
 *       - Orders
 *     description: Cancel all orders in preparation for a specific user.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: Numeric ID of the user whose orders need to be cancelled.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: All orders in preparation for the specified user cancelled successfully.
 *       404:
 *         description: No orders in progress for the specified user.
 *       500:
 *         description: Database error.
 */
router.put('/users/:userId/cancelled', verificarToken, async function(req, res, next) {
  const userId = parseInt(req.params.userId);

  try {
    // Actualizar el estado de las órdenes a 'Cancelled'
    const updateResult = await Order.updateMany(
      { userId: userId, status: 'In preparation' },
      { $set: { status: 'Cancelled', updateDatetime: new Date().toISOString() } }
    );

    if (updateResult.matchedCount > 0) {
      res.status(200).send(`Cancelled ${updateResult.modifiedCount} orders successfully for user id=${userId}.`);


      if (process.env.NODE_ENV != 'test') {
        const accessToken = req.headers.authorization;
      
        const headers = {
          Authorization: accessToken
        };
        const config = {
          headers: headers,
        };

        const orders = await Order.find({ userId: userId, status: 'In preparation' });

        // Iterar sobre cada pedido y sobre cada libro en el pedido
        for (const order of orders) {
          for (const book of order.books) {
            await axios.put(`http://localhost:4002/api/v1/books/${book.bookId}/${order.sellerId}/stock`, {
              units: book.units
            }, config);
          }
        }
      }
    } else {
      res.status(404).send(`No orders in progress for user id=${userId}`);
    }
  } catch (error) {
    debug("Database error", error);
    return res.status(500).send({ error: "Database error" });
  }
});



/**
 * @openapi
 * /api/v1/orders/user/{userid}/deliveryAddress:
 *   put:
 *     tags:
 *       - Orders
 *     description: Update the delivery address for all orders in preparation for a specific user.
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: Numeric ID of the user whose delivery address needs to be updated.
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deliveryAddress:
 *                 type: string
 *                 description: New delivery address to update.
 *     responses:
 *       200:
 *         description: Delivery address updated on all orders in preparation for the specified user.
 *       400:
 *         description: Orders not updated. No new address provided.
 *       404:
 *         description: No orders in progress for the specified user.
 *       500:
 *         description: Database error.
 */
router.put('/user/:userId/deliveryAddress', verificarToken, async function(req, res, next) {
  const userId = parseInt(req.params.userId);
  const newAddress = req.body.deliveryAddress;

  if (!newAddress) {
    return res.status(400).send('Orders not updated. No new address provided');
  }

  try {
    // Actualizar la dirección de entrega de las órdenes
    const updateResult = await Order.updateMany(
      { userId: userId, status: 'In preparation' },
      { $set: { deliveryAddress: newAddress, updateDatetime: new Date().toISOString() } }
    );

    if (updateResult.matchedCount > 0) {
      res.status(200).send(`Delivery address updated on ${updateResult.modifiedCount} orders for user id=${userId}.`);
    } else {
      res.status(404).send('No orders in progress for this user.');
    }
  } catch (error) {
    debug("Database error", error);
    return res.status(500).send({ error: "Database error" });
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
router.delete('/:orderId', verificarToken, async function(req, res, next) {
  try {

    const orderId = parseInt(req.params.orderId);

    const order = await Order.findOne({ "orderId": orderId });

    if (!order) {
      return res.status(404).send({ error: 'Order not found' });
    }

    if (order.status === 'Cancelled' || order.status === 'Delivered') {
      const result = await Order.deleteOne({ "orderId": orderId });
      res.status(200).send({ message: `Order id=${orderId} deleted successfully` });
    } else {
      // Si el estado no es ni Cancelled ni Delivered, no permitir la eliminación
      res.status(403).send({ error: 'Order cannot be deleted. Only orders that are Cancelled or Delivered can be deleted.' });
    }
  }
  catch (error) {
    return res.status(500).send({ error: 'Database error.' });
  }
});


// ---------------- AUXILIARY FUNCTIONS -----------------------

function check_date_format(date) {
  let date_regex = /^\d{4}-\d{2}-\d{2}$/;
  return date_regex.test(date);
}

module.exports = router;