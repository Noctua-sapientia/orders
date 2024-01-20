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
      let orders;
      let dbSave;
      let dbFind;

      beforeEach(() => {
          orders = [
              new Order({ "userId": 1, "sellerId": 2, "books": [{ "bookId": 12345678, "units": 2, "price": 5 }], "status": "In preparation", "deliveryAddress": "123 Main St", "maxDeliveryDate": "2024-04-25T00:00:00.000Z", "orderId": 1 }),
              new Order({ "userId": 2, "sellerId": 3, "books": [{ "bookId": 87654321, "units": 1, "price": 10 }], "status": "Shipped", "deliveryAddress": "456 Elm St", "maxDeliveryDate": "2024-05-25T00:00:00.000Z", "orderId": 2 })
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
        orders = [
            new Order({ "books": [{ "bookId": 12345678, "units": 2, "price": 5 }], "status": "In preparation", "orderId": 1 }),
            new Order({ "books": [{ "bookId": 12345678, "units": 1, "price": 10 }, { "bookId": 87654321, "units": 1, "price": 15 }], "status": "In preparation", "orderId": 2 }),
            new Order({ "books": [{ "bookId": 87654321, "units": 1, "price": 15 }], "status": "Delivered", "orderId": 3 })
        ];

        dbFind = jest.spyOn(Order, "find");
        dbSave = jest.spyOn(Order.prototype, "save").mockImplementation(async () => Promise.resolve(true));
    });

    it("Should cancel orders or remove book based on conditions", async () => {
        const bookId = 12345678;

        dbFind.mockImplementation(async () => Promise.resolve(orders.filter(order => order.status === 'In preparation' && order.books.some(book => book.bookId === bookId))));
        
        return request(app).put(`/api/v1/orders/books/${bookId}/cancelledRemove`).then((response) => {
            expect(response.statusCode).toBe(200);
            expect(dbFind).toBeCalledWith({ "books.bookId": bookId, status: 'In preparation' });
            expect(dbSave).toBeCalled();
        });
    });

    it("Should return 404 if no orders to modify", async () => {
        const bookId = -1;

        dbFind.mockImplementation(async () => Promise.resolve(orders.filter(order => order.status === 'In preparation' && order.books.some(book => book.bookId === bookId))));
        

        return request(app).put(`/api/v1/books/${bookId}/cancelledRemove`).then((response) => {
            expect(response.statusCode).toBe(404);
            expect(dbSave).toBeCalled();
        });
    });
  });


  describe("PUT /users/:userId/cancelled", () => {
    let dbUpdate;

    beforeEach(() => {
        dbUpdate = jest.spyOn(Order, "updateMany");
    });

    it("Should cancel orders in progress for a user", async () => {
        const userId = 1;
        const updateResult = {
            matchedCount: 2,
            modifiedCount: 2
        };
        dbUpdate.mockImplementation(async () => Promise.resolve(updateResult));

        return request(app).put(`/api/v1/orders/users/${userId}/cancelled`).then((response) => {
            expect(response.statusCode).toBe(200);
            expect(dbUpdate).toBeCalledWith({ userId: userId, status: 'In preparation' }, { $set: { status: 'Cancelled', updateDatetime: expect.any(String) } });
        });
    });

    it("Should return 404 if no orders in progress for the user", async () => {
        const userId = 2;
        const updateResult = {
            matchedCount: 0,
            modifiedCount: 0
        };
        dbUpdate.mockImplementation(async () => Promise.resolve(updateResult));

        return request(app).put(`/api/v1/orders/users/${userId}/cancelled`).then((response) => {
            expect(response.statusCode).toBe(404);
            expect(dbUpdate).toBeCalled();
        });
    });
  });

  describe("PUT /user/:userId/deliveryAddress", () => {
    let dbUpdate;

    beforeEach(() => {
        dbUpdate = jest.spyOn(Order, "updateMany");
    });

    it("Should update delivery address for orders in progress", async () => {
        const userId = 1;
        const newAddress = "456 New Address St";
        const updateResult = {
            matchedCount: 2,
            modifiedCount: 2
        };
        dbUpdate.mockImplementation(async () => Promise.resolve(updateResult));

        return request(app).put(`/api/v1/orders/user/${userId}/deliveryAddress`).send({ deliveryAddress: newAddress }).then((response) => {
            expect(response.statusCode).toBe(200);
            expect(dbUpdate).toBeCalledWith({ userId: userId, status: 'In preparation' }, { $set: { deliveryAddress: newAddress, updateDatetime: expect.any(String) } });
        });
    });

    it("Should return 400 if no new address is provided", async () => {
        const userId = 1;
        return request(app).put(`/api/v1/orders/user/${userId}/deliveryAddress`).send({}).then((response) => {
            expect(response.statusCode).toBe(400);
        });
    });

    it("Should return 404 if no orders in progress for the user", async () => {
        const userId = 2;
        const newAddress = "789 Another Address Ave";
        const updateResult = {
            matchedCount: 0,
            modifiedCount: 0
        };
        dbUpdate.mockImplementation(async () => Promise.resolve(updateResult));

        return request(app).put(`/api/v1/orders/user/${userId}/deliveryAddress`).send({ deliveryAddress: newAddress }).then((response) => {
            expect(response.statusCode).toBe(404);
        });
    });
  });


});

