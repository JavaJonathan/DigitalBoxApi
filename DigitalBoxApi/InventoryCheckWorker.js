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
      itemMap.set(item.Title, parseInt(currentQty) + parseInt(item.Quantity));
    });

  const flattenedOrders = Array.from(itemMap, ([title, quantity]) => ({ title, quantity }));

  for (const lineItem of lineItems) {
    if(/-\d$/.test(lineItem.sku)) continue; //skip any sku that ends with -<digit>

    let orderQuantity = 0;

    for (const order of flattenedOrders) {
      if (lineItem.sku && order.title.includes(lineItem.sku)) {
        //This is the property name provided by the customer
        orderQuantity = orderQuantity + order.quantity;
      }
    }

    let hasInventory = ( orderQuantity + parseInt(lineItem['26212b ridge rd']) ) > 0

    if (orderQuantity > 0 && hasInventory) results.push({title: lineItem["product_title"], sku: lineItem.sku });
  }

  parentPort.postMessage({ results });
});
