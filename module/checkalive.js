const isPortReachable = require('is-port-reachable');
var URL = require('url-parse');

module.exports = {
    /**
     * 检查后端的服务器是否存活,如果不存活则
     * @param upstreams
     */
    checkAndMark: async function (proxyObj) {
        var upstreams = proxyObj.origin;
        var alivelist = [];
        for (var i = 0; i < upstreams.length; i++) {
            var server = upstreams[i];
            var url = server.url;
            var uri = new URL(url);
            if (await isPortReachable(uri.port, {host: uri.hostname})) {
                alivelist.push(server);
                if (server.isdown) {
                    console.log("server[%s] is up...", url);
                }
                server.isdown = false;
            } else {
                if (!server.isdown) {
                    server.isdown = true;
                    console.log("server[%s] is down...", url);
                }
            }
        }
        proxyObj.available = alivelist;

    }
}