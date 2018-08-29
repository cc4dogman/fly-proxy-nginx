const web_o = Object.values(require('http-proxy/lib/http-proxy/passes/web-outgoing'));
module.exports = () => {
    return async (ctx, next) => {
        await next();
        if (ctx.proxyRes) {
            // code taken from here: https://github.com/nodejitsu/node-http-proxy/blob/42e8e1e099c086d818d8f62c8f15ec5a8f1a6624/lib/http-proxy/passes/web-incoming.js#L174
            for (var i = 0; i < web_o.length; i++) {
                if (web_o[i](ctx.req, ctx.res, ctx.proxyRes, ctx.proxyOptions)) {
                    break;
                }
            }
            ctx.status = ctx.proxyRes.statusCode;
            ctx.message = ctx.proxyRes.statusMessage;
            ctx.body = ctx.proxyRes.pipe(ctx.res);
        } else {
            //console.log("not found proxyRes");
        }

        // var body;
        // ctx.proxyRes.on('data', (chunk) => {
        //     body += chunk;
        // });
        // ctx.proxyRes.on('end', () => {
        //     ctx.body = body;
        //     resolve();
        // });
    }
};