# koa-nginx

[![npm version](https://badge.fury.io/js/koa-nginx.svg)](https://badge.fury.io/js/koa-nginx) [![Build Status](https://www.travis-ci.org/wedog/koa-nginx.svg?branch=master)](https://www.travis-ci.org/wedog/koa-nginx) [![Coverage Status](https://coveralls.io/repos/github/wedog/koa-nginx/badge.svg?branch=master)](https://coveralls.io/github/wedog/koa-nginx?branch=master)

Middleware for [koa2](https://github.com/koajs/koa). Reverse proxy middleware for koa. Proxy resources on other servers, such as Java services, and other node.js applications. Based on http-proxy library.

Forked by koa-nginx

# Require

node v8.0 +

# Installation

First install node.js(v8.0.0 or higher). Then:

```bash
$ npm i fly-proxy-ngnix --save
```

# Usage
When you request url contains terminal, it will transmit to http://127.0.0.1:3000/ !

```
const Koa = require('koa');
const Proxy = require('fly-proxy-ngnix');
const app = new Koa();
const Ngnix = Proxy.proxy({
  proxies: [
    {
      host: 'http://localhost:3333/',
      context: 'ngnix'
    },
  ]
});
app.use(Ngnix);
app.listen(3000);
    
```
# API
### Options
- `logLevel`
logging level。unrequired，String，default 'info'.
logging levels are prioritized from 0 to 5 (highest to lowest):

logLevel | level |
:--------:|:-----:|
error | 0 
warn | 1 
info | 2
verbose | 3 
debug  | 4 
silly  | 5

- `proxyTimeout`
timeout for outgoing proxy requests.unrequired,the values are in millisecond,Number,default 30000

- `rewrite`
rewrites the url redirects.unrequired,Funtion, default `path.replace(context, '')`

- `handleReq`
This event is emitted before the data is sent. It gives you a chance to alter the proxyReq request object. Applies to "web",include `proxyReq`,`req`,`res`,`options`
```js
const Ngnix = Proxy.proxy({
  proxies: ...,
  handleReq: proxyObj => {
    { proxyReq, req, res, options } = proxyObj;
  }
});
```

- `handleRes`
This event is emitted if the request to the target got a response,include `proxyRes`,`req`,`res`

- `error`
The error event is emitted if the request to the target fail,include `err`,`req`,`res`

- `proxies`
koa-ngnix important parameter,required,expect get array,Each of the internal objects is a proxy combination, and some of the internal parameters can override globally parameters of the same name.
  * `target` url string to be parsed with the url module
  * `context` Local proxy root address,required,string format
  * `logs` unrequired，Boolean, default true
  * `rewrite` unrequired，Function
  * `proxyTimeout` unrequired，Number

Most options based on [http-proxy](https://github.com/nodejitsu/node-http-proxy). 
* host: the end point server
* context: the request url contains the 'context' will be proxy

```js
const Ngnix = Proxy.proxy({
  proxies: [
    {
      target: 'http://127.0.0.1:3000',
      context: 'api',
      logs: false,
      rewrite: path => path.rewrite('api', 'rewriteApi'),
      proxyTimeout: 10000,
    },
    {
      ...
    },
  ],
  proxyTimeout: 5000,
  logLevel: 'debug',
  ...
});
app.use(Ngnix);
```

