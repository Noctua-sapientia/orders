const Order = require('../../models/order');
const dbConnect = require('../../db');

jest.setTimeout(30000);

describe('Orders DB connection', () => {
    beforeAll((done) => {
        if (dbConnect.readyState == 1) {
            done();
        } else {
            dbConnect.on("connected", () => done());
        }
    });

    beforeEach(async () => {
        await Order.deleteMany({});
    });

    it('writes a order in the DB', async () => {
        const order = new Order({ "userId": 1, "sellerId": 2, "status": "In preparation", "creationDatetime": "2024-01-21", "updateDatetime": "2024-01-21", "shippingCost": 5, "books": [{"bookId": 12345678, "units": 2, "price": 5}], "orderId": 1 , "deliveryAddress": "Calle Falsa 123", "maxDeliveryDate": "2024-01-21"});
        await order.save();
        orders = await Order.find();
        expect(orders).toBeArrayOfSize(1);
    });

    afterAll(async () => {
        if (dbConnect.readyState == 1) {
            await dbConnect.dropDatabase();
            await dbConnect.close();
        }
    });
});