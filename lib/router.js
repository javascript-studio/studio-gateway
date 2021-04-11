/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

class Route {

  constructor(name, re, keys) {
    this.name = name;
    this.re = re;
    this.keys = keys;
  }

  match(pathname) {
    const m = pathname.match(this.re);
    if (!m) {
      return null;
    }
    const params = {};
    for (let i = 1; i < m.length; i++) {
      const key = this.keys[i - 1];
      params[key] = m[i];
    }
    return params;
  }

}

exports.createRouter = function (paths) {
  const routes = Object.keys(paths).map((p) => {
    const keys = [];
    const re = p.replace(/{([a-z]+\+?)}/gi, (_, m) => {
      if (m.endsWith('+')) {
        keys.push(m.substring(0, m.length - 1));
        return '(.*)';
      }
      keys.push(m);
      return '([^/]+)';
    });
    return new Route(p, new RegExp(`^${re}$`), keys);
  });
  return function (pathname, then) {
    for (const r of routes) {
      const params = r.match(pathname);
      if (params) {
        then(r.name, params);
        return;
      }
    }
    then(null);
  };
};
