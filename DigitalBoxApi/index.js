const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');
const AuthorizationHelper = require('./AuthorizationHelper');
const FileHelper = require('./FileHelper');
const SearchHelper = require('./SearchHelper');
const OrderHelper = require('./OrderHelper');
const path = require('path');
const fs = require('fs');
const app = express();

let corsOptions = {
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200,
  exposedHeaders: ['Content-Disposition']
};

app.use(cors(corsOptions));
app.use(bodyParser.text({ limit: '500mb' }));
app.use(bodyParser.raw({ limit: '500mb' }));

const upload = multer({
  dest: 'uploads/'
});

/*Json DB Shape
  {
    Updating: Boolean,
    Orders: Array,
    Removed Orders: Array,
    UpdateFinishTime: Date,
    RemovedOrders: Array
  }
*/

app.post('/undoCancel', async (req, res) => {
  OrderHelper.undoCanceledOrder(JSON.parse(req.body), res);
});

app.post('/undoShip', async (req, res) => {
  OrderHelper.undoShippedOrder(JSON.parse(req.body), res);
});

app.get('/reportStatus', async (req, res) => {
  if (fs.readdirSync(path.join(__dirname, '/reports'))[0]) {
    res.json(true);
    return;
  }
  res.json(false);
});

app.post('/downloadReport', (req, res) => {
  const files = fs.readdirSync(path.join(__dirname, '/reports'));
  const filePath = path.join(__dirname, '/reports', files[0]);

  res.download(filePath, files[0], err => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).send('Error downloading file');
    }
  });
});

app.post('/addNote', async (req, res) => {
  OrderHelper.addNote(JSON.parse(req.body), res);
});

app.post('/generateReport', upload.single('file'), (req, res) => {
  OrderHelper.generateReport(req, res);
});

app.post('/priority', async (req, res) => {
  OrderHelper.toggleOrderPriority(JSON.parse(req.body), res);
});

app.post('/', async (req, res) => {
  FileHelper.GetOrdersFromFile(JSON.parse(req.body), res);
});

app.post('/cancel', async (req, res) => {
  FileHelper.CancelOrShipOrders(JSON.parse(req.body), res);
});

app.post('/ship', async (req, res) => {
  FileHelper.CancelOrShipOrders(JSON.parse(req.body), res);
});

app.post('/search', async (req, res) => {
  SearchHelper.SearchOrders(JSON.parse(req.body), res);
});

app.get('/', (req, res) => {
  res.json(AuthorizationHelper.getCredentials());
});

app.post('/canceledOrders', async (req, res) => {
  SearchHelper.CanceledOrders(JSON.parse(req.body), res);
});

app.post('/shippedOrders', async (req, res) => {
  SearchHelper.ShippedOrders(JSON.parse(req.body), res);
});

app.listen(2020, () => {
  console.log('Welcome to the Digital Box.');
});
