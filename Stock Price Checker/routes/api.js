'use strict';
const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  stock: String,
  price: String,
  likes: Number,
  ips: [String]
});

const Stock = mongoose.model('Stock', stockSchema);

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get(async function (req, res) {
      const stocks = [].concat(req.query.stock || []);
      const like = req.query.like === 'true';
      const ip = req.ip;

      try {
        const fetch = (await import('node-fetch')).default;
        const stockData = await Promise.all(stocks.map(async (stock) => {
          const response = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`);
          const data = await response.json();

          let stockDoc = await Stock.findOne({ stock });

          if (!stockDoc) {
            stockDoc = new Stock({
              stock,
              price: data.latestPrice,
              likes: 0,
              ips: []
            });
          }

          if (like && !stockDoc.ips.includes(ip)) {
            stockDoc.likes += 1;
            stockDoc.ips.push(ip);
          }

          await stockDoc.save();

          return {
            stock: stockDoc.stock,
            price: stockDoc.price,
            likes: stockDoc.likes
          };
        }));

        res.json({
          stockData: stocks.length === 1 ? stockData[0] : stockData
        });
      } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving stock data');
      }
    });
};
