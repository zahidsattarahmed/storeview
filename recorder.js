
var rrwebScript = document.createElement('script');

rrwebScript.onload = function ()
{
    rrweb.record(
      {
          emit(event)
          {
              eventsSV.push(event);
          },
    });
};

rrwebScript.src = "https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js";
document.head.appendChild(rrwebScript);

let eventsSV = [];
let uniqueId = localStorage.getItem('sv_app_unique_id');

if (uniqueId === null)
{
    //store value for the first time.
    uniqueId = randomString();
    localStorage.setItem('sv_app_unique_id', uniqueId);
}

function save()
{
    if(eventsSV.length == 0)
    {
        return;
    }

    var body = JSON.stringify({ eventsSV });
    body = encodeURIComponent(body);

    eventsSV = [];

    var url = "https://cdn.jsdelivr.net/gh/zahidsattarahmed/storeview/recorder.js	";
    //var url = "https://productview.optymyze.io/pv/public/record";
    // http://localhost:8888/upsell-new/public/main?shop=latest-dev.myshopify.com
    var params = "events=" + body + "&unique_id=" + uniqueId;
    var http = new XMLHttpRequest();

    http.open("POST", url, true);

    http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    http.setRequestHeader("Access-Control-Allow-Origin", "*");
    http.setRequestHeader('Access-Control-Allow-Methods', "POST");
    http.setRequestHeader("Access-Control-Max-Age", "3600");
    http.setRequestHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, content-type");

    http.onreadystatechange = function () {
        if (http.readyState == 4 && http.status == 200)
        {

        }
    }

    console.log(uniqueId);
    http.send(params);
}

setInterval(save, 1 * 1000);

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
