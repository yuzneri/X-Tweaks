"use strict";
(() => {
  // node_modules/preact/dist/preact.module.js
  var n;
  var l;
  var u;
  var t;
  var i;
  var r;
  var o;
  var e;
  var f;
  var c;
  var a;
  var s;
  var h;
  var p;
  var v;
  var y;
  var d = {};
  var w = [];
  var _ = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
  var g = Array.isArray;
  function m(n2, l3) {
    for (var u4 in l3) n2[u4] = l3[u4];
    return n2;
  }
  function b(n2) {
    n2 && n2.parentNode && n2.parentNode.removeChild(n2);
  }
  function k(l3, u4, t3) {
    var i3, r3, o3, e3 = {};
    for (o3 in u4) "key" == o3 ? i3 = u4[o3] : "ref" == o3 ? r3 = u4[o3] : e3[o3] = u4[o3];
    if (arguments.length > 2 && (e3.children = arguments.length > 3 ? n.call(arguments, 2) : t3), "function" == typeof l3 && null != l3.defaultProps) for (o3 in l3.defaultProps) void 0 === e3[o3] && (e3[o3] = l3.defaultProps[o3]);
    return x(l3, e3, i3, r3, null);
  }
  function x(n2, t3, i3, r3, o3) {
    var e3 = { type: n2, props: t3, key: i3, ref: r3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o3 ? ++u : o3, __i: -1, __u: 0 };
    return null == o3 && null != l.vnode && l.vnode(e3), e3;
  }
  function S(n2) {
    return n2.children;
  }
  function C(n2, l3) {
    this.props = n2, this.context = l3;
  }
  function $(n2, l3) {
    if (null == l3) return n2.__ ? $(n2.__, n2.__i + 1) : null;
    for (var u4; l3 < n2.__k.length; l3++) if (null != (u4 = n2.__k[l3]) && null != u4.__e) return u4.__e;
    return "function" == typeof n2.type ? $(n2) : null;
  }
  function I(n2) {
    if (n2.__P && n2.__d) {
      var u4 = n2.__v, t3 = u4.__e, i3 = [], r3 = [], o3 = m({}, u4);
      o3.__v = u4.__v + 1, l.vnode && l.vnode(o3), q(n2.__P, o3, u4, n2.__n, n2.__P.namespaceURI, 32 & u4.__u ? [t3] : null, i3, null == t3 ? $(u4) : t3, !!(32 & u4.__u), r3), o3.__v = u4.__v, o3.__.__k[o3.__i] = o3, D(i3, o3, r3), u4.__e = u4.__ = null, o3.__e != t3 && P(o3);
    }
  }
  function P(n2) {
    if (null != (n2 = n2.__) && null != n2.__c) return n2.__e = n2.__c.base = null, n2.__k.some(function(l3) {
      if (null != l3 && null != l3.__e) return n2.__e = n2.__c.base = l3.__e;
    }), P(n2);
  }
  function A(n2) {
    (!n2.__d && (n2.__d = true) && i.push(n2) && !H.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(H);
  }
  function H() {
    try {
      for (var n2, l3 = 1; i.length; ) i.length > l3 && i.sort(e), n2 = i.shift(), l3 = i.length, I(n2);
    } finally {
      i.length = H.__r = 0;
    }
  }
  function L(n2, l3, u4, t3, i3, r3, o3, e3, f4, c3, a3) {
    var s3, h3, p3, v3, y3, _2, g2 = t3 && t3.__k || w, m3 = l3.length;
    for (f4 = T(u4, l3, g2, f4, m3), s3 = 0; s3 < m3; s3++) null != (p3 = u4.__k[s3]) && (h3 = -1 != p3.__i && g2[p3.__i] || d, p3.__i = s3, _2 = q(n2, p3, h3, i3, r3, o3, e3, f4, c3, a3), v3 = p3.__e, p3.ref && h3.ref != p3.ref && (h3.ref && J(h3.ref, null, p3), a3.push(p3.ref, p3.__c || v3, p3)), null == y3 && null != v3 && (y3 = v3), 4 & p3.__u ? (f4 = j(p3, f4, n2), h3.__e && (h3.__e = null)) : "function" == typeof p3.type && void 0 !== _2 ? f4 = _2 : v3 && (f4 = v3.nextSibling), p3.__u &= -7);
    return u4.__e = y3, f4;
  }
  function T(n2, l3, u4, t3, i3) {
    var r3, o3, e3, f4, c3, a3 = u4.length, s3 = a3, h3 = 0;
    for (n2.__k = new Array(i3), r3 = 0; r3 < i3; r3++) null != (o3 = l3[r3]) && "boolean" != typeof o3 && "function" != typeof o3 ? ("string" == typeof o3 || "number" == typeof o3 || "bigint" == typeof o3 || o3.constructor == String ? o3 = n2.__k[r3] = x(null, o3, null, null, null) : g(o3) ? o3 = n2.__k[r3] = x(S, { children: o3 }, null, null, null) : void 0 === o3.constructor && o3.__b > 0 ? o3 = n2.__k[r3] = x(o3.type, o3.props, o3.key, o3.ref ? o3.ref : null, o3.__v) : n2.__k[r3] = o3, f4 = r3 + h3, o3.__ = n2, o3.__b = n2.__b + 1, e3 = null, -1 != (c3 = o3.__i = O(o3, u4, f4, s3)) && (s3--, (e3 = u4[c3]) && (e3.__u |= 2)), null == e3 || null == e3.__v ? (-1 == c3 && (i3 > a3 ? h3-- : i3 < a3 && h3++), "function" != typeof o3.type && (o3.__u |= 4)) : c3 != f4 && (c3 == f4 - 1 ? h3-- : c3 == f4 + 1 ? h3++ : (c3 > f4 ? h3-- : h3++, o3.__u |= 4))) : n2.__k[r3] = null;
    if (s3) for (r3 = 0; r3 < a3; r3++) null != (e3 = u4[r3]) && 0 == (2 & e3.__u) && (e3.__e == t3 && (t3 = $(e3)), K(e3, e3));
    return t3;
  }
  function j(n2, l3, u4) {
    var t3, i3;
    if ("function" == typeof n2.type) {
      for (t3 = n2.__k, i3 = 0; t3 && i3 < t3.length; i3++) t3[i3] && (t3[i3].__ = n2, l3 = j(t3[i3], l3, u4));
      return l3;
    }
    n2.__e != l3 && (l3 && n2.type && !l3.parentNode && (l3 = $(n2)), l3 = u4.insertBefore(n2.__e, l3 || null));
    do {
      l3 = l3 && l3.nextSibling;
    } while (null != l3 && 8 == l3.nodeType);
    return l3;
  }
  function O(n2, l3, u4, t3) {
    var i3, r3, o3, e3 = n2.key, f4 = n2.type, c3 = l3[u4], a3 = null != c3 && 0 == (2 & c3.__u);
    if (null === c3 && null == e3 || a3 && e3 == c3.key && f4 == c3.type) return u4;
    if (t3 > (a3 ? 1 : 0)) {
      for (i3 = u4 - 1, r3 = u4 + 1; i3 >= 0 || r3 < l3.length; ) if (null != (c3 = l3[o3 = i3 >= 0 ? i3-- : r3++]) && 0 == (2 & c3.__u) && e3 == c3.key && f4 == c3.type) return o3;
    }
    return -1;
  }
  function z(n2, l3, u4) {
    "-" == l3[0] ? n2.setProperty(l3, null == u4 ? "" : u4) : n2[l3] = null == u4 ? "" : "number" != typeof u4 || _.test(l3) ? u4 : u4 + "px";
  }
  function N(n2, l3, u4, t3, i3) {
    var r3, o3;
    n: if ("style" == l3) if ("string" == typeof u4) n2.style.cssText = u4;
    else {
      if ("string" == typeof t3 && (n2.style.cssText = t3 = ""), t3) for (l3 in t3) u4 && l3 in u4 || z(n2.style, l3, "");
      if (u4) for (l3 in u4) t3 && u4[l3] == t3[l3] || z(n2.style, l3, u4[l3]);
    }
    else if ("o" == l3[0] && "n" == l3[1]) r3 = l3 != (l3 = l3.replace(s, "$1")), o3 = l3.toLowerCase(), l3 = o3 in n2 || "onFocusOut" == l3 || "onFocusIn" == l3 ? o3.slice(2) : l3.slice(2), n2.l || (n2.l = {}), n2.l[l3 + r3] = u4, u4 ? t3 ? u4[a] = t3[a] : (u4[a] = h, n2.addEventListener(l3, r3 ? v : p, r3)) : n2.removeEventListener(l3, r3 ? v : p, r3);
    else {
      if ("http://www.w3.org/2000/svg" == i3) l3 = l3.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if ("width" != l3 && "height" != l3 && "href" != l3 && "list" != l3 && "form" != l3 && "tabIndex" != l3 && "download" != l3 && "rowSpan" != l3 && "colSpan" != l3 && "role" != l3 && "popover" != l3 && l3 in n2) try {
        n2[l3] = null == u4 ? "" : u4;
        break n;
      } catch (n3) {
      }
      "function" == typeof u4 || (null == u4 || false === u4 && "-" != l3[4] ? n2.removeAttribute(l3) : n2.setAttribute(l3, "popover" == l3 && 1 == u4 ? "" : u4));
    }
  }
  function V(n2) {
    return function(u4) {
      if (this.l) {
        var t3 = this.l[u4.type + n2];
        if (null == u4[c]) u4[c] = h++;
        else if (u4[c] < t3[a]) return;
        return t3(l.event ? l.event(u4) : u4);
      }
    };
  }
  function q(n2, u4, t3, i3, r3, o3, e3, f4, c3, a3) {
    var s3, h3, p3, v3, y3, d3, _2, k3, x3, M, I2, P2, A3, H2, T3, j3, F = u4.type;
    if (void 0 !== u4.constructor) return null;
    128 & t3.__u && (c3 = !!(32 & t3.__u), o3 = [f4 = u4.__e = t3.__e]), (s3 = l.__b) && s3(u4);
    n: if ("function" == typeof F) {
      h3 = e3.length;
      try {
        if (x3 = u4.props, M = F.prototype && F.prototype.render, I2 = (s3 = F.contextType) && i3[s3.__c], P2 = s3 ? I2 ? I2.props.value : s3.__ : i3, t3.__c ? k3 = (p3 = u4.__c = t3.__c).__ = p3.__E : (M ? u4.__c = p3 = new F(x3, P2) : (u4.__c = p3 = new C(x3, P2), p3.constructor = F, p3.render = Q), I2 && I2.sub(p3), p3.state || (p3.state = {}), p3.__n = i3, v3 = p3.__d = true, p3.__h = [], p3._sb = []), M && null == p3.__s && (p3.__s = p3.state), M && null != F.getDerivedStateFromProps && (p3.__s == p3.state && (p3.__s = m({}, p3.__s)), m(p3.__s, F.getDerivedStateFromProps(x3, p3.__s))), y3 = p3.props, d3 = p3.state, p3.__v = u4, v3) M && null == F.getDerivedStateFromProps && null != p3.componentWillMount && p3.componentWillMount(), M && null != p3.componentDidMount && p3.__h.push(p3.componentDidMount);
        else {
          if (M && null == F.getDerivedStateFromProps && x3 !== y3 && null != p3.componentWillReceiveProps && p3.componentWillReceiveProps(x3, P2), u4.__v == t3.__v || !p3.__e && null != p3.shouldComponentUpdate && false === p3.shouldComponentUpdate(x3, p3.__s, P2)) {
            u4.__v != t3.__v && (p3.props = x3, p3.state = p3.__s, p3.__d = false), u4.__e = t3.__e, u4.__k = t3.__k, u4.__k.some(function(n3) {
              n3 && (n3.__ = u4);
            }), w.push.apply(p3.__h, p3._sb), p3._sb = [], p3.__h.length && e3.push(p3), f4 = $(t3);
            break n;
          }
          null != p3.componentWillUpdate && p3.componentWillUpdate(x3, p3.__s, P2), M && null != p3.componentDidUpdate && p3.__h.push(function() {
            p3.componentDidUpdate(y3, d3, _2);
          });
        }
        if (p3.context = P2, p3.props = x3, p3.__P = n2, p3.__e = false, A3 = l.__r, H2 = 0, M) p3.state = p3.__s, p3.__d = false, A3 && A3(u4), s3 = p3.render(p3.props, p3.state, p3.context), w.push.apply(p3.__h, p3._sb), p3._sb = [];
        else do {
          p3.__d = false, A3 && A3(u4), s3 = p3.render(p3.props, p3.state, p3.context), p3.state = p3.__s;
        } while (p3.__d && ++H2 < 25);
        p3.state = p3.__s, null != p3.getChildContext && (i3 = m(m({}, i3), p3.getChildContext())), M && !v3 && null != p3.getSnapshotBeforeUpdate && (_2 = p3.getSnapshotBeforeUpdate(y3, d3)), T3 = null != s3 && s3.type === S && null == s3.key ? E(s3.props.children) : s3, f4 = L(n2, g(T3) ? T3 : [T3], u4, t3, i3, r3, o3, e3, f4, c3, a3), p3.base = u4.__e, u4.__u &= -161, p3.__h.length && e3.push(p3), k3 && (p3.__E = p3.__ = null);
      } catch (n3) {
        if (e3.length = h3, u4.__v = null, c3 || null != o3) {
          if (n3.then) {
            for (u4.__u |= c3 ? 160 : 128; f4 && 8 == f4.nodeType && f4.nextSibling; ) f4 = f4.nextSibling;
            null != o3 && (o3[o3.indexOf(f4)] = null), u4.__e = f4;
          } else if (null != o3) for (j3 = o3.length; j3--; ) b(o3[j3]);
        } else u4.__e = t3.__e;
        null == u4.__k && (u4.__k = t3.__k || []), n3.then || B(u4), l.__e(n3, u4, t3);
      }
    } else null == o3 && u4.__v == t3.__v ? (u4.__k = t3.__k, u4.__e = t3.__e) : f4 = u4.__e = G(t3.__e, u4, t3, i3, r3, o3, e3, c3, a3);
    return (s3 = l.diffed) && s3(u4), 128 & u4.__u ? void 0 : f4;
  }
  function B(n2) {
    n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(B));
  }
  function D(n2, u4, t3) {
    for (var i3 = 0; i3 < t3.length; i3++) J(t3[i3], t3[++i3], t3[++i3]);
    l.__c && l.__c(u4, n2), n2.some(function(u5) {
      try {
        n2 = u5.__h, u5.__h = [], n2.some(function(n3) {
          n3.call(u5);
        });
      } catch (n3) {
        l.__e(n3, u5.__v);
      }
    });
  }
  function E(n2) {
    return "object" != typeof n2 || null == n2 || n2.__b > 0 ? n2 : g(n2) ? n2.map(E) : void 0 !== n2.constructor ? null : m({}, n2);
  }
  function G(u4, t3, i3, r3, o3, e3, f4, c3, a3) {
    var s3, h3, p3, v3, y3, w3, _2, m3 = i3.props || d, k3 = t3.props, x3 = t3.type;
    if ("svg" == x3 ? o3 = "http://www.w3.org/2000/svg" : "math" == x3 ? o3 = "http://www.w3.org/1998/Math/MathML" : o3 || (o3 = "http://www.w3.org/1999/xhtml"), null != e3) {
      for (s3 = 0; s3 < e3.length; s3++) if ((y3 = e3[s3]) && "setAttribute" in y3 == !!x3 && (x3 ? y3.localName == x3 : 3 == y3.nodeType)) {
        u4 = y3, e3[s3] = null;
        break;
      }
    }
    if (null == u4) {
      if (null == x3) return document.createTextNode(k3);
      u4 = document.createElementNS(o3, x3, k3.is && k3), c3 && (l.__m && l.__m(t3, e3), c3 = false), e3 = null;
    }
    if (null == x3) m3 === k3 || c3 && u4.data == k3 || (u4.data = k3);
    else {
      if (e3 = "textarea" == x3 && null != k3.defaultValue ? null : e3 && n.call(u4.childNodes), !c3 && null != e3) for (m3 = {}, s3 = 0; s3 < u4.attributes.length; s3++) m3[(y3 = u4.attributes[s3]).name] = y3.value;
      for (s3 in m3) y3 = m3[s3], "dangerouslySetInnerHTML" == s3 ? p3 = y3 : "children" == s3 || s3 in k3 || "value" == s3 && "defaultValue" in k3 || "checked" == s3 && "defaultChecked" in k3 || N(u4, s3, null, y3, o3);
      for (s3 in k3) y3 = k3[s3], "children" == s3 ? v3 = y3 : "dangerouslySetInnerHTML" == s3 ? h3 = y3 : "value" == s3 ? w3 = y3 : "checked" == s3 ? _2 = y3 : c3 && "function" != typeof y3 || m3[s3] === y3 || N(u4, s3, y3, m3[s3], o3);
      if (h3) c3 || p3 && (h3.__html == p3.__html || h3.__html == u4.innerHTML) || (u4.innerHTML = h3.__html), t3.__k = [];
      else if (p3 && (u4.innerHTML = ""), L("template" == t3.type ? u4.content : u4, g(v3) ? v3 : [v3], t3, i3, r3, "foreignObject" == x3 ? "http://www.w3.org/1999/xhtml" : o3, e3, f4, e3 ? e3[0] : i3.__k && $(i3, 0), c3, a3), null != e3) for (s3 = e3.length; s3--; ) b(e3[s3]);
      c3 && "textarea" != x3 || (s3 = "value", "progress" == x3 && null == w3 ? u4.removeAttribute("value") : null != w3 && (w3 !== u4[s3] || "progress" == x3 && !w3 || "option" == x3 && w3 != m3[s3]) && N(u4, s3, w3, m3[s3], o3), s3 = "checked", null != _2 && _2 != u4[s3] && N(u4, s3, _2, m3[s3], o3));
    }
    return u4;
  }
  function J(n2, u4, t3) {
    try {
      if ("function" == typeof n2) {
        var i3 = "function" == typeof n2.__u;
        i3 && n2.__u(), i3 && null == u4 || (n2.__u = n2(u4));
      } else n2.current = u4;
    } catch (n3) {
      l.__e(n3, t3);
    }
  }
  function K(n2, u4, t3) {
    var i3, r3;
    if (l.unmount && l.unmount(n2), (i3 = n2.ref) && (i3.current && i3.current != n2.__e || J(i3, null, u4)), null != (i3 = n2.__c)) {
      if (i3.componentWillUnmount) try {
        i3.componentWillUnmount();
      } catch (n3) {
        l.__e(n3, u4);
      }
      i3.base = i3.__P = i3.__n = null;
    }
    if (i3 = n2.__k) for (r3 = 0; r3 < i3.length; r3++) i3[r3] && K(i3[r3], u4, t3 || "function" != typeof n2.type);
    t3 || b(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
  }
  function Q(n2, l3, u4) {
    return this.constructor(n2, u4);
  }
  function R(u4, t3, i3) {
    var r3, o3, e3, f4;
    t3 == document && (t3 = document.documentElement), l.__ && l.__(u4, t3), o3 = (r3 = "function" == typeof i3) ? null : i3 && i3.__k || t3.__k, e3 = [], f4 = [], q(t3, u4 = (!r3 && i3 || t3).__k = k(S, null, [u4]), o3 || d, d, t3.namespaceURI, !r3 && i3 ? [i3] : o3 ? null : t3.firstChild ? n.call(t3.childNodes) : null, e3, !r3 && i3 ? i3 : o3 ? o3.__e : t3.firstChild, r3, f4), D(e3, u4, f4), u4.props.children = null;
  }
  function X(n2) {
    function l3(n3) {
      var u4, t3;
      return this.getChildContext || (u4 = /* @__PURE__ */ new Set(), (t3 = {})[l3.__c] = this, this.getChildContext = function() {
        return t3;
      }, this.componentWillUnmount = function() {
        u4 = null;
      }, this.shouldComponentUpdate = function(n4) {
        this.props.value != n4.value && u4.forEach(function(n5) {
          n5.__e = true, A(n5);
        });
      }, this.sub = function(n4) {
        u4.add(n4);
        var l4 = n4.componentWillUnmount;
        n4.componentWillUnmount = function() {
          u4 && u4.delete(n4), l4 && l4.call(n4);
        };
      }), n3.children;
    }
    return l3.__c = "__cC" + y++, l3.__ = n2, l3.Provider = l3.__l = (l3.Consumer = function(n3, l4) {
      return n3.children(l4);
    }).contextType = l3, l3;
  }
  n = w.slice, l = { __e: function(n2, l3, u4, t3) {
    for (var i3, r3, o3; l3 = l3.__; ) if ((i3 = l3.__c) && !i3.__) try {
      if ((r3 = i3.constructor) && null != r3.getDerivedStateFromError && (i3.setState(r3.getDerivedStateFromError(n2)), o3 = i3.__d), null != i3.componentDidCatch && (i3.componentDidCatch(n2, t3 || {}), o3 = i3.__d), o3) return i3.__E = i3;
    } catch (l4) {
      n2 = l4;
    }
    throw n2;
  } }, u = 0, t = function(n2) {
    return null != n2 && void 0 === n2.constructor;
  }, C.prototype.setState = function(n2, l3) {
    var u4;
    u4 = null != this.__s && this.__s != this.state ? this.__s : this.__s = m({}, this.state), "function" == typeof n2 && (n2 = n2(m({}, u4), this.props)), n2 && m(u4, n2), null != n2 && this.__v && (l3 && this._sb.push(l3), A(this));
  }, C.prototype.forceUpdate = function(n2) {
    this.__v && (this.__e = true, n2 && this.__h.push(n2), A(this));
  }, C.prototype.render = S, i = [], o = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l3) {
    return n2.__v.__b - l3.__v.__b;
  }, H.__r = 0, f = Math.random().toString(8), c = "__d" + f, a = "__a" + f, s = /(PointerCapture)$|Capture$/i, h = 0, p = V(false), v = V(true), y = 0;

  // src/i18n/en.ts
  var AGE_UNITS = {
    minutes: "minutes",
    hours: "hours",
    days: "days"
  };
  var AGE_NOUN = { minutes: "minute", hours: "hour", days: "day" };
  var en = {
    language: {
      label: "Language",
      auto: "Auto (follow the browser)",
      ja: "日本語",
      en: "English"
    },
    /**
     * The post traits usable as conditions. They are the option names and also appear in
     * a condition's description.
     * The negated form is not held here, since conditions.trait attaches it.
     */
    traits: {
      repost: "Repost",
      quote: "Quote",
      reply: "Reply",
      communityNote: "With a Community Note",
      communityNoteRating: "With a Community Note to rate",
      pollOpen: "With a poll still open",
      pollClosed: "With a finished poll",
      linkCard: "With a link card",
      space: "With a Space",
      article: "With an Article",
      ad: "Ad or promoted post",
      media: "With a photo or video"
    },
    /**
     * How one condition is phrased. It appears both in rule names and as the note in the list.
     *
     * The assembly lives in the dictionary: how negation attaches and what the word order
     * is both change with the language, and concatenating on the caller's side cannot be
     * translated fully.
     */
    conditions: {
      text: (target, pattern, mode, negate) => {
        if (mode === "self") return `${target} ${negate ? "is not" : "is"} the author`;
        const verb = mode === "exact" ? negate ? "is not" : "is" : mode === "regex" ? negate ? "does not match" : "matches" : negate ? "does not contain" : "contains";
        return `${target} ${verb} “${pattern}”`;
      },
      trait: (name, negate) => negate ? `not ${name}` : name,
      /**
       * How old a post is, measured from the moment of judging.
       * With both a direction and a negation, there are four phrasings
       */
      age: (value, unit, direction, negate) => {
        const span = `${value} ${AGE_NOUN[unit]}${value === 1 ? "" : "s"}`;
        const verb = direction === "older" ? negate ? "is not older than" : "is older than" : negate ? "is not newer than" : "is newer than";
        return `the post ${verb} ${span}`;
      },
      /** A rule matches only when every condition holds (AND) */
      and: " and "
    },
    actions: {
      collapse: "Collapse",
      hide: "Hide",
      highlight: "Highlight",
      emphasize: "Emphasize",
      nothing: "Do nothing"
    },
    /** The button shown under a post cut off by the line limit. It follows X's wording */
    showMore: "Show more",
    placeholder: {
      /** Shown in the author's place when the author could not be read */
      post: "Post",
      show: "Show"
    },
    /** Where settings apply (the "tiers" of the design notes; that word is never shown on screen) */
    tiers: {
      label: "Where settings apply",
      global: "Global",
      accounts: "Account",
      columns: "Column",
      /** Settings with nothing to match, collected across the tiers */
      unassignedGroup: "Not assigned",
      notDetecting: "pro.x.com is not open, so the current state is unknown. What follows are the columns found earlier.",
      accountsEmpty: "No account found yet. Open pro.x.com and the accounts behind your columns will show up here.",
      columnsEmpty: "No column here yet. Open pro.x.com and the columns of the deck on screen will show up here.",
      /** A column with settings that was not found in the deck when it was reopened */
      columnMissing: "not found",
      /** When the columns are visible but not one of them could be identified */
      columnsUnidentified: "Your columns are open, but none of them could be identified, so per-column settings cannot be shown. Reloading pro.x.com usually fixes this.",
      unnamedColumn: "(column with no name)",
      missingColumn: "(column not found right now)",
      unknownColumn: "(column not found yet)",
      columnCount: (n2) => `${n2} ${n2 === 1 ? "column" : "columns"}`,
      nth: (n2) => `no. ${n2}`,
      deckNth: (n2) => `Deck ${n2}`,
      deckShowing: "showing",
      /** The accessible name of the entry point placed in a column header */
      columnEntry: "Settings for this column"
    },
    tabs: {
      label: "What to set",
      filter: "Filter",
      appearance: "Appearance",
      /** The result of merging the three tiers. Shown only while a column is selected */
      effective: "What applies"
    },
    effective: {
      hint: "What actually applies to this column, after combining the global, account and column settings. Nothing here can be edited — go to the tier it comes from.",
      from: { global: "Global", account: "Account", column: "This column" },
      unset: "Not set",
      rules: "Rules, in the order they are read",
      noRules: "No rule applies here",
      /** Disabled rules are listed too. This screen is for tracing "why is this not applying", so seeing that they exist helps */
      disabled: "off",
      filterStopped: "Filtering is off, so no rule below applies.",
      appearanceStopped: "Appearance is off, so nothing below applies.",
      appearance: "Appearance"
    },
    /** What happens to settings with nothing to match */
    forget: {
      action: "Remove this column from the list",
      hint: "Tidies up a column you deleted. If the column is still there, it comes back the next time it is found. The extension cannot tell deletion from being scrolled out of view.",
      confirm: "The settings for this column go with it. This cannot be undone.",
      confirmYes: "Remove with its settings",
      confirmNo: "Cancel"
    },
    unassigned: {
      badge: "Unassigned",
      configured: "Configured",
      chooseTarget: "Choose where to move it",
      remove: "Delete these settings",
      account: {
        notFound: "No matching account. The settings are kept.",
        moveTo: "Move these settings to an account that exists now",
        noTargets: "No account to move them to",
        skipConfigured: "Accounts that already have settings are left out, to avoid overwriting them."
      },
      column: {
        notFound: "No matching column. The settings are kept.",
        moveTo: "Move these settings to a column that exists now",
        noTargets: "No column to move them to",
        skipConfigured: "Columns that already have settings are left out, to avoid overwriting them."
      }
    },
    filterToggle: {
      label: "Filtering",
      on: "Apply",
      off: "Do not apply"
    },
    transfer: {
      open: "Import / export",
      legend: "Settings as JSON",
      /** The contents reveal things about the user's setup, so they get a look before passing it on */
      hint: "This includes your account names and column names. Check it before sharing. You can also paste settings here and load them.",
      save: "Save to a file",
      copy: "Copy",
      copied: "Copied",
      /** The clipboard can be refused. Do not fail silently */
      copyFailed: "Could not copy. Select the text above and copy it yourself.",
      close: "Close",
      choose: "Choose a file",
      load: "Replace my settings with this",
      /** Replacing cannot be undone, so it is confirmed once */
      confirm: "This replaces every setting you have. It cannot be undone.",
      confirmYes: "Replace",
      confirmNo: "Cancel",
      loaded: "Loaded",
      forget: "Forget the detected columns",
      forgotten: "Forgotten. Reload pro.x.com to rebuild it from the columns that are there",
      forgetFailed: "Could not forget it. Reopen this page and try again",
      errors: {
        badJson: (detail) => `Not valid JSON (${detail})`,
        notOurs: "This is not a settings file from this extension",
        badVersion: (version, supported) => `These settings are in a different format (version ${version}) from what this extension reads (version ${supported}), so they cannot be loaded`,
        /** A file can turn out to be unreadable (deleted, or no permission) */
        badFile: "Could not read that file"
      }
    },
    appearanceToggle: {
      label: "Appearance",
      on: "Apply",
      off: "Do not apply",
      /** Keeps the dimmed values below from reading as "what is in effect" while it is off */
      stoppedHint: "Appearance is off here, so nothing below is applied. What you set is still saved, and takes effect when you turn it back on."
    },
    rules: {
      legend: "Rules",
      hint: "Pick what the post is, then fill in only the boxes you want to match on. Picking a kind of post adds the boxes that go with it. The rule applies to posts that meet everything you filled in.",
      /**
       * The description of the selected action. Only the selected one is shown, next to
       * where the action is chosen.
       * All five listed at the top of the screen would be out of sight at the moment of
       * choosing. Hiding cannot be undone, so it has to be clear before the choice is made.
       */
      actionHints: {
        collapse: "Folds the post into a single line; press “Show” to bring it back.",
        hide: "Removes the post entirely, with no way to open it again.",
        highlight: "Keeps the post and tints its background.",
        emphasize: "Tints only the matched text.",
        nothing: "Stops every rule for that post, including the ones above this tier."
      },
      empty: "No rule yet",
      /**
       * The order in the list is the order rules are judged in.
       * This is the one description always shown on the filter tab, so the order across
       * tiers is gathered here as well.
       */
      orderHint: "Rules are read from the top, and the first one that matches decides what happens. Across tiers they are read column first, then account, then global. “Do nothing” ends the decision right there.",
      moveUp: (label) => `Move ${label} up`,
      moveDown: (label) => `Move ${label} down`,
      /** What a text condition looks at. Phrased as "whose" and "what" so it reads naturally */
      targets: {
        text: "the text",
        quotedText: "the quoted text",
        screenName: "the user ID",
        displayName: "the display name",
        repostedBy: "the reposter’s user ID",
        quotedScreenName: "the quoted user ID",
        quotedDisplayName: "the quoted display name",
        replyTo: "the reply-to user ID",
        pollChoice: "a poll choice",
        cardDomain: "the link domain",
        cardTitle: "the card headline",
        spaceName: "the Space name",
        articleText: "the article headline and intro"
      },
      /** An empty box means not filtering on that target */
      anyPlaceholder: "any",
      /**
       * The choice of not filtering in that box (the same word is used for traits and text).
       * A trait-only rule has "Any" for the text, and a text-only rule has "Any" for the trait
       */
      any: "Any",
      modes: {
        contains: "Contains",
        exact: "Matches exactly",
        regex: "Regular expression",
        /** Compares against that post's own author. It carries no pattern */
        self: "Is the author"
      },
      negate: "Not",
      ageLabel: "Post age",
      ageUnits: AGE_UNITS,
      ageDirections: { older: "older than", newer: "newer than" },
      ageError: "Enter a whole number of 1 or more",
      /** The per-rule on/off. A switch for stopping a rule temporarily rather than deleting it */
      enabled: "On",
      modeLabel: "How to match",
      traitLabel: "What the post is",
      actionLabel: "What to do on a match",
      namePlaceholder: "rule name (optional)",
      caseSensitive: "Match case",
      /** The button opening the add form. No input boxes are shown until it is pressed */
      openForm: "Add a rule",
      /** The button closing the add form. It means something different from "Cancel", which abandons an edit */
      closeForm: "Close",
      add: "Add",
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      remove: "Delete",
      /** The single confirmation before deleting */
      removeConfirm: "Delete this rule? This cannot be undone.",
      removeYes: "Delete",
      removeNo: "Keep it",
      errors: {
        /** When neither a trait nor any text was given: it would match every post */
        noCondition: "Pick what the post is, or fill in at least one box",
        badRegex: (detail) => `Not a valid regular expression (${detail})`,
        duplicate: "That rule already exists",
        /** When "Emphasize" is chosen for a rule with nothing to paint */
        noEmphasisTarget: "Emphasize needs a condition on something written on screen — that is where the matched characters get tinted. Who reposted, poll choices, text inside cards or Spaces, and “is the author” cannot be tinted"
      }
    },
    /** Color input */
    color: {
      label: "Color",
      /**
       * The short dimmed text inside the box (only 116px wide). It says no more than
       * where the color came from.
       * The color itself is shown by the swatch beside it, and longer explanations go to
       * `title` and the accessible name.
       */
      unsetShort: "Not set",
      fallbackShort: "default",
      inheritedShort: "inherited",
      /** Shows the color actually used when the box is empty */
      fallback: (color) => `default (${color})`,
      /** A color coming down from a wider scope. Unlike a default, it can be traced and changed */
      inherited: (color) => `from a wider scope (${color})`,
      /** What an empty box means in fields with no stand-in color (the appearance palette) */
      unset: "Not set (X Pro default)",
      error: "Enter a color code as #rrggbb, or #rrggbbaa to include opacity",
      /** The picker's (Coloris) messages */
      picker: {
        clear: "Clear",
        close: "Close",
        open: "Open the color picker",
        closeLabel: "Close the color picker",
        clearLabel: "Clear the selected color",
        marker: (s3, v3) => `Saturation ${s3}, brightness ${v3}`,
        hue: "Hue",
        alpha: "Opacity",
        input: "Color code",
        format: "Format",
        swatch: "Color swatch",
        instruction: "Pick saturation and brightness. Use the arrow keys to move."
      }
    },
    /** Appearance. Every item left empty or unset keeps the way X Pro shows it */
    appearance: {
      legend: "Size and display",
      hint: "Anything left empty or unset keeps the way X Pro shows it.",
      columnWidth: "Column width",
      fontSize: "Post text size",
      maxLines: "Post text line limit",
      lines: "lines",
      colors: {
        legend: "Colors",
        columnHeader: "Behind the column name",
        background: "Column background",
        columnTitle: "Column name",
        name: "Author name",
        text: "Post text",
        meta: "Secondary text (times, counts, reply-to)",
        link: "Links and “Show more”",
        border: "Line between posts"
      },
      autoContrast: "When a highlight makes text unreadable",
      autoContrastOn: "Fix the text color",
      autoContrastOff: "Leave it alone",
      /** What a highlight color is laid over */
      highlightBase: "Blend highlights over",
      highlightBases: {
        column: "The column background",
        theme: "X’s background (ignore the column color)"
      },
      /** How a post's time is shown */
      timeFormat: "Time display",
      timeFormats: {
        relative: "As X shows it",
        absolute: "Date and time",
        both: "Both"
      },
      /**
       * How a post's time is written. The order of the date parts changes with the
       * language, so it lives in the dictionary.
       * `year` is null for the current year (omitted)
       */
      timeAbsolute: (year, month, day, hour, minute) => {
        const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const date = `${MONTHS[month - 1]} ${day}${year === null ? "" : ` ${year}`}`;
        return `${date}, ${hour}:${minute}`;
      },
      /** Today's posts show the clock time alone (under "both", the relative time in parentheses fills in the date) */
      timeClock: (hour, minute) => `${hour}:${minute}`,
      /**
       * The characters wrapping X's relative time under "both". Halfwidth in both
       * languages, with a space in front.
       * The values are identical for now, but how parentheses are used can differ by
       * language, so they stay in the dictionary
       */
      timeParens: { open: " (", close: ")" },
      media: {
        maxThumbHeight: "Largest thumbnail height",
        collapse: "Photos and videos",
        collapseOn: "Do not show",
        collapseOff: "Show"
      }
    },
    /** Sizes entered in px */
    size: {
      unit: "px",
      unset: "Not set",
      /**
       * The value coming down from a wider scope when the box is empty.
       * The box is narrow, so the dimmed text shows only the number; the explanation for
       * screen readers lives in `inheritedLabel`.
       */
      inheritedLabel: (label, value, unit) => `${label} (not set; inherits ${value} ${unit} from a wider scope)`,
      error: "Enter a whole number of pixels, or leave it empty"
    },
    /** The notice shown briefly in a corner of the screen */
    status: {
      /** The same wording is used when a save from another screen arrives */
      saved: "Saved",
      saveFailed: "Could not save. What you see here is not stored yet"
    },
    /** When the stored format version differs and cannot be read */
    unreadable: {
      newer: (stored, supported) => `The saved settings use format version ${stored}, which is newer than the version this extension supports (${supported}), so they cannot be read. Your settings are still saved. Please update the extension.`,
      older: (stored, supported) => `The saved settings use format version ${stored}; this extension uses version ${supported}, and the two are not compatible, so it started from the defaults. The old settings are still stored and are replaced only once you change something here.`
    },
    /** Not set (on toggle-style rules, inheriting the setting from above) */
    unset: "Not set",
    title: "X Pro Tweaks settings",
    /** The panel that opens inside pro.x.com */
    panel: {
      close: "Close the settings"
    },
    /** The notice when one of X's markers breaks. What stops differs per marker, so each has its own sentence */
    health: {
      cell: "The way posts are marked seems to have changed. Neither filters nor appearance apply.",
      post: "The way posts are read seems to have changed. Filters do not apply.",
      column: "The way columns are identified seems to have changed. Per-column settings do not apply (account and global settings still do).",
      text: 'The way post text is read seems to have changed. Rules that look at text are off (otherwise a "does not contain" condition would match every post).',
      hint: "This clears itself once X changes back. Reload pro.x.com to check again."
    },
    adGuardNotice: "Too many posts looked like ads, so the ad rules were turned off to avoid hiding everything. Reload pro.x.com to try again.",
    /**
     * The notice shown on the settings screen while the extension is paused.
     * Being paused is shown only in the popup, so without this there is nothing on screen
     * to say why the settings have no effect
     */
    pausedNotice: "The extension is paused, so nothing here is applied. Your changes are still saved. Resume it from the toolbar icon.",
    /** The popup on the toolbar icon */
    popup: {
      openPanel: "Open the settings here",
      openOptions: "Open the settings page",
      /** States which one it currently is. A toggle alone does not say what the state was before pressing */
      running: "Running on pro.x.com",
      paused: "Paused — nothing is applied",
      pause: "Pause",
      resume: "Resume",
      saveFailed: "Could not switch. Reopen the browser and try again"
    }
  };

  // src/i18n/ja.ts
  var AGE_UNITS2 = { minutes: "分", hours: "時間", days: "日" };
  var ja = {
    language: {
      label: "表示言語",
      auto: "自動（ブラウザに合わせる）",
      ja: "日本語",
      en: "English"
    },
    traits: {
      repost: "リポスト",
      quote: "引用",
      reply: "リプライ",
      communityNote: "コミュニティノート付き",
      communityNoteRating: "コミュニティノートの評価待ち",
      pollOpen: "アンケート（回答受付中）",
      pollClosed: "アンケート（結果）",
      linkCard: "リンクカード付き",
      space: "スペース付き",
      article: "記事付き",
      ad: "広告・プロモ",
      media: "画像・動画あり"
    },
    conditions: {
      text: (target, pattern, mode, negate) => {
        if (mode === "self") return `${target}が自分自身${negate ? "でない" : ""}`;
        const suffix = mode === "exact" ? negate ? "と一致しない" : "と完全に一致" : mode === "regex" ? negate ? "に一致しない" : "に一致" : negate ? "を含まない" : "を含む";
        return `${target}が「${pattern}」${suffix}`;
      },
      trait: (name, negate) => negate ? `${name}ではない` : name,
      // How old a post is, shaped to read as "the post is older than one hour"
      age: (value, unit, direction, negate) => {
        const suffix = direction === "older" ? negate ? "より古くない" : "より古い" : negate ? "より新しくない" : "より新しい";
        return `投稿が${value}${AGE_UNITS2[unit]}${suffix}`;
      },
      and: " かつ "
    },
    actions: {
      collapse: "折りたたむ",
      hide: "非表示",
      highlight: "ハイライト",
      emphasize: "強調",
      nothing: "何もしない"
    },
    showMore: "さらに表示",
    placeholder: {
      post: "投稿",
      show: "表示"
    },
    tiers: {
      label: "設定の範囲",
      global: "グローバル",
      accounts: "アカウント",
      columns: "カラム",
      unassignedGroup: "未割り当て",
      notDetecting: "pro.x.com を開いていないので、いまの状態は分かりません。並んでいるのは前に見つけたカラムです。",
      accountsEmpty: "まだアカウントが見つかっていません。pro.x.com を開くと、カラムの所属アカウントがここに並びます。",
      columnsEmpty: "カラムがまだ1本もありません。pro.x.com を開くと、表示中のデッキのカラムがここに並びます。",
      columnMissing: "見つかりません",
      columnsUnidentified: "カラムは開いていますが、1本も見分けられなかったため、カラムごとの設定を出せません。pro.x.com を再読み込みすると直ることがあります。",
      unnamedColumn: "（名前のないカラム）",
      missingColumn: "（いま見つからないカラム）",
      unknownColumn: "（まだ見つけていないカラム）",
      columnCount: (n2) => `カラム ${n2} 個`,
      nth: (n2) => `${n2} 番目`,
      /** What a deck is called when its name is unreadable. Names depend on the UI language, whereas a number never breaks */
      deckNth: (n2) => `デッキ ${n2}`,
      deckShowing: "表示中",
      columnEntry: "このカラムの設定"
    },
    tabs: {
      label: "設定の種類",
      filter: "フィルタ",
      appearance: "見た目",
      effective: "適用中の設定"
    },
    effective: {
      hint: "グローバル・アカウント・カラムの設定をまとめた、このカラムに実際に適用される内容です。ここでは変えられません。直すときは、由来として出ている範囲へ移ってください。",
      from: { global: "グローバル", account: "アカウント", column: "このカラム" },
      unset: "指定なし",
      rules: "ルール（判定する順）",
      noRules: "このカラムに効くルールはありません",
      disabled: "無効",
      filterStopped: "フィルタを止めているので、下のルールはどれも効きません。",
      appearanceStopped: "外観を止めているので、下の指定はどれも効きません。",
      appearance: "見た目"
    },
    /** Removes one column from the record of detected columns */
    forget: {
      action: "このカラムを一覧から消す",
      hint: "消したカラムを片付けます。まだ残っているカラムなら、次に見つけたときまた並びます。X 側で消したかどうかは拡張からは分からないので、この操作でしか消せません。",
      confirm: "このカラムの設定も一緒に消えます。元に戻せません。",
      confirmYes: "設定ごと消す",
      confirmNo: "やめる"
    },
    unassigned: {
      badge: "未割り当て",
      configured: "設定あり",
      chooseTarget: "移す先を選ぶ",
      remove: "この設定を削除",
      account: {
        notFound: "対応するアカウントが見つかりません。設定は残してあります",
        moveTo: "この設定を、いまあるアカウントに移す",
        noTargets: "移せるアカウントがありません",
        skipConfigured: "すでに設定があるアカウントは、上書きを避けるため移す先に出しません。"
      },
      column: {
        notFound: "対応するカラムが見つかりません。設定は残してあります",
        moveTo: "この設定を、いまあるカラムに移す",
        noTargets: "移せるカラムがありません",
        skipConfigured: "すでに設定があるカラムは、上書きを避けるため移す先に出しません。"
      }
    },
    filterToggle: {
      label: "フィルタの適用",
      on: "適用する",
      off: "適用しない"
    },
    appearanceToggle: {
      label: "外観の適用",
      on: "適用する",
      off: "適用しない",
      stoppedHint: "ここでは外観を適用していないので、下の指定はどれも効きません。指定はそのまま保存され、「適用する」に戻したときに効きます。"
    },
    transfer: {
      open: "設定の入出力",
      legend: "設定の JSON",
      hint: "アカウント名とカラム名が入ります。人に渡す前に中身を確かめてください。この欄に貼り付けて読み込むこともできます。",
      save: "ファイルに保存",
      copy: "コピー",
      copied: "コピーしました",
      copyFailed: "コピーできませんでした。上の欄を選んでコピーしてください",
      close: "閉じる",
      choose: "ファイルを選ぶ",
      load: "この内容で設定を置き換える",
      confirm: "いまの設定をすべて置き換えます。元に戻せません。",
      confirmYes: "置き換える",
      confirmNo: "やめる",
      loaded: "読み込みました",
      /** Columns that are out of sight are never deleted automatically, so tidying up is done by hand */
      forget: "検出したカラムの記録を消す",
      forgotten: "記録を消しました。pro.x.com を開き直すと、いま在るカラムから作り直します",
      forgetFailed: "記録を消せませんでした。この画面を開き直してからもう一度お試しください",
      errors: {
        badJson: (detail) => `JSON として読めません（${detail}）`,
        notOurs: "この拡張の設定ファイルではありません",
        badVersion: (version, supported) => `設定の形式（version ${version}）が、この拡張の扱う形式（version ${supported}）と違うため読み込めません`,
        badFile: "ファイルを読めませんでした"
      }
    },
    rules: {
      legend: "ルール",
      hint: "投稿の種類を選び、絞りたい欄だけを埋めます。種類を選ぶと、その種類に関わる欄が増えます。埋めた内容をすべて満たす投稿に一致します。",
      actionHints: {
        collapse: "投稿を1行にまとめます。「表示」を押すと元に戻ります。",
        hide: "投稿ごと消します。開き直す方法はありません。",
        highlight: "投稿を残したまま背景に色を付けます。",
        emphasize: "一致した文字だけに色を付けます。",
        nothing: "その投稿への指定を、上位の範囲のものまで含めて止めます。"
      },
      empty: "まだルールがありません",
      orderHint: "上から順に見て、最初に一致したルールの動作を使います。範囲をまたぐときは、カラム設定 → アカウント設定 → グローバル設定の順に見ます。「何もしない」に一致すると、そこで判定が終わります。",
      moveUp: (label) => `${label}を上へ`,
      moveDown: (label) => `${label}を下へ`,
      targets: {
        text: "本文",
        quotedText: "引用元の本文",
        screenName: "ユーザーID",
        displayName: "表示名",
        repostedBy: "リポストした人のID",
        quotedScreenName: "引用元の投稿者のID",
        quotedDisplayName: "引用元の投稿者の表示名",
        replyTo: "返信先のID",
        pollChoice: "アンケートの選択肢",
        cardDomain: "リンク先のドメイン",
        cardTitle: "カードの見出し",
        spaceName: "スペースの名前",
        articleText: "記事の見出しと書き出し"
      },
      anyPlaceholder: "すべて",
      any: "すべて",
      modes: {
        contains: "含む",
        exact: "完全に一致",
        regex: "正規表現",
        /** Compares against that post's own author. It carries no pattern */
        self: "自分自身"
      },
      negate: "条件を反転",
      ageLabel: "投稿の古さ",
      ageUnits: AGE_UNITS2,
      ageDirections: { older: "より古い", newer: "より新しい" },
      ageError: "1 以上の整数を入力してください",
      enabled: "有効",
      modeLabel: "一致方法",
      traitLabel: "投稿の種類",
      actionLabel: "一致したときの動作",
      namePlaceholder: "ルール名（省略可）",
      caseSensitive: "大文字小文字を区別",
      openForm: "ルールを追加",
      closeForm: "閉じる",
      add: "追加",
      save: "保存",
      cancel: "取消",
      edit: "編集",
      remove: "削除",
      removeConfirm: "このルールを削除します。元に戻せません。",
      removeYes: "削除する",
      removeNo: "やめる",
      errors: {
        noCondition: "投稿の種類を選ぶか、どれか1つの欄を埋めてください",
        badRegex: (detail) => `正規表現として読めません（${detail}）`,
        duplicate: "すでに同じルールがあります",
        noEmphasisTarget: "「強調」には、画面に文字として出ている対象を見る条件が要ります（そこで一致した文字に色を付けます）。リポストした人・アンケートの選択肢・カードやスペースの文字と、「自分自身」の指定には色を付けられません"
      }
    },
    color: {
      label: "色",
      unsetShort: "未指定",
      fallbackShort: "既定",
      inheritedShort: "上位",
      fallback: (color) => `既定（${color}）`,
      inherited: (color) => `上位の設定（${color}）`,
      unset: "未指定（X Pro 標準）",
      error: "カラーコードは #rrggbb か、不透明度を含む #rrggbbaa の形式で入力してください",
      picker: {
        clear: "消す",
        close: "閉じる",
        open: "カラーピッカーを開く",
        closeLabel: "カラーピッカーを閉じる",
        clearLabel: "選んだ色を消す",
        marker: (s3, v3) => `鮮やかさ ${s3}、明るさ ${v3}`,
        hue: "色あい",
        alpha: "不透明度",
        input: "カラーコード",
        format: "形式",
        swatch: "色の見本",
        instruction: "鮮やかさと明るさを選びます。上下左右のキーで動かせます。"
      }
    },
    appearance: {
      legend: "大きさと表示",
      hint: "空欄・未指定の項目は、X Pro の表示のままになります。",
      columnWidth: "カラムの幅",
      fontSize: "本文の字の大きさ",
      maxLines: "本文の行数の上限",
      lines: "行",
      colors: {
        legend: "配色",
        columnHeader: "カラム名の帯の背景",
        background: "カラムの背景",
        columnTitle: "カラム名",
        name: "投稿者の名前",
        text: "本文",
        meta: "薄い文字（時刻・件数・返信先）",
        link: "リンクと「さらに表示」",
        border: "投稿と投稿の境目の線"
      },
      autoContrast: "ハイライトで文字が読めなくなったとき",
      autoContrastOn: "文字の色を自動で直す",
      autoContrastOff: "何もしない",
      highlightBase: "ハイライトの色を重ねる先",
      highlightBases: {
        column: "カラムの背景",
        theme: "X の背景（カラムの色を無視）"
      },
      timeFormat: "時刻の表示",
      timeFormats: {
        relative: "X の表示のまま",
        absolute: "日付と時刻",
        both: "両方"
      },
      timeAbsolute: (year, month, day, hour, minute) => `${year === null ? "" : `${year}年`}${month}月${day}日 ${hour}:${minute}`,
      timeClock: (hour, minute) => `${hour}:${minute}`,
      timeParens: { open: " (", close: ")" },
      media: {
        maxThumbHeight: "サムネイルの高さの上限",
        collapse: "画像と動画の表示",
        collapseOn: "表示しない",
        collapseOff: "表示する"
      }
    },
    size: {
      unit: "px",
      unset: "未指定",
      inheritedLabel: (label, value, unit) => `${label}（未指定。上位の設定の ${value}${unit} が適用されます）`,
      error: "整数のピクセル数を入力するか、空欄にしてください"
    },
    status: {
      // The same wording is used when a save from another screen arrives
      saved: "保存しました",
      // The state where what is on screen and what is stored disagree
      saveFailed: "保存できませんでした。この画面に見えている設定はまだ保存されていません"
    },
    unreadable: {
      newer: (stored, supported) => `保存されている設定の形式（version ${stored}）が、この拡張の対応する形式（version ${supported}）より新しいため読み込めません。設定は保存されたまま残っています。拡張を更新してください。`,
      older: (stored, supported) => `保存されている設定の形式（version ${stored}）は、この拡張の形式（version ${supported}）と互換性がないため、初期状態で始めました。以前の設定は保存されたまま残っていて、ここで何かを変えたときに置き換わります。`
    },
    unset: "未指定",
    title: "X Pro Tweaks の設定",
    panel: {
      close: "設定を閉じる"
    },
    /** The broken markers of X. What stops differs per marker, so each is described separately */
    health: {
      cell: "投稿の見分け方が変わったようです。フィルタも外観も適用されていません。",
      post: "投稿の読み取り方が変わったようです。フィルタが適用されていません。",
      column: "カラムの見分け方が変わったようです。カラムごとの設定が効きません（アカウントとグローバルの設定は効いています）。",
      text: "本文の読み取り方が変わったようです。本文を見るルールを止めています（止めないと、打ち消しの条件がすべての投稿に一致します）。",
      hint: "X 側の作りが戻れば自動で直ります。pro.x.com を開き直すと確かめ直します。"
    },
    adGuardNotice: "広告と判定される投稿が多すぎたため、すべて消してしまわないように広告のルールを止めました。pro.x.com を再読み込みすると、また判定を試します。",
    pausedNotice: "拡張を一時的に止めています。ここでの設定は保存されますが、いまは効きません。ツールバーのアイコンから再開できます。",
    popup: {
      openPanel: "このページで設定を開く",
      openOptions: "設定のページを開く",
      running: "pro.x.com で動いています",
      paused: "止めています（何も適用していません）",
      pause: "一時的に止める",
      resume: "再開する",
      saveFailed: "切り替えられませんでした。ブラウザを開き直してからもう一度お試しください"
    }
  };

  // src/i18n/index.ts
  var LOCALES = ["ja", "en"];
  var LANGUAGES = ["auto", ...LOCALES];
  var isLanguage = (v3) => LANGUAGES.includes(v3);
  var MESSAGES = { ja, en };
  var messagesFor = (locale) => MESSAGES[locale];
  var resolveLocale = (language, browserLanguage) => {
    if (language !== "auto") return language;
    return browserLanguage.toLowerCase().startsWith("ja") ? "ja" : "en";
  };
  var localeOf = (language) => resolveLocale(language, navigator.language);

  // node_modules/preact/hooks/dist/hooks.module.js
  var t2;
  var r2;
  var u2;
  var i2;
  var o2 = 0;
  var f2 = [];
  var c2 = l;
  var e2 = c2.__b;
  var a2 = c2.__r;
  var v2 = c2.diffed;
  var l2 = c2.__c;
  var m2 = c2.unmount;
  var p2 = c2.__;
  function s2(n2, t3) {
    c2.__h && c2.__h(r2, n2, o2 || t3), o2 = 0;
    var u4 = r2.__H || (r2.__H = { __: [], __h: [] });
    return n2 >= u4.__.length && u4.__.push({}), u4.__[n2];
  }
  function d2(n2) {
    return o2 = 1, y2(D2, n2);
  }
  function y2(n2, u4, i3) {
    var o3 = s2(t2++, 2);
    if (o3.t = n2, !o3.__c && (o3.__ = [i3 ? i3(u4) : D2(void 0, u4), function(n3) {
      var t3 = o3.__N ? o3.__N[0] : o3.__[0], r3 = o3.t(t3, n3);
      t3 !== r3 && (o3.__N = [r3, o3.__[1]], o3.__c.setState({}));
    }], o3.__c = r2, !r2.__f)) {
      var f4 = function(n3, t3, r3) {
        if (!o3.__c.__H) return true;
        var u5 = false, i4 = o3.__c.props !== n3;
        if (o3.__c.__H.__.some(function(n4) {
          if (n4.__N) {
            u5 = true;
            var t4 = n4.__[0];
            n4.__ = n4.__N, n4.__N = void 0, t4 !== n4.__[0] && (i4 = true);
          }
        }), c3) {
          var f5 = c3.call(this, n3, t3, r3);
          return u5 ? f5 || i4 : f5;
        }
        return !u5 || i4;
      };
      r2.__f = true;
      var c3 = r2.shouldComponentUpdate, e3 = r2.componentWillUpdate;
      r2.componentWillUpdate = function(n3, t3, r3) {
        if (this.__e) {
          var u5 = c3;
          c3 = void 0, f4(n3, t3, r3), c3 = u5;
        }
        e3 && e3.call(this, n3, t3, r3);
      }, r2.shouldComponentUpdate = f4;
    }
    return o3.__N || o3.__;
  }
  function h2(n2, u4) {
    var i3 = s2(t2++, 3);
    !c2.__s && C2(i3.__H, u4) && (i3.__ = n2, i3.u = u4, r2.__H.__h.push(i3));
  }
  function A2(n2) {
    return o2 = 5, T2(function() {
      return { current: n2 };
    }, []);
  }
  function T2(n2, r3) {
    var u4 = s2(t2++, 7);
    return C2(u4.__H, r3) && (u4.__ = n2(), u4.__H = r3, u4.__h = n2), u4.__;
  }
  function q2(n2, t3) {
    return o2 = 8, T2(function() {
      return n2;
    }, t3);
  }
  function x2(n2) {
    var u4 = r2.context[n2.__c], i3 = s2(t2++, 9);
    return i3.c = n2, u4 ? (null == i3.__ && (i3.__ = true, u4.sub(r2)), u4.props.value) : n2.__;
  }
  function j2() {
    for (var n2; n2 = f2.shift(); ) {
      var t3 = n2.__H;
      if (n2.__P && t3) try {
        t3.__h.some(z2), t3.__h.some(B2), t3.__h = [];
      } catch (r3) {
        t3.__h = [], c2.__e(r3, n2.__v);
      }
    }
  }
  c2.__b = function(n2) {
    r2 = null, e2 && e2(n2);
  }, c2.__ = function(n2, t3) {
    n2 && t3.__k && t3.__k.__m && (n2.__m = t3.__k.__m), p2 && p2(n2, t3);
  }, c2.__r = function(n2) {
    a2 && a2(n2), t2 = 0;
    var i3 = (r2 = n2.__c).__H;
    i3 && (u2 === r2 ? (i3.__h = [], r2.__h = [], i3.__.some(function(n3) {
      n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
    })) : (i3.__h.some(z2), i3.__h.some(B2), i3.__h = [], t2 = 0)), u2 = r2;
  }, c2.diffed = function(n2) {
    v2 && v2(n2);
    var t3 = n2.__c;
    t3 && t3.__H && (t3.__H.__h.length && (1 !== f2.push(t3) && i2 === c2.requestAnimationFrame || ((i2 = c2.requestAnimationFrame) || w2)(j2)), t3.__H.__.some(function(n3) {
      n3.u && (n3.__H = n3.u, n3.u = void 0);
    })), u2 = r2 = null;
  }, c2.__c = function(n2, t3) {
    t3.some(function(n3) {
      try {
        n3.__h.some(z2), n3.__h = n3.__h.filter(function(n4) {
          return !n4.__ || B2(n4);
        });
      } catch (r3) {
        t3.some(function(n4) {
          n4.__h && (n4.__h = []);
        }), t3 = [], c2.__e(r3, n3.__v);
      }
    }), l2 && l2(n2, t3);
  }, c2.unmount = function(n2) {
    m2 && m2(n2);
    var t3, r3 = n2.__c;
    r3 && r3.__H && (r3.__H.__.some(function(n3) {
      try {
        z2(n3);
      } catch (n4) {
        t3 = n4;
      }
    }), r3.__H = void 0, t3 && c2.__e(t3, r3.__v));
  };
  var k2 = "function" == typeof requestAnimationFrame;
  function w2(n2) {
    var t3, r3 = function() {
      clearTimeout(u4), k2 && cancelAnimationFrame(t3), setTimeout(n2);
    }, u4 = setTimeout(r3, 35);
    k2 && (t3 = requestAnimationFrame(r3));
  }
  function z2(n2) {
    var t3 = r2, u4 = n2.__c;
    "function" == typeof u4 && (n2.__c = void 0, u4()), r2 = t3;
  }
  function B2(n2) {
    var t3 = r2;
    n2.__c = n2.__(), r2 = t3;
  }
  function C2(n2, t3) {
    return !n2 || n2.length !== t3.length || t3.some(function(t4, r3) {
      return t4 !== n2[r3];
    });
  }
  function D2(n2, t3) {
    return "function" == typeof t3 ? t3(n2) : t3;
  }

  // src/ui/messages.tsx
  var MessagesContext = X(messagesFor("en"));
  var MessagesProvider = MessagesContext.Provider;
  var useMessages = () => x2(MessagesContext);

  // src/settings/schema.ts
  var SCHEMA_VERSION = 3;
  var ACTIONS = {
    COLLAPSE: "collapse",
    // fold it up
    HIDE: "hide",
    // remove it without a trace
    HIGHLIGHT: "highlight",
    // keep it shown, with a background color
    EMPHASIZE: "emphasize",
    // color only the matched characters
    NOTHING: "nothing"
    // stop every setting for this post (those of upper tiers included)
  };
  var TRAIT_KEYS = [
    "repost",
    "quote",
    "reply",
    "communityNote",
    "communityNoteRating",
    "pollOpen",
    "pollClosed",
    "linkCard",
    "space",
    "article",
    "ad",
    "media"
  ];
  var DEFAULT_HIGHLIGHT_COLOR = "#f9188026";
  var DEFAULT_EMPHASIS_COLOR = "#f9188066";
  var usesColor = (action) => action === ACTIONS.HIGHLIGHT || action === ACTIONS.EMPHASIZE;
  var defaultColorFor = (action) => action === ACTIONS.EMPHASIZE ? DEFAULT_EMPHASIS_COLOR : DEFAULT_HIGHLIGHT_COLOR;
  var filterApplies = (enabled) => enabled !== false;
  var mediaCollapses = (collapse) => collapse === true;
  var adjustsContrast = (autoContrast) => autoContrast !== false;
  var HIGHLIGHT_BASES = ["column", "theme"];
  var isHighlightBase = (v3) => HIGHLIGHT_BASES.includes(v3);
  var highlightBaseOf = (value) => value ?? "column";
  var TIME_FORMATS = ["relative", "absolute", "both"];
  var isTimeFormat = (v3) => TIME_FORMATS.includes(v3);
  var timeFormatOf = (value) => value ?? "relative";
  var appearanceApplies = (enabled) => enabled !== false;
  var MATCH_TARGETS = [
    "text",
    "quotedText",
    "screenName",
    "displayName",
    "repostedBy",
    "quotedScreenName",
    "quotedDisplayName",
    "replyTo",
    "pollChoice",
    "cardDomain",
    "cardTitle",
    "spaceName",
    "articleText"
  ];
  var isScreenNameTarget = (target) => target === "screenName" || target === "repostedBy" || target === "quotedScreenName" || target === "replyTo";
  var EMPHASIZABLE_TARGETS = [
    "text",
    "quotedText",
    "screenName",
    "displayName",
    "quotedScreenName",
    "quotedDisplayName",
    "replyTo"
  ];
  var canEmphasize = (target) => EMPHASIZABLE_TARGETS.includes(target);
  var COMMON_TARGETS = [
    "text",
    "screenName",
    "displayName"
  ];
  var TARGETS_BY_TRAIT = {
    repost: ["repostedBy"],
    quote: ["quotedText", "quotedScreenName", "quotedDisplayName"],
    reply: ["replyTo"],
    communityNote: [],
    communityNoteRating: [],
    pollOpen: ["pollChoice"],
    pollClosed: ["pollChoice"],
    linkCard: ["cardDomain", "cardTitle"],
    space: ["spaceName"],
    article: ["articleText"],
    ad: [],
    media: []
  };
  var targetsFor = (trait) => trait ? [...COMMON_TARGETS, ...TARGETS_BY_TRAIT[trait]] : COMMON_TARGETS;
  var MATCH_MODES = ["contains", "exact", "regex", "self"];
  var isSelfMode = (mode) => mode === "self";
  var canCompareToSelf = (target) => isScreenNameTarget(target) && target !== "screenName";
  var AGE_DIRECTIONS = ["older", "newer"];
  var AGE_UNITS3 = ["minutes", "hours", "days"];
  var MINUTES_IN = { minutes: 1, hours: 60, days: 60 * 24 };
  var minutesOf = (value, unit) => value * MINUTES_IN[unit];
  var splitDuration = (minutes) => {
    for (const unit of ["days", "hours"]) {
      const size3 = MINUTES_IN[unit];
      if (minutes % size3 === 0) return { value: minutes / size3, unit };
    }
    return { value: minutes, unit: "minutes" };
  };
  var canEmphasizeWith = (condition2) => condition2.kind === "text" && !condition2.negate && canEmphasize(condition2.target) && !isSelfMode(condition2.mode);
  var describeCondition = (condition2, m3) => {
    if (condition2.kind === "trait") return m3.conditions.trait(m3.traits[condition2.trait], condition2.negate);
    if (condition2.kind === "age") {
      const { value, unit } = splitDuration(condition2.minutes);
      return m3.conditions.age(value, unit, condition2.direction, condition2.negate);
    }
    return m3.conditions.text(
      m3.rules.targets[condition2.target],
      condition2.pattern,
      condition2.mode,
      condition2.negate
    );
  };
  var ruleName = (rule2, m3) => rule2.label || rule2.conditions.map((c3) => describeCondition(c3, m3)).join(m3.conditions.and);
  var isRecord = (v3) => typeof v3 === "object" && v3 !== null && !Array.isArray(v3);
  var rec = (v3) => isRecord(v3) ? v3 : {};
  var arr = (v3) => Array.isArray(v3) ? v3 : [];
  var str = (v3) => typeof v3 === "string" ? v3 : null;
  var bool = (v3) => typeof v3 === "boolean" ? v3 : null;
  var size = (v3) => typeof v3 === "number" && Number.isInteger(v3) && v3 > 0 ? v3 : null;
  var isAction = (v3) => Object.values(ACTIONS).includes(v3);
  var HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  var hexColor = (v3) => typeof v3 === "string" && HEX_COLOR_PATTERN.test(v3) ? v3.toLowerCase() : null;
  var isTarget = (v3) => MATCH_TARGETS.includes(v3);
  var isMode = (v3) => MATCH_MODES.includes(v3);
  var isTraitKey = (v3) => TRAIT_KEYS.includes(v3);
  var condition = (v3) => {
    const o3 = rec(v3);
    const negate = bool(o3.negate) ?? false;
    if (o3.kind === "trait") {
      return isTraitKey(o3.trait) ? { kind: "trait", trait: o3.trait, negate } : null;
    }
    if (o3.kind === "age") {
      const minutes = o3.minutes;
      if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes <= 0) return null;
      const direction = o3.direction === "newer" ? "newer" : "older";
      return { kind: "age", direction, minutes, negate };
    }
    if (o3.kind !== "text") return null;
    const target = isTarget(o3.target) ? o3.target : "text";
    const mode = isMode(o3.mode) ? o3.mode : "contains";
    if (isSelfMode(mode)) {
      return canCompareToSelf(target) ? { kind: "text", target, mode, pattern: "", caseSensitive: false, negate } : null;
    }
    const pattern = str(o3.pattern);
    if (!pattern) return null;
    return {
      kind: "text",
      target,
      mode,
      pattern,
      caseSensitive: bool(o3.caseSensitive) ?? false,
      negate
    };
  };
  var rule = (v3) => {
    const o3 = rec(v3);
    const conditions = arr(o3.conditions).map(condition).filter(isPresent);
    if (conditions.length === 0) return null;
    return {
      id: str(o3.id) ?? newRuleId(),
      conditions,
      action: isAction(o3.action) ? o3.action : ACTIONS.COLLAPSE,
      color: hexColor(o3.color),
      label: str(o3.label) ?? "",
      // Settings with no on/off are taken as never having been meant to be stopped, and are enabled
      enabled: bool(o3.enabled) ?? true
    };
  };
  var syncOrder = (order, rules) => {
    const ids = new Set(rules.map((rule2) => rule2.id));
    const kept = [];
    const seen = /* @__PURE__ */ new Set();
    for (const raw of arr(order)) {
      const id = str(raw);
      if (!id || !ids.has(id) || seen.has(id)) continue;
      seen.add(id);
      kept.push(id);
    }
    return [...kept, ...rules.map((rule2) => rule2.id).filter((id) => !seen.has(id))];
  };
  var isPresent = (v3) => v3 !== null;
  var fillNode = (v3) => {
    const node = rec(v3);
    const filter = rec(node.filter);
    const appearance = rec(node.appearance);
    const colors = rec(appearance.colors);
    const media = rec(appearance.media);
    const rules = {
      enabled: bool(filter.enabled),
      rules: arr(filter.rules).map(rule).filter(isPresent)
    };
    return {
      filter: { ...rules, order: syncOrder(filter.order, rules.rules) },
      appearance: {
        enabled: bool(appearance.enabled),
        columnWidth: size(appearance.columnWidth),
        fontSize: size(appearance.fontSize),
        maxLines: size(appearance.maxLines),
        colors: {
          background: hexColor(colors.background),
          text: hexColor(colors.text),
          name: hexColor(colors.name),
          meta: hexColor(colors.meta),
          link: hexColor(colors.link),
          border: hexColor(colors.border),
          columnTitle: hexColor(colors.columnTitle),
          columnHeader: hexColor(colors.columnHeader)
        },
        media: {
          maxThumbHeight: size(media.maxThumbHeight),
          collapse: bool(media.collapse)
        },
        timeFormat: isTimeFormat(appearance.timeFormat) ? appearance.timeFormat : null,
        autoContrast: bool(appearance.autoContrast),
        highlightBase: isHighlightBase(appearance.highlightBase) ? appearance.highlightBase : null
      }
    };
  };
  var nodeMap = (v3) => Object.fromEntries(Object.entries(rec(v3)).map(([key, node]) => [key, fillNode(node)]));
  var fillAll = (v3) => {
    const stored = rec(v3);
    return {
      version: SCHEMA_VERSION,
      language: isLanguage(stored.language) ? stored.language : "auto",
      global: fillNode(stored.global),
      accounts: nodeMap(stored.accounts),
      columns: nodeMap(stored.columns)
    };
  };
  var emptyNode = () => fillNode(void 0);
  var hasAppearanceValues = (appearance) => appearance.columnWidth !== null || appearance.fontSize !== null || appearance.maxLines !== null || appearance.timeFormat !== null || appearance.autoContrast !== null || appearance.highlightBase !== null || Object.values(appearance.colors).some((value) => value !== null) || Object.values(appearance.media).some((value) => value !== null);
  var hasAppearanceSettings = (appearance) => (
    // "Whether the appearance applies" is a setting too. Overlooking it would treat a tier
    // holding only that as empty and discard it
    appearance.enabled !== null || hasAppearanceValues(appearance)
  );
  var hasContent = (node) => !!node && (node.filter.rules.length > 0 || hasAppearanceValues(node.appearance));
  var isEmptyNode = (node) => {
    if (!node) return true;
    const { filter, appearance } = node;
    const hasFilter = filter.enabled !== null || filter.rules.length > 0;
    return !hasFilter && !hasAppearanceSettings(appearance);
  };
  var emptySettings = () => fillAll(void 0);
  var newRuleId = () => crypto.randomUUID();

  // src/settings/detected.ts
  var str2 = (v3) => typeof v3 === "string" && v3 ? v3 : null;
  var fillColumn = (v3) => {
    if (!isRecord(v3)) return null;
    const columnId = str2(v3.columnId);
    if (!columnId) return null;
    const column = { columnId, account: str2(v3.account), title: str2(v3.title) };
    return v3.missing === true ? { ...column, missing: true } : column;
  };
  var fillDeck = (v3) => {
    if (!isRecord(v3)) return null;
    const deckId = str2(v3.deckId);
    if (!deckId) return null;
    const columns = Array.isArray(v3.columns) ? v3.columns : [];
    return {
      deckId,
      name: str2(v3.name),
      columns: columns.map(fillColumn).filter((column) => column !== null)
    };
  };
  var emptyDetected = () => ({ decks: [], currentDeckId: null });
  var fillDetected = (v3) => {
    if (!isRecord(v3)) return emptyDetected();
    const stored = Array.isArray(v3.decks) ? v3.decks : [];
    return {
      decks: stored.map(fillDeck).filter((deck) => deck !== null),
      currentDeckId: str2(v3.currentDeckId)
    };
  };
  var withoutColumn = (detected, columnId) => ({
    ...detected,
    decks: detected.decks.map((deck) => ({
      ...deck,
      columns: deck.columns.filter((column) => column.columnId !== columnId)
    }))
  });
  var allColumns = (detected) => detected.decks.flatMap((deck) => deck.columns);

  // src/filter/health.ts
  var MARKERS = ["cell", "post", "text", "column"];

  // src/settings/storage.ts
  var api = typeof browser !== "undefined" ? browser : chrome;
  var STORAGE_KEY = "settings";
  var DETECTED_KEY = "detected";
  var PAUSED_KEY = "paused";
  var load = async () => {
    const stored = (await api.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
    if (stored === void 0 || stored === null) {
      return { settings: emptySettings(), unreadable: null };
    }
    const version = stored.version;
    if (version !== SCHEMA_VERSION) {
      const stamped = typeof version === "number" ? version : 0;
      return {
        settings: emptySettings(),
        unreadable: { version: stamped, newer: stamped > SCHEMA_VERSION }
      };
    }
    return { settings: fillAll(stored), unreadable: null };
  };
  var save = async (settings) => {
    await api.storage.local.set({ [STORAGE_KEY]: { ...settings, version: SCHEMA_VERSION } });
  };
  var watch = (key, parse, callback) => {
    const handler = (changes, areaName) => {
      const change = changes[key];
      if (areaName !== "local" || !change) return;
      callback(parse(change.newValue));
    };
    api.storage.onChanged.addListener(handler);
    return () => api.storage.onChanged.removeListener(handler);
  };
  var subscribe = (callback) => watch(STORAGE_KEY, fillAll, callback);
  var AD_GUARD_KEY = "adGuard";
  var fillFlag = (v3) => v3 === true;
  var loadAdGuard = async () => fillFlag((await api.storage.local.get(AD_GUARD_KEY))[AD_GUARD_KEY]);
  var subscribeAdGuard = (callback) => watch(AD_GUARD_KEY, fillFlag, callback);
  var HEALTH_KEY = "health";
  var fillHealth = (v3) => Array.isArray(v3) ? v3.filter((x3) => MARKERS.includes(x3)) : [];
  var loadHealth = async () => fillHealth((await api.storage.local.get(HEALTH_KEY))[HEALTH_KEY]);
  var subscribeHealth = (callback) => watch(HEALTH_KEY, fillHealth, callback);
  var fillPaused = (v3) => v3 === true;
  var loadPaused = async () => fillPaused((await api.storage.local.get(PAUSED_KEY))[PAUSED_KEY]);
  var subscribePaused = (callback) => watch(PAUSED_KEY, fillPaused, callback);
  var loadDetected = async () => fillDetected((await api.storage.local.get(DETECTED_KEY))[DETECTED_KEY]);
  var subscribeDetected = (callback) => watch(DETECTED_KEY, fillDetected, callback);
  var forgetColumn = async (columnId) => {
    const stored = (await api.storage.local.get(DETECTED_KEY))[DETECTED_KEY];
    await api.storage.local.set({ [DETECTED_KEY]: withoutColumn(fillDetected(stored), columnId) });
  };
  var clearDetected = async () => {
    await api.storage.local.remove(DETECTED_KEY);
  };

  // src/settings/resolve.ts
  var inherit = (tiers, pick) => {
    for (let i3 = tiers.length - 1; i3 >= 0; i3--) {
      const value = pick(tiers[i3]);
      if (value !== null) return value;
    }
    return null;
  };
  var mergeOrder = (tiers) => {
    const seen = /* @__PURE__ */ new Set();
    return [...tiers].reverse().flatMap((node) => node.filter.order).filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };
  var mergeFilter = (tiers) => ({
    enabled: inherit(tiers, (node) => node.filter.enabled),
    rules: tiers.flatMap((node) => node.filter.rules),
    order: mergeOrder(tiers)
  });
  var mergeAppearance = (tiers) => ({
    enabled: inherit(tiers, (node) => node.appearance.enabled),
    columnWidth: inherit(tiers, (node) => node.appearance.columnWidth),
    fontSize: inherit(tiers, (node) => node.appearance.fontSize),
    maxLines: inherit(tiers, (node) => node.appearance.maxLines),
    colors: {
      background: inherit(tiers, (node) => node.appearance.colors.background),
      text: inherit(tiers, (node) => node.appearance.colors.text),
      name: inherit(tiers, (node) => node.appearance.colors.name),
      meta: inherit(tiers, (node) => node.appearance.colors.meta),
      link: inherit(tiers, (node) => node.appearance.colors.link),
      border: inherit(tiers, (node) => node.appearance.colors.border),
      columnTitle: inherit(tiers, (node) => node.appearance.colors.columnTitle),
      columnHeader: inherit(tiers, (node) => node.appearance.colors.columnHeader)
    },
    media: {
      maxThumbHeight: inherit(tiers, (node) => node.appearance.media.maxThumbHeight),
      collapse: inherit(tiers, (node) => node.appearance.media.collapse)
    },
    timeFormat: inherit(tiers, (node) => node.appearance.timeFormat),
    autoContrast: inherit(tiers, (node) => node.appearance.autoContrast),
    highlightBase: inherit(tiers, (node) => node.appearance.highlightBase)
  });
  var tiersFor = (settings, scope) => {
    const tiers = [settings.global];
    const account = scope.account !== null ? settings.accounts[scope.account] : void 0;
    if (account) tiers.push(account);
    const column = scope.columnId !== null ? settings.columns[scope.columnId] : void 0;
    if (column) tiers.push(column);
    return tiers;
  };
  var enabledAt = (settings, scope) => inherit(tiersFor(settings, scope), (node) => node.filter.enabled);
  var resolve = (settings, scope) => {
    const tiers = tiersFor(settings, scope);
    return { filter: mergeFilter(tiers), appearance: mergeAppearance(tiers) };
  };
  var sourceOf = (settings, scope, pick) => {
    const column = scope.columnId !== null ? settings.columns[scope.columnId] : void 0;
    if (column && pick(column) !== null) return "column";
    const account = scope.account !== null ? settings.accounts[scope.account] : void 0;
    if (account && pick(account) !== null) return "account";
    return pick(settings.global) !== null ? "global" : null;
  };
  var ruleSourceOf = (settings, scope, id) => {
    const has = (node) => !!node?.filter.rules.some((r3) => r3.id === id);
    const column = scope.columnId !== null ? settings.columns[scope.columnId] : void 0;
    if (has(column)) return "column";
    const account = scope.account !== null ? settings.accounts[scope.account] : void 0;
    if (has(account)) return "account";
    return has(settings.global) ? "global" : null;
  };
  var inheritedFor = (settings, scope) => {
    if (scope.tier === "global") return { enabled: null, appearance: mergeAppearance([]) };
    const tiers = [settings.global];
    if (scope.tier === "columns" && scope.account !== null) {
      const account = settings.accounts[scope.account];
      if (account) tiers.push(account);
    }
    return { enabled: inherit(tiers, (node) => node.filter.enabled), appearance: mergeAppearance(tiers) };
  };

  // src/ui/color.ts
  var parseColorInput = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return { color: null, invalid: false };
    const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    if (!HEX_COLOR_PATTERN.test(withHash)) return { color: null, invalid: true };
    return { color: withHash.toLowerCase(), invalid: false };
  };

  // src/ui/size.ts
  var parseSizeInput = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return { size: null, invalid: false };
    if (!/^[0-9]+$/.test(trimmed)) return { size: null, invalid: true };
    const size3 = Number(trimmed);
    if (size3 <= 0) return { size: null, invalid: true };
    return { size: size3, invalid: false };
  };

  // node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
  var f3 = 0;
  function u3(e3, t3, n2, o3, i3, u4) {
    t3 || (t3 = {});
    var a3, c3, p3 = t3;
    if ("ref" in p3) for (c3 in p3 = {}, t3) "ref" == c3 ? a3 = t3[c3] : p3[c3] = t3[c3];
    var l3 = { type: e3, props: p3, key: n2, ref: a3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f3, __i: -1, __u: 0, __source: i3, __self: u4 };
    if ("function" == typeof e3 && (a3 = e3.defaultProps)) for (c3 in a3) void 0 === p3[c3] && (p3[c3] = a3[c3]);
    return l.vnode && l.vnode(l3), l3;
  }

  // src/ui/fields.tsx
  var actionLabel = (m3, action) => m3.actions[action];
  var RULE_ACTIONS = [
    ACTIONS.COLLAPSE,
    ACTIONS.HIDE,
    ACTIONS.HIGHLIGHT,
    ACTIONS.EMPHASIZE,
    ACTIONS.NOTHING
  ];
  var ColorField = ({
    value,
    onChange,
    hidden,
    fallback = DEFAULT_HIGHLIGHT_COLOR,
    fallbackInherited,
    label
  }) => {
    const m3 = useMessages();
    const [text, setText] = d2(value ?? "");
    const [error, setError] = d2(null);
    h2(() => {
      setText(value ?? "");
      setError(null);
    }, [value]);
    const commit = (raw) => {
      const result = parseColorInput(raw);
      setError(result.invalid ? m3.color.error : null);
      if (!result.invalid) onChange(result.color);
    };
    const note = fallback === null ? m3.color.unset : (fallbackInherited ? m3.color.inherited : m3.color.fallback)(fallback);
    const shortNote = fallback === null ? m3.color.unsetShort : fallbackInherited ? m3.color.inheritedShort : m3.color.fallbackShort;
    return /* @__PURE__ */ u3("span", { class: "color-field", hidden, children: [
      (value ?? fallback) !== null && /* @__PURE__ */ u3("span", { class: "swatch", style: { backgroundColor: value ?? fallback }, "aria-hidden": "true" }),
      /* @__PURE__ */ u3(
        "input",
        {
          type: "text",
          class: "colorcode",
          title: note,
          "aria-label": label ?? m3.color.label,
          placeholder: shortNote,
          "data-fallback": fallback ?? void 0,
          value: text,
          onInput: (e3) => setText(e3.currentTarget.value),
          onChange: (e3) => commit(e3.currentTarget.value)
        }
      ),
      error && /* @__PURE__ */ u3("p", { class: "error", children: error })
    ] });
  };
  var SizeField = ({ value, onChange, label, unit, inherited = null }) => {
    const m3 = useMessages();
    const [text, setText] = d2(value === null ? "" : String(value));
    const [error, setError] = d2(null);
    h2(() => {
      setText(value === null ? "" : String(value));
      setError(null);
    }, [value]);
    const commit = (raw) => {
      const result = parseSizeInput(raw);
      setError(result.invalid ? m3.size.error : null);
      if (!result.invalid) onChange(result.size);
    };
    const unitLabel = unit ?? m3.size.unit;
    return /* @__PURE__ */ u3("span", { class: "size-field", children: [
      /* @__PURE__ */ u3("span", { class: "size-box", children: [
        /* @__PURE__ */ u3(
          "input",
          {
            type: "text",
            inputMode: "numeric",
            class: "size",
            "aria-label": value === null && inherited !== null ? m3.size.inheritedLabel(label, String(inherited), unitLabel) : label,
            placeholder: inherited === null ? m3.size.unset : String(inherited),
            value: text,
            onInput: (e3) => setText(e3.currentTarget.value),
            onChange: (e3) => commit(e3.currentTarget.value)
          }
        ),
        /* @__PURE__ */ u3("span", { class: "unit", "aria-hidden": "true", children: unitLabel })
      ] }),
      error && /* @__PURE__ */ u3("p", { class: "error", children: error })
    ] });
  };
  var BoolSelect = ({ value, effective, onChange, label, on, off }) => /* @__PURE__ */ u3(
    "select",
    {
      "aria-label": label,
      value: String(value ?? effective),
      onChange: (e3) => {
        const next = e3.currentTarget.value === "true";
        onChange(next === effective ? null : next);
      },
      children: [
        /* @__PURE__ */ u3("option", { value: "true", children: on }),
        /* @__PURE__ */ u3("option", { value: "false", children: off })
      ]
    }
  );
  var ChoiceSelect = ({
    value,
    effective,
    options,
    labels,
    onChange,
    label
  }) => /* @__PURE__ */ u3(
    "select",
    {
      "aria-label": label,
      value: value ?? effective,
      onChange: (e3) => {
        const next = e3.currentTarget.value;
        onChange(next === effective ? null : next);
      },
      children: options.map((option) => /* @__PURE__ */ u3("option", { value: option, children: labels[option] }, option))
    }
  );
  var ActionSelect = ({
    value,
    onChange,
    actions,
    allowUnset,
    label
  }) => {
    const m3 = useMessages();
    return /* @__PURE__ */ u3(
      "select",
      {
        "aria-label": label,
        value: value ?? "null",
        onChange: (e3) => {
          const next = e3.currentTarget.value;
          onChange(next === "null" ? null : next);
        },
        children: [
          allowUnset && /* @__PURE__ */ u3("option", { value: "null", children: m3.unset }),
          actions.map((action) => /* @__PURE__ */ u3("option", { value: action, children: actionLabel(m3, action) }, action))
        ]
      }
    );
  };
  var ActionBadge = ({
    action,
    color,
    fallback
  }) => {
    const m3 = useMessages();
    const shown = fallback ?? defaultColorFor(action);
    return /* @__PURE__ */ u3("span", { class: "action-badge", children: [
      usesColor(action) && /* @__PURE__ */ u3(
        "span",
        {
          class: "swatch",
          style: { backgroundColor: color ?? shown },
          title: color ?? m3.color.fallback(shown)
        }
      ),
      actionLabel(m3, action)
    ] });
  };

  // src/ui/Appearance.tsx
  var COLOR_ORDER = [
    "columnHeader",
    "background",
    "columnTitle",
    "name",
    "text",
    "meta",
    "link",
    "border"
  ];
  var Appearance = ({ node, onChange, inherited }) => {
    const m3 = useMessages();
    const applying = appearanceApplies(node.enabled ?? inherited.enabled);
    const above = applying ? inherited : emptyNode().appearance;
    const patch = (part) => onChange({ ...node, ...part });
    const colors = (part) => patch({ colors: { ...node.colors, ...part } });
    const media = (part) => patch({ media: { ...node.media, ...part } });
    return /* @__PURE__ */ u3(S, { children: [
      /* @__PURE__ */ u3("p", { class: "hint", children: m3.appearance.hint }),
      /* @__PURE__ */ u3("label", { class: "row appearance-toggle", children: [
        /* @__PURE__ */ u3("span", { children: m3.appearanceToggle.label }),
        /* @__PURE__ */ u3(
          BoolSelect,
          {
            value: node.enabled,
            effective: appearanceApplies(inherited.enabled),
            onChange: (enabled) => patch({ enabled }),
            label: m3.appearanceToggle.label,
            on: m3.appearanceToggle.on,
            off: m3.appearanceToggle.off
          }
        )
      ] }),
      !applying && /* @__PURE__ */ u3("p", { class: "hint", children: m3.appearanceToggle.stoppedHint }),
      /* @__PURE__ */ u3("fieldset", { children: [
        /* @__PURE__ */ u3("legend", { children: m3.appearance.legend }),
        /* @__PURE__ */ u3("label", { class: "row", children: [
          /* @__PURE__ */ u3("span", { children: m3.appearance.columnWidth }),
          /* @__PURE__ */ u3(
            SizeField,
            {
              value: node.columnWidth,
              inherited: above.columnWidth,
              onChange: (columnWidth) => patch({ columnWidth }),
              label: m3.appearance.columnWidth
            }
          )
        ] }),
        /* @__PURE__ */ u3("label", { class: "row", children: [
          /* @__PURE__ */ u3("span", { children: m3.appearance.fontSize }),
          /* @__PURE__ */ u3(
            SizeField,
            {
              value: node.fontSize,
              inherited: above.fontSize,
              onChange: (fontSize) => patch({ fontSize }),
              label: m3.appearance.fontSize
            }
          )
        ] }),
        /* @__PURE__ */ u3("label", { class: "row", children: [
          /* @__PURE__ */ u3("span", { children: m3.appearance.maxLines }),
          /* @__PURE__ */ u3(
            SizeField,
            {
              value: node.maxLines,
              inherited: above.maxLines,
              onChange: (maxLines) => patch({ maxLines }),
              label: m3.appearance.maxLines,
              unit: m3.appearance.lines
            }
          )
        ] }),
        /* @__PURE__ */ u3("label", { class: "row", children: [
          /* @__PURE__ */ u3("span", { children: m3.appearance.media.maxThumbHeight }),
          /* @__PURE__ */ u3(
            SizeField,
            {
              value: node.media.maxThumbHeight,
              inherited: above.media.maxThumbHeight,
              onChange: (maxThumbHeight) => media({ maxThumbHeight }),
              label: m3.appearance.media.maxThumbHeight
            }
          )
        ] }),
        /* @__PURE__ */ u3("label", { class: "row", children: [
          /* @__PURE__ */ u3("span", { children: m3.appearance.media.collapse }),
          /* @__PURE__ */ u3(
            BoolSelect,
            {
              value: node.media.collapse,
              effective: mediaCollapses(above.media.collapse),
              onChange: (collapse) => media({ collapse }),
              label: m3.appearance.media.collapse,
              on: m3.appearance.media.collapseOn,
              off: m3.appearance.media.collapseOff
            }
          )
        ] }),
        /* @__PURE__ */ u3("label", { class: "row", children: [
          /* @__PURE__ */ u3("span", { children: m3.appearance.timeFormat }),
          /* @__PURE__ */ u3(
            ChoiceSelect,
            {
              value: node.timeFormat,
              effective: timeFormatOf(above.timeFormat),
              options: TIME_FORMATS,
              labels: m3.appearance.timeFormats,
              onChange: (timeFormat) => onChange({ ...node, timeFormat }),
              label: m3.appearance.timeFormat
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ u3("fieldset", { children: [
        /* @__PURE__ */ u3("legend", { children: m3.appearance.colors.legend }),
        COLOR_ORDER.map((key) => /* @__PURE__ */ u3("label", { class: "row", children: [
          /* @__PURE__ */ u3("span", { children: m3.appearance.colors[key] }),
          /* @__PURE__ */ u3(
            ColorField,
            {
              value: node.colors[key],
              onChange: (color) => colors({ [key]: color }),
              fallback: above.colors[key],
              fallbackInherited: true,
              label: m3.appearance.colors[key]
            }
          )
        ] }, key)),
        /* @__PURE__ */ u3("label", { class: "row", children: [
          /* @__PURE__ */ u3("span", { children: m3.appearance.autoContrast }),
          /* @__PURE__ */ u3(
            BoolSelect,
            {
              value: node.autoContrast,
              effective: adjustsContrast(above.autoContrast),
              onChange: (autoContrast) => onChange({ ...node, autoContrast }),
              label: m3.appearance.autoContrast,
              on: m3.appearance.autoContrastOn,
              off: m3.appearance.autoContrastOff
            }
          )
        ] }),
        /* @__PURE__ */ u3("label", { class: "row", children: [
          /* @__PURE__ */ u3("span", { children: m3.appearance.highlightBase }),
          /* @__PURE__ */ u3(
            ChoiceSelect,
            {
              value: node.highlightBase,
              effective: highlightBaseOf(above.highlightBase),
              options: HIGHLIGHT_BASES,
              labels: m3.appearance.highlightBases,
              onChange: (highlightBase) => onChange({ ...node, highlightBase }),
              label: m3.appearance.highlightBase
            }
          )
        ] })
      ] })
    ] });
  };

  // src/ui/reorder.ts
  var EDGE_ZONE = 56;
  var MAX_SPEED = 18;
  var scrollerOf = (el) => {
    for (let p3 = el.parentElement; p3; p3 = p3.parentElement) {
      const { overflowY } = getComputedStyle(p3);
      if ((overflowY === "auto" || overflowY === "scroll") && p3.scrollHeight > p3.clientHeight) {
        return p3;
      }
    }
    const doc = document.scrollingElement;
    return doc && doc.scrollHeight > doc.clientHeight ? doc : null;
  };
  var edgeBoxOf = (scroller) => scroller === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : scroller.getBoundingClientRect();
  var dropIndex = (rows, from, y3) => {
    const own = rows[from];
    if (y3 >= own.top && y3 <= own.bottom) return from;
    const downward = y3 > own.bottom;
    let passed = 0;
    for (let i3 = 0; i3 < rows.length; i3++) {
      if (i3 === from) continue;
      const r3 = rows[i3];
      if (downward ? r3.top < y3 : r3.bottom < y3) passed++;
    }
    return passed;
  };
  var useReorder = (onDrop) => {
    const grabbed = A2(null);
    const frame = A2(0);
    const [from, setFrom] = d2(null);
    const [to, setTo] = d2(null);
    const placeOf = (grab) => {
      const elements = [...grab.list.children];
      return {
        rows: elements.map((el) => el.getBoundingClientRect()),
        from: elements.indexOf(grab.row)
      };
    };
    const stop = q2(() => {
      cancelAnimationFrame(frame.current);
      grabbed.current = null;
      setFrom(null);
      setTo(null);
    }, []);
    const step = q2(() => {
      const grab = grabbed.current;
      if (!grab) return;
      const scroller = grab.scroller;
      if (scroller) {
        const box = edgeBoxOf(scroller);
        const toTop = grab.y - box.top;
        const toBottom = box.bottom - grab.y;
        if (toTop >= EDGE_ZONE) grab.held.up = false;
        if (toBottom >= EDGE_ZONE) grab.held.down = false;
        const delta = toTop < EDGE_ZONE && !grab.held.up ? -MAX_SPEED * (1 - Math.max(0, toTop) / EDGE_ZONE) : toBottom < EDGE_ZONE && !grab.held.down ? MAX_SPEED * (1 - Math.max(0, toBottom) / EDGE_ZONE) : 0;
        if (delta !== 0) scroller.scrollTop += delta;
      }
      const { rows, from: current } = placeOf(grab);
      if (current < 0) {
        stop();
        return;
      }
      setFrom(current);
      setTo(dropIndex(rows, current, grab.y));
      frame.current = requestAnimationFrame(step);
    }, [stop]);
    h2(() => () => cancelAnimationFrame(frame.current), []);
    h2(() => {
      if (from === null) return;
      const onKeyDown = (event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        stop();
      };
      document.addEventListener("keydown", onKeyDown, true);
      return () => document.removeEventListener("keydown", onKeyDown, true);
    }, [from, stop]);
    const gripProps = (index) => ({
      onPointerDown: (event) => {
        if (event.button !== 0) return;
        const grip = event.currentTarget;
        const row = grip.closest("li");
        const list = row?.parentElement;
        if (!row || !list) return;
        grip.setPointerCapture(event.pointerId);
        event.preventDefault();
        const scroller = scrollerOf(grip);
        const box = scroller ? edgeBoxOf(scroller) : null;
        grabbed.current = {
          row,
          list,
          y: event.clientY,
          scroller,
          held: box ? { up: event.clientY - box.top < EDGE_ZONE, down: box.bottom - event.clientY < EDGE_ZONE } : { up: false, down: false }
        };
        setFrom(index);
        setTo(index);
        frame.current = requestAnimationFrame(step);
      },
      // Only the position is remembered. Re-measuring and re-rendering happen together in the frame
      onPointerMove: (event) => {
        if (grabbed.current) grabbed.current.y = event.clientY;
      },
      onPointerUp: (event) => {
        const grab = grabbed.current;
        if (!grab) return;
        grab.y = event.clientY;
        const { rows, from: current } = placeOf(grab);
        const target = current < 0 ? -1 : dropIndex(rows, current, grab.y);
        stop();
        if (current >= 0 && target !== current) onDrop(current, target);
      },
      onPointerCancel: () => stop()
    });
    return { from, to, gripProps };
  };

  // src/ui/Rules.tsx
  var emptyText = () => ({
    mode: "contains",
    pattern: "",
    caseSensitive: false,
    negate: false
  });
  var emptyAge = () => ({ value: "", unit: "hours", direction: "older", negate: false });
  var emptyDraft = () => ({
    trait: null,
    texts: {},
    age: emptyAge(),
    action: ACTIONS.COLLAPSE,
    color: null,
    label: "",
    enabled: true
  });
  var toDraft = (rule2) => {
    const texts = {};
    for (const c3 of rule2.conditions) {
      if (c3.kind !== "text" || texts[c3.target]) continue;
      texts[c3.target] = {
        mode: c3.mode,
        pattern: c3.pattern,
        caseSensitive: c3.caseSensitive,
        negate: c3.negate
      };
    }
    const age = rule2.conditions.find((c3) => c3.kind === "age");
    return {
      trait: rule2.conditions.find((c3) => c3.kind === "trait") ?? null,
      texts,
      age: age ? (() => {
        const { value, unit } = splitDuration(age.minutes);
        return { value: String(value), unit, direction: age.direction, negate: age.negate };
      })() : emptyAge(),
      action: rule2.action,
      color: rule2.color,
      label: rule2.label,
      enabled: rule2.enabled
    };
  };
  var shownTargets = (draft) => targetsFor(draft.trait?.trait ?? null);
  var patternOf = (target, raw) => isScreenNameTarget(target) ? raw.trim().replace(/^@/, "") : raw.trim();
  var ageConditionOf = (age) => {
    const raw = age.value.trim();
    if (raw === "") return [];
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) return [];
    return [
      { kind: "age", direction: age.direction, minutes: minutesOf(value, age.unit), negate: age.negate }
    ];
  };
  var badAge = (age) => age.value.trim() !== "" && ageConditionOf(age).length === 0;
  var toConditions = (draft) => [
    ...draft.trait ? [draft.trait] : [],
    ...shownTargets(draft).flatMap((target) => {
      const input = draft.texts[target];
      if (!input) return [];
      if (isSelfMode(input.mode)) {
        return canCompareToSelf(target) ? [{ kind: "text", target, mode: "self", pattern: "", caseSensitive: false, negate: input.negate }] : [];
      }
      const pattern = patternOf(target, input.pattern);
      if (!pattern) return [];
      return [
        {
          kind: "text",
          target,
          mode: input.mode,
          pattern,
          // X does not distinguish case in user IDs, so the setting is dropped even if it is still there
          caseSensitive: !isScreenNameTarget(target) && input.caseSensitive,
          negate: input.negate
        }
      ];
    }),
    ...ageConditionOf(draft.age)
  ];
  var conditionsKey = (conditions) => JSON.stringify(
    conditions.map(
      (c3) => c3.kind === "text" ? ["text", c3.target, c3.mode, c3.pattern.toLowerCase(), c3.negate] : c3.kind === "age" ? ["age", c3.direction, c3.minutes, c3.negate] : ["trait", c3.trait, c3.negate]
    )
  );
  var validate = (draft, existing, m3) => {
    const conditions = toConditions(draft);
    if (badAge(draft.age)) return { error: m3.rules.ageError };
    if (conditions.length === 0) return { error: m3.rules.errors.noCondition };
    for (const c3 of conditions) {
      if (c3.kind !== "text" || c3.mode !== "regex") continue;
      try {
        new RegExp(c3.pattern);
      } catch (e3) {
        return { error: m3.rules.errors.badRegex(e3 instanceof Error ? e3.message : String(e3)) };
      }
    }
    if (draft.action === ACTIONS.EMPHASIZE && !conditions.some(canEmphasizeWith)) {
      return { error: m3.rules.errors.noEmphasisTarget };
    }
    const key = conditionsKey(conditions);
    if (existing.some((rule2) => conditionsKey(rule2.conditions) === key)) {
      return { error: m3.rules.errors.duplicate };
    }
    return {
      rule: {
        conditions,
        action: draft.action,
        color: usesColor(draft.action) ? draft.color : null,
        label: draft.label.trim(),
        enabled: draft.enabled
      }
    };
  };
  var NegateBox = ({ checked, onChange }) => {
    const m3 = useMessages();
    return /* @__PURE__ */ u3("label", { class: "inline", children: [
      /* @__PURE__ */ u3("input", { type: "checkbox", checked, onChange: (e3) => onChange(e3.currentTarget.checked) }),
      " ",
      m3.rules.negate
    ] });
  };
  var TextRow = ({ target, input, onChange, onSubmit }) => {
    const m3 = useMessages();
    return /* @__PURE__ */ u3("div", { class: "row add condition", children: [
      /* @__PURE__ */ u3("span", { class: "field-label", children: m3.rules.targets[target] }),
      !isSelfMode(input.mode) && /* @__PURE__ */ u3(
        "input",
        {
          type: "text",
          "aria-label": m3.rules.targets[target],
          placeholder: m3.rules.anyPlaceholder,
          value: input.pattern,
          onInput: (e3) => onChange({ ...input, pattern: e3.currentTarget.value }),
          onKeyDown: (e3) => e3.key === "Enter" && onSubmit()
        }
      ),
      /* @__PURE__ */ u3(
        "select",
        {
          "aria-label": m3.rules.modeLabel,
          value: input.mode,
          onChange: (e3) => onChange({ ...input, mode: e3.currentTarget.value }),
          children: Object.entries(m3.rules.modes).filter(([value]) => value !== "self" || canCompareToSelf(target)).map(([value, label]) => /* @__PURE__ */ u3("option", { value, children: label }, value))
        }
      ),
      /* @__PURE__ */ u3("label", { class: "inline", hidden: isScreenNameTarget(target), children: [
        /* @__PURE__ */ u3(
          "input",
          {
            type: "checkbox",
            checked: input.caseSensitive,
            onChange: (e3) => onChange({ ...input, caseSensitive: e3.currentTarget.checked })
          }
        ),
        " ",
        m3.rules.caseSensitive
      ] }),
      /* @__PURE__ */ u3(NegateBox, { checked: input.negate, onChange: (negate) => onChange({ ...input, negate }) })
    ] });
  };
  var RuleForm = ({
    draft,
    onDraftChange,
    onSubmit,
    mode,
    onClose,
    error,
    onDelete
  }) => {
    const m3 = useMessages();
    const { trait } = draft;
    const firstField = A2(null);
    const [confirming, setConfirming] = d2(false);
    h2(() => {
      firstField.current?.focus();
    }, []);
    return /* @__PURE__ */ u3(S, { children: [
      mode === "add" && /* @__PURE__ */ u3("p", { class: "hint", children: m3.rules.hint }),
      /* @__PURE__ */ u3("div", { class: "row add", children: /* @__PURE__ */ u3(
        "input",
        {
          ref: firstField,
          type: "text",
          "aria-label": m3.rules.namePlaceholder,
          placeholder: m3.rules.namePlaceholder,
          value: draft.label,
          onInput: (e3) => onDraftChange({ ...draft, label: e3.currentTarget.value })
        }
      ) }),
      /* @__PURE__ */ u3("div", { class: "row add condition", children: [
        /* @__PURE__ */ u3("span", { class: "field-label", children: m3.rules.traitLabel }),
        /* @__PURE__ */ u3(
          "select",
          {
            "aria-label": m3.rules.traitLabel,
            value: trait?.trait ?? "",
            onChange: (e3) => {
              const value = e3.currentTarget.value;
              onDraftChange({
                ...draft,
                // Back to "Any" drops the negation too, so no invisible setting is left behind
                trait: value ? { kind: "trait", trait: value, negate: trait?.negate ?? false } : null
              });
            },
            children: [
              /* @__PURE__ */ u3("option", { value: "", children: m3.rules.any }),
              TRAIT_KEYS.map((key) => /* @__PURE__ */ u3("option", { value: key, children: m3.traits[key] }, key))
            ]
          }
        ),
        trait && /* @__PURE__ */ u3(
          NegateBox,
          {
            checked: trait.negate,
            onChange: (negate) => onDraftChange({ ...draft, trait: { ...trait, negate } })
          }
        )
      ] }),
      /* @__PURE__ */ u3("div", { class: "row add condition", children: [
        /* @__PURE__ */ u3("span", { class: "field-label", children: m3.rules.ageLabel }),
        /* @__PURE__ */ u3(
          "input",
          {
            type: "text",
            inputMode: "numeric",
            "aria-label": m3.rules.ageLabel,
            placeholder: m3.rules.anyPlaceholder,
            value: draft.age.value,
            onInput: (e3) => onDraftChange({ ...draft, age: { ...draft.age, value: e3.currentTarget.value } }),
            onKeyDown: (e3) => e3.key === "Enter" && onSubmit()
          }
        ),
        /* @__PURE__ */ u3(
          "select",
          {
            "aria-label": m3.rules.ageLabel,
            value: draft.age.unit,
            onChange: (e3) => onDraftChange({ ...draft, age: { ...draft.age, unit: e3.currentTarget.value } }),
            children: AGE_UNITS3.map((unit) => /* @__PURE__ */ u3("option", { value: unit, children: m3.rules.ageUnits[unit] }, unit))
          }
        ),
        /* @__PURE__ */ u3(
          "select",
          {
            "aria-label": m3.rules.ageLabel,
            value: draft.age.direction,
            onChange: (e3) => onDraftChange({
              ...draft,
              age: { ...draft.age, direction: e3.currentTarget.value }
            }),
            children: AGE_DIRECTIONS.map((direction) => /* @__PURE__ */ u3("option", { value: direction, children: m3.rules.ageDirections[direction] }, direction))
          }
        ),
        /* @__PURE__ */ u3(
          NegateBox,
          {
            checked: draft.age.negate,
            onChange: (negate) => onDraftChange({ ...draft, age: { ...draft.age, negate } })
          }
        )
      ] }),
      shownTargets(draft).map((target) => /* @__PURE__ */ u3(
        TextRow,
        {
          target,
          input: draft.texts[target] ?? emptyText(),
          onChange: (input) => onDraftChange({ ...draft, texts: { ...draft.texts, [target]: input } }),
          onSubmit
        },
        target
      )),
      /* @__PURE__ */ u3("div", { class: "row add", children: [
        /* @__PURE__ */ u3(
          ActionSelect,
          {
            label: m3.rules.actionLabel,
            value: draft.action,
            actions: RULE_ACTIONS,
            onChange: (action) => onDraftChange({ ...draft, action: action ?? ACTIONS.COLLAPSE })
          }
        ),
        /* @__PURE__ */ u3(
          ColorField,
          {
            hidden: !usesColor(draft.action),
            fallback: defaultColorFor(draft.action),
            value: draft.color,
            onChange: (color) => onDraftChange({ ...draft, color })
          }
        ),
        /* @__PURE__ */ u3("button", { type: "button", onClick: onSubmit, children: mode === "add" ? m3.rules.add : m3.rules.save }),
        /* @__PURE__ */ u3("button", { type: "button", onClick: onClose, children: mode === "add" ? m3.rules.closeForm : m3.rules.cancel })
      ] }),
      /* @__PURE__ */ u3("p", { class: "hint action-hint", children: m3.rules.actionHints[draft.action] }),
      onDelete && /* @__PURE__ */ u3("div", { class: confirming ? "row add remove-row confirm" : "row add remove-row", children: confirming ? /* @__PURE__ */ u3(S, { children: [
        /* @__PURE__ */ u3("span", { children: m3.rules.removeConfirm }),
        /* @__PURE__ */ u3("button", { type: "button", class: "danger", onClick: onDelete, children: m3.rules.removeYes }),
        /* @__PURE__ */ u3("button", { type: "button", onClick: () => setConfirming(false), children: m3.rules.removeNo })
      ] }) : /* @__PURE__ */ u3("button", { type: "button", class: "danger", onClick: () => setConfirming(true), children: m3.rules.remove }) }),
      error && /* @__PURE__ */ u3("p", { class: "error", children: error })
    ] });
  };
  var detailOf = (rule2, m3) => rule2.label ? rule2.conditions.map((c3) => describeCondition(c3, m3)).join(m3.conditions.and) : "";
  var Rules = ({ rules, order, onChange }) => {
    const m3 = useMessages();
    const [draft, setDraft] = d2(emptyDraft);
    const [error, setError] = d2(null);
    const [editing, setEditing] = d2(null);
    const [adding, setAdding] = d2(false);
    const openButton = A2(null);
    const firstRender = A2(true);
    const current = editing && rules.some((rule2) => rule2.id === editing.id) ? editing : null;
    const editingId = current?.id ?? null;
    h2(() => {
      if (firstRender.current) {
        firstRender.current = false;
        return;
      }
      if (!adding && !editingId) openButton.current?.focus();
    }, [adding, editingId]);
    const add = () => {
      const result = validate(draft, rules, m3);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      const added = { id: newRuleId(), ...result.rule };
      onChange([...rules, added], [...order, added.id]);
      setDraft({
        ...draft,
        label: "",
        texts: Object.fromEntries(
          Object.entries(draft.texts).map(([target, input]) => [target, { ...input, pattern: "" }])
        )
      });
    };
    const save2 = () => {
      if (!current) return;
      const result = validate(
        current.draft,
        rules.filter((rule2) => rule2.id !== current.id),
        m3
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      onChange(
        rules.map((rule2) => rule2.id === current.id ? { id: rule2.id, ...result.rule } : rule2),
        order
      );
      setEditing(null);
    };
    const startEditing = (rule2) => {
      setError(null);
      setEditing({ id: rule2.id, draft: toDraft(rule2) });
    };
    const remove = (id) => {
      onChange(rules.filter((rule2) => rule2.id !== id), order.filter((x3) => x3 !== id));
      setEditing(null);
      setError(null);
    };
    const toggle = (id, enabled) => onChange(rules.map((rule2) => rule2.id === id ? { ...rule2, enabled } : rule2), order);
    const move = (from, to) => {
      const next = [...order];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onChange(rules, next);
    };
    const reorder = useReorder(move);
    const byId = new Map(rules.map((rule2) => [rule2.id, rule2]));
    const listed = order.map((id) => byId.get(id)).filter((rule2) => rule2 !== void 0);
    return /* @__PURE__ */ u3("fieldset", { children: [
      /* @__PURE__ */ u3("legend", { children: m3.rules.legend }),
      /* @__PURE__ */ u3("ul", { class: "rules", children: [
        listed.length === 0 && /* @__PURE__ */ u3("li", { class: "empty", children: m3.rules.empty }),
        listed.map(
          (rule2, index) => current?.id === rule2.id ? /* @__PURE__ */ u3("li", { class: "editing", children: /* @__PURE__ */ u3(
            RuleForm,
            {
              draft: current.draft,
              onDraftChange: (next) => setEditing({ id: rule2.id, draft: next }),
              onSubmit: save2,
              mode: "edit",
              onClose: () => {
                setEditing(null);
                setError(null);
              },
              error,
              onDelete: () => remove(rule2.id)
            }
          ) }, rule2.id) : /* @__PURE__ */ u3(
            "li",
            {
              class: [
                rule2.enabled ? "" : "disabled",
                reorder.from === index ? "dragging" : "",
                // The drop line: above the destination row when moving up, below it when moving down
                reorder.to !== null && reorder.from !== null && reorder.to < reorder.from && reorder.to === index ? "drop-before" : "",
                reorder.to !== null && reorder.from !== null && reorder.to > reorder.from && reorder.to === index ? "drop-after" : ""
              ].filter(Boolean).join(" "),
              children: [
                /* @__PURE__ */ u3("span", { class: "grip", "aria-hidden": "true", ...reorder.gripProps(index) }),
                /* @__PURE__ */ u3("label", { class: "inline", children: /* @__PURE__ */ u3(
                  "input",
                  {
                    type: "checkbox",
                    checked: rule2.enabled,
                    "aria-label": m3.rules.enabled,
                    onChange: (e3) => toggle(rule2.id, e3.currentTarget.checked)
                  }
                ) }),
                /* @__PURE__ */ u3("div", { class: "rule-body", children: [
                  /* @__PURE__ */ u3("span", { class: "rule-name", children: ruleName(rule2, m3) }),
                  detailOf(rule2, m3) && /* @__PURE__ */ u3("span", { class: "rule-meta", children: detailOf(rule2, m3) }),
                  /* @__PURE__ */ u3(ActionBadge, { action: rule2.action, color: rule2.color })
                ] }),
                /* @__PURE__ */ u3("span", { class: "rule-actions", children: [
                  /* @__PURE__ */ u3(
                    "button",
                    {
                      type: "button",
                      class: "move",
                      "aria-label": m3.rules.moveUp(ruleName(rule2, m3)),
                      disabled: index === 0,
                      onClick: () => move(index, index - 1),
                      children: "↑"
                    }
                  ),
                  /* @__PURE__ */ u3(
                    "button",
                    {
                      type: "button",
                      class: "move",
                      "aria-label": m3.rules.moveDown(ruleName(rule2, m3)),
                      disabled: index === listed.length - 1,
                      onClick: () => move(index, index + 1),
                      children: "↓"
                    }
                  ),
                  /* @__PURE__ */ u3(
                    "button",
                    {
                      type: "button",
                      disabled: current !== null,
                      onClick: () => startEditing(rule2),
                      children: m3.rules.edit
                    }
                  )
                ] })
              ]
            },
            rule2.id
          )
        )
      ] }),
      !current && (adding ? /* @__PURE__ */ u3(
        RuleForm,
        {
          draft,
          onDraftChange: setDraft,
          onSubmit: add,
          mode: "add",
          onClose: () => {
            setAdding(false);
            setError(null);
          },
          error
        }
      ) : /* @__PURE__ */ u3(
        "button",
        {
          ref: openButton,
          type: "button",
          class: "open-form",
          onClick: () => setAdding(true),
          children: m3.rules.openForm
        }
      ))
    ] });
  };

  // src/ui/TierEditor.tsx
  var TABS = ["filter", "appearance", "effective"];
  var TierEditor = ({ node, onChange, tab, onTabChange, inherited, effective }) => {
    const m3 = useMessages();
    const updateFilter = (patch) => onChange({ ...node, filter: { ...node.filter, ...patch } });
    const tabs = TABS.filter((key) => key !== "effective" || effective);
    const current = tabs.includes(tab) ? tab : "filter";
    return /* @__PURE__ */ u3(S, { children: [
      /* @__PURE__ */ u3("nav", { class: "tabs", "aria-label": m3.tabs.label, children: tabs.map((key) => /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          "aria-current": key === current ? "true" : void 0,
          class: key === current ? "tab current" : "tab",
          onClick: () => onTabChange(key),
          children: m3.tabs[key]
        },
        key
      )) }),
      current === "filter" && /* @__PURE__ */ u3(S, { children: [
        /* @__PURE__ */ u3("p", { class: "hint", children: m3.rules.orderHint }),
        /* @__PURE__ */ u3("label", { class: "row filter-toggle", children: [
          /* @__PURE__ */ u3("span", { children: m3.filterToggle.label }),
          /* @__PURE__ */ u3(
            BoolSelect,
            {
              value: node.filter.enabled,
              effective: filterApplies(inherited.enabled),
              onChange: (enabled) => updateFilter({ enabled }),
              label: m3.filterToggle.label,
              on: m3.filterToggle.on,
              off: m3.filterToggle.off
            }
          )
        ] }),
        /* @__PURE__ */ u3(
          Rules,
          {
            rules: node.filter.rules,
            order: node.filter.order,
            onChange: (rules, order) => updateFilter({ rules, order: syncOrder(order, rules) })
          }
        )
      ] }),
      current === "appearance" && /* @__PURE__ */ u3(
        Appearance,
        {
          node: node.appearance,
          inherited: inherited.appearance,
          onChange: (appearance) => onChange({ ...node, appearance })
        }
      ),
      current === "effective" && effective
    ] });
  };

  // src/ui/ScopeHeader.tsx
  var ScopeHeader = ({ entry, targets, onReassign, onRemove, onForget }) => {
    const m3 = useMessages();
    const [forgetting, setForgetting] = d2(false);
    const words = entry.scope.tier === "accounts" ? m3.unassigned.account : m3.unassigned.column;
    return /* @__PURE__ */ u3(S, { children: [
      /* @__PURE__ */ u3("div", { class: "scope-header", children: [
        /* @__PURE__ */ u3("h2", { class: "scope-label", children: entry.label }),
        entry.detail && /* @__PURE__ */ u3("span", { class: "rule-meta", children: entry.detail }),
        entry.unassigned && /* @__PURE__ */ u3("span", { class: "action-badge", title: words.notFound, children: m3.unassigned.badge })
      ] }),
      entry.unassigned && /* @__PURE__ */ u3("div", { class: "reassign", children: [
        /* @__PURE__ */ u3("div", { class: "row", children: [
          /* @__PURE__ */ u3("span", { children: words.moveTo }),
          /* @__PURE__ */ u3(
            "select",
            {
              value: "",
              disabled: targets.length === 0,
              onChange: (e3) => {
                const to = e3.currentTarget.value;
                if (to) onReassign(to);
              },
              children: [
                /* @__PURE__ */ u3("option", { value: "", children: targets.length === 0 ? words.noTargets : m3.unassigned.chooseTarget }),
                targets.map((target) => /* @__PURE__ */ u3("option", { value: target.key, children: target.label }, target.key))
              ]
            }
          ),
          /* @__PURE__ */ u3("button", { type: "button", onClick: onRemove, children: m3.unassigned.remove })
        ] }),
        /* @__PURE__ */ u3("p", { class: "hint", children: words.skipConfigured })
      ] }),
      onForget && !entry.unassigned && (forgetting ? /* @__PURE__ */ u3("div", { class: "row add confirm", children: [
        /* @__PURE__ */ u3("span", { children: m3.forget.confirm }),
        /* @__PURE__ */ u3(
          "button",
          {
            type: "button",
            class: "danger",
            onClick: () => {
              setForgetting(false);
              onForget();
            },
            children: m3.forget.confirmYes
          }
        ),
        /* @__PURE__ */ u3("button", { type: "button", onClick: () => setForgetting(false), children: m3.forget.confirmNo })
      ] }) : /* @__PURE__ */ u3("div", { class: "row add remove-row", children: /* @__PURE__ */ u3(
        "button",
        {
          type: "button",
          title: m3.forget.hint,
          onClick: () => entry.configured ? setForgetting(true) : onForget(),
          children: m3.forget.action
        }
      ) }))
    ] });
  };

  // src/ui/ScopeList.tsx
  var scopeKey = (scope) => scope.tier === "global" ? "global" : `${scope.tier}\0${scope.key}`;
  var ScopeList = ({ groups, active, onSelect, note }) => {
    const m3 = useMessages();
    const activeKey = scopeKey(active);
    return /* @__PURE__ */ u3("nav", { class: "pane scopes", "aria-label": m3.tiers.label, children: [
      note && /* @__PURE__ */ u3("p", { class: "hint", children: note }),
      groups.map((group, index) => /* @__PURE__ */ u3("div", { class: "scope-group", children: [
        group.label && /* @__PURE__ */ u3("h2", { children: [
          group.label,
          group.note && /* @__PURE__ */ u3("span", { class: "group-note", children: group.note })
        ] }),
        /* @__PURE__ */ u3("ul", { children: [
          group.entries.length === 0 && group.empty && /* @__PURE__ */ u3("li", { class: "empty", children: group.empty }),
          group.entries.map((entry) => {
            const key = scopeKey(entry.scope);
            const current = key === activeKey;
            return /* @__PURE__ */ u3("li", { children: /* @__PURE__ */ u3(
              "button",
              {
                type: "button",
                class: current ? "scope current" : "scope",
                "aria-current": current ? "true" : void 0,
                onClick: () => onSelect(entry.scope),
                children: [
                  /* @__PURE__ */ u3("span", { class: "scope-label", children: entry.label }),
                  entry.detail && /* @__PURE__ */ u3("span", { class: "scope-detail", children: entry.detail }),
                  entry.configured && /* @__PURE__ */ u3("span", { class: "scope-dot", role: "img", "aria-label": m3.unassigned.configured })
                ]
              }
            ) }, key);
          })
        ] })
      ] }, group.label ?? index))
    ] });
  };

  // src/settings/export.ts
  var EXPORT_APP = "x-pro-tweaks";
  var buildExport = (settings, detectedDecks, at) => {
    const exported = {
      app: EXPORT_APP,
      exportedAt: at.toISOString(),
      settings,
      detectedDecks
    };
    return JSON.stringify(exported, null, 2);
  };
  var pad = (n2) => String(n2).padStart(2, "0");
  var exportFileName = (at) => `x-pro-tweaks-${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}.json`;

  // src/settings/import.ts
  var reidentify = (node) => {
    const renamed = new Map(node.filter.rules.map((rule2) => [rule2.id, newRuleId()]));
    return {
      ...node,
      filter: {
        ...node.filter,
        rules: node.filter.rules.map((rule2) => ({ ...rule2, id: renamed.get(rule2.id) })),
        // Normalization has already run, so the order points at each existing rule exactly once
        order: node.filter.order.map((id) => renamed.get(id))
      }
    };
  };
  var reidentifyAll = (settings) => ({
    ...settings,
    global: reidentify(settings.global),
    accounts: Object.fromEntries(
      Object.entries(settings.accounts).map(([key, node]) => [key, reidentify(node)])
    ),
    columns: Object.fromEntries(
      Object.entries(settings.columns).map(([key, node]) => [key, reidentify(node)])
    )
  });
  var parseImport = (text) => {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      return { ok: false, error: { kind: "badJson", detail: error.message } };
    }
    if (!isRecord(parsed) || parsed.app !== EXPORT_APP) {
      return { ok: false, error: { kind: "notOurs" } };
    }
    const settings = parsed.settings;
    const version = isRecord(settings) ? settings.version : void 0;
    if (version !== SCHEMA_VERSION) {
      return { ok: false, error: { kind: "badVersion", version } };
    }
    return { ok: true, settings: reidentifyAll(fillAll(settings)) };
  };

  // src/ui/transfer-note.ts
  var noteOf = (outcome) => {
    if (outcome.error !== null) return { kind: "error", text: outcome.error };
    if (outcome.copied === "failed") return { kind: "copyFailed" };
    if (outcome.forgotten === "failed") return { kind: "forgetFailed" };
    if (outcome.copied === "done") return { kind: "copied" };
    if (outcome.loaded) return { kind: "loaded" };
    if (outcome.forgotten === "done") return { kind: "forgotten" };
    return null;
  };

  // src/ui/Transfer.tsx
  var errorText = (error, m3) => {
    const words = m3.transfer.errors;
    if (error.kind === "badJson") return words.badJson(error.detail);
    if (error.kind === "notOurs") return words.notOurs;
    return words.badVersion(error.version === void 0 ? "?" : String(error.version), SCHEMA_VERSION);
  };
  var Transfer = ({ settings, detected, onLoad, onClose }) => {
    const m3 = useMessages();
    const [copied, setCopied] = d2(null);
    const [error, setError] = d2(null);
    const [loaded, setLoaded] = d2(false);
    const [confirming, setConfirming] = d2(false);
    const [forgotten, setForgotten] = d2(null);
    const [draft, setDraft] = d2(null);
    const box = A2(null);
    const picker = A2(null);
    const { at, text } = T2(() => {
      const at2 = /* @__PURE__ */ new Date();
      return { at: at2, text: buildExport(settings, detected, at2) };
    }, [settings, detected]);
    const shown = draft ?? text;
    h2(() => setCopied(null), [shown]);
    h2(() => {
      const area = box.current;
      if (!area) return;
      area.focus();
      area.setSelectionRange(0, 0);
      area.scrollTop = 0;
    }, []);
    const edit = (value) => {
      setDraft(value);
      setError(null);
      setConfirming(false);
      setLoaded(false);
    };
    const save2 = () => {
      const url = URL.createObjectURL(new Blob([shown], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFileName(at);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    };
    const copy = () => {
      navigator.clipboard.writeText(shown).then(
        () => setCopied("done"),
        // Permission is sometimes refused. Rather than failing silently, offer another way
        () => setCopied("failed")
      );
    };
    const choose = async (file) => {
      if (!file) return;
      try {
        edit(await file.text());
      } catch {
        setError(m3.transfer.errors.badFile);
      }
    };
    const ask = () => {
      const result = parseImport(shown);
      if (!result.ok) {
        setError(errorText(result.error, m3));
        setConfirming(false);
        return;
      }
      setError(null);
      setConfirming(true);
    };
    const load2 = () => {
      const result = parseImport(shown);
      if (!result.ok) {
        setError(errorText(result.error, m3));
        setConfirming(false);
        return;
      }
      onLoad(result.settings);
      setConfirming(false);
      setDraft(null);
      setLoaded(true);
    };
    const decided = noteOf({ error, copied, loaded, forgotten });
    const note = decided === null ? "" : decided.kind === "error" ? decided.text : m3.transfer[decided.kind];
    return /* @__PURE__ */ u3("section", { class: "transfer", children: [
      /* @__PURE__ */ u3("div", { class: "row", children: [
        /* @__PURE__ */ u3("span", { children: m3.transfer.legend }),
        /* @__PURE__ */ u3("button", { type: "button", onClick: save2, children: m3.transfer.save }),
        /* @__PURE__ */ u3("button", { type: "button", onClick: copy, children: m3.transfer.copy }),
        /* @__PURE__ */ u3("button", { type: "button", onClick: onClose, children: m3.transfer.close })
      ] }),
      /* @__PURE__ */ u3(
        "textarea",
        {
          ref: box,
          rows: 12,
          value: shown,
          "aria-label": m3.transfer.legend,
          onInput: (e3) => edit(e3.currentTarget.value)
        }
      ),
      /* @__PURE__ */ u3("p", { class: "hint", children: m3.transfer.hint }),
      /* @__PURE__ */ u3("div", { class: "row", children: [
        /* @__PURE__ */ u3(
          "input",
          {
            ref: picker,
            type: "file",
            accept: "application/json,.json",
            hidden: true,
            onChange: (e3) => {
              void choose(e3.currentTarget.files?.[0]);
              e3.currentTarget.value = "";
            }
          }
        ),
        /* @__PURE__ */ u3("button", { type: "button", onClick: () => picker.current?.click(), children: m3.transfer.choose }),
        /* @__PURE__ */ u3("button", { type: "button", onClick: ask, children: m3.transfer.load }),
        /* @__PURE__ */ u3(
          "button",
          {
            type: "button",
            onClick: () => {
              clearDetected().then(
                () => setForgotten("done"),
                () => setForgotten("failed")
              );
            },
            children: m3.transfer.forget
          }
        )
      ] }),
      confirming && /* @__PURE__ */ u3("div", { class: "row add confirm", children: [
        /* @__PURE__ */ u3("span", { children: m3.transfer.confirm }),
        /* @__PURE__ */ u3("button", { type: "button", class: "danger", onClick: load2, children: m3.transfer.confirmYes }),
        /* @__PURE__ */ u3("button", { type: "button", onClick: () => setConfirming(false), children: m3.transfer.confirmNo })
      ] }),
      /* @__PURE__ */ u3("p", { class: error ? "error" : "hint", role: "status", "aria-live": "polite", children: note })
    ] });
  };

  // src/ui/Effective.tsx
  var From = ({ tier }) => {
    const m3 = useMessages();
    return tier ? /* @__PURE__ */ u3("span", { class: "from", children: m3.effective.from[tier] }) : null;
  };
  var Row = ({ label, value, tier }) => {
    const m3 = useMessages();
    return /* @__PURE__ */ u3("div", { class: "effective-row", children: [
      /* @__PURE__ */ u3("span", { class: "effective-label", children: label }),
      /* @__PURE__ */ u3("span", { class: value === null ? "effective-value unset" : "effective-value", children: value ?? m3.effective.unset }),
      /* @__PURE__ */ u3(From, { tier })
    ] });
  };
  var size2 = (value, unit) => value === null ? null : `${value}${unit}`;
  var appearanceRows = (settings, scope, effective, m3) => {
    const of = (pick) => sourceOf(settings, scope, pick);
    const colors = m3.appearance.colors;
    return [
      {
        label: m3.appearance.columnWidth,
        value: size2(effective.columnWidth, m3.size.unit),
        tier: of((n2) => n2.appearance.columnWidth)
      },
      {
        label: m3.appearance.fontSize,
        value: size2(effective.fontSize, m3.size.unit),
        tier: of((n2) => n2.appearance.fontSize)
      },
      {
        label: m3.appearance.maxLines,
        value: size2(effective.maxLines, m3.appearance.lines),
        tier: of((n2) => n2.appearance.maxLines)
      },
      {
        label: m3.appearance.media.maxThumbHeight,
        value: size2(effective.media.maxThumbHeight, m3.size.unit),
        tier: of((n2) => n2.appearance.media.maxThumbHeight)
      },
      {
        label: m3.appearance.media.collapse,
        // Unset has a default side too (shown). Say which one is in effect
        value: mediaCollapses(effective.media.collapse) ? m3.appearance.media.collapseOn : m3.appearance.media.collapseOff,
        tier: of((n2) => n2.appearance.media.collapse)
      },
      // Colors are listed in the same order as on the editing surface, so the two can be compared
      ...COLOR_ORDER.map((key) => ({
        label: colors[key],
        value: effective.colors[key],
        tier: of((n2) => n2.appearance.colors[key])
      }))
    ];
  };
  var Effective = ({ settings, scope }) => {
    const m3 = useMessages();
    const merged = resolve(settings, scope);
    const filtering = filterApplies(merged.filter.enabled);
    const styling = appearanceApplies(merged.appearance.enabled);
    const appearance = merged.appearance;
    const byId = new Map(merged.filter.rules.map((rule2) => [rule2.id, rule2]));
    const rules = merged.filter.order.map((id) => byId.get(id)).filter((rule2) => rule2 !== void 0);
    return /* @__PURE__ */ u3(S, { children: [
      /* @__PURE__ */ u3("p", { class: "hint", children: m3.effective.hint }),
      /* @__PURE__ */ u3("fieldset", { children: [
        /* @__PURE__ */ u3("legend", { children: m3.effective.rules }),
        /* @__PURE__ */ u3(
          Row,
          {
            label: m3.filterToggle.label,
            value: filtering ? m3.filterToggle.on : m3.filterToggle.off,
            tier: sourceOf(settings, scope, (n2) => n2.filter.enabled)
          }
        ),
        !filtering && /* @__PURE__ */ u3("p", { class: "warning", children: m3.effective.filterStopped }),
        rules.length === 0 ? /* @__PURE__ */ u3("p", { class: "hint", children: m3.effective.noRules }) : /* @__PURE__ */ u3("ol", { class: "effective-rules", children: rules.map((rule2) => /* @__PURE__ */ u3("li", { class: rule2.enabled ? void 0 : "off", children: [
          /* @__PURE__ */ u3("span", { class: "effective-label", children: ruleName(rule2, m3) }),
          /* @__PURE__ */ u3("span", { class: "action-badge", children: m3.actions[rule2.action] }),
          !rule2.enabled && /* @__PURE__ */ u3("span", { class: "rule-meta", children: m3.effective.disabled }),
          /* @__PURE__ */ u3(From, { tier: ruleSourceOf(settings, scope, rule2.id) })
        ] }, rule2.id)) })
      ] }),
      /* @__PURE__ */ u3("fieldset", { children: [
        /* @__PURE__ */ u3("legend", { children: m3.effective.appearance }),
        /* @__PURE__ */ u3(
          Row,
          {
            label: m3.appearanceToggle.label,
            value: styling ? m3.appearanceToggle.on : m3.appearanceToggle.off,
            tier: sourceOf(settings, scope, (n2) => n2.appearance.enabled)
          }
        ),
        !styling && /* @__PURE__ */ u3("p", { class: "warning", children: m3.effective.appearanceStopped }),
        appearanceRows(settings, scope, appearance, m3).map((row) => /* @__PURE__ */ u3(Row, { ...row }, row.label))
      ] })
    ] });
  };

  // src/ui/useSettings.ts
  var useSettings = () => {
    const [settings, setSettings] = d2(emptySettings);
    const [unreadable, setUnreadable] = d2(null);
    const [loaded, setLoaded] = d2(false);
    const [status, setStatus] = d2({ kind: null, id: 0 });
    const savingByMe = A2(false);
    h2(() => {
      load().then((loaded2) => {
        setSettings(loaded2.settings);
        setUnreadable(loaded2.unreadable);
        setLoaded(true);
      });
      return subscribe((next) => {
        if (savingByMe.current) return;
        setSettings(next);
        setStatus((prev) => ({ kind: "saved", id: prev.id + 1 }));
      });
    }, []);
    h2(() => {
      if (!status.kind) return;
      if (status.kind === "saveFailed") return;
      const timer = setTimeout(() => setStatus((prev) => ({ kind: null, id: prev.id })), 2e3);
      return () => clearTimeout(timer);
    }, [status.id]);
    const announce = (kind) => setStatus((prev) => ({ kind, id: prev.id + 1 }));
    const update = (next) => {
      setSettings(next);
      setUnreadable(null);
      savingByMe.current = true;
      save(next).then(() => announce("saved")).catch(() => announce("saveFailed")).finally(() => setTimeout(() => savingByMe.current = false, 0));
    };
    return {
      settings,
      unreadable,
      status: status.kind,
      update,
      reportSaveFailed: () => announce("saveFailed"),
      loaded
    };
  };

  // src/ui/SettingsApp.tsx
  var useDetected = () => {
    const [detected, setDetected] = d2(emptyDetected);
    const [loaded, setLoaded] = d2(false);
    h2(() => {
      loadDetected().then((found) => {
        setDetected(found);
        setLoaded(true);
      });
      return subscribeDetected(setDetected);
    }, []);
    return { detected, loaded };
  };
  var usePaused = () => {
    const [paused, setPaused] = d2(false);
    h2(() => {
      void loadPaused().then(setPaused);
      return subscribePaused(setPaused);
    }, []);
    return paused;
  };
  var useAdGuard = () => {
    const [tripped, setTripped] = d2(false);
    h2(() => {
      void loadAdGuard().then(setTripped);
      return subscribeAdGuard(setTripped);
    }, []);
    return tripped;
  };
  var useHealth = () => {
    const [broken, setBroken] = d2([]);
    h2(() => {
      void loadHealth().then(setBroken);
      return subscribeHealth(setBroken);
    }, []);
    return broken;
  };
  var LanguageSelect = ({
    value,
    onChange
  }) => {
    const m3 = useMessages();
    return /* @__PURE__ */ u3("label", { class: "language", children: [
      /* @__PURE__ */ u3("span", { children: m3.language.label }),
      /* @__PURE__ */ u3("select", { value, onChange: (e3) => onChange(e3.currentTarget.value), children: LANGUAGES.map((language) => /* @__PURE__ */ u3("option", { value: language, children: m3.language[language] }, language)) })
    ] });
  };
  var SettingsApp = ({ onLocale, start, exportable } = {}) => {
    const { settings, unreadable, status, update, reportSaveFailed, loaded } = useSettings();
    const locale = localeOf(settings.language);
    const m3 = messagesFor(locale);
    h2(() => onLocale?.(locale), [locale, onLocale]);
    const [scope, setScope] = d2(start ?? { tier: "global" });
    const [tab, setTab] = d2("filter");
    const [transferring, setTransferring] = d2(false);
    const transferButton = A2(null);
    const { detected: found, loaded: detectedLoaded } = useDetected();
    const detected = T2(() => allColumns(found), [found]);
    const paused = usePaused();
    const adGuard = useAdGuard();
    const broken = useHealth();
    const ready2 = loaded && detectedLoaded;
    const detecting = found.decks.length > 0;
    const updateGlobal = (node) => update({ ...settings, global: node });
    const put = (nodes, key, node) => {
      const next = { ...nodes };
      if (isEmptyNode(node)) delete next[key];
      else next[key] = node;
      return next;
    };
    const updateAccount = (key, node) => update({ ...settings, accounts: put(settings.accounts, key, node) });
    const updateColumn = (key, node) => update({ ...settings, columns: put(settings.columns, key, node) });
    const moveIn = (nodes, from, to) => {
      const moved = { ...nodes, [to]: nodes[from] };
      delete moved[from];
      return moved;
    };
    const removeFrom = (nodes, key) => {
      const rest = { ...nodes };
      delete rest[key];
      return rest;
    };
    const marked = (node, scope2) => hasContent(node) && filterApplies(enabledAt(settings, scope2));
    const accountEntries = T2(() => {
      const live = new Set(detected.map((column) => column.account).filter((a3) => a3 !== null));
      const keys = [.../* @__PURE__ */ new Set([...live, ...Object.keys(settings.accounts)])];
      return keys.sort().map((account) => ({
        scope: { tier: "accounts", key: account },
        label: `@${account}`,
        detail: live.has(account) ? m3.tiers.columnCount(detected.filter((column) => column.account === account).length) : void 0,
        unassigned: detecting && !live.has(account),
        configured: marked(settings.accounts[account], { account, columnId: null })
      }));
    }, [detected, settings, detecting, m3]);
    const deckGroups = T2(() => {
      const all = detected;
      const identityOf = (column) => JSON.stringify([column.title, column.account]);
      const duplicated = new Set(
        all.map(identityOf).filter((key, i3, keys) => keys.indexOf(key) !== i3)
      );
      const seen = /* @__PURE__ */ new Map();
      return found.decks.map((deck, index) => ({
        label: deck.name ?? m3.tiers.deckNth(index + 1),
        note: deck.deckId === found.currentDeckId ? m3.tiers.deckShowing : void 0,
        empty: m3.tiers.columnsEmpty,
        entries: deck.columns.map((column) => {
          const identity = identityOf(column);
          const order = (seen.get(identity) ?? 0) + 1;
          seen.set(identity, order);
          const account = column.account ? `@${column.account}` : null;
          const number = duplicated.has(identity) ? m3.tiers.nth(order) : null;
          const missing = column.missing ? m3.tiers.columnMissing : null;
          return {
            scope: { tier: "columns", key: column.columnId },
            label: column.title ?? m3.tiers.unnamedColumn,
            detail: [missing, account, number].filter(Boolean).join(" / ") || void 0,
            unassigned: false,
            configured: marked(settings.columns[column.columnId], {
              account: column.account,
              columnId: column.columnId
            })
          };
        })
      }));
    }, [found, detected, settings, m3]);
    const missingColumns = T2(() => {
      const liveIds = new Set(detected.map((column) => column.columnId));
      return Object.keys(settings.columns).filter((id) => !liveIds.has(id)).sort().map((id) => ({
        scope: { tier: "columns", key: id },
        label: detecting ? m3.tiers.missingColumn : m3.tiers.unknownColumn,
        detail: id,
        unassigned: detecting,
        // With no matching column, the account is unknown too. The effective value is judged up to global
        configured: marked(settings.columns[id], { account: null, columnId: id })
      }));
    }, [detected, settings, detecting, m3]);
    const globalEntry = T2(
      () => ({
        scope: { tier: "global" },
        label: m3.tiers.global,
        unassigned: false,
        configured: marked(settings.global, { account: null, columnId: null })
      }),
      [settings, m3]
    );
    const groups = T2(() => {
      const unassigned = [...accountEntries, ...missingColumns].filter((entry) => entry.unassigned);
      return [
        { entries: [globalEntry] },
        {
          label: m3.tiers.accounts,
          entries: accountEntries.filter((entry) => !entry.unassigned),
          empty: m3.tiers.accountsEmpty
        },
        ...deckGroups.length > 0 ? deckGroups : [{ label: m3.tiers.columns, entries: [], empty: m3.tiers.columnsEmpty }],
        // An empty group is not shown at all. A heading left with nothing to tidy up suggests there is something
        ...unassigned.length > 0 ? [{ label: m3.tiers.unassignedGroup, entries: unassigned }] : []
      ];
    }, [globalEntry, accountEntries, deckGroups, missingColumns, m3]);
    const current = groups.flatMap((group) => group.entries).find((entry) => scopeKey(entry.scope) === scopeKey(scope)) ?? globalEntry;
    const reassignTargets = T2(() => {
      if (current.scope.tier === "accounts") {
        return [...new Set(detected.map((column) => column.account).filter((a3) => a3 !== null))].filter((account) => !settings.accounts[account]).sort().map((account) => ({ key: account, label: `@${account}` }));
      }
      if (current.scope.tier === "columns") {
        return detected.filter((column) => column.columnId !== null && !settings.columns[column.columnId]).map((column) => ({
          key: column.columnId,
          label: `${column.title ?? m3.tiers.unnamedColumn}${column.account ? ` / @${column.account}` : ""}`
        }));
      }
      return [];
    }, [current.scope, detected, settings.accounts, settings.columns, m3]);
    const reassign = (to) => {
      const from = current.scope;
      if (from.tier === "accounts") {
        update({ ...settings, accounts: moveIn(settings.accounts, from.key, to) });
        setScope({ tier: "accounts", key: to });
      } else if (from.tier === "columns") {
        update({ ...settings, columns: moveIn(settings.columns, from.key, to) });
        setScope({ tier: "columns", key: to });
      }
    };
    const forgetCurrent = () => {
      const from = current.scope;
      if (from.tier !== "columns") return;
      forgetColumn(from.key).catch(reportSaveFailed);
      if (settings.columns[from.key]) {
        update({ ...settings, columns: removeFrom(settings.columns, from.key) });
      }
      setScope({ tier: "global" });
    };
    const removeCurrent = () => {
      const from = current.scope;
      if (from.tier === "accounts") {
        update({ ...settings, accounts: removeFrom(settings.accounts, from.key) });
      } else if (from.tier === "columns") {
        update({ ...settings, columns: removeFrom(settings.columns, from.key) });
      }
      setScope({ tier: "global" });
    };
    const inherited = T2(() => {
      const target = current.scope;
      if (target.tier === "global") return inheritedFor(settings, { tier: "global" });
      if (target.tier === "accounts") return inheritedFor(settings, { tier: "accounts" });
      const account = detected.find((column) => column.columnId === target.key)?.account ?? null;
      return inheritedFor(settings, { tier: "columns", account });
    }, [current.scope, settings, detected]);
    const shown = current.scope;
    const columnScope = shown.tier === "columns" ? {
      account: detected.find((column) => column.columnId === shown.key)?.account ?? null,
      columnId: shown.key
    } : null;
    const nodeOf = (target) => {
      if (target.tier === "global") return settings.global;
      const nodes = target.tier === "accounts" ? settings.accounts : settings.columns;
      return nodes[target.key] ?? emptyNode();
    };
    const changeNode = (node) => {
      const target = current.scope;
      if (target.tier === "global") updateGlobal(node);
      else if (target.tier === "accounts") updateAccount(target.key, node);
      else updateColumn(target.key, node);
    };
    return /* @__PURE__ */ u3(MessagesProvider, { value: m3, children: /* @__PURE__ */ u3("div", { class: "settings", children: [
      /* @__PURE__ */ u3("header", { children: [
        /* @__PURE__ */ u3("h1", { children: "X Pro Tweaks" }),
        /* @__PURE__ */ u3(
          "p",
          {
            id: "status",
            role: "status",
            "aria-live": "polite",
            class: status === "saveFailed" ? "failed" : void 0,
            children: status && m3.status[status]
          }
        ),
        /* @__PURE__ */ u3(
          LanguageSelect,
          {
            value: settings.language,
            onChange: (language) => update({ ...settings, language })
          }
        ),
        exportable && ready2 && /* @__PURE__ */ u3(
          "button",
          {
            type: "button",
            ref: transferButton,
            "aria-expanded": transferring,
            onClick: () => setTransferring((open) => !open),
            children: m3.transfer.open
          }
        )
      ] }),
      paused && /* @__PURE__ */ u3("p", { class: "warning", children: m3.pausedNotice }),
      adGuard && /* @__PURE__ */ u3("p", { class: "warning", children: m3.adGuardNotice }),
      broken.length > 0 && /* @__PURE__ */ u3("p", { class: "warning", children: [
        broken.map((marker) => m3.health[marker]).join(" "),
        " ",
        m3.health.hint
      ] }),
      unreadable !== null && /* @__PURE__ */ u3("p", { class: "warning", children: (unreadable.newer ? m3.unreadable.newer : m3.unreadable.older)(
        unreadable.version,
        SCHEMA_VERSION
      ) }),
      ready2 && /* @__PURE__ */ u3("div", { class: "panes", children: [
        /* @__PURE__ */ u3(
          ScopeList,
          {
            groups,
            active: current.scope,
            onSelect: setScope,
            note: detecting ? void 0 : m3.tiers.notDetecting
          }
        ),
        /* @__PURE__ */ u3("div", { class: "pane detail", children: [
          /* @__PURE__ */ u3(
            ScopeHeader,
            {
              entry: current,
              targets: reassignTargets,
              onReassign: reassign,
              onRemove: removeCurrent,
              onForget: current.scope.tier === "columns" ? forgetCurrent : void 0
            },
            scopeKey(current.scope)
          ),
          /* @__PURE__ */ u3(
            TierEditor,
            {
              node: nodeOf(current.scope),
              onChange: changeNode,
              tab,
              onTabChange: setTab,
              inherited,
              effective: columnScope && /* @__PURE__ */ u3(Effective, { settings, scope: columnScope })
            },
            scopeKey(current.scope)
          )
        ] })
      ] }),
      ready2 && transferring && /* @__PURE__ */ u3(
        Transfer,
        {
          settings,
          detected: found.decks,
          onLoad: update,
          onClose: () => {
            setTransferring(false);
            transferButton.current?.focus();
          }
        }
      )
    ] }) });
  };

  // node_modules/@melloware/coloris/dist/esm/coloris.js
  var Coloris = (() => {
    return ((window2, document2, Math2, undefined2) => {
      const ctx = document2.createElement("canvas").getContext("2d");
      const currentColor = { r: 0, g: 0, b: 0, h: 0, s: 0, v: 0, a: 1 };
      let container, picker, colorArea, colorMarker, colorPreview, colorValue, clearButton, closeButton, hueSlider, hueMarker, alphaSlider, alphaMarker, currentEl, currentFormat, oldColor, keyboardNav, colorAreaDims = {};
      const settings = {
        el: "[data-coloris]",
        parent: "body",
        theme: "default",
        themeMode: "light",
        rtl: false,
        wrap: true,
        margin: 2,
        format: "hex",
        formatToggle: false,
        swatches: [],
        swatchesOnly: false,
        alpha: true,
        forceAlpha: false,
        focusInput: true,
        selectInput: false,
        inline: false,
        defaultColor: "#000000",
        clearButton: false,
        clearLabel: "Clear",
        closeButton: false,
        closeLabel: "Close",
        onChange: () => undefined2,
        a11y: {
          open: "Open color picker",
          close: "Close color picker",
          clear: "Clear the selected color",
          marker: "Saturation: {s}. Brightness: {v}.",
          hueSlider: "Hue slider",
          alphaSlider: "Opacity slider",
          input: "Color value field",
          format: "Color format",
          swatch: "Color swatch",
          instruction: "Saturation and brightness selector. Use up, down, left and right arrow keys to select."
        }
      };
      const instances = {};
      let currentInstanceId = "";
      let defaultInstance = {};
      let hasInstance = false;
      function configure(options) {
        if (typeof options !== "object") {
          return;
        }
        for (const key in options) {
          switch (key) {
            case "el":
              bindFields(options.el);
              if (options.wrap !== false) {
                wrapFields(options.el);
              }
              break;
            case "parent":
              container = options.parent instanceof HTMLElement ? options.parent : document2.querySelector(options.parent);
              if (container) {
                container.appendChild(picker);
                settings.parent = options.parent;
                if (container === document2.body) {
                  container = undefined2;
                }
              }
              break;
            case "themeMode":
              settings.themeMode = options.themeMode;
              if (options.themeMode === "auto" && window2.matchMedia && window2.matchMedia("(prefers-color-scheme: dark)").matches) {
                settings.themeMode = "dark";
              }
            // The lack of a break statement is intentional
            case "theme":
              if (options.theme) {
                settings.theme = options.theme;
              }
              picker.className = `clr-picker clr-${settings.theme} clr-${settings.themeMode}`;
              if (settings.inline) {
                updatePickerPosition();
              }
              break;
            case "rtl":
              settings.rtl = !!options.rtl;
              Array.from(document2.getElementsByClassName("clr-field")).forEach((field) => field.classList.toggle("clr-rtl", settings.rtl));
              break;
            case "margin":
              options.margin *= 1;
              settings.margin = !isNaN(options.margin) ? options.margin : settings.margin;
              break;
            case "wrap":
              if (options.el && options.wrap) {
                wrapFields(options.el);
              }
              break;
            case "formatToggle":
              settings.formatToggle = !!options.formatToggle;
              getEl("clr-format").style.display = settings.formatToggle ? "block" : "none";
              if (settings.formatToggle) {
                settings.format = "auto";
              }
              break;
            case "swatches":
              if (Array.isArray(options.swatches)) {
                const swatchesContainer = getEl("clr-swatches");
                const swatches2 = document2.createElement("div");
                swatchesContainer.textContent = "";
                options.swatches.forEach((swatch, i3) => {
                  const button = document2.createElement("button");
                  button.setAttribute("type", `button`);
                  button.setAttribute("id", `clr-swatch-${i3}`);
                  button.setAttribute("aria-labelledby", `clr-swatch-label clr-swatch-${i3}`);
                  button.style.color = swatch;
                  button.textContent = swatch;
                  swatches2.appendChild(button);
                });
                if (options.swatches.length) {
                  swatchesContainer.appendChild(swatches2);
                }
                settings.swatches = options.swatches.slice();
              }
              break;
            case "swatchesOnly":
              settings.swatchesOnly = !!options.swatchesOnly;
              picker.setAttribute("data-minimal", settings.swatchesOnly);
              break;
            case "alpha":
              settings.alpha = !!options.alpha;
              picker.setAttribute("data-alpha", settings.alpha);
              break;
            case "inline":
              settings.inline = !!options.inline;
              picker.setAttribute("data-inline", settings.inline);
              if (settings.inline) {
                const defaultColor = options.defaultColor || settings.defaultColor;
                currentFormat = getColorFormatFromStr(defaultColor);
                updatePickerPosition();
                setColorFromStr(defaultColor);
              }
              break;
            case "clearButton":
              if (typeof options.clearButton === "object") {
                if (options.clearButton.label) {
                  settings.clearLabel = options.clearButton.label;
                  clearButton.innerHTML = settings.clearLabel;
                }
                options.clearButton = options.clearButton.show;
              }
              settings.clearButton = !!options.clearButton;
              clearButton.style.display = settings.clearButton ? "block" : "none";
              break;
            case "clearLabel":
              settings.clearLabel = options.clearLabel;
              clearButton.innerHTML = settings.clearLabel;
              break;
            case "closeButton":
              settings.closeButton = !!options.closeButton;
              if (settings.closeButton) {
                picker.insertBefore(closeButton, colorPreview);
              } else {
                colorPreview.appendChild(closeButton);
              }
              break;
            case "closeLabel":
              settings.closeLabel = options.closeLabel;
              closeButton.innerHTML = settings.closeLabel;
              break;
            case "a11y":
              const labels = options.a11y;
              let update = false;
              if (typeof labels === "object") {
                for (const label in labels) {
                  if (labels[label] && settings.a11y[label]) {
                    settings.a11y[label] = labels[label];
                    update = true;
                  }
                }
              }
              if (update) {
                const openLabel = getEl("clr-open-label");
                const swatchLabel = getEl("clr-swatch-label");
                openLabel.innerHTML = settings.a11y.open;
                swatchLabel.innerHTML = settings.a11y.swatch;
                closeButton.setAttribute("aria-label", settings.a11y.close);
                clearButton.setAttribute("aria-label", settings.a11y.clear);
                hueSlider.setAttribute("aria-label", settings.a11y.hueSlider);
                alphaSlider.setAttribute("aria-label", settings.a11y.alphaSlider);
                colorValue.setAttribute("aria-label", settings.a11y.input);
                colorArea.setAttribute("aria-label", settings.a11y.instruction);
              }
              break;
            default:
              settings[key] = options[key];
          }
        }
      }
      function setVirtualInstance(selector, options) {
        if (typeof selector === "string" && typeof options === "object") {
          instances[selector] = options;
          hasInstance = true;
        }
      }
      function removeVirtualInstance(selector) {
        delete instances[selector];
        if (Object.keys(instances).length === 0) {
          hasInstance = false;
          if (selector === currentInstanceId) {
            resetVirtualInstance();
          }
        }
      }
      function attachVirtualInstance(element) {
        if (hasInstance) {
          const unsupportedOptions = ["el", "wrap", "rtl", "inline", "defaultColor", "a11y"];
          for (let selector in instances) {
            const options = instances[selector];
            if (element.matches(selector)) {
              currentInstanceId = selector;
              defaultInstance = {};
              unsupportedOptions.forEach((option) => delete options[option]);
              for (let option in options) {
                defaultInstance[option] = Array.isArray(settings[option]) ? settings[option].slice() : settings[option];
              }
              configure(options);
              break;
            }
          }
        }
      }
      function resetVirtualInstance() {
        if (Object.keys(defaultInstance).length > 0) {
          configure(defaultInstance);
          currentInstanceId = "";
          defaultInstance = {};
        }
      }
      function bindFields(selector) {
        if (selector instanceof HTMLElement) {
          selector = [selector];
        }
        if (Array.isArray(selector)) {
          selector.forEach((field) => {
            addListener(field, "click", openPicker);
            addListener(field, "input", updateColorPreview);
          });
        } else {
          addListener(document2, "click", selector, openPicker);
          addListener(document2, "input", selector, updateColorPreview);
        }
      }
      function openPicker(event) {
        if (settings.inline) {
          return;
        }
        attachVirtualInstance(event.target);
        currentEl = event.target;
        oldColor = currentEl.value;
        currentFormat = getColorFormatFromStr(oldColor);
        picker.classList.add("clr-open");
        updatePickerPosition();
        setColorFromStr(oldColor);
        if (settings.focusInput || settings.selectInput) {
          colorValue.focus({ preventScroll: true });
          colorValue.setSelectionRange(currentEl.selectionStart, currentEl.selectionEnd);
        }
        if (settings.selectInput) {
          colorValue.select();
        }
        if (keyboardNav || settings.swatchesOnly) {
          getFocusableElements().shift().focus();
        }
        currentEl.dispatchEvent(new Event("open", { bubbles: false }));
      }
      function updatePickerPosition() {
        if (!picker || !currentEl && !settings.inline) return;
        const parent = container;
        const scrollY = window2.scrollY;
        const pickerWidth = picker.offsetWidth;
        const pickerHeight = picker.offsetHeight;
        const reposition = { left: false, top: false };
        let parentStyle, parentMarginTop, parentBorderTop;
        let offset = { x: 0, y: 0 };
        if (parent) {
          parentStyle = window2.getComputedStyle(parent);
          parentMarginTop = parseFloat(parentStyle.marginTop);
          parentBorderTop = parseFloat(parentStyle.borderTopWidth);
          offset = parent.getBoundingClientRect();
          offset.y += parentBorderTop + scrollY;
        }
        if (!settings.inline) {
          const coords = currentEl.getBoundingClientRect();
          let left = coords.x;
          let top = scrollY + coords.y + coords.height + settings.margin;
          if (parent) {
            left -= offset.x;
            top -= offset.y;
            if (left + pickerWidth > parent.clientWidth) {
              left += coords.width - pickerWidth;
              reposition.left = true;
            }
            if (top + pickerHeight > parent.clientHeight - parentMarginTop) {
              if (pickerHeight + settings.margin <= coords.top - (offset.y - scrollY)) {
                top -= coords.height + pickerHeight + settings.margin * 2;
                reposition.top = true;
              }
            }
            top += parent.scrollTop;
          } else {
            if (left + pickerWidth > document2.documentElement.clientWidth) {
              left += coords.width - pickerWidth;
              reposition.left = true;
            }
            if (top + pickerHeight - scrollY > document2.documentElement.clientHeight) {
              if (pickerHeight + settings.margin <= coords.top) {
                top = scrollY + coords.y - pickerHeight - settings.margin;
                reposition.top = true;
              }
            }
          }
          picker.classList.toggle("clr-left", reposition.left);
          picker.classList.toggle("clr-top", reposition.top);
          picker.style.left = `${left}px`;
          picker.style.top = `${top}px`;
          offset.x += picker.offsetLeft;
          offset.y += picker.offsetTop;
        }
        colorAreaDims = {
          width: colorArea.offsetWidth,
          height: colorArea.offsetHeight,
          x: colorArea.offsetLeft + offset.x,
          y: colorArea.offsetTop + offset.y
        };
      }
      function wrapFields(selector) {
        if (selector instanceof HTMLElement) {
          wrapColorField(selector);
        } else if (Array.isArray(selector)) {
          selector.forEach(wrapColorField);
        } else {
          document2.querySelectorAll(selector).forEach(wrapColorField);
        }
      }
      function wrapColorField(field) {
        const parentNode = field.parentNode;
        if (!parentNode.classList.contains("clr-field")) {
          const wrapper = document2.createElement("div");
          let classes = "clr-field";
          if (settings.rtl || field.classList.contains("clr-rtl")) {
            classes += " clr-rtl";
          }
          wrapper.innerHTML = '<button type="button" aria-labelledby="clr-open-label"></button>';
          parentNode.insertBefore(wrapper, field);
          wrapper.className = classes;
          wrapper.style.color = field.value;
          wrapper.appendChild(field);
        }
      }
      function updateColorPreview(event) {
        const parent = event.target.parentNode;
        if (parent.classList.contains("clr-field")) {
          parent.style.color = event.target.value;
        }
      }
      function closePicker(revert) {
        if (currentEl && !settings.inline) {
          const prevEl = currentEl;
          if (revert) {
            currentEl = undefined2;
            if (oldColor !== prevEl.value) {
              prevEl.value = oldColor;
              prevEl.dispatchEvent(new Event("input", { bubbles: true }));
            }
          }
          setTimeout(() => {
            if (oldColor !== prevEl.value) {
              prevEl.dispatchEvent(new Event("change", { bubbles: true }));
            }
          });
          picker.classList.remove("clr-open");
          if (hasInstance) {
            resetVirtualInstance();
          }
          prevEl.dispatchEvent(new Event("close", { bubbles: false }));
          if (settings.focusInput) {
            prevEl.focus({ preventScroll: true });
          }
          currentEl = undefined2;
        }
      }
      function setColorFromStr(str3) {
        const rgba = strToRGBA(str3);
        const hsva = RGBAtoHSVA(rgba);
        updateMarkerA11yLabel(hsva.s, hsva.v);
        updateColor(rgba, hsva);
        hueSlider.value = hsva.h;
        picker.style.color = `hsl(${hsva.h}, 100%, 50%)`;
        hueMarker.style.left = `${hsva.h / 360 * 100}%`;
        colorMarker.style.left = `${colorAreaDims.width * hsva.s / 100}px`;
        colorMarker.style.top = `${colorAreaDims.height - colorAreaDims.height * hsva.v / 100}px`;
        alphaSlider.value = hsva.a * 100;
        alphaMarker.style.left = `${hsva.a * 100}%`;
      }
      function getColorFormatFromStr(str3) {
        const format = str3.substring(0, 3).toLowerCase();
        if (format === "rgb" || format === "hsl") {
          return format;
        }
        return "hex";
      }
      function pickColor(color) {
        color = color !== undefined2 ? color : colorValue.value;
        if (currentEl) {
          currentEl.value = color;
          currentEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
        if (settings.onChange) {
          settings.onChange.call(window2, color, currentEl);
        }
        document2.dispatchEvent(new CustomEvent("coloris:pick", { detail: { color, currentEl } }));
      }
      function setColorAtPosition(x3, y3) {
        const hsva = {
          h: hueSlider.value * 1,
          s: x3 / colorAreaDims.width * 100,
          v: 100 - y3 / colorAreaDims.height * 100,
          a: alphaSlider.value / 100
        };
        const rgba = HSVAtoRGBA(hsva);
        updateMarkerA11yLabel(hsva.s, hsva.v);
        updateColor(rgba, hsva);
        pickColor();
      }
      function updateMarkerA11yLabel(saturation, value) {
        let label = settings.a11y.marker;
        saturation = saturation.toFixed(1) * 1;
        value = value.toFixed(1) * 1;
        label = label.replace("{s}", saturation);
        label = label.replace("{v}", value);
        colorMarker.setAttribute("aria-label", label);
      }
      function getPointerPosition(event) {
        return {
          pageX: event.changedTouches ? event.changedTouches[0].pageX : event.pageX,
          pageY: event.changedTouches ? event.changedTouches[0].pageY : event.pageY
        };
      }
      function moveMarker(event) {
        const pointer = getPointerPosition(event);
        let x3 = pointer.pageX - colorAreaDims.x;
        let y3 = pointer.pageY - colorAreaDims.y;
        if (container) {
          y3 += container.scrollTop;
        }
        setMarkerPosition(x3, y3);
        event.preventDefault();
        event.stopPropagation();
      }
      function moveMarkerOnKeydown(offsetX, offsetY) {
        let x3 = colorMarker.style.left.replace("px", "") * 1 + offsetX;
        let y3 = colorMarker.style.top.replace("px", "") * 1 + offsetY;
        setMarkerPosition(x3, y3);
      }
      function setMarkerPosition(x3, y3) {
        x3 = x3 < 0 ? 0 : x3 > colorAreaDims.width ? colorAreaDims.width : x3;
        y3 = y3 < 0 ? 0 : y3 > colorAreaDims.height ? colorAreaDims.height : y3;
        colorMarker.style.left = `${x3}px`;
        colorMarker.style.top = `${y3}px`;
        setColorAtPosition(x3, y3);
        colorMarker.focus();
      }
      function updateColor(rgba, hsva) {
        if (rgba === void 0) {
          rgba = {};
        }
        if (hsva === void 0) {
          hsva = {};
        }
        let format = settings.format;
        for (const key in rgba) {
          currentColor[key] = rgba[key];
        }
        for (const key in hsva) {
          currentColor[key] = hsva[key];
        }
        const hex = RGBAToHex(currentColor);
        const opaqueHex = hex.substring(0, 7);
        colorMarker.style.color = opaqueHex;
        alphaMarker.parentNode.style.color = opaqueHex;
        alphaMarker.style.color = hex;
        colorPreview.style.color = hex;
        colorArea.style.display = "none";
        colorArea.offsetHeight;
        colorArea.style.display = "";
        alphaMarker.nextElementSibling.style.display = "none";
        alphaMarker.nextElementSibling.offsetHeight;
        alphaMarker.nextElementSibling.style.display = "";
        if (format === "mixed") {
          format = currentColor.a === 1 ? "hex" : "rgb";
        } else if (format === "auto") {
          format = currentFormat;
        }
        switch (format) {
          case "hex":
            colorValue.value = hex;
            break;
          case "rgb":
            colorValue.value = RGBAToStr(currentColor);
            break;
          case "hsl":
            colorValue.value = HSLAToStr(HSVAtoHSLA(currentColor));
            break;
        }
        document2.querySelector(`.clr-format [value="${format}"]`).checked = true;
      }
      function setHue() {
        const hue = hueSlider.value * 1;
        const x3 = colorMarker.style.left.replace("px", "") * 1;
        const y3 = colorMarker.style.top.replace("px", "") * 1;
        picker.style.color = `hsl(${hue}, 100%, 50%)`;
        hueMarker.style.left = `${hue / 360 * 100}%`;
        setColorAtPosition(x3, y3);
      }
      function setAlpha() {
        const alpha = alphaSlider.value / 100;
        alphaMarker.style.left = `${alpha * 100}%`;
        updateColor({ a: alpha });
        pickColor();
      }
      function HSVAtoRGBA(hsva) {
        const saturation = hsva.s / 100;
        const value = hsva.v / 100;
        let chroma = saturation * value;
        let hueBy60 = hsva.h / 60;
        let x3 = chroma * (1 - Math2.abs(hueBy60 % 2 - 1));
        let m3 = value - chroma;
        chroma = chroma + m3;
        x3 = x3 + m3;
        const index = Math2.floor(hueBy60) % 6;
        const red = [chroma, x3, m3, m3, x3, chroma][index];
        const green = [x3, chroma, chroma, x3, m3, m3][index];
        const blue = [m3, m3, x3, chroma, chroma, x3][index];
        return {
          r: Math2.round(red * 255),
          g: Math2.round(green * 255),
          b: Math2.round(blue * 255),
          a: hsva.a
        };
      }
      function HSVAtoHSLA(hsva) {
        const value = hsva.v / 100;
        const lightness = value * (1 - hsva.s / 100 / 2);
        let saturation;
        if (lightness > 0 && lightness < 1) {
          saturation = Math2.round((value - lightness) / Math2.min(lightness, 1 - lightness) * 100);
        }
        return {
          h: hsva.h,
          s: saturation || 0,
          l: Math2.round(lightness * 100),
          a: hsva.a
        };
      }
      function RGBAtoHSVA(rgba) {
        const red = rgba.r / 255;
        const green = rgba.g / 255;
        const blue = rgba.b / 255;
        const xmax = Math2.max(red, green, blue);
        const xmin = Math2.min(red, green, blue);
        const chroma = xmax - xmin;
        const value = xmax;
        let hue = 0;
        let saturation = 0;
        if (chroma) {
          if (xmax === red) {
            hue = (green - blue) / chroma;
          }
          if (xmax === green) {
            hue = 2 + (blue - red) / chroma;
          }
          if (xmax === blue) {
            hue = 4 + (red - green) / chroma;
          }
          if (xmax) {
            saturation = chroma / xmax;
          }
        }
        hue = Math2.floor(hue * 60);
        return {
          h: hue < 0 ? hue + 360 : hue,
          s: Math2.round(saturation * 100),
          v: Math2.round(value * 100),
          a: rgba.a
        };
      }
      function strToRGBA(str3) {
        const regex = /^((rgba)|rgb)[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)[\D]*?([\d.]+|$)/i;
        let match, rgba;
        ctx.fillStyle = "#000";
        ctx.fillStyle = str3;
        match = regex.exec(ctx.fillStyle);
        if (match) {
          rgba = {
            r: match[3] * 1,
            g: match[4] * 1,
            b: match[5] * 1,
            a: match[6] * 1
          };
        } else {
          match = ctx.fillStyle.replace("#", "").match(/.{2}/g).map((h3) => parseInt(h3, 16));
          rgba = {
            r: match[0],
            g: match[1],
            b: match[2],
            a: 1
          };
        }
        return rgba;
      }
      function RGBAToHex(rgba) {
        let R2 = rgba.r.toString(16);
        let G2 = rgba.g.toString(16);
        let B3 = rgba.b.toString(16);
        let A3 = "";
        if (rgba.r < 16) {
          R2 = "0" + R2;
        }
        if (rgba.g < 16) {
          G2 = "0" + G2;
        }
        if (rgba.b < 16) {
          B3 = "0" + B3;
        }
        if (settings.alpha && (rgba.a < 1 || settings.forceAlpha)) {
          const alpha = rgba.a * 255 | 0;
          A3 = alpha.toString(16);
          if (alpha < 16) {
            A3 = "0" + A3;
          }
        }
        return "#" + R2 + G2 + B3 + A3;
      }
      function RGBAToStr(rgba) {
        if (!settings.alpha || rgba.a === 1 && !settings.forceAlpha) {
          return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
        } else {
          return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
        }
      }
      function HSLAToStr(hsla) {
        if (!settings.alpha || hsla.a === 1 && !settings.forceAlpha) {
          return `hsl(${hsla.h}, ${hsla.s}%, ${hsla.l}%)`;
        } else {
          return `hsla(${hsla.h}, ${hsla.s}%, ${hsla.l}%, ${hsla.a})`;
        }
      }
      function init() {
        if (document2.getElementById("clr-picker")) return;
        container = undefined2;
        picker = document2.createElement("div");
        picker.setAttribute("id", "clr-picker");
        picker.className = "clr-picker";
        picker.innerHTML = `<input id="clr-color-value" name="clr-color-value" class="clr-color" type="text" value="" spellcheck="false" aria-label="${settings.a11y.input}"><div id="clr-color-area" class="clr-gradient" role="application" aria-label="${settings.a11y.instruction}"><div id="clr-color-marker" class="clr-marker" tabindex="0"></div></div><div class="clr-hue"><input id="clr-hue-slider" name="clr-hue-slider" type="range" min="0" max="360" step="1" aria-label="${settings.a11y.hueSlider}"><div id="clr-hue-marker"></div></div><div class="clr-alpha"><input id="clr-alpha-slider" name="clr-alpha-slider" type="range" min="0" max="100" step="1" aria-label="${settings.a11y.alphaSlider}"><div id="clr-alpha-marker"></div><span></span></div><div id="clr-format" class="clr-format"><fieldset class="clr-segmented"><legend>${settings.a11y.format}</legend><input id="clr-f1" type="radio" name="clr-format" value="hex"><label for="clr-f1">Hex</label><input id="clr-f2" type="radio" name="clr-format" value="rgb"><label for="clr-f2">RGB</label><input id="clr-f3" type="radio" name="clr-format" value="hsl"><label for="clr-f3">HSL</label><span></span></fieldset></div><div id="clr-swatches" class="clr-swatches"></div><button type="button" id="clr-clear" class="clr-clear" aria-label="${settings.a11y.clear}">${settings.clearLabel}</button><div id="clr-color-preview" class="clr-preview"><button type="button" id="clr-close" class="clr-close" aria-label="${settings.a11y.close}">${settings.closeLabel}</button></div><span id="clr-open-label" hidden>${settings.a11y.open}</span><span id="clr-swatch-label" hidden>${settings.a11y.swatch}</span>`;
        document2.body.appendChild(picker);
        colorArea = getEl("clr-color-area");
        colorMarker = getEl("clr-color-marker");
        clearButton = getEl("clr-clear");
        closeButton = getEl("clr-close");
        colorPreview = getEl("clr-color-preview");
        colorValue = getEl("clr-color-value");
        hueSlider = getEl("clr-hue-slider");
        hueMarker = getEl("clr-hue-marker");
        alphaSlider = getEl("clr-alpha-slider");
        alphaMarker = getEl("clr-alpha-marker");
        bindFields(settings.el);
        wrapFields(settings.el);
        addListener(picker, "mousedown", (event) => {
          picker.classList.remove("clr-keyboard-nav");
          event.stopPropagation();
        });
        addListener(colorArea, "mousedown", (event) => {
          addListener(document2, "mousemove", moveMarker);
        });
        addListener(colorArea, "contextmenu", (event) => {
          event.preventDefault();
        });
        addListener(colorArea, "touchstart", (event) => {
          document2.addEventListener("touchmove", moveMarker, { passive: false });
        });
        addListener(colorMarker, "mousedown", (event) => {
          addListener(document2, "mousemove", moveMarker);
        });
        addListener(colorMarker, "touchstart", (event) => {
          document2.addEventListener("touchmove", moveMarker, { passive: false });
        });
        addListener(colorValue, "change", (event) => {
          const value = colorValue.value;
          if (currentEl || settings.inline) {
            const color = value === "" ? value : setColorFromStr(value);
            pickColor(color);
          }
        });
        addListener(clearButton, "click", (event) => {
          pickColor("");
          closePicker();
        });
        addListener(closeButton, "click", (event) => {
          pickColor();
          closePicker();
        });
        addListener(getEl("clr-format"), "click", ".clr-format input", (event) => {
          currentFormat = event.target.value;
          updateColor();
          pickColor();
        });
        addListener(picker, "click", ".clr-swatches button", (event) => {
          setColorFromStr(event.target.textContent);
          pickColor();
          if (settings.swatchesOnly) {
            closePicker();
          }
        });
        addListener(document2, "mouseup", (event) => {
          document2.removeEventListener("mousemove", moveMarker);
        });
        addListener(document2, "touchend", (event) => {
          document2.removeEventListener("touchmove", moveMarker);
        });
        addListener(document2, "mousedown", (event) => {
          keyboardNav = false;
          picker.classList.remove("clr-keyboard-nav");
          closePicker();
        });
        addListener(document2, "keydown", (event) => {
          const key = event.key;
          const target = event.target;
          const shiftKey = event.shiftKey;
          const navKeys = ["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
          if (key === "Escape") {
            closePicker(true);
            return;
          } else if (key === "Enter" && target.tagName !== "BUTTON") {
            closePicker();
            return;
          } else if (navKeys.includes(key)) {
            keyboardNav = true;
            picker.classList.add("clr-keyboard-nav");
          }
          if (key === "Tab" && target.matches(".clr-picker *")) {
            const focusables = getFocusableElements();
            const firstFocusable = focusables.shift();
            const lastFocusable = focusables.pop();
            if (shiftKey && target === firstFocusable) {
              lastFocusable.focus();
              event.preventDefault();
            } else if (!shiftKey && target === lastFocusable) {
              firstFocusable.focus();
              event.preventDefault();
            }
          }
        });
        addListener(document2, "click", ".clr-field button", (event) => {
          if (hasInstance) {
            resetVirtualInstance();
          }
          event.target.nextElementSibling.dispatchEvent(new Event("click", { bubbles: true }));
        });
        addListener(colorMarker, "keydown", (event) => {
          const movements = {
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0]
          };
          if (Object.keys(movements).includes(event.key)) {
            moveMarkerOnKeydown(...movements[event.key]);
            event.preventDefault();
          }
        });
        addListener(colorArea, "click", moveMarker);
        addListener(hueSlider, "input", setHue);
        addListener(alphaSlider, "input", setAlpha);
      }
      function getFocusableElements() {
        const controls = Array.from(picker.querySelectorAll("input, button"));
        const focusables = controls.filter((node) => !!node.offsetWidth);
        return focusables;
      }
      function getEl(id) {
        return document2.getElementById(id);
      }
      function addListener(context, type, selector, fn) {
        const matches = Element.prototype.matches || Element.prototype.msMatchesSelector;
        if (typeof selector === "string") {
          context.addEventListener(type, (event) => {
            if (matches.call(event.target, selector)) {
              fn.call(event.target, event);
            }
          });
        } else {
          fn = selector;
          context.addEventListener(type, fn);
        }
      }
      function DOMReady(fn, args) {
        args = args !== undefined2 ? args : [];
        if (document2.readyState !== "loading") {
          fn(...args);
        } else {
          document2.addEventListener("DOMContentLoaded", () => {
            fn(...args);
          });
        }
      }
      if (NodeList !== undefined2 && NodeList.prototype && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = Array.prototype.forEach;
      }
      function setColor(color, target) {
        currentEl = target;
        oldColor = currentEl.value;
        attachVirtualInstance(target);
        currentFormat = getColorFormatFromStr(color);
        updatePickerPosition();
        setColorFromStr(color);
        pickColor();
        if (oldColor !== color) {
          currentEl.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      const Coloris2 = (() => {
        const methods = {
          init,
          set: configure,
          wrap: wrapFields,
          close: closePicker,
          setInstance: setVirtualInstance,
          setColor,
          removeInstance: removeVirtualInstance,
          updatePosition: updatePickerPosition,
          ready: DOMReady
        };
        function Coloris3(options) {
          DOMReady(() => {
            if (options) {
              if (typeof options === "string") {
                bindFields(options);
              } else {
                configure(options);
              }
            }
          });
        }
        for (const key in methods) {
          Coloris3[key] = function() {
            for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }
            DOMReady(methods[key], args);
          };
        }
        DOMReady(() => {
          window2.addEventListener("resize", (event) => {
            Coloris3.updatePosition();
          });
          window2.addEventListener("scroll", (event) => {
            Coloris3.updatePosition();
          });
        });
        return Coloris3;
      })();
      Coloris2.coloris = Coloris2;
      return Coloris2;
    })(window, document, Math);
  })();
  var _coloris = Coloris.coloris;
  var _init = Coloris.init;
  var _set = Coloris.set;
  var _wrap = Coloris.wrap;
  var _close = Coloris.close;
  var _setInstance = Coloris.setInstance;
  var _removeInstance = Coloris.removeInstance;
  var _updatePosition = Coloris.updatePosition;
  var coloris_default = Coloris;

  // node_modules/@melloware/coloris/dist/coloris.css
  var coloris_default2 = `.clr-picker {\r
  display: none;\r
  flex-wrap: wrap;\r
  position: absolute;\r
  width: 200px;\r
  z-index: 1000;\r
  border-radius: 10px;\r
  background-color: #fff;\r
  justify-content: flex-end;\r
  direction: ltr;\r
  box-shadow: 0 0 5px rgba(0,0,0,.05), 0 5px 20px rgba(0,0,0,.1);\r
  -moz-user-select: none;\r
  -webkit-user-select: none;\r
  user-select: none;\r
}\r
\r
.clr-picker.clr-open,\r
.clr-picker[data-inline="true"] {\r
  display: flex;\r
}\r
\r
.clr-picker[data-inline="true"] {\r
  position: relative;\r
}\r
\r
.clr-gradient {\r
  position: relative;\r
  width: 100%;\r
  height: 100px;\r
  margin-bottom: 15px;\r
  border-radius: 3px 3px 0 0;\r
  background-image: linear-gradient(rgba(0,0,0,0), #000), linear-gradient(90deg, #fff, currentColor);\r
  cursor: pointer;\r
}\r
\r
.clr-marker {\r
  position: absolute;\r
  width: 12px;\r
  height: 12px;\r
  margin: -6px 0 0 -6px;\r
  border: 1px solid #fff;\r
  border-radius: 50%;\r
  background-color: currentColor;\r
  cursor: pointer;\r
}\r
\r
.clr-picker input[type="range"]::-webkit-slider-runnable-track {\r
  width: 100%;\r
  height: 16px;\r
}\r
\r
.clr-picker input[type="range"]::-webkit-slider-thumb {\r
  width: 16px;\r
  height: 16px;\r
  -webkit-appearance: none;\r
}\r
\r
.clr-picker input[type="range"]::-moz-range-track {\r
  width: 100%;\r
  height: 16px;\r
  border: 0;\r
}\r
\r
.clr-picker input[type="range"]::-moz-range-thumb {\r
  width: 16px;\r
  height: 16px;\r
  border: 0;\r
}\r
\r
.clr-hue {\r
  background-image: linear-gradient(to right, #f00 0%, #ff0 16.66%, #0f0 33.33%, #0ff 50%, #00f 66.66%, #f0f 83.33%, #f00 100%);\r
}\r
\r
.clr-hue,\r
.clr-alpha {\r
  position: relative;\r
  width: calc(100% - 40px);\r
  height: 8px;\r
  margin: 5px 20px;\r
  border-radius: 4px;\r
}\r
\r
.clr-alpha span {\r
  display: block;\r
  height: 100%;\r
  width: 100%;\r
  border-radius: inherit;\r
  background-image: linear-gradient(90deg, rgba(0,0,0,0), currentColor);\r
}\r
\r
.clr-hue input[type="range"],\r
.clr-alpha input[type="range"] {\r
  position: absolute;\r
  width: calc(100% + 32px);\r
  height: 16px;\r
  left: -16px;\r
  top: -4px;\r
  margin: 0;\r
  background-color: transparent;\r
  opacity: 0;\r
  cursor: pointer;\r
  appearance: none;\r
  -webkit-appearance: none;\r
}\r
\r
.clr-hue div,\r
.clr-alpha div {\r
  position: absolute;\r
  width: 16px;\r
  height: 16px;\r
  left: 0;\r
  top: 50%;\r
  margin-left: -8px;\r
  transform: translateY(-50%);\r
  border: 2px solid #fff;\r
  border-radius: 50%;\r
  background-color: currentColor;\r
  box-shadow: 0 0 1px #888;\r
  pointer-events: none;\r
}\r
\r
.clr-alpha div:before {\r
  content: '';\r
  position: absolute;\r
  height: 100%;\r
  width: 100%;\r
  left: 0;\r
  top: 0;\r
  border-radius: 50%;\r
  background-color: currentColor;\r
}\r
\r
.clr-format {\r
  display: none;\r
  order: 1;\r
  width: calc(100% - 40px);\r
  margin: 0 20px 20px;\r
}\r
\r
.clr-segmented {\r
  display: flex;\r
  position: relative;\r
  width: 100%;\r
  margin: 0;\r
  padding: 0;\r
  border: 1px solid #ddd;\r
  border-radius: 15px;\r
  box-sizing: border-box;\r
  color: #999;\r
  font-size: 12px;\r
}\r
\r
.clr-segmented input,\r
.clr-segmented legend {\r
  position: absolute;\r
  width: 100%;\r
  height: 100%;\r
  margin: 0;\r
  padding: 0;\r
  border: 0;\r
  left: 0;\r
  top: 0;\r
  opacity: 0;\r
  pointer-events: none;\r
}\r
\r
.clr-segmented label {\r
  flex-grow: 1;\r
  margin: 0;\r
  padding: 4px 0;\r
  font-size: inherit;\r
  font-weight: normal;\r
  line-height: initial;\r
  text-align: center;\r
  cursor: pointer;\r
}\r
\r
.clr-segmented label:first-of-type {\r
  border-radius: 10px 0 0 10px;\r
}\r
\r
.clr-segmented label:last-of-type {\r
  border-radius: 0 10px 10px 0;\r
}\r
\r
.clr-segmented input:checked + label {\r
  color: #fff;\r
  background-color: #666;\r
}\r
\r
.clr-swatches {\r
  order: 2;\r
  width: calc(100% - 32px);\r
  margin: 0 16px;\r
}\r
\r
.clr-swatches div {\r
  display: flex;\r
  flex-wrap: wrap;\r
  padding-bottom: 12px;\r
  justify-content: center;\r
}\r
\r
.clr-swatches button {\r
  position: relative;\r
  width: 20px;\r
  height: 20px;\r
  margin: 0 4px 6px 4px;\r
  padding: 0;\r
  border: 0;\r
  border-radius: 50%;\r
  color: inherit;\r
  text-indent: -1000px;\r
  white-space: nowrap;\r
  overflow: hidden;\r
  cursor: pointer;\r
}\r
\r
.clr-swatches button:after {\r
  content: '';\r
  display: block;\r
  position: absolute;\r
  width: 100%;\r
  height: 100%;\r
  left: 0;\r
  top: 0;\r
  border-radius: inherit;\r
  background-color: currentColor;\r
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.1);\r
}\r
\r
input.clr-color {\r
  order: 1;\r
  width: calc(100% - 80px);\r
  height: 32px;\r
  margin: 15px 20px 20px auto;\r
  padding: 0 10px;\r
  border: 1px solid #ddd;\r
  border-radius: 16px;\r
  color: #444;\r
  background-color: #fff;\r
  font-family: sans-serif;\r
  font-size: 14px;\r
  text-align: center;\r
  box-shadow: none;\r
}\r
\r
input.clr-color:focus {\r
  outline: none;\r
  border: 1px solid #1e90ff;\r
}\r
\r
.clr-close,\r
.clr-clear {\r
  display: none;\r
  order: 2;\r
  height: 24px;\r
  margin: 0 20px 20px;\r
  padding: 0 20px;\r
  border: 0;\r
  border-radius: 12px;\r
  color: #fff;\r
  background-color: #666;\r
  font-family: inherit;\r
  font-size: 12px;\r
  font-weight: 400;\r
  cursor: pointer;\r
}\r
\r
.clr-close {\r
  display: block;\r
  margin: 0 20px 20px auto;\r
}\r
\r
.clr-preview {\r
  position: relative;\r
  width: 32px;\r
  height: 32px;\r
  margin: 15px 0 20px 20px;\r
  border-radius: 50%;\r
  overflow: hidden;\r
}\r
\r
.clr-preview:before,\r
.clr-preview:after {\r
  content: '';\r
  position: absolute;\r
  height: 100%;\r
  width: 100%;\r
  left: 0;\r
  top: 0;\r
  border: 1px solid #fff;\r
  border-radius: 50%;\r
}\r
\r
.clr-preview:after {\r
  border: 0;\r
  background-color: currentColor;\r
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.1);\r
}\r
\r
.clr-preview button {\r
  position: absolute;\r
  width: 100%;\r
  height: 100%;\r
  z-index: 1;\r
  margin: 0;\r
  padding: 0;\r
  border: 0;\r
  border-radius: 50%;\r
  outline-offset: -2px;\r
  background-color: transparent;\r
  text-indent: -9999px;\r
  cursor: pointer;\r
  overflow: hidden;\r
}\r
\r
.clr-marker,\r
.clr-hue div,\r
.clr-alpha div,\r
.clr-color {\r
  box-sizing: border-box;\r
}\r
\r
.clr-field {\r
  display: inline-block;\r
  position: relative;\r
  color: transparent;\r
}\r
\r
.clr-field input {\r
  margin: 0;\r
  direction: ltr;\r
}\r
\r
.clr-field.clr-rtl input {\r
  text-align: right;\r
}\r
\r
.clr-field button {\r
  position: absolute;\r
  width: 30px;\r
  height: 100%;\r
  right: 0;\r
  top: 50%;\r
  transform: translateY(-50%);\r
  margin: 0;\r
  padding: 0;\r
  border: 0;\r
  color: inherit;\r
  text-indent: -1000px;\r
  white-space: nowrap;\r
  overflow: hidden;\r
  pointer-events: none;\r
}\r
\r
.clr-field.clr-rtl button {\r
  right: auto;\r
  left: 0;\r
}\r
\r
.clr-field button:after {\r
  content: '';\r
  display: block;\r
  position: absolute;\r
  width: 100%;\r
  height: 100%;\r
  left: 0;\r
  top: 0;\r
  border-radius: inherit;\r
  background-color: currentColor;\r
  box-shadow: inset 0 0 1px rgba(0,0,0,.5);\r
}\r
\r
.clr-alpha,\r
.clr-alpha div,\r
.clr-swatches button,\r
.clr-preview:before,\r
.clr-field button {\r
  background-image: repeating-linear-gradient(45deg, #aaa 25%, transparent 25%, transparent 75%, #aaa 75%, #aaa), repeating-linear-gradient(45deg, #aaa 25%, #fff 25%, #fff 75%, #aaa 75%, #aaa);\r
  background-position: 0 0, 4px 4px;\r
  background-size: 8px 8px;\r
}\r
\r
.clr-marker:focus {\r
  outline: none;\r
}\r
\r
.clr-keyboard-nav .clr-marker:focus,\r
.clr-keyboard-nav .clr-hue input:focus + div,\r
.clr-keyboard-nav .clr-alpha input:focus + div,\r
.clr-keyboard-nav .clr-segmented input:focus + label {\r
  outline: none;\r
  box-shadow: 0 0 0 2px #1e90ff, 0 0 2px 2px #fff;\r
}\r
\r
.clr-picker[data-alpha="false"] .clr-alpha {\r
  display: none;\r
}\r
\r
.clr-picker[data-minimal="true"] {\r
  padding-top: 16px;\r
}\r
\r
.clr-picker[data-minimal="true"] .clr-gradient,\r
.clr-picker[data-minimal="true"] .clr-hue,\r
.clr-picker[data-minimal="true"] .clr-alpha,\r
.clr-picker[data-minimal="true"] .clr-color,\r
.clr-picker[data-minimal="true"] .clr-preview {\r
  display: none;\r
}\r
\r
/** Dark theme **/\r
\r
.clr-dark {\r
  background-color: #444;\r
}\r
\r
.clr-dark .clr-segmented {\r
  border-color: #777;\r
}\r
\r
.clr-dark .clr-swatches button:after {\r
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.3);\r
}\r
\r
.clr-dark input.clr-color {\r
  color: #fff;\r
  border-color: #777;\r
  background-color: #555;\r
}\r
\r
.clr-dark input.clr-color:focus {\r
  border-color: #1e90ff;\r
}\r
\r
.clr-dark .clr-preview:after {\r
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.5);\r
}\r
\r
.clr-dark .clr-alpha,\r
.clr-dark .clr-alpha div,\r
.clr-dark .clr-swatches button,\r
.clr-dark .clr-preview:before {\r
  background-image: repeating-linear-gradient(45deg, #666 25%, transparent 25%, transparent 75%, #888 75%, #888), repeating-linear-gradient(45deg, #888 25%, #444 25%, #444 75%, #888 75%, #888);\r
}\r
\r
/** Polaroid theme **/\r
\r
.clr-picker.clr-polaroid {\r
  border-radius: 6px;\r
  box-shadow: 0 0 5px rgba(0,0,0,.1), 0 5px 30px rgba(0,0,0,.2);\r
}\r
\r
.clr-picker.clr-polaroid:before {\r
  content: '';\r
  display: block;\r
  position: absolute;\r
  width: 16px;\r
  height: 10px;\r
  left: 20px;\r
  top: -10px;\r
  border: solid transparent;\r
  border-width: 0 8px 10px 8px;\r
  border-bottom-color: currentColor;\r
  box-sizing: border-box;\r
  color: #fff;\r
  filter: drop-shadow(0 -4px 3px rgba(0,0,0,.1));\r
  pointer-events: none;\r
}\r
\r
.clr-picker.clr-polaroid.clr-dark:before {\r
  color: #444;\r
}\r
\r
.clr-picker.clr-polaroid.clr-left:before {\r
  left: auto;\r
  right: 20px;\r
}\r
\r
.clr-picker.clr-polaroid.clr-top:before {\r
  top: auto;\r
  bottom: -10px;\r
  transform: rotateZ(180deg);\r
}\r
\r
.clr-polaroid .clr-gradient {\r
  width: calc(100% - 20px);\r
  height: 120px;\r
  margin: 10px;\r
  border-radius: 3px;\r
}\r
\r
.clr-polaroid .clr-hue,\r
.clr-polaroid .clr-alpha {\r
  width: calc(100% - 30px);\r
  height: 10px;\r
  margin: 6px 15px;\r
  border-radius: 5px;\r
}\r
\r
.clr-polaroid .clr-hue div,\r
.clr-polaroid .clr-alpha div {\r
  box-shadow: 0 0 5px rgba(0,0,0,.2);\r
}\r
\r
.clr-polaroid .clr-format {\r
  width: calc(100% - 20px);\r
  margin: 0 10px 15px;\r
}\r
\r
.clr-polaroid .clr-swatches {\r
  width: calc(100% - 12px);\r
  margin: 0 6px;\r
}\r
.clr-polaroid .clr-swatches div {\r
  padding-bottom: 10px;\r
}\r
\r
.clr-polaroid .clr-swatches button {\r
  width: 22px;\r
  height: 22px;\r
}\r
\r
.clr-polaroid input.clr-color {\r
  width: calc(100% - 60px);\r
  margin: 10px 10px 15px auto;\r
}\r
\r
.clr-polaroid .clr-clear {\r
  margin: 0 10px 15px 10px;\r
}\r
\r
.clr-polaroid .clr-close {\r
  margin: 0 10px 15px auto;\r
}\r
\r
.clr-polaroid .clr-preview {\r
  margin: 10px 0 15px 10px;\r
}\r
\r
/** Large theme **/\r
\r
.clr-picker.clr-large {\r
  width: 275px;\r
}\r
\r
.clr-large .clr-gradient {\r
  height: 150px;\r
}\r
\r
.clr-large .clr-swatches button {\r
  width: 22px;\r
  height: 22px;\r
}\r
\r
/** Pill (horizontal) theme **/\r
\r
.clr-picker.clr-pill {\r
  width: 380px;\r
  padding-left: 180px;\r
  box-sizing: border-box;\r
}\r
\r
.clr-pill .clr-gradient {\r
  position: absolute;\r
  width: 180px;\r
  height: 100%;\r
  left: 0;\r
  top: 0;\r
  margin-bottom: 0;\r
  border-radius: 3px 0 0 3px;\r
}\r
\r
.clr-pill .clr-hue {\r
  margin-top: 20px;\r
}`;

  // src/ui/color-picker.ts
  var STYLE_ID = "xpro-coloris-style";
  var FIELD_SELECTOR = ".colorcode";
  var a11yOf = ({ color: { picker } }) => ({
    open: picker.open,
    close: picker.closeLabel,
    clear: picker.clearLabel,
    marker: picker.marker("{s}", "{v}"),
    hueSlider: picker.hue,
    alphaSlider: picker.alpha,
    input: picker.input,
    format: picker.format,
    swatch: picker.swatch,
    instruction: picker.instruction
  });
  var ready = false;
  var swatches = [
    DEFAULT_HIGHLIGHT_COLOR,
    // pink (the color X uses for likes)
    "#00ba7c26",
    // green (reposted)
    "#1d9bf026",
    // blue (the standard accent)
    "#7856ff26",
    // purple
    "#ff7a0026",
    // orange
    "#ffd40026",
    // yellow
    "#f4212e26",
    // red (warnings, destructive actions)
    "#71767b26"
    // gray (secondary text)
  ];
  var setupColorPicker = (messages) => {
    const picker = messages.color.picker;
    if (ready) {
      coloris_default({
        el: [],
        clearLabel: picker.clear,
        closeLabel: picker.close,
        a11y: a11yOf(messages)
      });
      return;
    }
    ready = true;
    document.addEventListener(
      "click",
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (!target.classList.contains("colorcode") || target.value) return;
        const fallback = target.dataset.fallback;
        if (fallback) target.value = fallback;
      },
      true
    );
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = coloris_default2;
      document.head.append(style);
    }
    coloris_default.init();
    coloris_default({
      el: FIELD_SELECTOR,
      // Stops the default behavior of wrapping the input in a div.
      // DOM that Preact manages, rewritten from the outside, would disagree with its re-renders
      wrap: false,
      alpha: true,
      format: "hex",
      // The settings screen follows the OS color scheme, so the picker follows it too
      themeMode: "auto",
      swatches,
      // Coloris's own wording is English, so it is brought into line with the rest of the screen
      clearLabel: picker.clear,
      closeLabel: picker.close,
      a11y: a11yOf(messages)
    });
  };

  // src/options.tsx
  var root = document.getElementById("app");
  if (!root) throw new Error("設定画面のマウント先が見つかりません");
  var applyLocale = (locale) => {
    const messages = messagesFor(locale);
    document.documentElement.lang = locale;
    document.title = messages.title;
    setupColorPicker(messages);
  };
  R(/* @__PURE__ */ u3(SettingsApp, { onLocale: applyLocale, exportable: true }), root);
})();
/*! Bundled license information:

@melloware/coloris/dist/esm/coloris.js:
  (*!
  * Copyright (c) 2021-2024 Momo Bassit.
  * Licensed under the MIT License (MIT)
  * https://github.com/mdbassit/Coloris
  * Version: 0.25.0
  * NPM: https://github.com/melloware/coloris-npm
  *)
*/
