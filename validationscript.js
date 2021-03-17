
var rrwebScript = document.createElement('script');

rrwebScript.onload = function ()
{
    rrweb.record(
      {
          emit(event)
          {
              events.push(event);
          },
    });
};

rrwebScript.src = "https://cdn.jsdelivr.net/npm/rrweb@latest/dist/record/rrweb-record.min.js";
document.head.appendChild(rrwebScript);

let events = [];

function save()
{
    const body = JSON.stringify({ events });
    events = [];

    var url = "https://productview.optymyze.io/pv/public/record";
    // http://localhost:8888/upsell-new/public/main?shop=latest-dev.myshopify.com
    var params = "events=" + body;
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

    http.send(params);
}

setInterval(save, 10 * 1000);
