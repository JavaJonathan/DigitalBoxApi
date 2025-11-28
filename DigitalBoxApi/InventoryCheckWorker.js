//This requirement/feature needs to be done off of the main thread due to the sheer size/poor formatting of the data.
//User uploads spreadsheet with 20k items
//The app need to iterate through each item and order to check if there is an order for said item
//The comparison is where things start to get tricky due to poor data formatting
//The user uploads a spreadsheet with UPC's and Inventory Counts
//The orders in the app can possibly have a upc or not, but rather than it being a separate property, it is included in the title of the order
//So we will have to do a contains on each title to see if the title does contain the upc or not
//We could use the Aho–Corasick Algo, but for readability I will just run this nested loop off of the main thread rather than
//optimizing it for the main thread

const { parentPort } = require('worker_threads');

parentPort.on('message', function (message) {
  const { lineItems, orders } = message;

  const results = [];

  const itemMap = new Map();

  orders
    .flatMap(order => order.FileContents)
    .forEach(item => {
      const currentQty = itemMap.get(item.Title) || 0;
      itemMap.set(item.Title, currentQty + item.Quantity);
    });

  const flattenedOrders = Array.from(itemMap, ([title, quantity]) => ({ title, quantity }));

  for (const lineItem of lineItems) {
    for (const order of flattenedOrders) {
      if (lineItem.sku && order.title.includes(lineItem.sku)) {
        //This is the property name provided by the customer
        if (order.quantity + lineItem['26212b ridge rd'] > 0) results.push(order.title);
      }
    }
  }

  parentPort.postMessage({ results });
});
