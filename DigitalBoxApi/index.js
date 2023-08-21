const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const AuthorizationHelper = require("./AuthorizationHelper");
const FileHelper = require("./FileHelper");
const SearchHelper = require("./SearchHelper");

const app = express();

let corsOptions = {
  origin: "http://localhost:3000",
  optionsSuccessStatus: 200, // For legacy browser support
};

app.use(cors(corsOptions));
app.use(bodyParser.text({ limit: "500mb" }));
app.use(bodyParser.raw({ limit: "500mb" }));

/*Json DB Shape
  {
    Updating: Boolean,
    Orders: Array,
    Removed Orders: Array,
    UpdateFinishTime: Date,
    RemovedOrders: Array
  }
*/

app.post("/", async (req, res) => {
  FileHelper.GetOrdersFromFile(JSON.parse(req.body), res);
});

app.post("/cancel", async (req, res) => {
  FileHelper.CancelOrShipOrders(JSON.parse(req.body), res);
});

app.post("/ship", async (req, res) => {
  FileHelper.CancelOrShipOrders(JSON.parse(req.body), res);
});

app.post("/search", async (req, res) => {
  SearchHelper.SearchOrders(JSON.parse(req.body), res);
});

app.get("/", (req, res) => {
  res.json(AuthorizationHelper.getCredentials());
});

app.post("/canceledOrders", async (req, res) => {
  SearchHelper.CanceledOrders(JSON.parse(req.body), res);
});

app.post("/shippedOrders", async (req, res) => {
  SearchHelper.ShippedOrders(JSON.parse(req.body), res);
});

app.listen(2020, () => {
  console.log("Server is up and listening on port 2020");
});
