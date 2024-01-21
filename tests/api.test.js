const app = require('../app');
const request = require('supertest');
const Order = require('../models/order');

describe("Orders API", () => {

  describe("GET /", () => {

    it("Should return an HTML document", () =>{

      return request(app)
        .get('/')
        .then(response => {
          expect(response.status).toBe(200);
          expect(response.type).toEqual(expect.stringContaining("html"));
          expect(response.text).toEqual(expect.stringContaining("h1"));
      });

    });

  });

  describe("GET /", () => {
    const date = new Date().toISOString();
    const orders = [
        new Order({ "userId": 1, "sellerId": 2, "status": "In preparation", "creationDatetime": date, "updateDatetime": date, "shippingCost": 5, "books": [{"bookId": 12345678, "units": 2, "price": 5}], "orderId": 1 , "deliveryAddress": "Calle Falsa 123", "maxDeliveryDate": date}),
        new Order({ "userId": 1, "sellerId": 3, "status": "Shipped", "creationDatetime": date, "updateDatetime": date, "shippingCost": 7, "books": [{"bookId": 87654321, "units": 1, "price": 10}], "orderId": 2 , "deliveryAddress": "Calle Falsa 321", "maxDeliveryDate": date}),
        new Order({ "userId": 2, "sellerId": 2, "status": "Delivered", "creationDatetime": date, "updateDatetime": date, "shippingCost": 3, "books": [{"bookId": 12345679, "units": 3, "price": 7}], "orderId": 3, "deliveryAddress": "Calle Falsa 333", "maxDeliveryDate": date })
    ];

    
    jest.spyOn(Order, "find").mockImplementation(async () => Promise.resolve(orders));
    

    it("Should return all orders if no query parameters are specified", async () => {
        return request(app).get("/api/v1/orders").then((response) => {
            expect(response.statusCode).toBe(200);
            expect(response.body).toBeArrayOfSize(3);
        });
    });

    it("Should return orders filtered by userId", async () => {
      const userId = 1;
      return request(app).get(`/api/v1/orders?userId=${userId}`).then((response) => {
          expect(response.statusCode).toBe(200);
          expect(response.body).toBeArrayOfSize(2);
        });
    });

    // it("Should return orders sorted by creation date", async () => {
    //     return request(app).get("/api/v1/orders?sort=creationDate").then((response) => {
    //         expect(response.statusCode).toBe(200);
    //         const sortedOrders = [...orders].sort((a, b) => (a.creationDatetime) - (b.creationDatetime));
    //         expect(response.body).toEqual(sortedOrders.map(order => order.cleanup()));
    //     });
    //   });


    it("Should return 404 if no orders match the query", async () => {
        return request(app).get("/api/v1/orders?userId=-1").then((response) => {
            expect(response.statusCode).toBe(404);
        });
    });
  });

  describe("PUT /:orderId", () => {
      let dbSave;
      let dbFind;

      beforeEach(() => {
        const date = new Date().toISOString();
        const orders = [
            new Order({ "userId": 1, "sellerId": 2, "status": "In preparation", "creationDatetime": date, "updateDatetime": date, "shippingCost": 5, "books": [{"bookId": 12345678, "units": 2, "price": 5}], "orderId": 1 , "deliveryAddress": "Calle Falsa 123", "maxDeliveryDate": date}),
            new Order({ "userId": 1, "sellerId": 3, "status": "Shipped", "creationDatetime": date, "updateDatetime": date, "shippingCost": 7, "books": [{"bookId": 87654321, "units": 1, "price": 10}], "orderId": 2 , "deliveryAddress": "Calle Falsa 321", "maxDeliveryDate": date}),
            new Order({ "userId": 2, "sellerId": 2, "status": "Delivered", "creationDatetime": date, "updateDatetime": date, "shippingCost": 3, "books": [{"bookId": 12345679, "units": 3, "price": 7}], "orderId": 3, "deliveryAddress": "Calle Falsa 333", "maxDeliveryDate": date })
        ];

          dbFind = jest.spyOn(Order, "find");
          dbFind.mockImplementation(async () => Promise.resolve(orders));

          dbSave = jest.spyOn(Order.prototype, "save");
          dbSave.mockImplementation(async () => Promise.resolve(true));
      });

      it("Should update an existing order", async () => {
          const orderId = 1;
          const updatedData = { "status": "Delivered" };

          return request(app).put(`/api/v1/orders/${orderId}`).send(updatedData).then((response) => {
              expect(response.statusCode).toBe(200);
              expect(dbSave).toBeCalled();
          });
      });

      it("Should return 404 if order is not found", async () => {
          const orderId = -1;
          const updatedData = { "status": "Delivered" };

          return request(app).put(`/api/v1/orders/${orderId}`).send(updatedData).then((response) => {
              expect(response.statusCode).toBe(404);
              expect(dbSave).toBeCalled();
          });
      });


      it("Should return 500 if there is a database error on save", async () => {
          dbSave.mockImplementation(async () => Promise.reject("Database error on save"));

          const orderId = 1;
          const updatedData = { "status": "Delivered" };

          return request(app).put(`/api/v1/orders/${orderId}`).send(updatedData).then((response) => {
              expect(response.statusCode).toBe(500);
              expect(dbSave).toBeCalled();
          });
      });
      
  });

  describe("PUT /orders/books/:bookId/cancelledRemove", () => {
    let orders;
    let dbFind;
    let dbSave;

    beforeEach(() => {
        const date = new Date().toISOString();
        orders = [
            new Order({ "userId": 1, "sellerId": 2, "status": "In preparation", "creationDatetime": date, "updateDatetime": date, "shippingCost": 5, "books": [{"bookId": 12345678, "units": 2, "price": 5}], "orderId": 1 , "deliveryAddress": "Calle Falsa 123", "maxDeliveryDate": date}),
            new Order({ "userId": 1, "sellerId": 3, "status": "Shipped", "creationDatetime": date, "updateDatetime": date, "shippingCost": 7, "books": [{"bookId": 87654321, "units": 1, "price": 10}], "orderId": 2 , "deliveryAddress": "Calle Falsa 321", "maxDeliveryDate": date}),
            new Order({ "userId": 2, "sellerId": 2, "status": "Delivered", "creationDatetime": date, "updateDatetime": date, "shippingCost": 3, "books": [{"bookId": 12345679, "units": 3, "price": 7}], "orderId": 3, "deliveryAddress": "Calle Falsa 333", "maxDeliveryDate": date })
        ];

        dbFind = jest.spyOn(Order, "find");
        dbSave = jest.spyOn(Order.prototype, "save").mockImplementation(async () => Promise.resolve(true));
    });

    it("Should cancel orders or remove book based on conditions", async () => {
        const bookId = 12345678;
        dbFind.mockImplementation(async () => Promise.resolve(orders.filter(order => order.status === 'In preparation' && order.books.some(book => book.bookId === bookId))));
        
        return request(app).put(`/api/v1/orders/books/${bookId}/cancelledRemove`).then((response) => {
            expect(response.statusCode).toBe(200);
            expect(dbFind).toBeCalled();
            expect(dbSave).toBeCalled();
        });
    });

    it("Should return 404 if no orders to modify", async () => {
        const bookId = 2;

        dbFind.mockImplementation(async () => Promise.resolve(orders.filter(order => order.status === 'In preparation' && order.books.some(book => book.bookId === bookId))));

        return request(app).put(`/api/v1/orders/books/${bookId}/cancelledRemove`).then((response) => {
            expect(response.statusCode).toBe(404);
            expect(dbFind).toBeCalled();
            expect(dbSave).toBeCalled();
        });
    });

    it("Should return 500 if there is a database error", async () => {
        const bookId = 1;
        dbFind.mockImplementation(async () => Promise.reject("Database error"));

        return request(app).put(`/api/v1/orders/books/${bookId}/cancelledRemove`).then((response) => {
            expect(response.statusCode).toBe(500);
            expect(dbFind).toBeCalled();
            expect(dbSave).toBeCalled();
        });
    });
  });



  describe("PUT orders/users/:userId/cancelled", () => {
    let dbUpdate;
  
    beforeEach(() => {
      dbUpdate = jest.spyOn(Order, 'updateMany');
    });
  
    it("Should cancel all 'In preparation' orders for a user", async () => {
      const userId = 1;
      const mockUpdateResult = { matchedCount: 2, modifiedCount: 2 };
      dbUpdate.mockResolvedValue(mockUpdateResult);
  
      return request(app).put(`/api/v1/orders/users/${userId}/cancelled`).then((response) => {
        expect(response.statusCode).toBe(200);
        expect(response.text).toContain(`Cancelled ${mockUpdateResult.modifiedCount} orders successfully for user id=${userId}.`);
        expect(dbUpdate).toHaveBeenCalledWith(
          { userId: userId, status: 'In preparation' },
          { $set: { status: 'Cancelled', updateDatetime: expect.any(String) } }
        );
      });
    });
  
    it("Should send 404 if no 'In preparation' orders for the user", async () => {
      const userId = 1;
      const mockUpdateResult = { matchedCount: 0, modifiedCount: 0 };
      dbUpdate.mockResolvedValue(mockUpdateResult);
  
      return request(app).put(`/api/v1/orders/users/${userId}/cancelled`).then((response) => {
        expect(response.statusCode).toBe(404);
        expect(response.text).toContain(`No orders in progress for user id=${userId}`);
      });
    });
  
    it("Should send 500 if there is a database error", async () => {
      const userId = 1;
      dbUpdate.mockRejectedValue(new Error("Database error"));
  
      return request(app).put(`/api/v1/orders/users/${userId}/cancelled`).then((response) => {
        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual({ error: "Database error" });
      });
    });
  });


  describe("PUT orders/sellers/:sellerId/cancelled", () => {
    let dbUpdate;
  
    beforeEach(() => {
      dbUpdate = jest.spyOn(Order, 'updateMany');
    });
  
    it("Should cancel all 'In preparation' orders for a seller", async () => {
      const sellerId = 1;
      const mockUpdateResult = { matchedCount: 2, modifiedCount: 2 };
      dbUpdate.mockResolvedValue(mockUpdateResult);
  
      return request(app).put(`/api/v1/orders/sellers/${sellerId}/cancelled`).then((response) => {
        expect(response.statusCode).toBe(200);
        expect(response.text).toContain(`Cancelled ${mockUpdateResult.modifiedCount} orders successfully for seller id=${sellerId}.`);
        expect(dbUpdate).toHaveBeenCalledWith(
          { sellerId: sellerId, status: 'In preparation' },
          { $set: { status: 'Cancelled', updateDatetime: expect.any(String) } }
        );
      });
    });
  
    it("Should send 404 if no 'In preparation' orders for the seller", async () => {
      const sellerId = 1;
      const mockUpdateResult = { matchedCount: 0, modifiedCount: 0 };
      dbUpdate.mockResolvedValue(mockUpdateResult);
  
      return request(app).put(`/api/v1/orders/sellers/${sellerId}/cancelled`).then((response) => {
        expect(response.statusCode).toBe(404);
        expect(response.text).toContain(`No orders in progress for seller id=${sellerId}`);
      });
    });
  
    it("Should send 500 if there is a database error", async () => {
      const sellerId = 1;
      dbUpdate.mockRejectedValue(new Error("Database error"));
  
      return request(app).put(`/api/v1/orders/sellers/${sellerId}/cancelled`).then((response) => {
        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual({ error: "Database error" });
      });
    });
  });

  describe("PUT orders/user/:userId/deliveryAddress", () => {
    let dbUpdate;
  
    beforeEach(() => {
      dbUpdate = jest.spyOn(Order, 'updateMany');
    });
  
    it("Should update delivery address for 'In preparation' orders of a user", async () => {
      const userId = 1;
      const newAddress = "New Address 123";
      const mockUpdateResult = { matchedCount: 2, modifiedCount: 2 };
      dbUpdate.mockResolvedValue(mockUpdateResult);
  
      return request(app).put(`/api/v1/orders/user/${userId}/deliveryAddress`).send({ deliveryAddress: newAddress }).then((response) => {
        expect(response.statusCode).toBe(200);
        expect(response.text).toContain(`Delivery address updated on ${mockUpdateResult.modifiedCount} orders for user id=${userId}.`);
        expect(dbUpdate).toHaveBeenCalledWith(
          { userId: userId, status: 'In preparation' },
          { $set: { deliveryAddress: newAddress, updateDatetime: expect.any(String) } }
        );
      });
    });
  
  
    it("Should return 404 if no 'In preparation' orders for the user", async () => {
      const userId = 1;
      const newAddress = "New Address 123";
      const mockUpdateResult = { matchedCount: 0, modifiedCount: 0 };
      dbUpdate.mockResolvedValue(mockUpdateResult);
  
      return request(app).put(`/api/v1/orders/user/${userId}/deliveryAddress`).send({ deliveryAddress: newAddress }).then((response) => {
        expect(response.statusCode).toBe(404);
        expect(response.text).toContain('No orders in progress for this user.');
      });
    });
  
    it("Should return 500 if there is a database error", async () => {
      const userId = 1;
      const newAddress = "New Address 123";
      dbUpdate.mockRejectedValue(new Error("Database error"));
  
      return request(app).put(`/api/v1/orders/user/${userId}/deliveryAddress`).send({ deliveryAddress: newAddress }).then((response) => {
        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual({ error: "Database error" });
      });
    });
  });

  describe("DELETE /:orderId", () => {
    let dbFind;
    let dbDeleteOne;
  
    beforeEach(() => {
      dbFind = jest.spyOn(Order, 'find');
      dbDeleteOne = jest.spyOn(Order, 'deleteOne');
    });
  
    it("Should delete the order if it is 'Cancelled' or 'Delivered'", async () => {
      const orderId = 1;
      const mockOrder = new Order({ "userId": 1, "sellerId": 2, "status": "Delivered", "creationDatetime": new Date().toISOString(), "updateDatetime": new Date().toISOString(), "shippingCost": 5, "books": [{"bookId": 12345678, "units": 2, "price": 5}], "orderId": 1 , "deliveryAddress": "Calle Falsa 123", "maxDeliveryDate": new Date().toISOString() });
      dbFind.mockResolvedValue(mockOrder);
      dbDeleteOne.mockResolvedValue({ deletedCount: 1 });
  
      return request(app).delete(`/api/v1/orders/${orderId}`).then((response) => {
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ message: `Order id=${orderId} deleted successfully` });
        expect(dbDeleteOne).toHaveBeenCalledWith({ "orderId": orderId });
      });
    });
  
    it("Should not delete the order if it is not 'Cancelled' or 'Delivered'", async () => {
      const orderId = 1;
      const mockOrder = new Order({ "userId": 1, "sellerId": 2, "status": "In Prepration", "creationDatetime": new Date().toISOString(), "updateDatetime": new Date().toISOString(), "shippingCost": 5, "books": [{"bookId": 12345678, "units": 2, "price": 5}], "orderId": 1 , "deliveryAddress": "Calle Falsa 123", "maxDeliveryDate": new Date().toISOString() });
      dbFind.mockResolvedValue(mockOrder);
  
      return request(app).delete(`/api/v1/orders/${orderId}`).then((response) => {
        expect(response.statusCode).toBe(403);
        expect(response.body).toEqual({ error: 'Order cannot be deleted. Only orders that are Cancelled or Delivered can be deleted.' });
      });
    });
  
    it("Should return 404 if the order is not found", async () => {
      const orderId = 1;
      dbFind.mockResolvedValue();
  
      return request(app).delete(`/api/v1/orders/${orderId}`).then((response) => {
        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual({ error: 'Order not found' });
      });
    });
  
    it("Should return 500 if there is a database error", async () => {
      const orderId = 1;
      dbFind.mockRejectedValue(new Error("Database error"));
  
      return request(app).delete(`/api/v1/orders/${orderId}`).then((response) => {
        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual({ error: 'Database error.' });
      });
    });
  });


});

