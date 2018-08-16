/**
 * Created by ly_wu on 2017/6/21.
 */
const HttpProxy = require('http-proxy');
const proxyServer = HttpProxy.createProxyServer({selfHandleResponse: true});
const compose = require('koa-compose');
const baseProxy = require('./utils/baseProxy');
const weightedArray = require('weighted-array');
var checkAlive = require("./module/checkalive");
var randomstring = require("randomstring");
var Promise = require("bluebird");

function randomServerId() {
    return randomstring.generate(7);
}

class Proxy extends baseProxy {
    proxy(options) {
        this.checkOut(options);
        const mildArr = [];
        const {proxies, rewrite, proxyTimeout} = this.options;
        this.handle(proxyServer);
        proxyServer.on('proxyRes', function (proxyRes, req, res) {
            req.ctx.proxyRes = proxyRes;
            req.resolve();
        });
        proxies.forEach(proxy => {
            var upstreams = proxy.upstreams;
            var items = [];
            if (upstreams) {
                for (var i = 0; i < upstreams.length; i++) {
                    var us = upstreams[i];
                    items.push({url: us.uri, weight: us.weight ? us.weight : 1, id: us.id ? us.id : randomServerId()});
                }
            }
            const pattern = new RegExp('^/' + proxy.context + '(/|/w+)?');
            let proxyObj = {origin: items, available: items};
            this.checkAliveTask(proxyObj);


            const proxyOptions = {
                target: proxy.host,
                upstreams: proxyObj,
                changeOrigin: true,
                xfwd: true,
                rewrite: proxy.rewrite || rewrite(pattern),
                logs: proxy.enablelog == undefined ? false : proxy.enablelog,
                proxyTimeout: proxy.proxyTimeout || proxyTimeout,
            };
            var context = "/";
            if (proxy.context && proxy.context.length > 0) {
                context += proxy.context;
            }

            mildArr.push(
                this.nginx(context, proxyOptions)
            );
        });
        return compose(mildArr);
    }

    checkAliveTask(proxyObj) {
        setInterval(async function () {
            //将原始信息传入进行check alive
            await checkAlive.checkAndMark(proxyObj);

        }, 10 * 1000);
    }

    nginx(context, proxyOptions) {
        return async function (ctx, next) {
            if (!ctx.url.startsWith(context)) {
                return await next();
            }
            const {logs, rewrite, target, upstreams} = proxyOptions;
            if (typeof rewrite === 'function') {
                ctx.req.url = rewrite(ctx.url);
            }
            ctx.req.body = ctx.request.body || null;
            proxyOptions.headers = ctx.request.headers;
            await this.proxyReuqest(ctx, proxyOptions);
            return await next();
        }.bind({options: this.options, proxyReuqest: this.proxyReuqest, selectUpstream: this.selectUpstream});
    }

    async proxyReuqest(ctx, proxyOptions) {
        const {logs, rewrite, target, upstreams} = proxyOptions;
        var errorids = [];
        var upStream;
        for (var i = 0; i < upstreams.origin.length; i++) {
            try {
                upStream = this.selectUpstream(upstreams, errorids);
                //如果选取不到服务器了，则返回404
                if (!upStream) {
                    ctx.throw(404, 'all server is down!');
                    return;
                }
                await new Promise((resolve, reject) => {

                    if (logs) {
                        this.options.log.info(
                            upStream.url,
                            '- proxy -',
                            ctx.req.method,
                            ctx.req.url
                        );
                    }
                    proxyOptions.target = upStream.url;
                    ctx.proxyOptions = proxyOptions;
                    ctx.req.ctx = ctx;
                    ctx.req.resolve = resolve;
                    ctx.res.setHeader("X-Backend-Server", upStream.id);
                    proxyServer.web(ctx.req, ctx.res, proxyOptions, e => {
                        const status = {
                            ECONNRESET: 502,
                            ECONNREFUSED: 503,
                            ETIMEOUT: 504,
                        }[e.code];
                        if (status) ctx.status = status;
                        if (this.options.handleError) {
                            this.options.handleError.call(null, {e, req: ctx.req, res: ctx.res});
                        }
                        if (logs) {
                            this.options.log.error('- proxy -', ctx.status, ctx.req.method, ctx.req.url);
                        }
                        reject();
                    });
                });
                return;
            } catch (e) {
                //发生异常时,如果不是服务器本身的问题，则直接返回
                if (ctx.status < 500) {
                    return;
                }
                //如果是的，则需要换个服务器继续
                if (upStream) {
                    this.options.log.error('- proxy[%s] fail retry-', JSON.stringify(upStream));
                    errorids.push(upStream.id);
                }
            }
        }
    }

    selectUpstream(upstreams, errorids) {
        var upStream;
        if (upstreams) {
            //获取存活下来的后端服务
            var available = upstreams.available;
            //如果所有存活服务器和错误id集合一致时，则直接返回了
            var selectable = [];
            for (var i = 0; i < available.length; i++) {
                var e = available[i];
                if (errorids.indexOf(e.id) == -1 && !e.isdown) {
                    selectable.push(e);
                }
            }
            //如果没有存活下来的服务器，则直接返回404
            var backEndServer = weightedArray.select(selectable);
            upStream = backEndServer;
        } else {
        }
        return upStream;
    }
}

module.exports = new Proxy();
