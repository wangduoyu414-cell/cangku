// Proxy Manager — round-robin rotation with success-rate tracking
// Proxies with >30% failure rate get deprioritized
var ProxyManager = (function () {
  function ProxyManager(proxies, healthCheckIntervalMs) {
    if (healthCheckIntervalMs === void 0) { healthCheckIntervalMs = 60000; }
    this.proxyList = proxies;
    this.cursor = 0;
    this.healthCheckTimer = null;
    this.stats = new Map(proxies.map(function (p) { return [buildKey(p), { total: 0, failures: 0, lastUsed: 0, lastChecked: 0, avgLatency: 0, banCount: 0 }]; }));
    this.healthCheckIntervalMs = healthCheckIntervalMs;
  }
  ProxyManager.prototype.startHealthCheck = function () {
    var _this = this;
    if (this.healthCheckTimer)
      return;
    this.healthCheckTimer = setInterval(function () {
      _this.healthCheck().catch(function () { });
    }, this.healthCheckIntervalMs);
    this.healthCheck().catch(function () { });
  };
  ProxyManager.prototype.stopHealthCheck = function () {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  };
  ProxyManager.prototype.healthCheck = function () {
    var _this = this;
    var checks = this.proxyList.map(function (p) { return _this.checkOneProxy(p); });
    return Promise.allSettled(checks);
  };
  ProxyManager.prototype.checkOneProxy = function (p) {
    var _this = this;
    var start = Date.now();
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { return controller.abort(); }, 10000);
    return fetch('https://www.google.com/generate_204', { signal: controller.signal })
      .then(function () {
        clearTimeout(timeoutId);
        _this.reportLatency(p, Date.now() - start);
      })
      .catch(function () {
        clearTimeout(timeoutId);
        _this.reportResult(p, false);
      });
  };
  ProxyManager.prototype.reportLatency = function (proxy, latencyMs) {
    var key = buildKey(proxy);
    var s = this.stats.get(key);
    if (!s)
      return;
    s.lastChecked = Date.now();
    var prev = s.avgLatency;
    var successes = s.total - s.failures;
    s.avgLatency = Math.round((prev * Math.max(successes, 1) + latencyMs) / (Math.max(successes, 1) + 1));
  };
  ProxyManager.prototype.reportResult = function (proxy, success) {
    var key = buildKey(proxy);
    var s = this.stats.get(key);
    if (!s)
      return;
    s.total += 1;
    if (!success) {
      s.failures += 1;
      if (s.total >= 5 && s.failures / s.total > 0.5) {
        s.banCount++;
      }
    }
  };
  ProxyManager.prototype.getProxy = function () {
    var deprioritized = this.findDeprioritized();
    var start = this.cursor;
    for (var i = 0; i < this.proxyList.length; i++) {
      var idx = (start + i) % this.proxyList.length;
      var p = this.proxyList[idx];
      if (!p)
        continue;
      if (!deprioritized.has(buildKey(p))) {
        this.cursor = (idx + 1) % this.proxyList.length;
        this.touch(buildKey(p));
        return p;
      }
    }
    var p = this.proxyList[this.cursor];
    if (!p)
      return this.proxyList[0];
    this.cursor = (this.cursor + 1) % this.proxyList.length;
    this.touch(buildKey(p));
    return p;
  };
  ProxyManager.prototype.rotate = function () {
    return this.getProxy();
  };
  ProxyManager.prototype.getStats = function () {
    var available = 0;
    var deprioritized = this.findDeprioritized();
    for (var i = 0; i < this.proxyList.length; i++) {
      var p = this.proxyList[i];
      if (!deprioritized.has(buildKey(p))) {
        available++;
      }
    }
    var byType = {};
    for (var i = 0; i < this.proxyList.length; i++) {
      var p = this.proxyList[i];
      var t = p.type || 'unknown';
      byType[t] = (byType[t] || 0) + 1;
    }
    var requestTotal = 0;
    for (var _i = 0, _a = Array.from(this.stats.values()); _i < _a.length; _i++) {
      var s = _a[_i];
      requestTotal += s.total;
    }
    return { total: requestTotal, available: available, byType: byType };
  };
  ProxyManager.prototype.findDeprioritized = function () {
    var deprioritized = new Set();
    var entries = Array.from(this.stats.entries());
    for (var i = 0; i < entries.length; i++) {
      var key = entries[i][0];
      var s = entries[i][1];
      if (s.total >= 5 && s.failures / s.total > 0.3) {
        deprioritized.add(key);
      }
    }
    return deprioritized;
  };
  ProxyManager.prototype.touch = function (key) {
    var s = this.stats.get(key);
    if (s)
      s.lastUsed = Date.now();
  };
  return ProxyManager;
})();
function buildKey(p) {
  return p.ip + ':' + p.port;
}
export { ProxyManager };
