const app = require('../app');
const request = require('supertest');

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

});