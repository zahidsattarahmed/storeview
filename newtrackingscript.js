var currentPage = document.location.href;
var currentPageArray = currentPage.split("/");
var pageType = currentPageArray[3];

currentPageArray = currentPageArray.splice(3);
var pageURL = "/" + currentPageArray.join('/');

postPageVisit(pageURL);

//manage regular cart events, i.e. on page load
getCartInfo("regular");

// manage ajax events
$(document).ajaxComplete(function (event, request, settings) {
    var url = settings.url;

    if (settings.type == 'POST') {
        if (url == "/cart/add.js" || url == "/cart/update.js" || url == "/cart/change.js" || url == "/cart/clear.js")
        {
            getCartInfo("ajax - " + url);
        }
    }
});


function postPageVisit(pageURL)
{
    if (localStorage.getItem('sv_app_unique_id') === null) {

        //store value for the first time.
        var uniqueString = randomString();
        localStorage.setItem('sv_app_unique_id', uniqueString);
    }

    var shop = Shopify.shop;
    var url = "https://productview.optymyze.io/pv/public/storepagevisit";
    //var url = "https://storeview.ngrok.io/storeview/public/pagevisit";

    var http = new XMLHttpRequest();

    var uniqueId = localStorage.getItem('sv_app_unique_id');
    var params = "shop_name=" + shop + "&unique_id=" + uniqueId + "&page_url=" + pageURL + "&timestamp=" + Date.now();

    http.open("POST", url, true);

    http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    http.setRequestHeader("Access-Control-Allow-Origin", "*");
    http.setRequestHeader('Access-Control-Allow-Methods', "POST");
    http.setRequestHeader("Access-Control-Max-Age", "3600");
    http.setRequestHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, content-type");

    http.onreadystatechange = function () {
        if (http.readyState == 4 && http.status == 200) {
            //console.log('status: 200')
        }
    }

    http.send(params);
}

function getCartInfo(type) {

    var shop = window.location.hostname;
    var cartURL = 'https://' + shop + '/cart.json';

    var http = new XMLHttpRequest();

    http.open("GET", cartURL, true);

    http.onreadystatechange = function ()
    {
        if (http.readyState == 4 && http.status == 200)
        {
            var cartData = http.responseText;
            var previousCartData = localStorage.getItem('cart_raw_data');

            if(previousCartData == null)
            {
                previousCartArray = null;
            }
            else
            {
                previousCartArray = JSON.parse(previousCartData);
            }

            var cartArray = JSON.parse(cartData);

            //compare now with previously stored cart json.
            if(cartData !== previousCartData)
            {
                //check if previously there was some items in the cart but now it's 0
                if((cartArray.item_count == 0 && previousCartData !== null))
                {
                    //ensure that this is not an empty cart due to an order being placed and then the cart becoming empty.
                    if(cartArray.token == previousCartData.token)
                    {
                        if(previousCartArray.items.count != 0)
                        {
                            localStorage.setItem('cart_raw_data', cartData);
                            createActivityItems(cartArray, previousCartArray);
                        }
                    }
                }
                //if item count is not 0, then business as usual.
                else if(cartArray.item_count != 0)
                {
                    localStorage.setItem('cart_raw_data', cartData);
                    createActivityItems(cartArray, previousCartArray);
                }
            }
        }
    }

    http.send(null);
}

function createActivityItems(cartData, previousCartData)
{
    var activities = new Array();
    var shouldGetIP = false; // If the cart is new then we need to get the IP address.

    var isNewCart = false;

    //If a new cart has been inititiated after placing an order.
    if(previousCartData != null)
    {
        if(cartData.token != previousCartData.token)
        {
            isNewCart = true;
        }
    }

    //First cart activity
    if(previousCartData == null || isNewCart == true)
    {
        for(var i = 0; i < cartData.items.length; i++)
        {
            var cartItem = cartData.items[i];

            var activity =
            {
                'cart_id': cartData.token,
                'type': 'added',
                'product_id': cartItem.product_id,
                'product_name': cartItem.title,
                'quantity': cartItem.quantity,
                'amount': cartItem.discounted_price,
                'timestamp': Date.now(),
            }

            shouldGetIP = true;
            activities.push(activity);
        }
    }
    else
    {
        var previousCartItems = getPreviousCartItems(previousCartData);

        for(var i = 0; i < cartData.items.length; i++)
        {
            var cartItem = cartData.items[i];

            var productId = cartItem.product_id;
            var quantity = cartItem.quantity;

            //quantity increased or decreased.
            if(productId in previousCartItems)
            {
                var quantityDifference = quantity - previousCartItems[productId];

                if(quantityDifference > 0)
                {
                    var activity =
                    {
                        'cart_id': cartData.token,
                        'type': 'increased',
                        'product_id': productId,
                        'product_name': cartItem.title,
                        'quantity': cartItem.quantity,
                        'amount': cartItem.discounted_price,
                        'difference': quantityDifference,
                    }

                    activities.push(activity);
                }
                else if(quantityDifference < 0)
                {
                    var activity =
                    {
                        'cart_id': cartData.token,
                        'type': 'decreased',
                        'product_id': productId,
                        'product_name': cartItem.title,
                        'quantity': cartItem.quantity,
                        'amount': cartItem.discounted_price,
                        'difference': -quantityDifference,
                    }

                    activities.push(activity);
                }
            }
            else //this product was not present previously, add it!
            {
                var activity =
                {
                    'cart_id': cartData.token,
                    'type': 'added',
                    'product_id': productId,
                    'product_name': cartItem.title,
                    'quantity': cartItem.quantity,
                    'amount': cartItem.discounted_price,
                }

                activities.push(activity);
            }
        }

        var currentCartItems = getCurrentCartItems(cartData);

        //remove item if not present in current cart data.
        for(var i = 0; i < previousCartData.items.length; i++)
        {
            var cartItem = previousCartData.items[i];
            var productId = cartItem.product_id;

            if(productId in currentCartItems === false)
            {
                var activity =
                {
                    'cart_id': previousCartData.token,
                    'type': 'removed',
                    'product_id': cartItem.product_id,
                    'product_name': cartItem.title,
                    'quantity': cartItem.quantity,
                    'amount': cartItem.discounted_price,
                }

                activities.push(activity);
            }
        }
    }

    performIPCheck(activities, cartData, shouldGetIP);
}

function getCurrentCartItems(currentCartData)
{
    var currentArrayItems = new Array();

    for(var i = 0; i < currentCartData.items.length; i++)
    {
        var productId = currentCartData.items[i].product_id;
        currentArrayItems[productId] = currentCartData.items[i].quantity;
    }

    return currentArrayItems;
}

function getPreviousCartItems(previousCartData)
{
    var previousCartItems = new Array();

    for(var i = 0; i < previousCartData.items.length; i++)
    {
        var productId = previousCartData.items[i].product_id;
        previousCartItems[productId] = previousCartData.items[i].quantity;
    }

    return previousCartItems;
}

function performIPCheck(activities, cartData, shouldGetIP)
{
    var ip = '';

    if(shouldGetIP == true)
    {
        var http = new XMLHttpRequest();

        var url = "https://api.ipify.org?format=text";
        http.open("GET", url, true);

        http.onreadystatechange = function () {
            if (http.readyState == 4 && http.status == 200) {
                var ip = http.responseText;
                storeActivities(activities, cartData, ip);
            }
        }

        http.send(null);
    }
    else
    {
        storeActivities(activities, cartData, ip);
    }
}

function storeActivities(activities, cartData, ip)
{
    if(activities.length != 0)
    {
        //need to send line items node of cart json.
        var cartItems = null
        if(cartData.items != 0)
        {
            cartItems = JSON.stringify(cartData.items);
        }

        var activities = JSON.stringify(activities);

        var shop = Shopify.shop;
        var http = new XMLHttpRequest();

        //var url = "https://storeview.ngrok.io/storeview/public/storeactivities";
        var url = "https://optymyze.io/tracking/public/storeactivities";

        cartItems = encodeURIComponent(cartItems);

        var customerId = "";

        if(checkExists(ShopifyAnalytics, "meta.page.customerId"))
        {
            customerId = ShopifyAnalytics.meta.page.customerId;
        }

        var uniqueId = localStorage.getItem('sv_app_unique_id');

        var params = "shop_name=" + shop + "&data=" + activities + "&timestamp=" + Date.now() + "&cart_items=" + cartItems + "&ip=" + ip + "&customer_id=" + customerId + "&unique_id=" + uniqueId;

        http.open("POST", url, true);

        http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        http.setRequestHeader("Access-Control-Allow-Origin", "*");
        http.setRequestHeader('Access-Control-Allow-Methods', "POST");
        http.setRequestHeader("Access-Control-Max-Age", "3600");
        http.setRequestHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, content-type");

        http.onreadystatechange = function ()
        {
            if (http.readyState == 4 && http.status == 200)
            {

            }
        }

        http.send(params);
    }
}

function randomString() {
	var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
	var string_length = 32;
	var str = '';
	for (var i=0; i<string_length; i++) {
		var rnum = Math.floor(Math.random() * chars.length);
		str += chars.substring(rnum,rnum+1);
	}
  return str;
}

function checkExists( val, names ) {
    names = names.split( '.' );
    while ( val && names.length ) { val = val[ names.shift() ]; }
    return typeof val !== 'undefined';
}
