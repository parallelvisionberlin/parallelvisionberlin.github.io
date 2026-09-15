/*! @anam-ai/js-sdk 4.27.0, Anam AI, MIT. PV capture-cancellation patch. See ../../vendor/anam-sdk/NOTICE.txt. */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// vendor/anam-sdk/node_modules/base64-js/index.js
var require_base64_js = __commonJS({
  "vendor/anam-sdk/node_modules/base64-js/index.js"(exports) {
    "use strict";
    exports.byteLength = byteLength;
    exports.toByteArray = toByteArray;
    exports.fromByteArray = fromByteArray;
    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
    var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (i = 0, len = code.length; i < len; ++i) {
      lookup[i] = code[i];
      revLookup[code.charCodeAt(i)] = i;
    }
    var i;
    var len;
    revLookup["-".charCodeAt(0)] = 62;
    revLookup["_".charCodeAt(0)] = 63;
    function getLens(b64) {
      var len2 = b64.length;
      if (len2 % 4 > 0) {
        throw new Error("Invalid string. Length must be a multiple of 4");
      }
      var validLen = b64.indexOf("=");
      if (validLen === -1) validLen = len2;
      var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
      return [validLen, placeHoldersLen];
    }
    function byteLength(b64) {
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
    }
    function _byteLength(b64, validLen, placeHoldersLen) {
      return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
    }
    function toByteArray(b64) {
      var tmp;
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
      var curByte = 0;
      var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
      var i2;
      for (i2 = 0; i2 < len2; i2 += 4) {
        tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
        arr[curByte++] = tmp >> 16 & 255;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
      }
      if (placeHoldersLen === 2) {
        tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
        arr[curByte++] = tmp & 255;
      }
      if (placeHoldersLen === 1) {
        tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
      }
      return arr;
    }
    function tripletToBase64(num) {
      return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
    }
    function encodeChunk(uint8, start, end) {
      var tmp;
      var output = [];
      for (var i2 = start; i2 < end; i2 += 3) {
        tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
        output.push(tripletToBase64(tmp));
      }
      return output.join("");
    }
    function fromByteArray(uint8) {
      var tmp;
      var len2 = uint8.length;
      var extraBytes = len2 % 3;
      var parts = [];
      var maxChunkLength = 16383;
      for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
        parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
      }
      if (extraBytes === 1) {
        tmp = uint8[len2 - 1];
        parts.push(
          lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
        );
      } else if (extraBytes === 2) {
        tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
        parts.push(
          lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
        );
      }
      return parts.join("");
    }
  }
});

// vendor/anam-sdk/node_modules/ieee754/index.js
var require_ieee754 = __commonJS({
  "vendor/anam-sdk/node_modules/ieee754/index.js"(exports) {
    /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
    exports.read = function(buffer, offset, isLE, mLen, nBytes) {
      var e, m;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var nBits = -7;
      var i = isLE ? nBytes - 1 : 0;
      var d = isLE ? -1 : 1;
      var s = buffer[offset + i];
      i += d;
      e = s & (1 << -nBits) - 1;
      s >>= -nBits;
      nBits += eLen;
      for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {
      }
      m = e & (1 << -nBits) - 1;
      e >>= -nBits;
      nBits += mLen;
      for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {
      }
      if (e === 0) {
        e = 1 - eBias;
      } else if (e === eMax) {
        return m ? NaN : (s ? -1 : 1) * Infinity;
      } else {
        m = m + Math.pow(2, mLen);
        e = e - eBias;
      }
      return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
    };
    exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
      var e, m, c;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
      var i = isLE ? 0 : nBytes - 1;
      var d = isLE ? 1 : -1;
      var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
      value = Math.abs(value);
      if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
      } else {
        e = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c = Math.pow(2, -e)) < 1) {
          e--;
          c *= 2;
        }
        if (e + eBias >= 1) {
          value += rt / c;
        } else {
          value += rt * Math.pow(2, 1 - eBias);
        }
        if (value * c >= 2) {
          e++;
          c /= 2;
        }
        if (e + eBias >= eMax) {
          m = 0;
          e = eMax;
        } else if (e + eBias >= 1) {
          m = (value * c - 1) * Math.pow(2, mLen);
          e = e + eBias;
        } else {
          m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
          e = 0;
        }
      }
      for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
      }
      e = e << mLen | m;
      eLen += mLen;
      for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
      }
      buffer[offset + i - d] |= s * 128;
    };
  }
});

// vendor/anam-sdk/node_modules/buffer/index.js
var require_buffer = __commonJS({
  "vendor/anam-sdk/node_modules/buffer/index.js"(exports) {
    "use strict";
    /*!
     * The buffer module from node.js, for the browser.
     *
     * @author   Feross Aboukhadijeh <https://feross.org>
     * @license  MIT
     */
    var base64 = require_base64_js();
    var ieee754 = require_ieee754();
    var customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
    exports.Buffer = Buffer3;
    exports.SlowBuffer = SlowBuffer;
    exports.INSPECT_MAX_BYTES = 50;
    var K_MAX_LENGTH = 2147483647;
    exports.kMaxLength = K_MAX_LENGTH;
    Buffer3.TYPED_ARRAY_SUPPORT = typedArraySupport();
    if (!Buffer3.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
      console.error(
        "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
      );
    }
    function typedArraySupport() {
      try {
        const arr = new Uint8Array(1);
        const proto = { foo: function() {
          return 42;
        } };
        Object.setPrototypeOf(proto, Uint8Array.prototype);
        Object.setPrototypeOf(arr, proto);
        return arr.foo() === 42;
      } catch (e) {
        return false;
      }
    }
    Object.defineProperty(Buffer3.prototype, "parent", {
      enumerable: true,
      get: function() {
        if (!Buffer3.isBuffer(this)) return void 0;
        return this.buffer;
      }
    });
    Object.defineProperty(Buffer3.prototype, "offset", {
      enumerable: true,
      get: function() {
        if (!Buffer3.isBuffer(this)) return void 0;
        return this.byteOffset;
      }
    });
    function createBuffer(length) {
      if (length > K_MAX_LENGTH) {
        throw new RangeError('The value "' + length + '" is invalid for option "size"');
      }
      const buf = new Uint8Array(length);
      Object.setPrototypeOf(buf, Buffer3.prototype);
      return buf;
    }
    function Buffer3(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        if (typeof encodingOrOffset === "string") {
          throw new TypeError(
            'The "string" argument must be of type string. Received type number'
          );
        }
        return allocUnsafe(arg);
      }
      return from(arg, encodingOrOffset, length);
    }
    Buffer3.poolSize = 8192;
    function from(value, encodingOrOffset, length) {
      if (typeof value === "string") {
        return fromString(value, encodingOrOffset);
      }
      if (ArrayBuffer.isView(value)) {
        return fromArrayView(value);
      }
      if (value == null) {
        throw new TypeError(
          "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
        );
      }
      if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
        return fromArrayBuffer(value, encodingOrOffset, length);
      }
      if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer))) {
        return fromArrayBuffer(value, encodingOrOffset, length);
      }
      if (typeof value === "number") {
        throw new TypeError(
          'The "value" argument must not be of type number. Received type number'
        );
      }
      const valueOf = value.valueOf && value.valueOf();
      if (valueOf != null && valueOf !== value) {
        return Buffer3.from(valueOf, encodingOrOffset, length);
      }
      const b = fromObject(value);
      if (b) return b;
      if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
        return Buffer3.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
      }
      throw new TypeError(
        "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
      );
    }
    Buffer3.from = function(value, encodingOrOffset, length) {
      return from(value, encodingOrOffset, length);
    };
    Object.setPrototypeOf(Buffer3.prototype, Uint8Array.prototype);
    Object.setPrototypeOf(Buffer3, Uint8Array);
    function assertSize(size) {
      if (typeof size !== "number") {
        throw new TypeError('"size" argument must be of type number');
      } else if (size < 0) {
        throw new RangeError('The value "' + size + '" is invalid for option "size"');
      }
    }
    function alloc(size, fill, encoding) {
      assertSize(size);
      if (size <= 0) {
        return createBuffer(size);
      }
      if (fill !== void 0) {
        return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
      }
      return createBuffer(size);
    }
    Buffer3.alloc = function(size, fill, encoding) {
      return alloc(size, fill, encoding);
    };
    function allocUnsafe(size) {
      assertSize(size);
      return createBuffer(size < 0 ? 0 : checked(size) | 0);
    }
    Buffer3.allocUnsafe = function(size) {
      return allocUnsafe(size);
    };
    Buffer3.allocUnsafeSlow = function(size) {
      return allocUnsafe(size);
    };
    function fromString(string, encoding) {
      if (typeof encoding !== "string" || encoding === "") {
        encoding = "utf8";
      }
      if (!Buffer3.isEncoding(encoding)) {
        throw new TypeError("Unknown encoding: " + encoding);
      }
      const length = byteLength(string, encoding) | 0;
      let buf = createBuffer(length);
      const actual = buf.write(string, encoding);
      if (actual !== length) {
        buf = buf.slice(0, actual);
      }
      return buf;
    }
    function fromArrayLike(array) {
      const length = array.length < 0 ? 0 : checked(array.length) | 0;
      const buf = createBuffer(length);
      for (let i = 0; i < length; i += 1) {
        buf[i] = array[i] & 255;
      }
      return buf;
    }
    function fromArrayView(arrayView) {
      if (isInstance(arrayView, Uint8Array)) {
        const copy = new Uint8Array(arrayView);
        return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
      }
      return fromArrayLike(arrayView);
    }
    function fromArrayBuffer(array, byteOffset, length) {
      if (byteOffset < 0 || array.byteLength < byteOffset) {
        throw new RangeError('"offset" is outside of buffer bounds');
      }
      if (array.byteLength < byteOffset + (length || 0)) {
        throw new RangeError('"length" is outside of buffer bounds');
      }
      let buf;
      if (byteOffset === void 0 && length === void 0) {
        buf = new Uint8Array(array);
      } else if (length === void 0) {
        buf = new Uint8Array(array, byteOffset);
      } else {
        buf = new Uint8Array(array, byteOffset, length);
      }
      Object.setPrototypeOf(buf, Buffer3.prototype);
      return buf;
    }
    function fromObject(obj) {
      if (Buffer3.isBuffer(obj)) {
        const len = checked(obj.length) | 0;
        const buf = createBuffer(len);
        if (buf.length === 0) {
          return buf;
        }
        obj.copy(buf, 0, 0, len);
        return buf;
      }
      if (obj.length !== void 0) {
        if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
          return createBuffer(0);
        }
        return fromArrayLike(obj);
      }
      if (obj.type === "Buffer" && Array.isArray(obj.data)) {
        return fromArrayLike(obj.data);
      }
    }
    function checked(length) {
      if (length >= K_MAX_LENGTH) {
        throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
      }
      return length | 0;
    }
    function SlowBuffer(length) {
      if (+length != length) {
        length = 0;
      }
      return Buffer3.alloc(+length);
    }
    Buffer3.isBuffer = function isBuffer(b) {
      return b != null && b._isBuffer === true && b !== Buffer3.prototype;
    };
    Buffer3.compare = function compare(a, b) {
      if (isInstance(a, Uint8Array)) a = Buffer3.from(a, a.offset, a.byteLength);
      if (isInstance(b, Uint8Array)) b = Buffer3.from(b, b.offset, b.byteLength);
      if (!Buffer3.isBuffer(a) || !Buffer3.isBuffer(b)) {
        throw new TypeError(
          'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
        );
      }
      if (a === b) return 0;
      let x = a.length;
      let y = b.length;
      for (let i = 0, len = Math.min(x, y); i < len; ++i) {
        if (a[i] !== b[i]) {
          x = a[i];
          y = b[i];
          break;
        }
      }
      if (x < y) return -1;
      if (y < x) return 1;
      return 0;
    };
    Buffer3.isEncoding = function isEncoding(encoding) {
      switch (String(encoding).toLowerCase()) {
        case "hex":
        case "utf8":
        case "utf-8":
        case "ascii":
        case "latin1":
        case "binary":
        case "base64":
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return true;
        default:
          return false;
      }
    };
    Buffer3.concat = function concat(list, length) {
      if (!Array.isArray(list)) {
        throw new TypeError('"list" argument must be an Array of Buffers');
      }
      if (list.length === 0) {
        return Buffer3.alloc(0);
      }
      let i;
      if (length === void 0) {
        length = 0;
        for (i = 0; i < list.length; ++i) {
          length += list[i].length;
        }
      }
      const buffer = Buffer3.allocUnsafe(length);
      let pos = 0;
      for (i = 0; i < list.length; ++i) {
        let buf = list[i];
        if (isInstance(buf, Uint8Array)) {
          if (pos + buf.length > buffer.length) {
            if (!Buffer3.isBuffer(buf)) buf = Buffer3.from(buf);
            buf.copy(buffer, pos);
          } else {
            Uint8Array.prototype.set.call(
              buffer,
              buf,
              pos
            );
          }
        } else if (!Buffer3.isBuffer(buf)) {
          throw new TypeError('"list" argument must be an Array of Buffers');
        } else {
          buf.copy(buffer, pos);
        }
        pos += buf.length;
      }
      return buffer;
    };
    function byteLength(string, encoding) {
      if (Buffer3.isBuffer(string)) {
        return string.length;
      }
      if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
        return string.byteLength;
      }
      if (typeof string !== "string") {
        throw new TypeError(
          'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string
        );
      }
      const len = string.length;
      const mustMatch = arguments.length > 2 && arguments[2] === true;
      if (!mustMatch && len === 0) return 0;
      let loweredCase = false;
      for (; ; ) {
        switch (encoding) {
          case "ascii":
          case "latin1":
          case "binary":
            return len;
          case "utf8":
          case "utf-8":
            return utf8ToBytes(string).length;
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return len * 2;
          case "hex":
            return len >>> 1;
          case "base64":
            return base64ToBytes(string).length;
          default:
            if (loweredCase) {
              return mustMatch ? -1 : utf8ToBytes(string).length;
            }
            encoding = ("" + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer3.byteLength = byteLength;
    function slowToString(encoding, start, end) {
      let loweredCase = false;
      if (start === void 0 || start < 0) {
        start = 0;
      }
      if (start > this.length) {
        return "";
      }
      if (end === void 0 || end > this.length) {
        end = this.length;
      }
      if (end <= 0) {
        return "";
      }
      end >>>= 0;
      start >>>= 0;
      if (end <= start) {
        return "";
      }
      if (!encoding) encoding = "utf8";
      while (true) {
        switch (encoding) {
          case "hex":
            return hexSlice(this, start, end);
          case "utf8":
          case "utf-8":
            return utf8Slice(this, start, end);
          case "ascii":
            return asciiSlice(this, start, end);
          case "latin1":
          case "binary":
            return latin1Slice(this, start, end);
          case "base64":
            return base64Slice(this, start, end);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return utf16leSlice(this, start, end);
          default:
            if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
            encoding = (encoding + "").toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer3.prototype._isBuffer = true;
    function swap(b, n, m) {
      const i = b[n];
      b[n] = b[m];
      b[m] = i;
    }
    Buffer3.prototype.swap16 = function swap16() {
      const len = this.length;
      if (len % 2 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 16-bits");
      }
      for (let i = 0; i < len; i += 2) {
        swap(this, i, i + 1);
      }
      return this;
    };
    Buffer3.prototype.swap32 = function swap32() {
      const len = this.length;
      if (len % 4 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 32-bits");
      }
      for (let i = 0; i < len; i += 4) {
        swap(this, i, i + 3);
        swap(this, i + 1, i + 2);
      }
      return this;
    };
    Buffer3.prototype.swap64 = function swap64() {
      const len = this.length;
      if (len % 8 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 64-bits");
      }
      for (let i = 0; i < len; i += 8) {
        swap(this, i, i + 7);
        swap(this, i + 1, i + 6);
        swap(this, i + 2, i + 5);
        swap(this, i + 3, i + 4);
      }
      return this;
    };
    Buffer3.prototype.toString = function toString() {
      const length = this.length;
      if (length === 0) return "";
      if (arguments.length === 0) return utf8Slice(this, 0, length);
      return slowToString.apply(this, arguments);
    };
    Buffer3.prototype.toLocaleString = Buffer3.prototype.toString;
    Buffer3.prototype.equals = function equals(b) {
      if (!Buffer3.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
      if (this === b) return true;
      return Buffer3.compare(this, b) === 0;
    };
    Buffer3.prototype.inspect = function inspect() {
      let str = "";
      const max = exports.INSPECT_MAX_BYTES;
      str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
      if (this.length > max) str += " ... ";
      return "<Buffer " + str + ">";
    };
    if (customInspectSymbol) {
      Buffer3.prototype[customInspectSymbol] = Buffer3.prototype.inspect;
    }
    Buffer3.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
      if (isInstance(target, Uint8Array)) {
        target = Buffer3.from(target, target.offset, target.byteLength);
      }
      if (!Buffer3.isBuffer(target)) {
        throw new TypeError(
          'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target
        );
      }
      if (start === void 0) {
        start = 0;
      }
      if (end === void 0) {
        end = target ? target.length : 0;
      }
      if (thisStart === void 0) {
        thisStart = 0;
      }
      if (thisEnd === void 0) {
        thisEnd = this.length;
      }
      if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
        throw new RangeError("out of range index");
      }
      if (thisStart >= thisEnd && start >= end) {
        return 0;
      }
      if (thisStart >= thisEnd) {
        return -1;
      }
      if (start >= end) {
        return 1;
      }
      start >>>= 0;
      end >>>= 0;
      thisStart >>>= 0;
      thisEnd >>>= 0;
      if (this === target) return 0;
      let x = thisEnd - thisStart;
      let y = end - start;
      const len = Math.min(x, y);
      const thisCopy = this.slice(thisStart, thisEnd);
      const targetCopy = target.slice(start, end);
      for (let i = 0; i < len; ++i) {
        if (thisCopy[i] !== targetCopy[i]) {
          x = thisCopy[i];
          y = targetCopy[i];
          break;
        }
      }
      if (x < y) return -1;
      if (y < x) return 1;
      return 0;
    };
    function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
      if (buffer.length === 0) return -1;
      if (typeof byteOffset === "string") {
        encoding = byteOffset;
        byteOffset = 0;
      } else if (byteOffset > 2147483647) {
        byteOffset = 2147483647;
      } else if (byteOffset < -2147483648) {
        byteOffset = -2147483648;
      }
      byteOffset = +byteOffset;
      if (numberIsNaN(byteOffset)) {
        byteOffset = dir ? 0 : buffer.length - 1;
      }
      if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
      if (byteOffset >= buffer.length) {
        if (dir) return -1;
        else byteOffset = buffer.length - 1;
      } else if (byteOffset < 0) {
        if (dir) byteOffset = 0;
        else return -1;
      }
      if (typeof val === "string") {
        val = Buffer3.from(val, encoding);
      }
      if (Buffer3.isBuffer(val)) {
        if (val.length === 0) {
          return -1;
        }
        return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
      } else if (typeof val === "number") {
        val = val & 255;
        if (typeof Uint8Array.prototype.indexOf === "function") {
          if (dir) {
            return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
          } else {
            return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
          }
        }
        return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
      }
      throw new TypeError("val must be string, number or Buffer");
    }
    function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
      let indexSize = 1;
      let arrLength = arr.length;
      let valLength = val.length;
      if (encoding !== void 0) {
        encoding = String(encoding).toLowerCase();
        if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
          if (arr.length < 2 || val.length < 2) {
            return -1;
          }
          indexSize = 2;
          arrLength /= 2;
          valLength /= 2;
          byteOffset /= 2;
        }
      }
      function read(buf, i2) {
        if (indexSize === 1) {
          return buf[i2];
        } else {
          return buf.readUInt16BE(i2 * indexSize);
        }
      }
      let i;
      if (dir) {
        let foundIndex = -1;
        for (i = byteOffset; i < arrLength; i++) {
          if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
            if (foundIndex === -1) foundIndex = i;
            if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
          } else {
            if (foundIndex !== -1) i -= i - foundIndex;
            foundIndex = -1;
          }
        }
      } else {
        if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
        for (i = byteOffset; i >= 0; i--) {
          let found = true;
          for (let j = 0; j < valLength; j++) {
            if (read(arr, i + j) !== read(val, j)) {
              found = false;
              break;
            }
          }
          if (found) return i;
        }
      }
      return -1;
    }
    Buffer3.prototype.includes = function includes(val, byteOffset, encoding) {
      return this.indexOf(val, byteOffset, encoding) !== -1;
    };
    Buffer3.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
    };
    Buffer3.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
    };
    function hexWrite(buf, string, offset, length) {
      offset = Number(offset) || 0;
      const remaining = buf.length - offset;
      if (!length) {
        length = remaining;
      } else {
        length = Number(length);
        if (length > remaining) {
          length = remaining;
        }
      }
      const strLen = string.length;
      if (length > strLen / 2) {
        length = strLen / 2;
      }
      let i;
      for (i = 0; i < length; ++i) {
        const parsed = parseInt(string.substr(i * 2, 2), 16);
        if (numberIsNaN(parsed)) return i;
        buf[offset + i] = parsed;
      }
      return i;
    }
    function utf8Write(buf, string, offset, length) {
      return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
    }
    function asciiWrite(buf, string, offset, length) {
      return blitBuffer(asciiToBytes(string), buf, offset, length);
    }
    function base64Write(buf, string, offset, length) {
      return blitBuffer(base64ToBytes(string), buf, offset, length);
    }
    function ucs2Write(buf, string, offset, length) {
      return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
    }
    Buffer3.prototype.write = function write(string, offset, length, encoding) {
      if (offset === void 0) {
        encoding = "utf8";
        length = this.length;
        offset = 0;
      } else if (length === void 0 && typeof offset === "string") {
        encoding = offset;
        length = this.length;
        offset = 0;
      } else if (isFinite(offset)) {
        offset = offset >>> 0;
        if (isFinite(length)) {
          length = length >>> 0;
          if (encoding === void 0) encoding = "utf8";
        } else {
          encoding = length;
          length = void 0;
        }
      } else {
        throw new Error(
          "Buffer.write(string, encoding, offset[, length]) is no longer supported"
        );
      }
      const remaining = this.length - offset;
      if (length === void 0 || length > remaining) length = remaining;
      if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
        throw new RangeError("Attempt to write outside buffer bounds");
      }
      if (!encoding) encoding = "utf8";
      let loweredCase = false;
      for (; ; ) {
        switch (encoding) {
          case "hex":
            return hexWrite(this, string, offset, length);
          case "utf8":
          case "utf-8":
            return utf8Write(this, string, offset, length);
          case "ascii":
          case "latin1":
          case "binary":
            return asciiWrite(this, string, offset, length);
          case "base64":
            return base64Write(this, string, offset, length);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return ucs2Write(this, string, offset, length);
          default:
            if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
            encoding = ("" + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    };
    Buffer3.prototype.toJSON = function toJSON() {
      return {
        type: "Buffer",
        data: Array.prototype.slice.call(this._arr || this, 0)
      };
    };
    function base64Slice(buf, start, end) {
      if (start === 0 && end === buf.length) {
        return base64.fromByteArray(buf);
      } else {
        return base64.fromByteArray(buf.slice(start, end));
      }
    }
    function utf8Slice(buf, start, end) {
      end = Math.min(buf.length, end);
      const res = [];
      let i = start;
      while (i < end) {
        const firstByte = buf[i];
        let codePoint = null;
        let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
        if (i + bytesPerSequence <= end) {
          let secondByte, thirdByte, fourthByte, tempCodePoint;
          switch (bytesPerSequence) {
            case 1:
              if (firstByte < 128) {
                codePoint = firstByte;
              }
              break;
            case 2:
              secondByte = buf[i + 1];
              if ((secondByte & 192) === 128) {
                tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                if (tempCodePoint > 127) {
                  codePoint = tempCodePoint;
                }
              }
              break;
            case 3:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                  codePoint = tempCodePoint;
                }
              }
              break;
            case 4:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              fourthByte = buf[i + 3];
              if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                  codePoint = tempCodePoint;
                }
              }
          }
        }
        if (codePoint === null) {
          codePoint = 65533;
          bytesPerSequence = 1;
        } else if (codePoint > 65535) {
          codePoint -= 65536;
          res.push(codePoint >>> 10 & 1023 | 55296);
          codePoint = 56320 | codePoint & 1023;
        }
        res.push(codePoint);
        i += bytesPerSequence;
      }
      return decodeCodePointsArray(res);
    }
    var MAX_ARGUMENTS_LENGTH = 4096;
    function decodeCodePointsArray(codePoints) {
      const len = codePoints.length;
      if (len <= MAX_ARGUMENTS_LENGTH) {
        return String.fromCharCode.apply(String, codePoints);
      }
      let res = "";
      let i = 0;
      while (i < len) {
        res += String.fromCharCode.apply(
          String,
          codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
        );
      }
      return res;
    }
    function asciiSlice(buf, start, end) {
      let ret = "";
      end = Math.min(buf.length, end);
      for (let i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i] & 127);
      }
      return ret;
    }
    function latin1Slice(buf, start, end) {
      let ret = "";
      end = Math.min(buf.length, end);
      for (let i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i]);
      }
      return ret;
    }
    function hexSlice(buf, start, end) {
      const len = buf.length;
      if (!start || start < 0) start = 0;
      if (!end || end < 0 || end > len) end = len;
      let out = "";
      for (let i = start; i < end; ++i) {
        out += hexSliceLookupTable[buf[i]];
      }
      return out;
    }
    function utf16leSlice(buf, start, end) {
      const bytes = buf.slice(start, end);
      let res = "";
      for (let i = 0; i < bytes.length - 1; i += 2) {
        res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
      }
      return res;
    }
    Buffer3.prototype.slice = function slice(start, end) {
      const len = this.length;
      start = ~~start;
      end = end === void 0 ? len : ~~end;
      if (start < 0) {
        start += len;
        if (start < 0) start = 0;
      } else if (start > len) {
        start = len;
      }
      if (end < 0) {
        end += len;
        if (end < 0) end = 0;
      } else if (end > len) {
        end = len;
      }
      if (end < start) end = start;
      const newBuf = this.subarray(start, end);
      Object.setPrototypeOf(newBuf, Buffer3.prototype);
      return newBuf;
    };
    function checkOffset(offset, ext, length) {
      if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
      if (offset + ext > length) throw new RangeError("Trying to access beyond buffer length");
    }
    Buffer3.prototype.readUintLE = Buffer3.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) checkOffset(offset, byteLength2, this.length);
      let val = this[offset];
      let mul = 1;
      let i = 0;
      while (++i < byteLength2 && (mul *= 256)) {
        val += this[offset + i] * mul;
      }
      return val;
    };
    Buffer3.prototype.readUintBE = Buffer3.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) {
        checkOffset(offset, byteLength2, this.length);
      }
      let val = this[offset + --byteLength2];
      let mul = 1;
      while (byteLength2 > 0 && (mul *= 256)) {
        val += this[offset + --byteLength2] * mul;
      }
      return val;
    };
    Buffer3.prototype.readUint8 = Buffer3.prototype.readUInt8 = function readUInt8(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 1, this.length);
      return this[offset];
    };
    Buffer3.prototype.readUint16LE = Buffer3.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 2, this.length);
      return this[offset] | this[offset + 1] << 8;
    };
    Buffer3.prototype.readUint16BE = Buffer3.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 2, this.length);
      return this[offset] << 8 | this[offset + 1];
    };
    Buffer3.prototype.readUint32LE = Buffer3.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
    };
    Buffer3.prototype.readUint32BE = Buffer3.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
    };
    Buffer3.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last = this[offset + 7];
      if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
      }
      const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
      const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
      return BigInt(lo) + (BigInt(hi) << BigInt(32));
    });
    Buffer3.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last = this[offset + 7];
      if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
      }
      const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
      const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
      return (BigInt(hi) << BigInt(32)) + BigInt(lo);
    });
    Buffer3.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) checkOffset(offset, byteLength2, this.length);
      let val = this[offset];
      let mul = 1;
      let i = 0;
      while (++i < byteLength2 && (mul *= 256)) {
        val += this[offset + i] * mul;
      }
      mul *= 128;
      if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
      return val;
    };
    Buffer3.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) checkOffset(offset, byteLength2, this.length);
      let i = byteLength2;
      let mul = 1;
      let val = this[offset + --i];
      while (i > 0 && (mul *= 256)) {
        val += this[offset + --i] * mul;
      }
      mul *= 128;
      if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
      return val;
    };
    Buffer3.prototype.readInt8 = function readInt8(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 1, this.length);
      if (!(this[offset] & 128)) return this[offset];
      return (255 - this[offset] + 1) * -1;
    };
    Buffer3.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 2, this.length);
      const val = this[offset] | this[offset + 1] << 8;
      return val & 32768 ? val | 4294901760 : val;
    };
    Buffer3.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 2, this.length);
      const val = this[offset + 1] | this[offset] << 8;
      return val & 32768 ? val | 4294901760 : val;
    };
    Buffer3.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
    };
    Buffer3.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
    };
    Buffer3.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last = this[offset + 7];
      if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
      }
      const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
      return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
    });
    Buffer3.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last = this[offset + 7];
      if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
      }
      const val = (first << 24) + // Overflow
      this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
      return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
    });
    Buffer3.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return ieee754.read(this, offset, true, 23, 4);
    };
    Buffer3.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return ieee754.read(this, offset, false, 23, 4);
    };
    Buffer3.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 8, this.length);
      return ieee754.read(this, offset, true, 52, 8);
    };
    Buffer3.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 8, this.length);
      return ieee754.read(this, offset, false, 52, 8);
    };
    function checkInt(buf, value, offset, ext, max, min) {
      if (!Buffer3.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
      if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
      if (offset + ext > buf.length) throw new RangeError("Index out of range");
    }
    Buffer3.prototype.writeUintLE = Buffer3.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
      value = +value;
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) {
        const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
        checkInt(this, value, offset, byteLength2, maxBytes, 0);
      }
      let mul = 1;
      let i = 0;
      this[offset] = value & 255;
      while (++i < byteLength2 && (mul *= 256)) {
        this[offset + i] = value / mul & 255;
      }
      return offset + byteLength2;
    };
    Buffer3.prototype.writeUintBE = Buffer3.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
      value = +value;
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) {
        const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
        checkInt(this, value, offset, byteLength2, maxBytes, 0);
      }
      let i = byteLength2 - 1;
      let mul = 1;
      this[offset + i] = value & 255;
      while (--i >= 0 && (mul *= 256)) {
        this[offset + i] = value / mul & 255;
      }
      return offset + byteLength2;
    };
    Buffer3.prototype.writeUint8 = Buffer3.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 1, 255, 0);
      this[offset] = value & 255;
      return offset + 1;
    };
    Buffer3.prototype.writeUint16LE = Buffer3.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
      this[offset] = value & 255;
      this[offset + 1] = value >>> 8;
      return offset + 2;
    };
    Buffer3.prototype.writeUint16BE = Buffer3.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
      this[offset] = value >>> 8;
      this[offset + 1] = value & 255;
      return offset + 2;
    };
    Buffer3.prototype.writeUint32LE = Buffer3.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
      this[offset + 3] = value >>> 24;
      this[offset + 2] = value >>> 16;
      this[offset + 1] = value >>> 8;
      this[offset] = value & 255;
      return offset + 4;
    };
    Buffer3.prototype.writeUint32BE = Buffer3.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
      this[offset] = value >>> 24;
      this[offset + 1] = value >>> 16;
      this[offset + 2] = value >>> 8;
      this[offset + 3] = value & 255;
      return offset + 4;
    };
    function wrtBigUInt64LE(buf, value, offset, min, max) {
      checkIntBI(value, min, max, buf, offset, 7);
      let lo = Number(value & BigInt(4294967295));
      buf[offset++] = lo;
      lo = lo >> 8;
      buf[offset++] = lo;
      lo = lo >> 8;
      buf[offset++] = lo;
      lo = lo >> 8;
      buf[offset++] = lo;
      let hi = Number(value >> BigInt(32) & BigInt(4294967295));
      buf[offset++] = hi;
      hi = hi >> 8;
      buf[offset++] = hi;
      hi = hi >> 8;
      buf[offset++] = hi;
      hi = hi >> 8;
      buf[offset++] = hi;
      return offset;
    }
    function wrtBigUInt64BE(buf, value, offset, min, max) {
      checkIntBI(value, min, max, buf, offset, 7);
      let lo = Number(value & BigInt(4294967295));
      buf[offset + 7] = lo;
      lo = lo >> 8;
      buf[offset + 6] = lo;
      lo = lo >> 8;
      buf[offset + 5] = lo;
      lo = lo >> 8;
      buf[offset + 4] = lo;
      let hi = Number(value >> BigInt(32) & BigInt(4294967295));
      buf[offset + 3] = hi;
      hi = hi >> 8;
      buf[offset + 2] = hi;
      hi = hi >> 8;
      buf[offset + 1] = hi;
      hi = hi >> 8;
      buf[offset] = hi;
      return offset + 8;
    }
    Buffer3.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
      return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
    });
    Buffer3.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
      return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
    });
    Buffer3.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        const limit = Math.pow(2, 8 * byteLength2 - 1);
        checkInt(this, value, offset, byteLength2, limit - 1, -limit);
      }
      let i = 0;
      let mul = 1;
      let sub = 0;
      this[offset] = value & 255;
      while (++i < byteLength2 && (mul *= 256)) {
        if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = (value / mul >> 0) - sub & 255;
      }
      return offset + byteLength2;
    };
    Buffer3.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        const limit = Math.pow(2, 8 * byteLength2 - 1);
        checkInt(this, value, offset, byteLength2, limit - 1, -limit);
      }
      let i = byteLength2 - 1;
      let mul = 1;
      let sub = 0;
      this[offset + i] = value & 255;
      while (--i >= 0 && (mul *= 256)) {
        if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = (value / mul >> 0) - sub & 255;
      }
      return offset + byteLength2;
    };
    Buffer3.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 1, 127, -128);
      if (value < 0) value = 255 + value + 1;
      this[offset] = value & 255;
      return offset + 1;
    };
    Buffer3.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
      this[offset] = value & 255;
      this[offset + 1] = value >>> 8;
      return offset + 2;
    };
    Buffer3.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
      this[offset] = value >>> 8;
      this[offset + 1] = value & 255;
      return offset + 2;
    };
    Buffer3.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
      this[offset] = value & 255;
      this[offset + 1] = value >>> 8;
      this[offset + 2] = value >>> 16;
      this[offset + 3] = value >>> 24;
      return offset + 4;
    };
    Buffer3.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
      if (value < 0) value = 4294967295 + value + 1;
      this[offset] = value >>> 24;
      this[offset + 1] = value >>> 16;
      this[offset + 2] = value >>> 8;
      this[offset + 3] = value & 255;
      return offset + 4;
    };
    Buffer3.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
      return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
    });
    Buffer3.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
      return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
    });
    function checkIEEE754(buf, value, offset, ext, max, min) {
      if (offset + ext > buf.length) throw new RangeError("Index out of range");
      if (offset < 0) throw new RangeError("Index out of range");
    }
    function writeFloat(buf, value, offset, littleEndian, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 4, 34028234663852886e22, -34028234663852886e22);
      }
      ieee754.write(buf, value, offset, littleEndian, 23, 4);
      return offset + 4;
    }
    Buffer3.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
      return writeFloat(this, value, offset, true, noAssert);
    };
    Buffer3.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
      return writeFloat(this, value, offset, false, noAssert);
    };
    function writeDouble(buf, value, offset, littleEndian, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 8, 17976931348623157e292, -17976931348623157e292);
      }
      ieee754.write(buf, value, offset, littleEndian, 52, 8);
      return offset + 8;
    }
    Buffer3.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
      return writeDouble(this, value, offset, true, noAssert);
    };
    Buffer3.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
      return writeDouble(this, value, offset, false, noAssert);
    };
    Buffer3.prototype.copy = function copy(target, targetStart, start, end) {
      if (!Buffer3.isBuffer(target)) throw new TypeError("argument should be a Buffer");
      if (!start) start = 0;
      if (!end && end !== 0) end = this.length;
      if (targetStart >= target.length) targetStart = target.length;
      if (!targetStart) targetStart = 0;
      if (end > 0 && end < start) end = start;
      if (end === start) return 0;
      if (target.length === 0 || this.length === 0) return 0;
      if (targetStart < 0) {
        throw new RangeError("targetStart out of bounds");
      }
      if (start < 0 || start >= this.length) throw new RangeError("Index out of range");
      if (end < 0) throw new RangeError("sourceEnd out of bounds");
      if (end > this.length) end = this.length;
      if (target.length - targetStart < end - start) {
        end = target.length - targetStart + start;
      }
      const len = end - start;
      if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
        this.copyWithin(targetStart, start, end);
      } else {
        Uint8Array.prototype.set.call(
          target,
          this.subarray(start, end),
          targetStart
        );
      }
      return len;
    };
    Buffer3.prototype.fill = function fill(val, start, end, encoding) {
      if (typeof val === "string") {
        if (typeof start === "string") {
          encoding = start;
          start = 0;
          end = this.length;
        } else if (typeof end === "string") {
          encoding = end;
          end = this.length;
        }
        if (encoding !== void 0 && typeof encoding !== "string") {
          throw new TypeError("encoding must be a string");
        }
        if (typeof encoding === "string" && !Buffer3.isEncoding(encoding)) {
          throw new TypeError("Unknown encoding: " + encoding);
        }
        if (val.length === 1) {
          const code = val.charCodeAt(0);
          if (encoding === "utf8" && code < 128 || encoding === "latin1") {
            val = code;
          }
        }
      } else if (typeof val === "number") {
        val = val & 255;
      } else if (typeof val === "boolean") {
        val = Number(val);
      }
      if (start < 0 || this.length < start || this.length < end) {
        throw new RangeError("Out of range index");
      }
      if (end <= start) {
        return this;
      }
      start = start >>> 0;
      end = end === void 0 ? this.length : end >>> 0;
      if (!val) val = 0;
      let i;
      if (typeof val === "number") {
        for (i = start; i < end; ++i) {
          this[i] = val;
        }
      } else {
        const bytes = Buffer3.isBuffer(val) ? val : Buffer3.from(val, encoding);
        const len = bytes.length;
        if (len === 0) {
          throw new TypeError('The value "' + val + '" is invalid for argument "value"');
        }
        for (i = 0; i < end - start; ++i) {
          this[i + start] = bytes[i % len];
        }
      }
      return this;
    };
    var errors = {};
    function E(sym, getMessage, Base) {
      errors[sym] = class NodeError extends Base {
        constructor() {
          super();
          Object.defineProperty(this, "message", {
            value: getMessage.apply(this, arguments),
            writable: true,
            configurable: true
          });
          this.name = `${this.name} [${sym}]`;
          this.stack;
          delete this.name;
        }
        get code() {
          return sym;
        }
        set code(value) {
          Object.defineProperty(this, "code", {
            configurable: true,
            enumerable: true,
            value,
            writable: true
          });
        }
        toString() {
          return `${this.name} [${sym}]: ${this.message}`;
        }
      };
    }
    E(
      "ERR_BUFFER_OUT_OF_BOUNDS",
      function(name) {
        if (name) {
          return `${name} is outside of buffer bounds`;
        }
        return "Attempt to access memory outside buffer bounds";
      },
      RangeError
    );
    E(
      "ERR_INVALID_ARG_TYPE",
      function(name, actual) {
        return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
      },
      TypeError
    );
    E(
      "ERR_OUT_OF_RANGE",
      function(str, range, input) {
        let msg = `The value of "${str}" is out of range.`;
        let received = input;
        if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
          received = addNumericalSeparator(String(input));
        } else if (typeof input === "bigint") {
          received = String(input);
          if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
            received = addNumericalSeparator(received);
          }
          received += "n";
        }
        msg += ` It must be ${range}. Received ${received}`;
        return msg;
      },
      RangeError
    );
    function addNumericalSeparator(val) {
      let res = "";
      let i = val.length;
      const start = val[0] === "-" ? 1 : 0;
      for (; i >= start + 4; i -= 3) {
        res = `_${val.slice(i - 3, i)}${res}`;
      }
      return `${val.slice(0, i)}${res}`;
    }
    function checkBounds(buf, offset, byteLength2) {
      validateNumber(offset, "offset");
      if (buf[offset] === void 0 || buf[offset + byteLength2] === void 0) {
        boundsError(offset, buf.length - (byteLength2 + 1));
      }
    }
    function checkIntBI(value, min, max, buf, offset, byteLength2) {
      if (value > max || value < min) {
        const n = typeof min === "bigint" ? "n" : "";
        let range;
        if (byteLength2 > 3) {
          if (min === 0 || min === BigInt(0)) {
            range = `>= 0${n} and < 2${n} ** ${(byteLength2 + 1) * 8}${n}`;
          } else {
            range = `>= -(2${n} ** ${(byteLength2 + 1) * 8 - 1}${n}) and < 2 ** ${(byteLength2 + 1) * 8 - 1}${n}`;
          }
        } else {
          range = `>= ${min}${n} and <= ${max}${n}`;
        }
        throw new errors.ERR_OUT_OF_RANGE("value", range, value);
      }
      checkBounds(buf, offset, byteLength2);
    }
    function validateNumber(value, name) {
      if (typeof value !== "number") {
        throw new errors.ERR_INVALID_ARG_TYPE(name, "number", value);
      }
    }
    function boundsError(value, length, type) {
      if (Math.floor(value) !== value) {
        validateNumber(value, type);
        throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
      }
      if (length < 0) {
        throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
      }
      throw new errors.ERR_OUT_OF_RANGE(
        type || "offset",
        `>= ${type ? 1 : 0} and <= ${length}`,
        value
      );
    }
    var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
    function base64clean(str) {
      str = str.split("=")[0];
      str = str.trim().replace(INVALID_BASE64_RE, "");
      if (str.length < 2) return "";
      while (str.length % 4 !== 0) {
        str = str + "=";
      }
      return str;
    }
    function utf8ToBytes(string, units) {
      units = units || Infinity;
      let codePoint;
      const length = string.length;
      let leadSurrogate = null;
      const bytes = [];
      for (let i = 0; i < length; ++i) {
        codePoint = string.charCodeAt(i);
        if (codePoint > 55295 && codePoint < 57344) {
          if (!leadSurrogate) {
            if (codePoint > 56319) {
              if ((units -= 3) > -1) bytes.push(239, 191, 189);
              continue;
            } else if (i + 1 === length) {
              if ((units -= 3) > -1) bytes.push(239, 191, 189);
              continue;
            }
            leadSurrogate = codePoint;
            continue;
          }
          if (codePoint < 56320) {
            if ((units -= 3) > -1) bytes.push(239, 191, 189);
            leadSurrogate = codePoint;
            continue;
          }
          codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
        } else if (leadSurrogate) {
          if ((units -= 3) > -1) bytes.push(239, 191, 189);
        }
        leadSurrogate = null;
        if (codePoint < 128) {
          if ((units -= 1) < 0) break;
          bytes.push(codePoint);
        } else if (codePoint < 2048) {
          if ((units -= 2) < 0) break;
          bytes.push(
            codePoint >> 6 | 192,
            codePoint & 63 | 128
          );
        } else if (codePoint < 65536) {
          if ((units -= 3) < 0) break;
          bytes.push(
            codePoint >> 12 | 224,
            codePoint >> 6 & 63 | 128,
            codePoint & 63 | 128
          );
        } else if (codePoint < 1114112) {
          if ((units -= 4) < 0) break;
          bytes.push(
            codePoint >> 18 | 240,
            codePoint >> 12 & 63 | 128,
            codePoint >> 6 & 63 | 128,
            codePoint & 63 | 128
          );
        } else {
          throw new Error("Invalid code point");
        }
      }
      return bytes;
    }
    function asciiToBytes(str) {
      const byteArray = [];
      for (let i = 0; i < str.length; ++i) {
        byteArray.push(str.charCodeAt(i) & 255);
      }
      return byteArray;
    }
    function utf16leToBytes(str, units) {
      let c, hi, lo;
      const byteArray = [];
      for (let i = 0; i < str.length; ++i) {
        if ((units -= 2) < 0) break;
        c = str.charCodeAt(i);
        hi = c >> 8;
        lo = c % 256;
        byteArray.push(lo);
        byteArray.push(hi);
      }
      return byteArray;
    }
    function base64ToBytes(str) {
      return base64.toByteArray(base64clean(str));
    }
    function blitBuffer(src, dst, offset, length) {
      let i;
      for (i = 0; i < length; ++i) {
        if (i + offset >= dst.length || i >= src.length) break;
        dst[i + offset] = src[i];
      }
      return i;
    }
    function isInstance(obj, type) {
      return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
    }
    function numberIsNaN(obj) {
      return obj !== obj;
    }
    var hexSliceLookupTable = (function() {
      const alphabet = "0123456789abcdef";
      const table = new Array(256);
      for (let i = 0; i < 16; ++i) {
        const i16 = i * 16;
        for (let j = 0; j < 16; ++j) {
          table[i16 + j] = alphabet[i] + alphabet[j];
        }
      }
      return table;
    })();
    function defineBigIntMethod(fn) {
      return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
    }
    function BufferBigIntNotDefined() {
      throw new Error("BigInt not supported");
    }
  }
});

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/AnamClient.js
var import_buffer = __toESM(require_buffer());

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/lib/constants.js
var DEFAULT_API_BASE_URL = "https://api.anam.ai";
var DEFAULT_API_VERSION = "/v1";
var CLIENT_METADATA = {
  client: "js-sdk",
  // Placeholder substituted by semantic-release-mirror-version. The substitution
  // must happen here in src, not only in dist: `npm publish` re-runs the `prepare`
  // build, which would otherwise regenerate dist with the placeholder intact.
  version: "4.27.0"
};
var DEFAULT_START_SESSION_MAX_ATTEMPTS = 3;
var DEFAULT_START_SESSION_INITIAL_BACKOFF_MS = 250;
var DEFAULT_START_SESSION_MAX_BACKOFF_MS = 2e3;
var DEFAULT_START_SESSION_REQUEST_TIMEOUT_MS = 1e4;

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/lib/ClientMetrics.js
var __awaiter = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var DEFAULT_ANAM_METRICS_BASE_URL = "https://api.anam.ai";
var DEFAULT_ANAM_API_VERSION = "/v1";
var ClientMetricMeasurement;
(function(ClientMetricMeasurement2) {
  ClientMetricMeasurement2["CLIENT_METRIC_MEASUREMENT_ERROR"] = "client_error";
  ClientMetricMeasurement2["CLIENT_METRIC_MEASUREMENT_CONNECTION_CLOSED"] = "client_connection_closed";
  ClientMetricMeasurement2["CLIENT_METRIC_MEASUREMENT_CONNECTION_ESTABLISHED"] = "client_connection_established";
  ClientMetricMeasurement2["CLIENT_METRIC_MEASUREMENT_CONNECTION_MILESTONE"] = "client_connection_milestone";
  ClientMetricMeasurement2["CLIENT_METRIC_MEASUREMENT_CONNECTION_MILESTONES"] = "client_connection_milestones";
  ClientMetricMeasurement2["CLIENT_METRIC_MEASUREMENT_SESSION_ATTEMPT"] = "client_session_attempt";
  ClientMetricMeasurement2["CLIENT_METRIC_MEASUREMENT_SESSION_SUCCESS"] = "client_session_success";
  ClientMetricMeasurement2["CLIENT_METRIC_MEASUREMENT_ICE_RESTART"] = "client_ice_restart";
  ClientMetricMeasurement2["CLIENT_METRIC_MEASUREMENT_INPUT_AUDIO_SETTINGS"] = "client_input_audio_settings";
})(ClientMetricMeasurement || (ClientMetricMeasurement = {}));
var CLIENT_METRICS_MAX_BATCH_SIZE = 50;
var anamCurrentBaseUrl = DEFAULT_ANAM_METRICS_BASE_URL;
var anamCurrentApiVersion = DEFAULT_ANAM_API_VERSION;
var apiGatewayConfig;
var metricsDisabled = false;
var setClientMetricsBaseUrl = (baseUrl, apiVersion = DEFAULT_ANAM_API_VERSION) => {
  anamCurrentBaseUrl = baseUrl;
  anamCurrentApiVersion = apiVersion;
};
var setClientMetricsApiGateway = (config) => {
  apiGatewayConfig = config;
};
var setClientMetricsDisabled = (disabled) => {
  metricsDisabled = disabled;
};
var anamMetricsContext = {
  sessionId: null,
  organizationId: null,
  attemptCorrelationId: null
};
var setMetricsContext = (context) => {
  anamMetricsContext = Object.assign(Object.assign({}, anamMetricsContext), context);
};
var sendClientMetric = (name, value, tags) => __awaiter(void 0, void 0, void 0, function* () {
  yield sendClientMetrics([{ name, value, tags }]);
});
var sendClientMetrics = (metrics) => __awaiter(void 0, void 0, void 0, function* () {
  if (metricsDisabled || metrics.length === 0) {
    return;
  }
  try {
    const targetPath = `${anamCurrentApiVersion}/metrics/client`;
    let url;
    const headers = {
      "Content-Type": "application/json"
    };
    if ((apiGatewayConfig === null || apiGatewayConfig === void 0 ? void 0 : apiGatewayConfig.enabled) && (apiGatewayConfig === null || apiGatewayConfig === void 0 ? void 0 : apiGatewayConfig.baseUrl)) {
      url = `${apiGatewayConfig.baseUrl}${targetPath}`;
      headers["X-Anam-Target-Url"] = `${anamCurrentBaseUrl}${targetPath}`;
    } else {
      url = `${anamCurrentBaseUrl}${targetPath}`;
    }
    const normalizedMetrics = metrics.map((metric) => {
      var _a;
      return Object.assign(Object.assign({}, metric), { clientTimestamp: (_a = metric.clientTimestamp) !== null && _a !== void 0 ? _a : (/* @__PURE__ */ new Date()).toISOString(), tags: buildMetricTags(metric.tags) });
    });
    for (let batchStart = 0; batchStart < normalizedMetrics.length; batchStart += CLIENT_METRICS_MAX_BATCH_SIZE) {
      const batch = normalizedMetrics.slice(batchStart, batchStart + CLIENT_METRICS_MAX_BATCH_SIZE);
      const body = batch.length === 1 ? batch[0] : {
        metrics: batch
      };
      yield fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });
    }
  } catch (error) {
    console.error("Failed to send client metric:", error);
  }
});
var buildMetricTags = (tags) => {
  const metricTags = Object.assign(Object.assign({}, CLIENT_METADATA), tags);
  if (anamMetricsContext.sessionId && metricTags.sessionId === void 0) {
    metricTags.sessionId = anamMetricsContext.sessionId;
  }
  if (anamMetricsContext.organizationId && metricTags.organizationId === void 0) {
    metricTags.organizationId = anamMetricsContext.organizationId;
  }
  if (anamMetricsContext.attemptCorrelationId && metricTags.attemptCorrelationId === void 0) {
    metricTags.attemptCorrelationId = anamMetricsContext.attemptCorrelationId;
  }
  return metricTags;
};
var createRTCStatsReport = (stats, outputFormat = "console") => {
  var _a, _b, _c;
  const statsByType = {};
  stats.forEach((report) => {
    if (!statsByType[report.type]) {
      statsByType[report.type] = [];
    }
    statsByType[report.type].push(report);
  });
  const jsonReport = {
    issues: []
  };
  const inboundVideo = ((_a = statsByType["inbound-rtp"]) === null || _a === void 0 ? void 0 : _a.filter((r) => r.kind === "video")) || [];
  if (inboundVideo.length > 0) {
    jsonReport.personaVideoStream = [];
    inboundVideo.forEach((report) => {
      var _a2, _b2, _c2, _d, _e;
      const videoData = {
        framesReceived: (_a2 = report.framesReceived) !== null && _a2 !== void 0 ? _a2 : "unknown",
        framesDropped: (_b2 = report.framesDropped) !== null && _b2 !== void 0 ? _b2 : "unknown",
        framesPerSecond: (_c2 = report.framesPerSecond) !== null && _c2 !== void 0 ? _c2 : "unknown",
        packetsReceived: (_d = report.packetsReceived) !== null && _d !== void 0 ? _d : "unknown",
        packetsLost: (_e = report.packetsLost) !== null && _e !== void 0 ? _e : "unknown",
        resolution: report.frameWidth && report.frameHeight ? `${report.frameWidth}x${report.frameHeight}` : void 0,
        jitter: report.jitter !== void 0 ? report.jitter : void 0
      };
      jsonReport.personaVideoStream.push(videoData);
    });
  }
  const inboundAudio = ((_b = statsByType["inbound-rtp"]) === null || _b === void 0 ? void 0 : _b.filter((r) => r.kind === "audio")) || [];
  if (inboundAudio.length > 0) {
    jsonReport.personaAudioStream = [];
    inboundAudio.forEach((report) => {
      var _a2, _b2, _c2;
      const audioData = {
        packetsReceived: (_a2 = report.packetsReceived) !== null && _a2 !== void 0 ? _a2 : "unknown",
        packetsLost: (_b2 = report.packetsLost) !== null && _b2 !== void 0 ? _b2 : "unknown",
        audioLevel: (_c2 = report.audioLevel) !== null && _c2 !== void 0 ? _c2 : "unknown",
        jitter: report.jitter !== void 0 ? report.jitter : void 0,
        totalAudioEnergy: report.totalAudioEnergy !== void 0 ? report.totalAudioEnergy : void 0
      };
      jsonReport.personaAudioStream.push(audioData);
    });
  }
  const outboundAudio = ((_c = statsByType["outbound-rtp"]) === null || _c === void 0 ? void 0 : _c.filter((r) => r.kind === "audio")) || [];
  if (outboundAudio.length > 0) {
    jsonReport.userAudioInput = [];
    outboundAudio.forEach((report) => {
      var _a2, _b2;
      const userAudioData = {
        packetsSent: (_a2 = report.packetsSent) !== null && _a2 !== void 0 ? _a2 : "unknown",
        retransmittedPackets: (_b2 = report.retransmittedPacketsSent) !== null && _b2 !== void 0 ? _b2 : void 0,
        avgPacketSendDelay: report.totalPacketSendDelay !== void 0 ? report.totalPacketSendDelay / (report.packetsSent || 1) * 1e3 : void 0
      };
      jsonReport.userAudioInput.push(userAudioData);
    });
  }
  if (statsByType["codec"]) {
    jsonReport.codecs = [];
    statsByType["codec"].forEach((report) => {
      const codecData = {
        status: report.payloadType ? "Active" : "Available",
        mimeType: report.mimeType || "Unknown",
        payloadType: report.payloadType || "N/A",
        clockRate: report.clockRate || void 0,
        channels: report.channels || void 0
      };
      jsonReport.codecs.push(codecData);
    });
  }
  if (statsByType["transport"]) {
    jsonReport.transportLayer = [];
    statsByType["transport"].forEach((report) => {
      const transportData = {
        dtlsState: report.dtlsState || "unknown",
        iceState: report.iceState || "unknown",
        bytesSent: report.bytesSent || void 0,
        bytesReceived: report.bytesReceived || void 0
      };
      jsonReport.transportLayer.push(transportData);
    });
  }
  const issues = [];
  inboundVideo.forEach((report) => {
    if (typeof report.framesDropped === "number" && report.framesDropped > 0) {
      issues.push(`Video: ${report.framesDropped} frames dropped`);
    }
    if (typeof report.packetsLost === "number" && report.packetsLost > 0) {
      issues.push(`Video: ${report.packetsLost} packets lost`);
    }
    if (typeof report.framesPerSecond === "number" && report.framesPerSecond < 23) {
      issues.push(`Video: Low frame rate (${report.framesPerSecond} fps)`);
    }
  });
  inboundAudio.forEach((report) => {
    if (typeof report.packetsLost === "number" && report.packetsLost > 0) {
      issues.push(`Audio: ${report.packetsLost} packets lost`);
    }
    if (typeof report.jitter === "number" && report.jitter > 0.1) {
      issues.push(`Audio: High jitter (${(report.jitter * 1e3).toFixed(1)}ms)`);
    }
  });
  jsonReport.issues = issues;
  if (outputFormat === "json") {
    return jsonReport;
  }
  console.group("\u{1F4CA} WebRTC Session Statistics Report");
  if (jsonReport.personaVideoStream && jsonReport.personaVideoStream.length > 0) {
    console.group("\u{1F4F9} Persona Video Stream (Inbound)");
    jsonReport.personaVideoStream.forEach((videoData) => {
      console.log(`Frames Received: ${videoData.framesReceived}`);
      console.log(`Frames Dropped: ${videoData.framesDropped}`);
      console.log(`Frames Per Second: ${videoData.framesPerSecond}`);
      console.log(`Packets Received: ${typeof videoData.packetsReceived === "number" ? videoData.packetsReceived.toLocaleString() : videoData.packetsReceived}`);
      console.log(`Packets Lost: ${videoData.packetsLost}`);
      if (videoData.resolution) {
        console.log(`Resolution: ${videoData.resolution}`);
      }
      if (videoData.jitter !== void 0) {
        console.log(`Jitter: ${videoData.jitter.toFixed(5)}ms`);
      }
    });
    console.groupEnd();
  }
  if (jsonReport.personaAudioStream && jsonReport.personaAudioStream.length > 0) {
    console.group("\u{1F50A} Persona Audio Stream (Inbound)");
    jsonReport.personaAudioStream.forEach((audioData) => {
      console.log(`Packets Received: ${typeof audioData.packetsReceived === "number" ? audioData.packetsReceived.toLocaleString() : audioData.packetsReceived}`);
      console.log(`Packets Lost: ${audioData.packetsLost}`);
      console.log(`Audio Level: ${audioData.audioLevel}`);
      if (audioData.jitter !== void 0) {
        console.log(`Jitter: ${audioData.jitter.toFixed(5)}ms`);
      }
      if (audioData.totalAudioEnergy !== void 0) {
        console.log(`Total Audio Energy: ${audioData.totalAudioEnergy.toFixed(6)}`);
      }
    });
    console.groupEnd();
  }
  if (jsonReport.userAudioInput && jsonReport.userAudioInput.length > 0) {
    console.group("\u{1F3A4} User Audio Input (Outbound)");
    jsonReport.userAudioInput.forEach((userAudioData) => {
      console.log(`Packets Sent: ${typeof userAudioData.packetsSent === "number" ? userAudioData.packetsSent.toLocaleString() : userAudioData.packetsSent}`);
      if (userAudioData.retransmittedPackets) {
        console.log(`Retransmitted Packets: ${userAudioData.retransmittedPackets}`);
      }
      if (userAudioData.avgPacketSendDelay !== void 0) {
        console.log(`Avg Packet Send Delay: ${userAudioData.avgPacketSendDelay.toFixed(5)}ms`);
      }
    });
    console.groupEnd();
  }
  if (jsonReport.codecs && jsonReport.codecs.length > 0) {
    console.group("\u{1F527} Codecs Used");
    jsonReport.codecs.forEach((codecData) => {
      console.log(`${codecData.status} ${codecData.mimeType} - Payload Type: ${codecData.payloadType}`);
      if (codecData.clockRate) {
        console.log(`  Clock Rate: ${codecData.clockRate}Hz`);
      }
      if (codecData.channels) {
        console.log(`  Channels: ${codecData.channels}`);
      }
    });
    console.groupEnd();
  }
  if (jsonReport.transportLayer && jsonReport.transportLayer.length > 0) {
    console.group("\u{1F69A} Transport Layer");
    jsonReport.transportLayer.forEach((transportData) => {
      console.log(`DTLS State: ${transportData.dtlsState}`);
      console.log(`ICE State: ${transportData.iceState}`);
      if (transportData.bytesReceived || transportData.bytesSent) {
        console.log(`Data Transfer (bytes) - Sent: ${(transportData.bytesSent || 0).toLocaleString()}, Received: ${(transportData.bytesReceived || 0).toLocaleString()}`);
      }
    });
    console.groupEnd();
  }
  if (jsonReport.issues.length > 0) {
    console.group("\u26A0\uFE0F Potential Issues Detected");
    jsonReport.issues.forEach((issue) => console.warn(issue));
    console.groupEnd();
  } else {
    console.log("\u2705 No significant issues detected");
  }
  console.groupEnd();
};

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/lib/ClientError.js
var ErrorCode;
(function(ErrorCode2) {
  ErrorCode2["CLIENT_ERROR_CODE_USAGE_LIMIT_REACHED"] = "CLIENT_ERROR_CODE_USAGE_LIMIT_REACHED";
  ErrorCode2["CLIENT_ERROR_CODE_SPEND_CAP_REACHED"] = "CLIENT_ERROR_CODE_SPEND_CAP_REACHED";
  ErrorCode2["CLIENT_ERROR_CODE_VALIDATION_ERROR"] = "CLIENT_ERROR_CODE_VALIDATION_ERROR";
  ErrorCode2["CLIENT_ERROR_CODE_AUTHENTICATION_ERROR"] = "CLIENT_ERROR_CODE_AUTHENTICATION_ERROR";
  ErrorCode2["CLIENT_ERROR_CODE_SERVER_ERROR"] = "CLIENT_ERROR_CODE_SERVER_ERROR";
  ErrorCode2["CLIENT_ERROR_CODE_MAX_CONCURRENT_SESSIONS_REACHED"] = "CLIENT_ERROR_CODE_MAX_CONCURRENT_SESSIONS_REACHED";
  ErrorCode2["CLIENT_ERROR_CODE_SERVICE_BUSY"] = "CLIENT_ERROR_CODE_SERVICE_BUSY";
  ErrorCode2["CLIENT_ERROR_CODE_NO_PLAN_FOUND"] = "CLIENT_ERROR_CODE_NO_PLAN_FOUND";
  ErrorCode2["CLIENT_ERROR_CODE_UNKNOWN_ERROR"] = "CLIENT_ERROR_CODE_UNKNOWN_ERROR";
  ErrorCode2["CLIENT_ERROR_CODE_CONFIGURATION_ERROR"] = "CLIENT_ERROR_CODE_CONFIGURATION_ERROR";
})(ErrorCode || (ErrorCode = {}));
var ClientError = class _ClientError extends Error {
  constructor(message, code, statusCode = 500, details) {
    super(message);
    this.name = "ClientError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, _ClientError.prototype);
    sendClientMetric(ClientMetricMeasurement.CLIENT_METRIC_MEASUREMENT_ERROR, code, {
      details,
      statusCode
    });
  }
};

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/lib/correlationId.js
function generateCorrelationId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/lib/ConnectionMilestones.js
var DEFAULT_CONNECTION_MILESTONE_SAMPLE_RATIO = 0;
var DEFAULT_SLOW_CONNECTION_THRESHOLD_MS = 5e3;
var ClientConnectionMilestoneRecorder = class {
  constructor(options = {}) {
    var _a, _b, _c, _d;
    this.milestones = [];
    this.context = {
      sessionId: null,
      organizationId: null,
      attemptCorrelationId: null
    };
    this.published = false;
    this.sessionSuccessful = false;
    this.now = (_a = options.now) !== null && _a !== void 0 ? _a : getMonotonicNow;
    this.attemptStartedAtMs = this.now();
    this.sampleRatio = clampRatio((_b = options.connectionMilestoneSampleRatio) !== null && _b !== void 0 ? _b : DEFAULT_CONNECTION_MILESTONE_SAMPLE_RATIO);
    this.slowConnectionThresholdMs = Math.max(0, finiteNumberOrDefault(options.slowConnectionThresholdMs, DEFAULT_SLOW_CONNECTION_THRESHOLD_MS));
    this.sampled = ((_c = options.random) !== null && _c !== void 0 ? _c : Math.random)() < this.sampleRatio;
    this.updateContext((_d = options.context) !== null && _d !== void 0 ? _d : {});
    this.record("client_session_attempt");
  }
  updateContext(context) {
    this.context = Object.assign(Object.assign({}, this.context), context);
  }
  record(name, tags) {
    if (this.published) {
      return;
    }
    const sanitizedTags = sanitizeMilestoneTags(tags);
    const milestone = {
      name,
      elapsedMs: this.elapsedMs(),
      clientTimestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (Object.keys(sanitizedTags).length > 0) {
      milestone.tags = sanitizedTags;
    }
    this.milestones.push(milestone);
  }
  recordSessionSuccess(tags) {
    if (this.sessionSuccessful) {
      return;
    }
    this.sessionSuccessful = true;
    this.record("client_session_success", tags);
    this.publishIfNeeded();
    this.finalize();
  }
  /**
   * Make the recorder inert and release its buffer. `published` gates
   * record()/publish()/publishFailure(), so flipping it here stops all further
   * recording and publishing. publish() (if it ran) already built the metric
   * payloads synchronously, so clearing the buffer afterwards is safe.
   */
  finalize() {
    this.published = true;
    this.milestones.length = 0;
  }
  publishFailure(tags) {
    if (this.sessionSuccessful || this.published) {
      return;
    }
    this.record("connection_attempt_failed", tags);
    this.publish("failed", tags);
  }
  publishIfNeeded() {
    if (this.published) {
      return;
    }
    if (this.elapsedMs() >= this.slowConnectionThresholdMs) {
      this.publish("slow");
      return;
    }
    if (this.sampled) {
      this.publish("sampled");
    }
  }
  publish(reason, tags) {
    if (this.published || this.milestones.length === 0) {
      return;
    }
    this.published = true;
    const summaryTags = sanitizeMetricTags(Object.assign(Object.assign(Object.assign({}, tags), this.context), { publishReason: reason, attemptDurationMs: this.elapsedMs(), milestoneCount: this.milestones.length, connectionMilestoneSampleRatio: this.sampleRatio, slowConnectionThresholdMs: this.slowConnectionThresholdMs, wasSampled: this.sampled ? 1 : 0 }));
    const metrics = [
      {
        name: ClientMetricMeasurement.CLIENT_METRIC_MEASUREMENT_CONNECTION_MILESTONES,
        value: "1",
        tags: summaryTags
      },
      ...this.milestones.map((milestone, index) => ({
        name: ClientMetricMeasurement.CLIENT_METRIC_MEASUREMENT_CONNECTION_MILESTONE,
        value: milestone.elapsedMs,
        clientTimestamp: milestone.clientTimestamp,
        tags: sanitizeMetricTags(Object.assign(Object.assign(Object.assign({}, this.context), { publishReason: reason, milestone: milestone.name, sequence: index }), milestone.tags))
      }))
    ];
    void sendClientMetrics(metrics);
  }
  elapsedMs() {
    return Math.max(0, Math.round(this.now() - this.attemptStartedAtMs));
  }
};
var getMonotonicNow = () => {
  if (typeof performance !== "undefined") {
    return performance.now();
  }
  return Date.now();
};
var clampRatio = (value) => {
  const finiteValue = finiteNumberOrDefault(value, DEFAULT_CONNECTION_MILESTONE_SAMPLE_RATIO);
  return Math.min(1, Math.max(0, finiteValue));
};
var finiteNumberOrDefault = (value, fallback) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};
var sanitizeMilestoneTags = (tags) => {
  if (!tags) {
    return {};
  }
  const sanitizedTags = {};
  Object.entries(tags).forEach(([key, value]) => {
    if (value === void 0 || value === null) {
      return;
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      return;
    }
    sanitizedTags[key] = value;
  });
  return sanitizedTags;
};
var sanitizeMetricTags = (tags) => {
  const metricTags = {};
  Object.entries(sanitizeMilestoneTags(tags)).forEach(([key, value]) => {
    metricTags[key] = typeof value === "boolean" ? String(value) : value;
  });
  return metricTags;
};

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/lib/validateApiGatewayConfig.js
function validateApiGatewayConfig(apiGatewayConfig2) {
  if (!apiGatewayConfig2 || !apiGatewayConfig2.enabled) {
    return void 0;
  }
  if (!apiGatewayConfig2.baseUrl) {
    return "API Gateway baseUrl is required when enabled";
  }
  try {
    const url = new URL(apiGatewayConfig2.baseUrl);
    if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) {
      return `Invalid API Gateway baseUrl protocol: ${url.protocol}. Must be http:, https:, ws:, or wss:`;
    }
  } catch (error) {
    return `Invalid API Gateway baseUrl: ${apiGatewayConfig2.baseUrl}`;
  }
  if (apiGatewayConfig2.wsPath) {
    if (!apiGatewayConfig2.wsPath.startsWith("/")) {
      return "API Gateway wsPath must start with /";
    }
  }
  return void 0;
}

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/types/signalling/SignalMessage.js
var SignalMessageAction;
(function(SignalMessageAction2) {
  SignalMessageAction2["OFFER"] = "offer";
  SignalMessageAction2["ANSWER"] = "answer";
  SignalMessageAction2["ICE_CANDIDATE"] = "icecandidate";
  SignalMessageAction2["END_SESSION"] = "endsession";
  SignalMessageAction2["HEARTBEAT"] = "heartbeat";
  SignalMessageAction2["WARNING"] = "warning";
  SignalMessageAction2["TALK_STREAM_INTERRUPTED"] = "talkinputstreaminterrupted";
  SignalMessageAction2["TALK_STREAM_INPUT"] = "talkstream";
  SignalMessageAction2["SESSION_READY"] = "sessionready";
  SignalMessageAction2["AGENT_AUDIO_INPUT"] = "agentaudioinput";
  SignalMessageAction2["AGENT_AUDIO_INPUT_END"] = "agentaudioinputend";
})(SignalMessageAction || (SignalMessageAction = {}));

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/types/streaming/DataChannelMessage.js
var DataChannelMessage;
(function(DataChannelMessage2) {
  DataChannelMessage2["SPEECH_TEXT"] = "speechText";
  DataChannelMessage2["CLIENT_TOOL_EVENT"] = "clientToolEvent";
  DataChannelMessage2["TOOL_CALL_STARTED_EVENT"] = "toolCallStarted";
  DataChannelMessage2["TOOL_CALL_COMPLETED_EVENT"] = "toolCallCompleted";
  DataChannelMessage2["TOOL_CALL_FAILED_EVENT"] = "toolCallFailed";
  DataChannelMessage2["REASONING_TEXT"] = "reasoningText";
  DataChannelMessage2["USER_SPEECH_STARTED"] = "userSpeechStarted";
  DataChannelMessage2["USER_SPEECH_ENDED"] = "userSpeechEnded";
  DataChannelMessage2["DIRECTOR_NOTE_CUE_APPLIED"] = "directorNoteCueApplied";
  DataChannelMessage2["PERSONA_CONFIG_UPDATE_APPLIED"] = "personaConfigUpdateApplied";
})(DataChannelMessage || (DataChannelMessage = {}));

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/types/InputAudioState.js
var AudioPermissionState;
(function(AudioPermissionState2) {
  AudioPermissionState2["PENDING"] = "pending";
  AudioPermissionState2["GRANTED"] = "granted";
  AudioPermissionState2["DENIED"] = "denied";
  AudioPermissionState2["NOT_REQUESTED"] = "not_requested";
})(AudioPermissionState || (AudioPermissionState = {}));

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/types/messageHistory/MessageRole.js
var MessageRole;
(function(MessageRole2) {
  MessageRole2["USER"] = "user";
  MessageRole2["PERSONA"] = "persona";
})(MessageRole || (MessageRole = {}));

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/types/events/public/AnamEvent.js
var AnamEvent;
(function(AnamEvent2) {
  AnamEvent2["MESSAGE_HISTORY_UPDATED"] = "MESSAGE_HISTORY_UPDATED";
  AnamEvent2["MESSAGE_STREAM_EVENT_RECEIVED"] = "MESSAGE_STREAM_EVENT_RECEIVED";
  AnamEvent2["CONNECTION_ESTABLISHED"] = "CONNECTION_ESTABLISHED";
  AnamEvent2["DATA_CHANNEL_OPEN"] = "DATA_CHANNEL_OPEN";
  AnamEvent2["CONNECTION_CLOSED"] = "CONNECTION_CLOSED";
  AnamEvent2["INPUT_AUDIO_STREAM_STARTED"] = "INPUT_AUDIO_STREAM_STARTED";
  AnamEvent2["VIDEO_STREAM_STARTED"] = "VIDEO_STREAM_STARTED";
  AnamEvent2["VIDEO_PLAY_STARTED"] = "VIDEO_PLAY_STARTED";
  AnamEvent2["AUDIO_STREAM_STARTED"] = "AUDIO_STREAM_STARTED";
  AnamEvent2["TALK_STREAM_INTERRUPTED"] = "TALK_STREAM_INTERRUPTED";
  AnamEvent2["SESSION_READY"] = "SESSION_READY";
  AnamEvent2["SERVER_WARNING"] = "SERVER_WARNING";
  AnamEvent2["MIC_PERMISSION_PENDING"] = "MIC_PERMISSION_PENDING";
  AnamEvent2["MIC_PERMISSION_GRANTED"] = "MIC_PERMISSION_GRANTED";
  AnamEvent2["MIC_PERMISSION_DENIED"] = "MIC_PERMISSION_DENIED";
  AnamEvent2["INPUT_AUDIO_DEVICE_CHANGED"] = "INPUT_AUDIO_DEVICE_CHANGED";
  AnamEvent2["CLIENT_TOOL_EVENT_RECEIVED"] = "CLIENT_TOOL_EVENT_RECEIVED";
  AnamEvent2["TOOL_CALL_STARTED"] = "TOOL_CALL_STARTED";
  AnamEvent2["TOOL_CALL_COMPLETED"] = "TOOL_CALL_COMPLETED";
  AnamEvent2["TOOL_CALL_FAILED"] = "TOOL_CALL_FAILED";
  AnamEvent2["REASONING_HISTORY_UPDATED"] = "REASONING_HISTORY_UPDATED";
  AnamEvent2["REASONING_STREAM_EVENT_RECEIVED"] = "REASONING_STREAM_EVENT_RECEIVED";
  AnamEvent2["USER_SPEECH_STARTED"] = "USER_SPEECH_STARTED";
  AnamEvent2["USER_SPEECH_ENDED"] = "USER_SPEECH_ENDED";
  AnamEvent2["DIRECTOR_NOTE_CUE_APPLIED"] = "DIRECTOR_NOTE_CUE_APPLIED";
  AnamEvent2["PERSONA_CONFIG_UPDATE_APPLIED"] = "PERSONA_CONFIG_UPDATE_APPLIED";
})(AnamEvent || (AnamEvent = {}));

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/types/events/internal/InternalEvent.js
var InternalEvent;
(function(InternalEvent2) {
  InternalEvent2["WEB_SOCKET_OPEN"] = "WEB_SOCKET_OPEN";
  InternalEvent2["SIGNAL_MESSAGE_RECEIVED"] = "SIGNAL_MESSAGE_RECEIVED";
  InternalEvent2["WEBRTC_CHAT_MESSAGE_RECEIVED"] = "WEBRTC_CHAT_MESSAGE_RECEIVED";
  InternalEvent2["WEBRTC_CLIENT_TOOL_EVENT_RECEIVED"] = "WEBRTC_CLIENT_TOOL_EVENT_RECEIVED";
  InternalEvent2["WEBRTC_TOOL_CALL_STARTED_EVENT_RECEIVED"] = "WEBRTC_TOOL_CALL_STARTED_EVENT_RECEIVED";
  InternalEvent2["WEBRTC_TOOL_CALL_COMPLETED_EVENT_RECEIVED"] = "WEBRTC_TOOL_CALL_COMPLETED_EVENT_RECEIVED";
  InternalEvent2["WEBRTC_TOOL_CALL_FAILED_EVENT_RECEIVED"] = "WEBRTC_TOOL_CALL_FAILED_EVENT_RECEIVED";
  InternalEvent2["WEBRTC_REASONING_TEXT_MESSAGE_RECEIVED"] = "WEBRTC_REASONING_TEXT_MESSAGE_RECEIVED";
  InternalEvent2["TOOL_CALL_RESULT_READY"] = "TOOL_CALL_RESULT_READY";
})(InternalEvent || (InternalEvent = {}));

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/types/events/public/ConnectionClosedCodes.js
var ConnectionClosedCode;
(function(ConnectionClosedCode2) {
  ConnectionClosedCode2["NORMAL"] = "CONNECTION_CLOSED_CODE_NORMAL";
  ConnectionClosedCode2["MICROPHONE_PERMISSION_DENIED"] = "CONNECTION_CLOSED_CODE_MICROPHONE_PERMISSION_DENIED";
  ConnectionClosedCode2["SIGNALLING_CLIENT_CONNECTION_FAILURE"] = "CONNECTION_CLOSED_CODE_SIGNALLING_CLIENT_CONNECTION_FAILURE";
  ConnectionClosedCode2["WEBRTC_FAILURE"] = "CONNECTION_CLOSED_CODE_WEBRTC_FAILURE";
  ConnectionClosedCode2["SERVER_CLOSED_CONNECTION"] = "CONNECTION_CLOSED_CODE_SERVER_CLOSED_CONNECTION";
})(ConnectionClosedCode || (ConnectionClosedCode = {}));

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/types/AgentAudioInputStream.js
var AgentAudioInputStream = class {
  constructor(config, signallingClient) {
    this.sequenceNumber = 0;
    this.config = config;
    this.signallingClient = signallingClient;
  }
  /**
   * Send PCM audio chunk to server.
   * @param audioData - Raw PCM audio bytes (ArrayBuffer/Uint8Array) or base64-encoded string
   */
  sendAudioChunk(audioData) {
    const base64 = typeof audioData === "string" ? audioData : this.arrayBufferToBase64(audioData);
    const payload = {
      audioData: base64,
      encoding: this.config.encoding,
      sampleRate: this.config.sampleRate,
      channels: this.config.channels,
      sequenceNumber: this.sequenceNumber++
    };
    this.signallingClient.sendAgentAudioInput(payload);
  }
  /**
   * Signal end of the current audio sequence/turn.
   * Sends AGENT_AUDIO_INPUT_END signal message and resets sequence number.
   */
  endSequence() {
    this.signallingClient.sendAgentAudioInputEnd();
    this.sequenceNumber = 0;
  }
  /**
   * Get the current sequence number (number of chunks sent in current sequence).
   */
  getSequenceNumber() {
    return this.sequenceNumber;
  }
  /**
   * Get the audio format configuration for this stream.
   */
  getConfig() {
    return this.config;
  }
  arrayBufferToBase64(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return btoa(binary);
  }
};

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/types/directorNotes/DirectorNoteCue.js
var DIRECTOR_NOTE_CUE_TAGS = Object.freeze([
  "happy",
  "warm",
  "playful",
  "laughter",
  "curious",
  "supportive",
  "concerned",
  "sad",
  "surprised",
  "angry",
  "distressed"
]);

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/modules/SignallingClient.js
var __awaiter2 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var DEFAULT_HEARTBEAT_INTERVAL_SECONDS = 5;
var DEFAULT_WS_RECONNECTION_ATTEMPTS = 5;
var WEBSOCKET_STABLE_RECONNECTION_RESET_MS = 5e3;
var ICE_RESTART_WS_RECONNECTION_ATTEMPTS = 24;
var API_GATEWAY_BACKEND_CLOSE_REASON_PREFIX = "Backend WebSocket";
var SignallingClient = class {
  constructor(sessionId, options, publicEventEmitter, internalEventEmitter, apiGatewayConfig2, connectionMilestones) {
    var _a, _b, _c, _d, _e;
    this.stopSignal = false;
    this.sendingBuffer = [];
    this.wsConnectionAttempts = 0;
    this.socket = null;
    this.permanentlyClosed = false;
    this.iceRestartReconnectInProgress = false;
    this.heartBeatIntervalRef = null;
    this.reconnectTimer = null;
    this.stableConnectionTimer = null;
    this.publicEventEmitter = publicEventEmitter;
    this.internalEventEmitter = internalEventEmitter;
    this.apiGatewayConfig = apiGatewayConfig2;
    this.connectionMilestones = connectionMilestones;
    if (!sessionId) {
      throw new Error("Signalling Client: sessionId is required");
    }
    this.sessionId = sessionId;
    const { heartbeatIntervalSeconds, maxWsReconnectionAttempts, url } = options;
    this.heartbeatIntervalSeconds = heartbeatIntervalSeconds || DEFAULT_HEARTBEAT_INTERVAL_SECONDS;
    this.maxWsReconnectionAttempts = maxWsReconnectionAttempts || DEFAULT_WS_RECONNECTION_ATTEMPTS;
    if (!url.baseUrl) {
      throw new Error("Signalling Client: baseUrl is required");
    }
    if (((_a = this.apiGatewayConfig) === null || _a === void 0 ? void 0 : _a.enabled) && ((_b = this.apiGatewayConfig) === null || _b === void 0 ? void 0 : _b.baseUrl)) {
      const gatewayUrl = new URL(this.apiGatewayConfig.baseUrl);
      const wsPath = (_c = this.apiGatewayConfig.wsPath) !== null && _c !== void 0 ? _c : "/ws";
      gatewayUrl.protocol = gatewayUrl.protocol.replace("http", "ws");
      gatewayUrl.pathname = wsPath;
      this.url = gatewayUrl;
      const httpProtocol = url.protocol || "https";
      const targetProtocol = httpProtocol === "http" ? "ws" : "wss";
      const httpUrl = `${httpProtocol}://${url.baseUrl}`;
      const targetWsPath = (_d = url.signallingPath) !== null && _d !== void 0 ? _d : "/ws";
      const targetUrl = new URL(httpUrl);
      targetUrl.protocol = targetProtocol === "ws" ? "ws:" : "wss:";
      if (url.port) {
        targetUrl.port = url.port;
      }
      targetUrl.pathname = targetWsPath;
      targetUrl.searchParams.append("session_id", sessionId);
      this.url.searchParams.append("target_url", targetUrl.href);
    } else {
      const httpProtocol = url.protocol || "https";
      const initUrl = `${httpProtocol}://${url.baseUrl}`;
      this.url = new URL(initUrl);
      this.url.protocol = url.protocol === "http" ? "ws:" : "wss:";
      if (url.port) {
        this.url.port = url.port;
      }
      this.url.pathname = (_e = url.signallingPath) !== null && _e !== void 0 ? _e : "/ws";
      this.url.searchParams.append("session_id", sessionId);
    }
  }
  stop() {
    this.stopSignal = true;
    this.closeSocket();
  }
  connect() {
    var _a;
    this.clearReconnectTimer();
    this.clearStableConnectionTimer();
    (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("websocket_connecting", {
      attemptNumber: this.wsConnectionAttempts + 1
    });
    const socket = new WebSocket(this.url.href);
    this.socket = socket;
    socket.onopen = () => {
      void this.onOpen(socket);
    };
    socket.onclose = (event) => {
      void this.onClose(socket, event);
    };
    socket.onerror = (event) => {
      this.onError(socket, event);
    };
    return socket;
  }
  /**
   * Force a fresh signalling socket for an ICE restart. A network switch can
   * leave the existing socket half-open (readyState stays OPEN with no 'close'
   * event), so a restart offer sent on it is silently dropped. Detach the stale
   * socket's handlers so its eventual close does not drive the reconnect backoff,
   * drop it, and open a new connection. While the new network path is still dead,
   * use an ICE-restart-specific retry budget so signalling does not terminally
   * close before StreamingClient's websocket-open wait can time out and retry.
   */
  reconnectForIceRestart() {
    if (this.isPermanentlyClosed()) {
      return;
    }
    this.clearReconnectTimer();
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      try {
        this.socket.close();
      } catch (err) {
        console.warn("SignallingClient - reconnectForIceRestart: error closing stale socket", err);
      }
      this.socket = null;
    }
    this.clearHeartbeatInterval();
    this.wsConnectionAttempts = 0;
    this.iceRestartReconnectInProgress = true;
    this.connect();
  }
  /**
   * Ends the ICE-restart reconnect episode: subsequent closes use the default
   * retry budget again. Called by StreamingClient when the restart succeeds,
   * is cancelled, or exhausts its attempts.
   */
  endIceRestartReconnect() {
    this.iceRestartReconnectInProgress = false;
  }
  isConnected() {
    var _a;
    return ((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState) === WebSocket.OPEN;
  }
  isPermanentlyClosed() {
    return this.permanentlyClosed || this.stopSignal;
  }
  sendOffer(localDescription) {
    return __awaiter2(this, void 0, void 0, function* () {
      const offerMessagePayload = {
        connectionDescription: localDescription,
        userUid: this.sessionId
        // TODO: this should be renamed to session ID on the server
      };
      const offerMessage = {
        actionType: SignalMessageAction.OFFER,
        sessionId: this.sessionId,
        payload: offerMessagePayload
      };
      this.sendSignalMessage(offerMessage);
    });
  }
  sendIceCandidate(candidate) {
    return __awaiter2(this, void 0, void 0, function* () {
      const iceCandidateMessage = {
        actionType: SignalMessageAction.ICE_CANDIDATE,
        sessionId: this.sessionId,
        payload: candidate.toJSON()
      };
      this.sendSignalMessage(iceCandidateMessage);
    });
  }
  sendSignalMessage(message) {
    var _a;
    if (((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState) === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error("SignallingClient - sendSignalMessage: error sending message", error);
      }
    } else {
      this.sendingBuffer.push(message);
    }
  }
  sendTalkMessage(payload) {
    return __awaiter2(this, void 0, void 0, function* () {
      const chatMessage = {
        actionType: SignalMessageAction.TALK_STREAM_INPUT,
        sessionId: this.sessionId,
        payload
      };
      this.sendSignalMessage(chatMessage);
    });
  }
  sendAgentAudioInput(payload) {
    const message = {
      actionType: SignalMessageAction.AGENT_AUDIO_INPUT,
      sessionId: this.sessionId,
      payload
    };
    this.sendSignalMessage(message);
  }
  sendAgentAudioInputEnd() {
    const message = {
      actionType: SignalMessageAction.AGENT_AUDIO_INPUT_END,
      sessionId: this.sessionId,
      payload: {}
    };
    this.sendSignalMessage(message);
  }
  closeSocket() {
    this.clearReconnectTimer();
    this.clearStableConnectionTimer();
    this.iceRestartReconnectInProgress = false;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.clearHeartbeatInterval();
  }
  onOpen(socket) {
    return __awaiter2(this, void 0, void 0, function* () {
      var _a;
      if (this.socket !== socket) {
        return;
      }
      try {
        (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("websocket_open", {
          attemptNumber: this.wsConnectionAttempts + 1
        });
        this.scheduleStableConnectionReset(socket);
        this.flushSendingBuffer();
        socket.onmessage = this.onMessage.bind(this);
        this.startSendingHeartBeats();
        this.internalEventEmitter.emit(InternalEvent.WEB_SOCKET_OPEN);
      } catch (e) {
        console.error("SignallingClient - onOpen: error in onOpen", e);
        this.publicEventEmitter.emit(AnamEvent.CONNECTION_CLOSED, ConnectionClosedCode.SIGNALLING_CLIENT_CONNECTION_FAILURE);
        this.permanentlyClosed = true;
      }
    });
  }
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  clearStableConnectionTimer() {
    if (this.stableConnectionTimer) {
      clearTimeout(this.stableConnectionTimer);
      this.stableConnectionTimer = null;
    }
  }
  clearHeartbeatInterval() {
    if (this.heartBeatIntervalRef) {
      clearInterval(this.heartBeatIntervalRef);
      this.heartBeatIntervalRef = null;
    }
  }
  scheduleStableConnectionReset(socket) {
    this.clearStableConnectionTimer();
    this.stableConnectionTimer = setTimeout(() => {
      this.stableConnectionTimer = null;
      if (this.socket === socket && socket.readyState === WebSocket.OPEN) {
        this.wsConnectionAttempts = 0;
      }
    }, WEBSOCKET_STABLE_RECONNECTION_RESET_MS);
  }
  onClose(socket, event) {
    return __awaiter2(this, void 0, void 0, function* () {
      var _a, _b, _c;
      if (this.socket !== socket) {
        return;
      }
      this.clearStableConnectionTimer();
      this.clearHeartbeatInterval();
      (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("websocket_closed", {
        attemptNumber: this.wsConnectionAttempts + 1,
        closeCode: event === null || event === void 0 ? void 0 : event.code,
        closeReason: event === null || event === void 0 ? void 0 : event.reason,
        wasClean: event === null || event === void 0 ? void 0 : event.wasClean
      });
      this.wsConnectionAttempts += 1;
      if (this.stopSignal) {
        return;
      }
      const maxReconnectionAttempts = this.getMaxReconnectionAttempts(event);
      if (this.shouldRetryCloseEvent(event) && this.wsConnectionAttempts <= maxReconnectionAttempts) {
        const retryDelayMs = 100 * this.wsConnectionAttempts;
        (_b = this.connectionMilestones) === null || _b === void 0 ? void 0 : _b.record("websocket_retry_scheduled", {
          attemptNumber: this.wsConnectionAttempts + 1,
          delayMs: retryDelayMs
        });
        this.socket = null;
        this.clearReconnectTimer();
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.connect();
        }, retryDelayMs);
      } else {
        this.clearReconnectTimer();
        this.clearHeartbeatInterval();
        (_c = this.connectionMilestones) === null || _c === void 0 ? void 0 : _c.publishFailure({
          failureStage: "websocket",
          closeCode: event === null || event === void 0 ? void 0 : event.code,
          closeReason: event === null || event === void 0 ? void 0 : event.reason
        });
        this.publicEventEmitter.emit(AnamEvent.CONNECTION_CLOSED, ConnectionClosedCode.SIGNALLING_CLIENT_CONNECTION_FAILURE);
        this.iceRestartReconnectInProgress = false;
        this.permanentlyClosed = true;
      }
    });
  }
  getMaxReconnectionAttempts(event) {
    if (!this.iceRestartReconnectInProgress || this.isApiGatewayBackendClose(event)) {
      return this.maxWsReconnectionAttempts;
    }
    return Math.max(this.maxWsReconnectionAttempts, ICE_RESTART_WS_RECONNECTION_ATTEMPTS);
  }
  shouldRetryCloseEvent(event) {
    return !(this.isApiGatewayBackendClose(event) && (event === null || event === void 0 ? void 0 : event.code) === 1008);
  }
  isApiGatewayBackendClose(event) {
    var _a;
    return ((_a = this.apiGatewayConfig) === null || _a === void 0 ? void 0 : _a.enabled) === true && typeof (event === null || event === void 0 ? void 0 : event.reason) === "string" && event.reason.startsWith(API_GATEWAY_BACKEND_CLOSE_REASON_PREFIX);
  }
  onError(socket, event) {
    var _a;
    if (this.stopSignal || this.socket !== socket) {
      return;
    }
    (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("websocket_error", {
      eventType: event.type
    });
    console.error("SignallingClient - onError: ", event);
  }
  flushSendingBuffer() {
    const newBuffer = [];
    if (this.sendingBuffer.length > 0) {
      this.sendingBuffer.forEach((message) => {
        var _a;
        if (((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState) === WebSocket.OPEN) {
          this.socket.send(JSON.stringify(message));
        } else {
          newBuffer.push(message);
        }
      });
    }
    this.sendingBuffer = newBuffer;
  }
  onMessage(event) {
    return __awaiter2(this, void 0, void 0, function* () {
      const message = JSON.parse(event.data);
      this.internalEventEmitter.emit(InternalEvent.SIGNAL_MESSAGE_RECEIVED, message);
    });
  }
  startSendingHeartBeats() {
    if (!this.socket) {
      throw new Error("SignallingClient - startSendingHeartBeats: socket is null");
    }
    if (this.heartBeatIntervalRef) {
      console.warn("SignallingClient - startSendingHeartBeats: heartbeat interval already set");
    }
    const heartbeatInterval = this.heartbeatIntervalSeconds * 1e3;
    const heartbeatMessage = {
      actionType: SignalMessageAction.HEARTBEAT,
      sessionId: this.sessionId,
      payload: ""
    };
    const heartbeatMessageJson = JSON.stringify(heartbeatMessage);
    this.heartBeatIntervalRef = setInterval(() => {
      var _a;
      if (this.stopSignal) {
        return;
      }
      if (((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState) === WebSocket.OPEN) {
        this.socket.send(heartbeatMessageJson);
      }
    }, heartbeatInterval);
  }
};

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/modules/CoreApiRestClient.js
var __awaiter3 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var CoreApiRestClient = class {
  constructor(sessionToken, apiKey, options) {
    if (!sessionToken && !apiKey) {
      throw new Error("Either sessionToken or apiKey must be provided");
    }
    this.sessionToken = sessionToken || null;
    this.apiKey = apiKey || null;
    this.baseUrl = (options === null || options === void 0 ? void 0 : options.baseUrl) || DEFAULT_API_BASE_URL;
    this.apiVersion = (options === null || options === void 0 ? void 0 : options.apiVersion) || DEFAULT_API_VERSION;
    this.apiGatewayConfig = (options === null || options === void 0 ? void 0 : options.apiGateway) || void 0;
    this.retryOptions = resolveRetryOptions(options === null || options === void 0 ? void 0 : options.retry);
    this.requestTimeoutMs = Math.max(0, asFiniteNumber(options === null || options === void 0 ? void 0 : options.requestTimeoutMs, DEFAULT_START_SESSION_REQUEST_TIMEOUT_MS));
  }
  /**
   * Builds URL and headers for a request, applying API Gateway configuration if enabled
   */
  buildGatewayUrlAndHeaders(targetPath, baseHeaders) {
    var _a, _b;
    if (((_a = this.apiGatewayConfig) === null || _a === void 0 ? void 0 : _a.enabled) && ((_b = this.apiGatewayConfig) === null || _b === void 0 ? void 0 : _b.baseUrl)) {
      const url = `${this.apiGatewayConfig.baseUrl}${targetPath}`;
      const targetUrl = new URL(`${this.baseUrl}${targetPath}`);
      const headers = Object.assign(Object.assign({}, baseHeaders), { "X-Anam-Target-Url": targetUrl.href });
      return { url, headers };
    } else {
      return {
        url: `${this.baseUrl}${targetPath}`,
        headers: baseHeaders
      };
    }
  }
  startSession(personaConfig, sessionOptions) {
    return __awaiter3(this, void 0, void 0, function* () {
      if (!this.sessionToken) {
        if (!personaConfig) {
          throw new ClientError("Persona configuration must be provided when using apiKey", ErrorCode.CLIENT_ERROR_CODE_VALIDATION_ERROR, 400);
        }
        this.sessionToken = yield this.unsafe_getSessionToken(personaConfig);
      }
      if (personaConfig && "brainType" in personaConfig) {
        console.warn("Warning: brainType is deprecated and will be removed in a future version. Please use llmId instead.");
      }
      const { maxAttempts } = this.retryOptions;
      let lastError;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return yield this.attemptStartSession(personaConfig, sessionOptions);
        } catch (error) {
          lastError = error;
          if (attempt >= maxAttempts || !isRetryableError(error)) {
            throw error;
          }
          yield sleep(this.computeBackoffDelay(attempt));
        }
      }
      throw lastError;
    });
  }
  attemptStartSession(personaConfig, sessionOptions) {
    return __awaiter3(this, void 0, void 0, function* () {
      const controller = this.requestTimeoutMs > 0 ? new AbortController() : void 0;
      const timeoutHandle = controller !== void 0 ? setTimeout(() => controller.abort(), this.requestTimeoutMs) : void 0;
      try {
        const targetPath = `${this.apiVersion}/engine/session`;
        const { url, headers } = this.buildGatewayUrlAndHeaders(targetPath, {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.sessionToken}`
        });
        const response = yield fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            personaConfig,
            sessionOptions,
            clientMetadata: CLIENT_METADATA
          }),
          signal: controller === null || controller === void 0 ? void 0 : controller.signal
        });
        const data = yield response.json();
        const errorCause = data.error;
        switch (response.status) {
          case 200:
          case 201:
            return data;
          case 400:
            throw new ClientError("Invalid request to start session", ErrorCode.CLIENT_ERROR_CODE_VALIDATION_ERROR, 400, { cause: data.message });
          case 401:
            throw new ClientError("Authentication failed when starting session", ErrorCode.CLIENT_ERROR_CODE_AUTHENTICATION_ERROR, 401, { cause: data.message });
          case 402:
            throw new ClientError("Please sign up for a plan to start a session", ErrorCode.CLIENT_ERROR_CODE_NO_PLAN_FOUND, 402, { cause: data.message });
          case 403:
            throw new ClientError("Authentication failed when starting session", ErrorCode.CLIENT_ERROR_CODE_AUTHENTICATION_ERROR, 403, { cause: data.message });
          case 429:
            if (errorCause === "Concurrent session limit reached") {
              throw new ClientError("Concurrency limit reached, please upgrade your plan", ErrorCode.CLIENT_ERROR_CODE_MAX_CONCURRENT_SESSIONS_REACHED, 429, { cause: data.message });
            } else if (errorCause === "Spend cap reached") {
              throw new ClientError("Spend cap reached, please upgrade your plan", ErrorCode.CLIENT_ERROR_CODE_SPEND_CAP_REACHED, 429, { cause: data.message });
            } else {
              throw new ClientError("Usage limit reached, please upgrade your plan", ErrorCode.CLIENT_ERROR_CODE_USAGE_LIMIT_REACHED, 429, { cause: data.message });
            }
          case 503:
            throw new ClientError("There are no available personas, please try again later", ErrorCode.CLIENT_ERROR_CODE_SERVICE_BUSY, 503, { cause: data.message });
          default:
            throw new ClientError("Unknown error when starting session", ErrorCode.CLIENT_ERROR_CODE_SERVER_ERROR, response.status, { cause: data.message });
        }
      } catch (error) {
        if (error instanceof ClientError) {
          throw error;
        }
        throw new ClientError("Failed to start session", ErrorCode.CLIENT_ERROR_CODE_SERVER_ERROR, 500, { cause: error instanceof Error ? error.message : String(error) });
      } finally {
        if (timeoutHandle !== void 0) {
          clearTimeout(timeoutHandle);
        }
      }
    });
  }
  computeBackoffDelay(attempt) {
    const { initialBackoffMs, maxBackoffMs } = this.retryOptions;
    const exponential = Math.min(maxBackoffMs, initialBackoffMs * Math.pow(2, attempt - 1));
    return Math.floor(exponential / 2 + Math.random() * (exponential / 2));
  }
  unsafe_getSessionToken(personaConfig) {
    return __awaiter3(this, void 0, void 0, function* () {
      console.warn("Using an insecure method. This method should not be used in production.");
      if (!this.apiKey) {
        throw new Error("No apiKey provided");
      }
      if (personaConfig && "brainType" in personaConfig) {
        console.warn("Warning: brainType is deprecated and will be removed in a future version. Please use llmId instead.");
      }
      const body = {
        clientLabel: "js-sdk-api-key",
        personaConfig
      };
      try {
        const targetPath = `${this.apiVersion}/auth/session-token`;
        const { url, headers } = this.buildGatewayUrlAndHeaders(targetPath, {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        });
        const response = yield fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body)
        });
        let data = {};
        try {
          const responseBody = yield response.json();
          if (responseBody && typeof responseBody === "object") {
            data = responseBody;
          }
        } catch (_a) {
        }
        if (!response.ok) {
          const isAuthenticationError = response.status === 401 || response.status === 403;
          const responseMessage = typeof data.message === "string" ? data.message : typeof data.error === "string" ? data.error : `Request failed with HTTP status ${response.status}`;
          const clientError = new ClientError("Failed to get session token", isAuthenticationError ? ErrorCode.CLIENT_ERROR_CODE_AUTHENTICATION_ERROR : response.status >= 400 && response.status < 500 ? ErrorCode.CLIENT_ERROR_CODE_VALIDATION_ERROR : ErrorCode.CLIENT_ERROR_CODE_SERVER_ERROR, response.status, { cause: responseMessage });
          clientError.details = { cause: responseMessage, responseBody: data };
          throw clientError;
        }
        if (typeof data.sessionToken !== "string" || !data.sessionToken) {
          throw new ClientError("Failed to get session token", ErrorCode.CLIENT_ERROR_CODE_SERVER_ERROR, 500, { cause: "Response did not include a session token" });
        }
        return data.sessionToken;
      } catch (error) {
        if (error instanceof ClientError) {
          throw error;
        }
        throw new ClientError("Failed to get session token", ErrorCode.CLIENT_ERROR_CODE_SERVER_ERROR, 500, { cause: error instanceof Error ? error.message : String(error) });
      }
    });
  }
  getApiUrl() {
    return `${this.baseUrl}${this.apiVersion}`;
  }
};
function resolveRetryOptions(options) {
  const maxAttempts = Math.max(1, Math.floor(asFiniteNumber(options === null || options === void 0 ? void 0 : options.maxAttempts, DEFAULT_START_SESSION_MAX_ATTEMPTS)));
  const initialBackoffMs = Math.max(0, asFiniteNumber(options === null || options === void 0 ? void 0 : options.initialBackoffMs, DEFAULT_START_SESSION_INITIAL_BACKOFF_MS));
  const maxBackoffMs = Math.max(initialBackoffMs, asFiniteNumber(options === null || options === void 0 ? void 0 : options.maxBackoffMs, DEFAULT_START_SESSION_MAX_BACKOFF_MS));
  return { maxAttempts, initialBackoffMs, maxBackoffMs };
}
function asFiniteNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function isRetryableError(error) {
  if (error instanceof ClientError) {
    return error.statusCode >= 500 && error.statusCode < 600;
  }
  return true;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/modules/EngineApiRestClient.js
var __awaiter4 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var EngineApiRestClient = class {
  constructor(baseUrl, sessionId, apiGatewayConfig2) {
    this.baseUrl = baseUrl;
    this.sessionId = sessionId;
    this.apiGatewayConfig = apiGatewayConfig2;
  }
  sendTalkCommand(content) {
    return __awaiter4(this, void 0, void 0, function* () {
      var _a, _b;
      try {
        let url;
        const headers = {
          "Content-Type": "application/json"
        };
        const targetPath = `/talk`;
        const queryString = `?session_id=${this.sessionId}`;
        if (((_a = this.apiGatewayConfig) === null || _a === void 0 ? void 0 : _a.enabled) && ((_b = this.apiGatewayConfig) === null || _b === void 0 ? void 0 : _b.baseUrl)) {
          url = `${this.apiGatewayConfig.baseUrl}${targetPath}${queryString}`;
          const targetUrl = new URL(`${this.baseUrl}${targetPath}${queryString}`);
          headers["X-Anam-Target-Url"] = targetUrl.href;
        } else {
          url = `${this.baseUrl}${targetPath}${queryString}`;
        }
        const response = yield fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            content
          })
        });
        if (!response.ok) {
          throw new Error(`Failed to send talk command: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error(error);
        throw new Error("EngineApiRestClient - sendTalkCommand: Failed to send talk command");
      }
    });
  }
};

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/modules/InternalEventEmitter.js
var InternalEventEmitter = class {
  constructor() {
    this.listeners = {};
  }
  addListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = /* @__PURE__ */ new Set();
    }
    this.listeners[event].add(callback);
  }
  removeListener(event, callback) {
    if (!this.listeners[event])
      return;
    this.listeners[event].delete(callback);
  }
  emit(event, ...args) {
    if (!this.listeners[event])
      return;
    this.listeners[event].forEach((callback) => {
      callback(...args);
    });
  }
};

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/modules/MessageHistoryClient.js
var MessageHistoryClient = class {
  constructor(publicEventEmitter, internalEventEmitter) {
    this.messages = [];
    this.publishedUtterances = /* @__PURE__ */ new WeakSet();
    this.publicEventEmitter = publicEventEmitter;
    this.internalEventEmitter = internalEventEmitter;
    this.internalEventEmitter.addListener(InternalEvent.WEBRTC_CHAT_MESSAGE_RECEIVED, this.processWebRtcTextMessageEvent.bind(this));
  }
  webRtcTextMessageEventToMessageStreamEvent(event) {
    var _a;
    const correlationId = (_a = event.user_action_correlation_id) !== null && _a !== void 0 ? _a : event.correlationId;
    return Object.assign(Object.assign(Object.assign({ id: `${event.role}::${event.message_id}`, content: event.content, role: event.role, endOfSpeech: event.end_of_speech, interrupted: event.interrupted, contentIndex: event.content_index }, event.utterance_id ? { utteranceId: event.utterance_id } : {}), correlationId ? { correlationId } : {}), event.cue_tag ? { cueTag: event.cue_tag } : {});
  }
  processUserMessage(messageEvent) {
    const userMessage = {
      id: messageEvent.id,
      content: messageEvent.content,
      role: messageEvent.role
    };
    this.messages.push(userMessage);
  }
  // Appends a chunk to the message's per-utterance breakdown. A joining space is prepended
  // to each subsequent utterance so the turn-level content concatenates correctly; remove
  // only that separator while preserving all other leading whitespace.
  appendUtterance(utterances, messageEvent) {
    if (!messageEvent.utteranceId)
      return utterances;
    const wasPublished = !!utterances && this.publishedUtterances.has(utterances);
    const current = wasPublished ? [...utterances] : utterances !== null && utterances !== void 0 ? utterances : [];
    const last = current[current.length - 1];
    if (last && last.id === messageEvent.utteranceId) {
      const updatedLast = wasPublished ? Object.assign({}, last) : last;
      updatedLast.content += messageEvent.content;
      current[current.length - 1] = updatedLast;
      return current;
    }
    const content = current.length > 0 && messageEvent.content.startsWith(" ") ? messageEvent.content.slice(1) : messageEvent.content;
    current.push({ id: messageEvent.utteranceId, content });
    return current;
  }
  processPersonaMessage(messageEvent) {
    const personaMessage = {
      id: messageEvent.id,
      content: messageEvent.content,
      role: messageEvent.role,
      interrupted: messageEvent.interrupted
    };
    const existingMessageIndex = this.messages.findIndex((m) => m.id === personaMessage.id);
    if (existingMessageIndex !== -1) {
      const existingMessage = this.messages[existingMessageIndex];
      const utterances = this.appendUtterance(existingMessage.utterances, messageEvent);
      this.messages[existingMessageIndex] = Object.assign(Object.assign(Object.assign({}, existingMessage), { content: existingMessage.content + personaMessage.content, interrupted: existingMessage.interrupted || personaMessage.interrupted }), utterances ? { utterances } : {});
    } else {
      const utterances = this.appendUtterance(void 0, messageEvent);
      this.messages.push(Object.assign(Object.assign({}, personaMessage), utterances ? { utterances } : {}));
    }
  }
  processWebRtcTextMessageEvent(event) {
    const messageStreamEvent = this.webRtcTextMessageEventToMessageStreamEvent(event);
    this.publicEventEmitter.emit(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, messageStreamEvent);
    switch (messageStreamEvent.role) {
      case MessageRole.USER:
        this.processUserMessage(messageStreamEvent);
        break;
      case MessageRole.PERSONA:
        this.processPersonaMessage(messageStreamEvent);
        break;
    }
    if (messageStreamEvent.endOfSpeech) {
      this.messages.forEach((message) => {
        if (message.utterances) {
          this.publishedUtterances.add(message.utterances);
        }
      });
      this.publicEventEmitter.emit(AnamEvent.MESSAGE_HISTORY_UPDATED, this.messages);
    }
  }
};

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/modules/PublicEventEmitter.js
var PublicEventEmitter = class {
  constructor() {
    this.listeners = {};
  }
  addListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = /* @__PURE__ */ new Set();
    }
    this.listeners[event].add(callback);
  }
  removeListener(event, callback) {
    if (!this.listeners[event])
      return;
    this.listeners[event].delete(callback);
  }
  emit(event, ...args) {
    if (event === AnamEvent.CONNECTION_ESTABLISHED) {
      sendClientMetric(ClientMetricMeasurement.CLIENT_METRIC_MEASUREMENT_CONNECTION_ESTABLISHED, "1");
    }
    if (event === AnamEvent.CONNECTION_CLOSED) {
      const [closeCode, details] = args;
      sendClientMetric(ClientMetricMeasurement.CLIENT_METRIC_MEASUREMENT_CONNECTION_CLOSED, closeCode, details ? { details } : void 0);
    }
    if (!this.listeners[event])
      return;
    this.listeners[event].forEach((callback) => {
      callback(...args);
    });
  }
};

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/lib/InputAudioCapture.js
var buildInputAudioConstraints = (deviceId) => {
  const constraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    voiceIsolation: true,
    channelCount: { ideal: 1 }
  };
  if (deviceId) {
    constraints.deviceId = { exact: deviceId };
  }
  return constraints;
};
var detectInputAudioPlatform = (navigatorInfo = typeof navigator === "undefined" ? void 0 : navigator) => {
  var _a, _b;
  if (!navigatorInfo) {
    return "unknown";
  }
  const userAgent = (_a = navigatorInfo.userAgent) !== null && _a !== void 0 ? _a : "";
  if (/android/i.test(userAgent)) {
    return "android";
  }
  const isIosUserAgent = /iPad|iPhone|iPod/i.test(userAgent);
  const isIpadDesktopMode = navigatorInfo.platform === "MacIntel" && ((_b = navigatorInfo.maxTouchPoints) !== null && _b !== void 0 ? _b : 0) > 1;
  if (isIosUserAgent || isIpadDesktopMode) {
    return "ios";
  }
  return "desktop";
};
var detectInputAudioBrowser = (navigatorInfo = typeof navigator === "undefined" ? void 0 : navigator) => {
  var _a;
  const userAgent = (_a = navigatorInfo === null || navigatorInfo === void 0 ? void 0 : navigatorInfo.userAgent) !== null && _a !== void 0 ? _a : "";
  if (/(Edg|EdgiOS|EdgA)\//i.test(userAgent)) {
    return "edge";
  }
  if (/(Firefox|FxiOS)\//i.test(userAgent)) {
    return "firefox";
  }
  if (/(OPR|Opera|SamsungBrowser|Vivaldi|Whale|YaBrowser)\//i.test(userAgent)) {
    return "other";
  }
  if (/(Chrome|CriOS)\//i.test(userAgent)) {
    return "chrome";
  }
  if (/Safari\//i.test(userAgent)) {
    return "safari";
  }
  return "other";
};
var serializeAppliedInputAudioSettings = (settings) => {
  const values = settings;
  return {
    echoCancellation: normalizeEchoCancellation(values.echoCancellation),
    noiseSuppression: normalizeBooleanSetting(values.noiseSuppression),
    autoGainControl: normalizeBooleanSetting(values.autoGainControl),
    voiceIsolation: normalizeBooleanSetting(values.voiceIsolation),
    channelCount: typeof values.channelCount === "number" && Number.isFinite(values.channelCount) ? values.channelCount : 0
  };
};
var reportInputAudioSettings = (track, capturePath, options = {}) => {
  var _a, _b, _c;
  let settings = {};
  try {
    settings = track.getSettings();
  } catch (_d) {
  }
  const fields = serializeAppliedInputAudioSettings(settings);
  const platform = (_a = options.platform) !== null && _a !== void 0 ? _a : detectInputAudioPlatform();
  const browser = (_b = options.browser) !== null && _b !== void 0 ? _b : detectInputAudioBrowser();
  const sendMetrics = (_c = options.sendMetrics) !== null && _c !== void 0 ? _c : sendClientMetrics;
  try {
    void sendMetrics([
      {
        name: ClientMetricMeasurement.CLIENT_METRIC_MEASUREMENT_INPUT_AUDIO_SETTINGS,
        value: capturePath,
        tags: { platform, browser },
        fields: Object.assign({}, fields)
      }
    ]).catch(() => {
    });
  } catch (_e) {
  }
};
var normalizeBooleanSetting = (value) => {
  if (value === true) {
    return "true";
  }
  if (value === false) {
    return "false";
  }
  return "unreported";
};
var normalizeEchoCancellation = (value) => {
  if (value === "all" || value === "remote-only") {
    return "true";
  }
  return normalizeBooleanSetting(value);
};

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/types/TalkMessageStreamState.js
var TalkMessageStreamState;
(function(TalkMessageStreamState2) {
  TalkMessageStreamState2[TalkMessageStreamState2["UNSTARTED"] = 0] = "UNSTARTED";
  TalkMessageStreamState2[TalkMessageStreamState2["STREAMING"] = 1] = "STREAMING";
  TalkMessageStreamState2[TalkMessageStreamState2["INTERRUPTED"] = 2] = "INTERRUPTED";
  TalkMessageStreamState2[TalkMessageStreamState2["ENDED"] = 3] = "ENDED";
})(TalkMessageStreamState || (TalkMessageStreamState = {}));

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/types/TalkMessageStream.js
var __awaiter5 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
var TalkMessageStream = class {
  constructor(correlationId, internalEventEmitter, signallingClient) {
    this.state = TalkMessageStreamState.UNSTARTED;
    this.correlationId = correlationId;
    this.internalEventEmitter = internalEventEmitter;
    this.signallingClient = signallingClient;
    this.internalEventEmitter.addListener(InternalEvent.SIGNAL_MESSAGE_RECEIVED, this.onSignalMessage.bind(this));
  }
  onDeactivate() {
    this.internalEventEmitter.removeListener(InternalEvent.SIGNAL_MESSAGE_RECEIVED, this.onSignalMessage.bind(this));
  }
  onSignalMessage(signalMessage) {
    return __awaiter5(this, void 0, void 0, function* () {
      if (signalMessage.actionType === SignalMessageAction.TALK_STREAM_INTERRUPTED) {
        const message = signalMessage.payload;
        if (message.correlationId === this.correlationId) {
          this.state = TalkMessageStreamState.INTERRUPTED;
          this.onDeactivate();
        }
      }
    });
  }
  /**
   * End the stream without sending more content.
   *
   * The terminator carries the most recent utteranceId passed to
   * streamMessageChunk, so it does not start a new untagged utterance.
   */
  endMessage() {
    return __awaiter5(this, void 0, void 0, function* () {
      if (this.state === TalkMessageStreamState.ENDED) {
        console.warn("Talk stream is already ended via end of speech. No need to call endMessage.");
        return;
      }
      if (this.state !== TalkMessageStreamState.STREAMING) {
        console.warn("Talk stream is not in an active state: " + this.state);
        return;
      }
      const payload = Object.assign({ content: "", startOfSpeech: false, endOfSpeech: true, correlationId: this.correlationId }, this.lastUtteranceId != null ? { utteranceId: this.lastUtteranceId } : {});
      yield this.signallingClient.sendTalkMessage(payload);
      this.state = TalkMessageStreamState.ENDED;
      this.onDeactivate();
    });
  }
  /**
   * Send a text chunk to be spoken.
   *
   * @param partialMessage The text chunk to speak.
   * @param endOfSpeech Whether this is the final chunk of the speech.
   * @param utteranceId Optional lowercase UUID v4 string marking the utterance this chunk
   * starts. Set it on the first chunk, not on every text chunk; omitting it continues the
   * current utterance. A new id queues the next utterance after the current one without
   * ending the speech sequence, which is what allows speech before and after a tool call,
   * or two ready utterances that must play in order. The most recent value is reused for
   * the terminator sent by endMessage. Throws if it is not a lowercase UUID v4. Needs a
   * Cara 4 avatar: Cara 3 avatars drop the id silently and speak the turn as one
   * utterance.
   */
  streamMessageChunk(partialMessage, endOfSpeech, utteranceId) {
    return __awaiter5(this, void 0, void 0, function* () {
      if (this.state !== TalkMessageStreamState.STREAMING && this.state !== TalkMessageStreamState.UNSTARTED) {
        throw new Error("Talk stream is not in an active state: " + this.state);
      }
      if (utteranceId != null && !UUID_V4.test(utteranceId)) {
        throw new Error("utteranceId must be a lowercase UUID v4 string, got: " + utteranceId);
      }
      const payload = Object.assign({ content: partialMessage, startOfSpeech: this.state === TalkMessageStreamState.UNSTARTED, endOfSpeech, correlationId: this.correlationId }, utteranceId != null ? { utteranceId } : {});
      if (utteranceId != null) {
        this.lastUtteranceId = utteranceId;
      }
      this.state = endOfSpeech ? TalkMessageStreamState.ENDED : TalkMessageStreamState.STREAMING;
      if (this.state === TalkMessageStreamState.ENDED) {
        this.onDeactivate();
      }
      yield this.signallingClient.sendTalkMessage(payload);
    });
  }
  getCorrelationId() {
    return this.correlationId;
  }
  isActive() {
    return this.state === TalkMessageStreamState.STREAMING || this.state === TalkMessageStreamState.UNSTARTED;
  }
  getState() {
    return this.state;
  }
};

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/modules/ToolCallManager.js
var __awaiter6 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var calculateExecutionTime = (startTimestamp, endTimestamp) => {
  if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
    return 0;
  }
  const executionTime = endTimestamp - startTimestamp;
  return executionTime > 0 ? executionTime : 0;
};
var ToolCallManager = class {
  constructor(publicEventEmitter, internalEventEmitter) {
    this.handlers = /* @__PURE__ */ Object.create(null);
    this.pendingCalls = /* @__PURE__ */ Object.create(null);
    this.failedCalls = /* @__PURE__ */ Object.create(null);
    this.activeSessionId = null;
    this.publicEventEmitter = publicEventEmitter;
    this.internalEventEmitter = internalEventEmitter;
  }
  setActiveSession(sessionId) {
    this.activeSessionId = sessionId;
    this.clearPendingCalls();
    this.clearFailedCalls();
  }
  clearSessionState() {
    this.activeSessionId = null;
    this.clearPendingCalls();
    this.clearFailedCalls();
  }
  clearPendingCalls() {
    this.pendingCalls = /* @__PURE__ */ Object.create(null);
  }
  clearFailedCalls() {
    this.failedCalls = /* @__PURE__ */ Object.create(null);
  }
  registerHandler(toolName, handler) {
    this.handlers[toolName] = handler;
    return () => {
      delete this.handlers[toolName];
    };
  }
  processToolCallStartedEvent(toolCallEvent) {
    return __awaiter6(this, void 0, void 0, function* () {
      if (this.activeSessionId !== toolCallEvent.session_id) {
        return;
      }
      const { tool_name, timestamp } = toolCallEvent;
      const payload = this.WebRTCToolCallStartedEventToToolCallStartedPayload(toolCallEvent);
      const parsedTimestamp = new Date(timestamp);
      this.pendingCalls[toolCallEvent.tool_call_id] = {
        payload,
        timestamp: parsedTimestamp.getTime()
      };
      if (!(tool_name in this.handlers)) {
        return;
      }
      const handler = this.handlers[tool_name];
      if (!handler.onStart) {
        return;
      }
      try {
        const result = yield handler.onStart(payload);
        if (toolCallEvent.tool_type === "client") {
          this.sendToolResult({
            sessionId: toolCallEvent.session_id,
            toolCallId: toolCallEvent.tool_call_id,
            userActionCorrelationId: toolCallEvent.user_action_correlation_id,
            timestampUserAction: toolCallEvent.timestamp_user_action,
            result: result !== null && result !== void 0 ? result : void 0,
            errorMessage: void 0
          });
          yield this.processToolCallCompletedEvent(Object.assign(Object.assign({}, toolCallEvent), { result, timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
          return;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (toolCallEvent.tool_type === "client") {
          this.sendToolResult({
            sessionId: toolCallEvent.session_id,
            toolCallId: toolCallEvent.tool_call_id,
            userActionCorrelationId: toolCallEvent.user_action_correlation_id,
            timestampUserAction: toolCallEvent.timestamp_user_action,
            result: void 0,
            errorMessage: `Error in handler: ${errorMessage}`
          });
        }
        yield this.processToolCallFailedEvent(Object.assign(Object.assign({}, toolCallEvent), { error_message: `Error in onStart handler: ${errorMessage}`, timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
        return;
      }
    });
  }
  processToolCallCompletedEvent(toolCallEvent) {
    return __awaiter6(this, void 0, void 0, function* () {
      const { tool_name, tool_call_id } = toolCallEvent;
      if (this.activeSessionId !== toolCallEvent.session_id) {
        return;
      }
      if (tool_call_id in this.failedCalls) {
        delete this.failedCalls[tool_call_id];
        return;
      }
      const payload = this.webRTCToolCallCompletedEventToToolCallCompletedPayload(toolCallEvent);
      if (tool_call_id in this.pendingCalls) {
        delete this.pendingCalls[tool_call_id];
      }
      if (!(tool_name in this.handlers)) {
        return;
      }
      const handler = this.handlers[tool_name];
      if (!handler.onComplete) {
        return;
      }
      if (toolCallEvent.tool_type === "client") {
        this.publicEventEmitter.emit(AnamEvent.TOOL_CALL_COMPLETED, payload);
      }
      try {
        yield handler.onComplete(payload);
      } catch (error) {
        console.error(`Error in onComplete handler for tool ${tool_name}:`, error);
        return;
      }
    });
  }
  processToolCallFailedEvent(toolCallEvent) {
    return __awaiter6(this, void 0, void 0, function* () {
      const { tool_name, tool_call_id } = toolCallEvent;
      if (this.activeSessionId !== toolCallEvent.session_id) {
        return;
      }
      const payload = this.webRTCToolCallFailedEventToToolCallFailedPayload(toolCallEvent);
      this.failedCalls[tool_call_id] = payload;
      if (tool_call_id in this.pendingCalls) {
        delete this.pendingCalls[tool_call_id];
      }
      if (!(tool_name in this.handlers)) {
        return;
      }
      const handler = this.handlers[tool_name];
      if (!handler.onFail) {
        return;
      }
      if (toolCallEvent.tool_type === "client") {
        this.publicEventEmitter.emit(AnamEvent.TOOL_CALL_FAILED, payload);
      }
      try {
        yield handler.onFail(payload);
      } catch (error) {
        console.error(`Error in onFail handler for tool ${tool_name}:`, error);
        return;
      }
    });
  }
  /**
   * Emits a tool result event so it can be sent back to the engine.
   * The StreamingClient listens for this event and sends the data channel message.
   */
  sendToolResult(result) {
    const payload = {
      sessionId: result.sessionId,
      toolCallId: result.toolCallId,
      result: result.result,
      errorMessage: result.errorMessage,
      userActionCorrelationId: result.userActionCorrelationId,
      timestampUserAction: result.timestampUserAction
    };
    this.internalEventEmitter.emit(InternalEvent.TOOL_CALL_RESULT_READY, payload);
  }
  /**
   * Converts a WebRtcClientToolEvent to a ClientToolEvent
   */
  static WebRTCClientToolEventToClientToolEvent(webRtcEvent) {
    return {
      eventUid: webRtcEvent.event_uid,
      sessionId: webRtcEvent.session_id,
      eventName: webRtcEvent.event_name,
      eventData: webRtcEvent.event_data,
      timestamp: webRtcEvent.timestamp,
      timestampUserAction: webRtcEvent.timestamp_user_action,
      userActionCorrelationId: webRtcEvent.user_action_correlation_id
    };
  }
  static WebRTCToolCallStartedEventToClientToolEvent(webRtcEvent) {
    return {
      eventUid: webRtcEvent.event_uid,
      sessionId: webRtcEvent.session_id,
      eventName: webRtcEvent.tool_name,
      eventData: webRtcEvent.arguments,
      timestamp: webRtcEvent.timestamp,
      timestampUserAction: webRtcEvent.timestamp_user_action,
      userActionCorrelationId: webRtcEvent.user_action_correlation_id
    };
  }
  WebRTCToolCallStartedEventToToolCallStartedPayload(webRtcEvent) {
    return {
      eventUid: webRtcEvent.event_uid,
      sessionId: webRtcEvent.session_id,
      toolCallId: webRtcEvent.tool_call_id,
      toolName: webRtcEvent.tool_name,
      toolType: webRtcEvent.tool_type,
      toolSubtype: webRtcEvent.tool_subtype,
      arguments: webRtcEvent.arguments,
      timestamp: webRtcEvent.timestamp,
      timestampUserAction: webRtcEvent.timestamp_user_action,
      userActionCorrelationId: webRtcEvent.user_action_correlation_id
    };
  }
  webRTCToolCallCompletedEventToToolCallCompletedPayload(webRtcEvent) {
    const parsedTimestamp = new Date(webRtcEvent.timestamp);
    const pendingCall = this.pendingCalls[webRtcEvent.tool_call_id];
    const executionTime = pendingCall ? calculateExecutionTime(pendingCall.timestamp, parsedTimestamp.getTime()) : 0;
    return {
      eventUid: webRtcEvent.event_uid,
      sessionId: webRtcEvent.session_id,
      toolCallId: webRtcEvent.tool_call_id,
      toolName: webRtcEvent.tool_name,
      toolType: webRtcEvent.tool_type,
      toolSubtype: webRtcEvent.tool_subtype,
      result: webRtcEvent.result,
      executionTime: executionTime > 0 ? executionTime : 0,
      timestamp: webRtcEvent.timestamp,
      documentsAccessed: webRtcEvent.documents_accessed,
      // Include accessed files if present
      timestampUserAction: webRtcEvent.timestamp_user_action,
      userActionCorrelationId: webRtcEvent.user_action_correlation_id
    };
  }
  webRTCToolCallFailedEventToToolCallFailedPayload(webRtcEvent) {
    const parsedTimestamp = new Date(webRtcEvent.timestamp);
    const pendingCall = this.pendingCalls[webRtcEvent.tool_call_id];
    const executionTime = pendingCall ? calculateExecutionTime(pendingCall.timestamp, parsedTimestamp.getTime()) : 0;
    return {
      eventUid: webRtcEvent.event_uid,
      sessionId: webRtcEvent.session_id,
      toolCallId: webRtcEvent.tool_call_id,
      toolName: webRtcEvent.tool_name,
      toolType: webRtcEvent.tool_type,
      toolSubtype: webRtcEvent.tool_subtype,
      errorMessage: webRtcEvent.error_message,
      executionTime: executionTime > 0 ? executionTime : 0,
      timestamp: webRtcEvent.timestamp,
      timestampUserAction: webRtcEvent.timestamp_user_action,
      userActionCorrelationId: webRtcEvent.user_action_correlation_id
    };
  }
};

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/modules/StreamingClient.js
var __awaiter7 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var SUCCESS_METRIC_POLLING_TIMEOUT_MS = 15e3;
var STATS_COLLECTION_INTERVAL_MS = 5e3;
var ICE_CANDIDATE_POOL_SIZE = 2;
var MAX_ICE_RESTART_ATTEMPTS = 3;
var ICE_DISCONNECTED_GRACE_MS = 2e3;
var ICE_RESTART_WATCHDOG_MS = 3e3;
var ENSURE_WS_OPEN_TIMEOUT_MS = 5e3;
var StreamingClient = class {
  constructor(sessionId, options, publicEventEmitter, internalEventEmitter, toolCallManager, connectionMilestones) {
    var _a, _b, _c, _d;
    this.peerConnection = null;
    this.connectionEstablishedEmitted = false;
    this.iceRestartInProgress = false;
    this.iceRestartAttempts = 0;
    this.iceRestartAwaitedAnswer = false;
    this.iceRestartEpisodeStartMs = null;
    this.iceRestartEpisodeTrigger = null;
    this.iceRestartStopped = false;
    this.iceDisconnectedGraceTimer = null;
    this.iceRestartWatchdogTimer = null;
    this.pendingWsOpenListener = null;
    this.pendingWsOpenTimeout = null;
    this.pendingWsOpenReject = null;
    this.connectionReceivedAnswer = false;
    this.remoteIceCandidateBuffer = [];
    this.iceRestartCandidateBuffer = null;
    this.inputAudioStream = null;
    this.dataChannel = null;
    this.videoElement = null;
    this.videoStream = null;
    this.audioStream = null;
    this.inputAudioState = {
      isMuted: false,
      permissionState: AudioPermissionState.NOT_REQUESTED
    };
    this.successMetricPoller = null;
    this.successMetricFired = false;
    this.showPeerConnectionStatsReport = false;
    this.peerConnectionStatsReportOutputFormat = "console";
    this.statsCollectionInterval = null;
    this.agentAudioInputStream = null;
    this.firstLocalIceCandidateSent = false;
    this.firstRemoteIceCandidateReceived = false;
    this.firstRemoteIceCandidateApplied = false;
    this.connectionEstablishedMilestoneRecorded = false;
    this.publicEventEmitter = publicEventEmitter;
    this.internalEventEmitter = internalEventEmitter;
    this.toolCallManager = toolCallManager;
    this.connectionMilestones = connectionMilestones;
    this.apiGatewayConfig = options.apiGateway;
    const { inputAudio } = options;
    this.inputAudioState = inputAudio.inputAudioState;
    if (options.inputAudio.userProvidedMediaStream) {
      this.inputAudioStream = options.inputAudio.userProvidedMediaStream;
    }
    this.disableInputAudio = options.inputAudio.disableInputAudio === true;
    this.internalEventEmitter.addListener(InternalEvent.WEB_SOCKET_OPEN, this.onSignallingClientConnected.bind(this));
    this.internalEventEmitter.addListener(InternalEvent.SIGNAL_MESSAGE_RECEIVED, this.onSignalMessage.bind(this));
    this.internalEventEmitter.addListener(InternalEvent.WEBRTC_TOOL_CALL_STARTED_EVENT_RECEIVED, this.toolCallManager.processToolCallStartedEvent.bind(this.toolCallManager));
    this.internalEventEmitter.addListener(InternalEvent.WEBRTC_TOOL_CALL_COMPLETED_EVENT_RECEIVED, this.toolCallManager.processToolCallCompletedEvent.bind(this.toolCallManager));
    this.internalEventEmitter.addListener(InternalEvent.WEBRTC_TOOL_CALL_FAILED_EVENT_RECEIVED, this.toolCallManager.processToolCallFailedEvent.bind(this.toolCallManager));
    this.internalEventEmitter.addListener(InternalEvent.TOOL_CALL_RESULT_READY, this.onToolCallResultReceived.bind(this));
    this.iceServers = options.iceServers;
    this.iceTransportPolicy = options.iceTransportPolicy;
    this.rtcConfiguration = options.rtcConfiguration;
    this.signallingClient = new SignallingClient(sessionId, options.signalling, this.publicEventEmitter, this.internalEventEmitter, this.apiGatewayConfig, this.connectionMilestones);
    this.engineApiRestClient = new EngineApiRestClient(options.engine.baseUrl, sessionId, this.apiGatewayConfig);
    this.audioDeviceId = options.inputAudio.audioDeviceId;
    this.showPeerConnectionStatsReport = (_b = (_a = options.metrics) === null || _a === void 0 ? void 0 : _a.showPeerConnectionStatsReport) !== null && _b !== void 0 ? _b : false;
    this.peerConnectionStatsReportOutputFormat = (_d = (_c = options.metrics) === null || _c === void 0 ? void 0 : _c.peerConnectionStatsReportOutputFormat) !== null && _d !== void 0 ? _d : "console";
  }
  onInputAudioStateChange(oldState, newState) {
    if (oldState.isMuted !== newState.isMuted) {
      if (newState.isMuted) {
        this.muteAllAudioTracks();
      } else {
        this.unmuteAllAudioTracks();
      }
    }
  }
  muteAllAudioTracks() {
    var _a;
    (_a = this.inputAudioStream) === null || _a === void 0 ? void 0 : _a.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });
  }
  unmuteAllAudioTracks() {
    var _a;
    (_a = this.inputAudioStream) === null || _a === void 0 ? void 0 : _a.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });
  }
  startStatsCollection() {
    if (this.statsCollectionInterval) {
      return;
    }
    this.statsCollectionInterval = setInterval(() => __awaiter7(this, void 0, void 0, function* () {
      if (!this.peerConnection || !this.dataChannel || this.dataChannel.readyState !== "open") {
        return;
      }
      try {
        const stats = yield this.peerConnection.getStats();
        this.sendClientSideMetrics(stats);
      } catch (error) {
        console.error("Failed to collect and send stats:", error);
      }
    }), STATS_COLLECTION_INTERVAL_MS);
  }
  sendClientSideMetrics(stats) {
    stats.forEach((report) => {
      if (report.type === "inbound-rtp") {
        const metrics = {
          message_type: "remote_rtp_stats",
          data: report
        };
        if (this.dataChannel && this.dataChannel.readyState === "open") {
          this.dataChannel.send(JSON.stringify(metrics));
        }
      }
    });
  }
  recordSessionSuccess(detectionMethod) {
    var _a, _b;
    if (this.successMetricFired) {
      return;
    }
    this.successMetricFired = true;
    (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("first_video_frame", {
      detectionMethod
    });
    (_b = this.connectionMilestones) === null || _b === void 0 ? void 0 : _b.recordSessionSuccess({ detectionMethod });
    sendClientMetric(ClientMetricMeasurement.CLIENT_METRIC_MEASUREMENT_SESSION_SUCCESS, "1", { detectionMethod });
  }
  startSuccessMetricPolling() {
    if (this.successMetricPoller || this.successMetricFired) {
      return;
    }
    const timeoutId = setTimeout(() => {
      var _a, _b;
      if (this.successMetricPoller) {
        (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("first_video_frame_timeout", {
          timeoutMs: SUCCESS_METRIC_POLLING_TIMEOUT_MS
        });
        (_b = this.connectionMilestones) === null || _b === void 0 ? void 0 : _b.publishFailure({
          failureStage: "first_video_frame",
          timeoutMs: SUCCESS_METRIC_POLLING_TIMEOUT_MS
        });
        console.warn("No video frames received, there is a problem with the connection.");
        clearInterval(this.successMetricPoller);
        this.successMetricPoller = null;
      }
    }, SUCCESS_METRIC_POLLING_TIMEOUT_MS);
    this.successMetricPoller = setInterval(() => __awaiter7(this, void 0, void 0, function* () {
      if (!this.peerConnection || this.successMetricFired) {
        if (this.successMetricPoller) {
          clearInterval(this.successMetricPoller);
        }
        clearTimeout(timeoutId);
        return;
      }
      try {
        const stats = yield this.peerConnection.getStats();
        let videoDetected = false;
        let detectionMethod = null;
        stats.forEach((report) => {
          if (report.type === "inbound-rtp" && report.kind === "video") {
            if (report.framesDecoded !== void 0 && report.framesDecoded > 0) {
              videoDetected = true;
              detectionMethod = "framesDecoded";
            } else if (report.framesReceived !== void 0 && report.framesReceived > 0) {
              videoDetected = true;
              detectionMethod = "framesReceived";
            } else if (report.bytesReceived > 0 && report.packetsReceived > 0 && // Additional check: ensure we've received enough data for actual video
            report.bytesReceived > 1e5) {
              videoDetected = true;
              detectionMethod = "bytesReceived";
            }
          }
        });
        if (videoDetected && !this.successMetricFired) {
          this.recordSessionSuccess(detectionMethod !== null && detectionMethod !== void 0 ? detectionMethod : "unknown");
          if (this.successMetricPoller) {
            clearInterval(this.successMetricPoller);
          }
          clearTimeout(timeoutId);
          this.successMetricPoller = null;
        }
      } catch (error) {
      }
    }), 500);
  }
  muteInputAudio() {
    const oldAudioState = this.inputAudioState;
    const newAudioState = Object.assign(Object.assign({}, this.inputAudioState), { isMuted: true });
    this.inputAudioState = newAudioState;
    this.onInputAudioStateChange(oldAudioState, newAudioState);
    return this.inputAudioState;
  }
  unmuteInputAudio() {
    const oldAudioState = this.inputAudioState;
    const newAudioState = Object.assign(Object.assign({}, this.inputAudioState), { isMuted: false });
    this.inputAudioState = newAudioState;
    this.onInputAudioStateChange(oldAudioState, newAudioState);
    return this.inputAudioState;
  }
  getInputAudioState() {
    return this.inputAudioState;
  }
  getPeerConnection() {
    return this.peerConnection;
  }
  changeAudioInputDevice(deviceId) {
    return __awaiter7(this, void 0, void 0, function* () {
      if (!this.peerConnection) {
        throw new Error("StreamingClient - changeAudioInputDevice: peer connection is not initialized. Start streaming first.");
      }
      if (!(deviceId === null || deviceId === void 0 ? void 0 : deviceId.trim())) {
        throw new Error("StreamingClient - changeAudioInputDevice: a non-empty deviceId is required");
      }
      const normalizedDeviceId = deviceId.trim();
      const wasMuted = this.inputAudioState.isMuted;
      try {
        if (this.inputAudioStream) {
          this.inputAudioStream.getAudioTracks().forEach((track) => {
            track.stop();
          });
        }
        const audioConstraints = buildInputAudioConstraints(normalizedDeviceId);
        const captureConnection = this.peerConnection;
        const capturedStream = yield navigator.mediaDevices.getUserMedia({
          audio: audioConstraints
        });
        if (!captureConnection || this.peerConnection !== captureConnection || captureConnection.connectionState === "closed" || this.iceRestartStopped) {
          capturedStream.getTracks().forEach((track) => track.stop());
          return;
        }
        this.inputAudioStream = capturedStream;
        this.audioDeviceId = normalizedDeviceId;
        yield this.setupAudioTrack("device_change");
        if (wasMuted) {
          this.muteAllAudioTracks();
        }
        this.publicEventEmitter.emit(AnamEvent.INPUT_AUDIO_DEVICE_CHANGED, normalizedDeviceId);
      } catch (error) {
        console.error("Failed to change audio input device:", error);
        throw new Error(`StreamingClient - changeAudioInputDevice: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }
  getInputAudioStream() {
    return this.inputAudioStream;
  }
  getVideoStream() {
    return this.videoStream;
  }
  getAudioStream() {
    return this.audioStream;
  }
  onToolCallResultReceived(payload) {
    const message = {
      session_id: payload.sessionId,
      message_type: "tool_result",
      tool_call_id: payload.toolCallId,
      user_action_correlation_id: payload.userActionCorrelationId,
      timestamp_user_action: payload.timestampUserAction
    };
    if (payload.result !== void 0) {
      message.result = payload.result;
    }
    if (payload.errorMessage) {
      message.error = payload.errorMessage;
    }
    this.sendDataMessage(JSON.stringify(message));
  }
  sendDataMessage(message) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(message);
      return true;
    }
    return false;
  }
  setMediaStreamTargetById(videoElementId) {
    if (videoElementId) {
      const videoElement = document.getElementById(videoElementId);
      if (!videoElement) {
        throw new Error(`StreamingClient: video element with id ${videoElementId} not found`);
      }
      this.videoElement = videoElement;
    }
  }
  startConnection() {
    var _a;
    try {
      if (this.peerConnection) {
        console.error("StreamingClient - startConnection: peer connection already exists");
        return;
      }
      this.resetAttemptScopedMilestoneState();
      (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("connection_start_requested");
      this.signallingClient.connect();
    } catch (error) {
      console.error("StreamingClient - startConnection: error", error);
      this.handleWebrtcFailure(error);
    }
  }
  resetAttemptScopedMilestoneState() {
    this.firstLocalIceCandidateSent = false;
    this.firstRemoteIceCandidateReceived = false;
    this.firstRemoteIceCandidateApplied = false;
    this.connectionEstablishedMilestoneRecorded = false;
  }
  stopConnection() {
    return __awaiter7(this, void 0, void 0, function* () {
      yield this.shutdown();
    });
  }
  sendTalkCommand(content) {
    return __awaiter7(this, void 0, void 0, function* () {
      if (!this.peerConnection) {
        throw new Error("StreamingClient - sendTalkCommand: peer connection is null");
      }
      yield this.engineApiRestClient.sendTalkCommand(content);
      return;
    });
  }
  startTalkMessageStream(correlationId) {
    if (!correlationId) {
      correlationId = Math.random().toString(36).substring(2, 15);
    }
    return new TalkMessageStream(correlationId, this.internalEventEmitter, this.signallingClient);
  }
  createAgentAudioInputStream(config) {
    this.agentAudioInputStream = new AgentAudioInputStream(config, this.signallingClient);
    return this.agentAudioInputStream;
  }
  getAgentAudioInputStream() {
    return this.agentAudioInputStream;
  }
  initPeerConnection() {
    return __awaiter7(this, void 0, void 0, function* () {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
      (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("peer_connection_creating");
      this.peerConnection = new RTCPeerConnection(Object.assign(Object.assign({
        // SDK default first (caller's rtcConfiguration may override it)
        iceCandidatePoolSize: ICE_CANDIDATE_POOL_SIZE
      }, this.rtcConfiguration), {
        iceTransportPolicy: (_d = (_c = (_b = this.rtcConfiguration) === null || _b === void 0 ? void 0 : _b.iceTransportPolicy) !== null && _c !== void 0 ? _c : this.iceTransportPolicy) !== null && _d !== void 0 ? _d : void 0,
        // resolved iceServers always wins for its field (preserves backward compat)
        iceServers: this.iceServers
      }));
      (_e = this.connectionMilestones) === null || _e === void 0 ? void 0 : _e.record("peer_connection_created", {
        iceCandidatePoolSize: ICE_CANDIDATE_POOL_SIZE,
        iceServerCount: this.iceServers.length,
        iceTransportPolicy: (_h = (_g = (_f = this.rtcConfiguration) === null || _f === void 0 ? void 0 : _f.iceTransportPolicy) !== null && _g !== void 0 ? _g : this.iceTransportPolicy) !== null && _h !== void 0 ? _h : "all"
      });
      this.peerConnection.onicecandidate = this.onIceCandidate.bind(this);
      this.peerConnection.oniceconnectionstatechange = this.onIceConnectionStateChange.bind(this);
      this.peerConnection.onconnectionstatechange = this.onConnectionStateChange.bind(this);
      this.peerConnection.addEventListener("track", this.onTrackEventHandler.bind(this));
      yield this.setupDataChannels();
      this.peerConnection.addTransceiver("video", { direction: "recvonly" });
      if (this.disableInputAudio) {
        (_j = this.connectionMilestones) === null || _j === void 0 ? void 0 : _j.record("microphone_permission_skipped", {
          reason: "input_audio_disabled"
        });
        this.peerConnection.addTransceiver("audio", { direction: "recvonly" });
      } else {
        this.peerConnection.addTransceiver("audio", { direction: "sendrecv" });
        if (this.inputAudioStream) {
          (_k = this.connectionMilestones) === null || _k === void 0 ? void 0 : _k.record("input_audio_stream_provided", {
            audioTrackCount: this.inputAudioStream.getAudioTracks().length
          });
          yield this.setupAudioTrack("user_provided");
        } else {
          this.requestMicrophonePermissionAsync().catch((error) => {
            console.error("Async microphone permission request failed:", error);
          });
        }
      }
    });
  }
  onSignalMessage(signalMessage) {
    return __awaiter7(this, void 0, void 0, function* () {
      var _a, _b, _c, _d;
      if (!this.peerConnection) {
        console.error("StreamingClient - onSignalMessage: peerConnection is not initialized");
        return;
      }
      switch (signalMessage.actionType) {
        case SignalMessageAction.ANSWER: {
          (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("answer_received");
          const answer = signalMessage.payload;
          if (this.peerConnection.signalingState !== "have-local-offer") {
            break;
          }
          try {
            yield this.peerConnection.setRemoteDescription(answer);
          } catch (err) {
            console.error("StreamingClient - setRemoteDescription(answer) failed", err);
            if (!this.connectionEstablishedEmitted && !this.isAwaitingRestartAnswer()) {
              this.handleWebrtcFailure(err);
            }
            break;
          }
          (_b = this.connectionMilestones) === null || _b === void 0 ? void 0 : _b.record("remote_description_set");
          this.connectionReceivedAnswer = true;
          this.onAnswerAccepted();
          yield this.flushRemoteIceCandidateBuffer();
          break;
        }
        case SignalMessageAction.ICE_CANDIDATE: {
          const iceCandidateConfig = signalMessage.payload;
          const candidate = new RTCIceCandidate(iceCandidateConfig);
          if (!this.firstRemoteIceCandidateReceived) {
            this.firstRemoteIceCandidateReceived = true;
            (_c = this.connectionMilestones) === null || _c === void 0 ? void 0 : _c.record("first_remote_ice_candidate_received", getIceCandidateMilestoneTags(candidate));
          }
          if (this.connectionReceivedAnswer) {
            yield this.addRemoteIceCandidate(candidate);
          } else {
            this.remoteIceCandidateBuffer.push(candidate);
          }
          break;
        }
        case SignalMessageAction.END_SESSION:
          const reason = signalMessage.payload;
          this.sendIceRestartMetric("aborted");
          (_d = this.connectionMilestones) === null || _d === void 0 ? void 0 : _d.publishFailure({
            failureStage: "server_closed_connection"
          });
          this.publicEventEmitter.emit(AnamEvent.CONNECTION_CLOSED, ConnectionClosedCode.SERVER_CLOSED_CONNECTION, reason);
          this.shutdown();
          break;
        case SignalMessageAction.WARNING:
          const message = signalMessage.payload;
          console.warn("Warning received from server: " + message);
          this.publicEventEmitter.emit(AnamEvent.SERVER_WARNING, message);
          break;
        case SignalMessageAction.TALK_STREAM_INTERRUPTED:
          const chatMessage = signalMessage.payload;
          this.publicEventEmitter.emit(AnamEvent.TALK_STREAM_INTERRUPTED, chatMessage.correlationId);
          break;
        case SignalMessageAction.SESSION_READY:
          const sessionId = signalMessage.sessionId;
          this.publicEventEmitter.emit(AnamEvent.SESSION_READY, sessionId);
          break;
        case SignalMessageAction.HEARTBEAT:
          break;
        default:
          console.warn("StreamingClient - onSignalMessage: unknown signal message action type. Is your @anam-ai/js-sdk version up to date?", signalMessage);
      }
    });
  }
  onSignallingClientConnected() {
    return __awaiter7(this, void 0, void 0, function* () {
      if (!this.peerConnection) {
        try {
          yield this.initPeerConnectionAndSendOffer();
        } catch (err) {
          console.error("StreamingClient - onSignallingClientConnected: Error initializing peer connection", err);
          this.handleWebrtcFailure(err);
        }
      }
    });
  }
  flushRemoteIceCandidateBuffer() {
    return __awaiter7(this, void 0, void 0, function* () {
      const bufferedCandidates = [...this.remoteIceCandidateBuffer];
      this.remoteIceCandidateBuffer = [];
      for (const candidate of bufferedCandidates) {
        yield this.addRemoteIceCandidate(candidate);
      }
    });
  }
  /**
   * Add a single remote ICE candidate to the peer connection.
   * Each candidate is added independently: a rejection on one candidate is
   * logged and swallowed so it cannot abort the flush loop (dropping the
   * remaining buffered candidates) or surface as an unhandled rejection from
   * the ANSWER handler. The "first applied" milestone is only recorded after a
   * genuine, successful add.
   */
  addRemoteIceCandidate(candidate) {
    return __awaiter7(this, void 0, void 0, function* () {
      if (!this.peerConnection) {
        return;
      }
      try {
        yield this.peerConnection.addIceCandidate(candidate);
        this.recordFirstRemoteIceCandidateApplied(candidate);
      } catch (error) {
        console.warn("StreamingClient - addRemoteIceCandidate: failed to add remote ICE candidate", error);
      }
    });
  }
  recordFirstRemoteIceCandidateApplied(candidate) {
    var _a;
    if (this.firstRemoteIceCandidateApplied) {
      return;
    }
    this.firstRemoteIceCandidateApplied = true;
    (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("first_remote_ice_candidate_applied", getIceCandidateMilestoneTags(candidate));
  }
  /**
   * ICE Candidate Trickle
   * As each ICE candidate is gathered from the STUN server it is sent to the
   * webRTC server immediately in an effort to reduce time to connection.
   */
  onIceCandidate(event) {
    var _a, _b;
    if (event.candidate) {
      if (!this.firstLocalIceCandidateSent) {
        this.firstLocalIceCandidateSent = true;
        (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("first_local_ice_candidate_sent", getIceCandidateMilestoneTags(event.candidate));
      }
      if (this.iceRestartCandidateBuffer) {
        this.iceRestartCandidateBuffer.push(event.candidate);
        return;
      }
      this.signallingClient.sendIceCandidate(event.candidate);
    } else {
      (_b = this.connectionMilestones) === null || _b === void 0 ? void 0 : _b.record("ice_gathering_complete");
    }
  }
  onIceConnectionStateChange() {
    var _a, _b, _c;
    const state = (_a = this.peerConnection) === null || _a === void 0 ? void 0 : _a.iceConnectionState;
    if (state) {
      (_b = this.connectionMilestones) === null || _b === void 0 ? void 0 : _b.record("ice_connection_state_changed", {
        iceConnectionState: state
      });
    }
    switch (state) {
      case "connected":
      case "completed":
        this.clearIceDisconnectedGraceTimer();
        this.clearIceRestartWatchdog();
        this.iceRestartInProgress = false;
        this.sendIceRestartMetric("recovered");
        this.iceRestartAttempts = 0;
        this.signallingClient.endIceRestartReconnect();
        if (!this.connectionEstablishedMilestoneRecorded) {
          this.connectionEstablishedMilestoneRecorded = true;
          (_c = this.connectionMilestones) === null || _c === void 0 ? void 0 : _c.record("client_connection_established", {
            iceConnectionState: state
          });
        }
        if (!this.connectionEstablishedEmitted) {
          this.connectionEstablishedEmitted = true;
          this.publicEventEmitter.emit(AnamEvent.CONNECTION_ESTABLISHED);
        }
        this.startStatsCollection();
        break;
      case "disconnected":
        this.scheduleIceRestartAfterGrace();
        break;
      case "failed":
        this.clearIceDisconnectedGraceTimer();
        void this.restartIce();
        break;
    }
  }
  clearIceDisconnectedGraceTimer() {
    if (this.iceDisconnectedGraceTimer) {
      clearTimeout(this.iceDisconnectedGraceTimer);
      this.iceDisconnectedGraceTimer = null;
    }
  }
  clearIceRestartWatchdog() {
    if (this.iceRestartWatchdogTimer) {
      clearTimeout(this.iceRestartWatchdogTimer);
      this.iceRestartWatchdogTimer = null;
    }
  }
  // One metric per restart episode, sent at episode end. No-op when no
  // episode is active; deliberately silent on user shutdown mid-episode.
  sendIceRestartMetric(outcome) {
    var _a;
    if (this.iceRestartEpisodeStartMs === null) {
      return;
    }
    const durationMs = Math.round(performance.now() - this.iceRestartEpisodeStartMs);
    const trigger = (_a = this.iceRestartEpisodeTrigger) !== null && _a !== void 0 ? _a : "unknown";
    this.iceRestartEpisodeStartMs = null;
    this.iceRestartEpisodeTrigger = null;
    sendClientMetric(ClientMetricMeasurement.CLIENT_METRIC_MEASUREMENT_ICE_RESTART, durationMs, {
      outcome,
      attempts: this.iceRestartAttempts,
      trigger
    });
  }
  // True while a restart offer is outstanding (in-progress gate, awaited-answer
  // grace cycle, or armed watchdog) — i.e. an incoming answer belongs to an ICE
  // restart rather than the initial connection.
  isAwaitingRestartAnswer() {
    return this.iceRestartInProgress || this.iceRestartAwaitedAnswer || this.iceRestartWatchdogTimer !== null;
  }
  onAnswerAccepted() {
    var _a;
    const wasAwaitingRestartAnswer = this.isAwaitingRestartAnswer();
    this.clearIceRestartWatchdog();
    this.iceRestartAwaitedAnswer = false;
    if (!wasAwaitingRestartAnswer) {
      return;
    }
    this.iceRestartInProgress = false;
    const state = (_a = this.peerConnection) === null || _a === void 0 ? void 0 : _a.iceConnectionState;
    if (state === "disconnected" || state === "failed") {
      this.scheduleIceRestartAfterGrace();
    }
  }
  // Clears the pending ensureSignallingConnected wait (timeout + listener).
  clearPendingWsOpenWait() {
    if (this.pendingWsOpenTimeout) {
      clearTimeout(this.pendingWsOpenTimeout);
      this.pendingWsOpenTimeout = null;
    }
    if (this.pendingWsOpenListener) {
      this.internalEventEmitter.removeListener(InternalEvent.WEB_SOCKET_OPEN, this.pendingWsOpenListener);
      this.pendingWsOpenListener = null;
    }
    this.pendingWsOpenReject = null;
  }
  // Stops all restart activity: timers, pending WS wait, and the in-progress gate.
  cancelIceRestart() {
    this.clearIceDisconnectedGraceTimer();
    this.clearIceRestartWatchdog();
    const reject = this.pendingWsOpenReject;
    this.clearPendingWsOpenWait();
    if (reject)
      reject(new Error("ice restart cancelled"));
    this.iceRestartCandidateBuffer = null;
    this.iceRestartInProgress = false;
    this.iceRestartEpisodeStartMs = null;
    this.iceRestartEpisodeTrigger = null;
    this.signallingClient.endIceRestartReconnect();
  }
  // Send any candidates buffered while the re-offer was minted+sent, then stop
  // buffering (see restartIce/onIceCandidate).
  flushIceRestartCandidateBuffer() {
    const buffered = this.iceRestartCandidateBuffer;
    this.iceRestartCandidateBuffer = null;
    if (!buffered)
      return;
    for (const candidate of buffered) {
      this.signallingClient.sendIceCandidate(candidate);
    }
  }
  scheduleIceRestartAfterGrace() {
    if (this.iceRestartStopped || this.iceRestartInProgress || this.iceDisconnectedGraceTimer) {
      return;
    }
    this.iceDisconnectedGraceTimer = setTimeout(() => {
      var _a;
      this.iceDisconnectedGraceTimer = null;
      if (this.iceRestartStopped)
        return;
      const state = (_a = this.peerConnection) === null || _a === void 0 ? void 0 : _a.iceConnectionState;
      if (state === "disconnected" || state === "failed") {
        void this.restartIce();
      }
    }, ICE_DISCONNECTED_GRACE_MS);
  }
  /**
   * Resolve once the signalling WebSocket is open (it auto-reconnects on close),
   * or reject if it is terminally closed / times out. Restart offers must never
   * be sent on a dead socket. Timeout + listener are stored so shutdown can clear
   * them (see clearPendingWsOpenWait).
   */
  ensureSignallingConnected() {
    if (this.signallingClient.isConnected()) {
      return Promise.resolve();
    }
    if (this.signallingClient.isPermanentlyClosed()) {
      return Promise.reject(new Error("signalling permanently closed"));
    }
    return new Promise((resolve, reject) => {
      this.pendingWsOpenReject = reject;
      this.pendingWsOpenTimeout = setTimeout(() => {
        this.clearPendingWsOpenWait();
        reject(new Error("timed out waiting for signalling WebSocket"));
      }, ENSURE_WS_OPEN_TIMEOUT_MS);
      const onOpen = () => {
        this.clearPendingWsOpenWait();
        resolve();
      };
      this.pendingWsOpenListener = onOpen;
      this.internalEventEmitter.addListener(InternalEvent.WEB_SOCKET_OPEN, onOpen);
    });
  }
  /**
   * Automatic ICE restart. Mints a new offer with fresh ICE credentials and
   * sends it over the existing channel. Bounded retries via a watchdog; on
   * exhaustion or terminal signalling, falls back to the WebRTC-failure path.
   */
  restartIce() {
    return __awaiter7(this, void 0, void 0, function* () {
      var _a, _b;
      if (!this.peerConnection || this.iceRestartInProgress || this.iceRestartStopped) {
        return;
      }
      if (this.signallingClient.isPermanentlyClosed()) {
        this.sendIceRestartMetric("aborted");
        this.cancelIceRestart();
        return;
      }
      if (this.iceRestartAttempts >= MAX_ICE_RESTART_ATTEMPTS) {
        console.error("StreamingClient - restartIce: exhausted attempts");
        (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.publishFailure({
          failureStage: "ice_connection",
          iceConnectionState: (_b = this.peerConnection) === null || _b === void 0 ? void 0 : _b.iceConnectionState
        });
        this.sendIceRestartMetric("exhausted");
        this.cancelIceRestart();
        this.handleWebrtcFailure("The connection to our servers was lost. Please try again.");
        return;
      }
      if (this.iceRestartAttempts === 0) {
        this.iceRestartEpisodeStartMs = performance.now();
        this.iceRestartEpisodeTrigger = this.peerConnection.iceConnectionState;
      }
      this.iceRestartInProgress = true;
      this.iceRestartAttempts += 1;
      try {
        if (this.peerConnection.signalingState !== "stable") {
          yield this.peerConnection.setLocalDescription({ type: "rollback" });
        }
        if (this.iceRestartAttempts === 1) {
          this.signallingClient.reconnectForIceRestart();
        }
        yield this.ensureSignallingConnected();
        if (this.iceRestartStopped)
          return;
        const currentIceState = this.peerConnection.iceConnectionState;
        if (currentIceState === "connected" || currentIceState === "completed") {
          this.iceRestartInProgress = false;
          this.sendIceRestartMetric("recovered");
          this.signallingClient.endIceRestartReconnect();
          return;
        }
        this.connectionReceivedAnswer = false;
        this.remoteIceCandidateBuffer = [];
        const offer = yield this.peerConnection.createOffer({ iceRestart: true });
        this.iceRestartCandidateBuffer = [];
        yield this.peerConnection.setLocalDescription(offer);
        if (!this.peerConnection.localDescription) {
          throw new Error("null local description after ICE restart offer");
        }
        yield this.signallingClient.sendOffer(this.peerConnection.localDescription);
        this.flushIceRestartCandidateBuffer();
        this.iceRestartAwaitedAnswer = false;
        this.clearIceRestartWatchdog();
        this.iceRestartWatchdogTimer = setTimeout(() => this.onIceRestartWatchdog(), ICE_RESTART_WATCHDOG_MS);
      } catch (err) {
        this.iceRestartCandidateBuffer = null;
        console.error("StreamingClient - restartIce: error", err);
        this.iceRestartInProgress = false;
        if (this.iceRestartStopped) {
          this.cancelIceRestart();
          return;
        }
        if (this.signallingClient.isPermanentlyClosed()) {
          this.sendIceRestartMetric("aborted");
          this.cancelIceRestart();
          return;
        }
        this.clearIceRestartWatchdog();
        this.iceRestartWatchdogTimer = setTimeout(() => {
          this.iceRestartWatchdogTimer = null;
          void this.restartIce();
        }, ICE_RESTART_WATCHDOG_MS);
      }
    });
  }
  // Watchdog for an outstanding restart offer. Only rolls back and re-offers
  // once the current offer is resolved, so a second offer is never minted while
  // the first offer's answer is still in flight (the ANSWER handler could
  // otherwise apply it against the wrong offer).
  onIceRestartWatchdog() {
    var _a;
    this.iceRestartWatchdogTimer = null;
    this.iceRestartInProgress = false;
    if (this.iceRestartStopped)
      return;
    const state = (_a = this.peerConnection) === null || _a === void 0 ? void 0 : _a.iceConnectionState;
    if (state === "connected" || state === "completed")
      return;
    if (!this.connectionReceivedAnswer && !this.iceRestartAwaitedAnswer) {
      this.iceRestartAwaitedAnswer = true;
      this.iceRestartInProgress = true;
      this.iceRestartWatchdogTimer = setTimeout(() => this.onIceRestartWatchdog(), ICE_RESTART_WATCHDOG_MS);
      return;
    }
    void this.restartIce();
  }
  onConnectionStateChange() {
    var _a, _b, _c, _d, _e;
    const connectionState = (_a = this.peerConnection) === null || _a === void 0 ? void 0 : _a.connectionState;
    if (connectionState) {
      (_b = this.connectionMilestones) === null || _b === void 0 ? void 0 : _b.record("webrtc_connection_state_changed", {
        connectionState
      });
    }
    if (connectionState === "failed") {
      const iceState = (_c = this.peerConnection) === null || _c === void 0 ? void 0 : _c.iceConnectionState;
      const recovering = !this.iceRestartStopped && (iceState === "disconnected" || iceState === "failed");
      if (!recovering) {
        (_d = this.connectionMilestones) === null || _d === void 0 ? void 0 : _d.publishFailure({
          failureStage: "webrtc_connection",
          connectionState
        });
      }
    }
    if (((_e = this.peerConnection) === null || _e === void 0 ? void 0 : _e.connectionState) === "closed") {
      console.error("StreamingClient - onConnectionStateChange: Connection closed");
      this.handleWebrtcFailure("The connection to our servers was lost. Please try again.");
    }
  }
  handleWebrtcFailure(err) {
    var _a, _b;
    (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("webrtc_failure", getErrorTags(err));
    (_b = this.connectionMilestones) === null || _b === void 0 ? void 0 : _b.publishFailure(Object.assign({ failureStage: "webrtc" }, getErrorTags(err)));
    console.error({ message: "StreamingClient - handleWebrtcFailure: ", err });
    if (err.name === "NotAllowedError" && err.message === "Permission denied") {
      this.publicEventEmitter.emit(AnamEvent.CONNECTION_CLOSED, ConnectionClosedCode.MICROPHONE_PERMISSION_DENIED);
    } else {
      this.publicEventEmitter.emit(AnamEvent.CONNECTION_CLOSED, ConnectionClosedCode.WEBRTC_FAILURE);
    }
    try {
      this.stopConnection();
    } catch (error) {
      console.error("StreamingClient - handleWebrtcFailure: error stopping connection", error);
    }
  }
  onTrackEventHandler(event) {
    var _a, _b;
    if (event.track.kind === "video") {
      (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("video_track_received");
      this.startSuccessMetricPolling();
      this.videoStream = event.streams[0];
      this.publicEventEmitter.emit(AnamEvent.VIDEO_STREAM_STARTED, this.videoStream);
      if (this.videoElement) {
        this.videoElement.srcObject = this.videoStream;
        const handle = this.videoElement.requestVideoFrameCallback(() => {
          var _a2;
          (_a2 = this.videoElement) === null || _a2 === void 0 ? void 0 : _a2.cancelVideoFrameCallback(handle);
          this.publicEventEmitter.emit(AnamEvent.VIDEO_PLAY_STARTED);
          this.recordSessionSuccess("videoElement");
        });
      }
    } else if (event.track.kind === "audio") {
      (_b = this.connectionMilestones) === null || _b === void 0 ? void 0 : _b.record("audio_track_received");
      this.audioStream = event.streams[0];
      this.publicEventEmitter.emit(AnamEvent.AUDIO_STREAM_STARTED, this.audioStream);
    }
  }
  /**
   * Set up the data channels for sending and receiving messages
   */
  setupDataChannels() {
    return __awaiter7(this, void 0, void 0, function* () {
      var _a;
      if (!this.peerConnection) {
        console.error("StreamingClient - setupDataChannels: peer connection is not initialized");
        return;
      }
      if (!this.disableInputAudio && this.inputAudioStream) {
        if (!this.inputAudioStream.getAudioTracks().length) {
          throw new Error("StreamingClient - setupDataChannels: user provided stream does not have audio tracks");
        }
      }
      const dataChannel = this.peerConnection.createDataChannel("session", {
        ordered: true
      });
      (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("data_channel_created");
      dataChannel.onopen = () => {
        var _a2;
        this.dataChannel = dataChannel !== null && dataChannel !== void 0 ? dataChannel : null;
        (_a2 = this.connectionMilestones) === null || _a2 === void 0 ? void 0 : _a2.record("data_channel_open");
        this.publicEventEmitter.emit(AnamEvent.DATA_CHANNEL_OPEN);
      };
      dataChannel.onclose = () => {
        var _a2;
        (_a2 = this.connectionMilestones) === null || _a2 === void 0 ? void 0 : _a2.record("data_channel_closed");
      };
      dataChannel.onmessage = (event) => {
        var _a2, _b, _c, _d, _e, _f, _g;
        try {
          const message = JSON.parse(event.data);
          switch (message.messageType) {
            case DataChannelMessage.SPEECH_TEXT:
              this.internalEventEmitter.emit(InternalEvent.WEBRTC_CHAT_MESSAGE_RECEIVED, message.data);
              break;
            case DataChannelMessage.CLIENT_TOOL_EVENT:
              const webRtcToolEvent = message.data;
              this.internalEventEmitter.emit(InternalEvent.WEBRTC_CLIENT_TOOL_EVENT_RECEIVED, webRtcToolEvent);
              const clientToolEvent = ToolCallManager.WebRTCClientToolEventToClientToolEvent(webRtcToolEvent);
              this.publicEventEmitter.emit(AnamEvent.CLIENT_TOOL_EVENT_RECEIVED, clientToolEvent);
              break;
            case DataChannelMessage.TOOL_CALL_STARTED_EVENT:
              const webRtcToolCallStartedEvent = message.data;
              this.publicEventEmitter.emit(AnamEvent.TOOL_CALL_STARTED, this.toolCallManager.WebRTCToolCallStartedEventToToolCallStartedPayload(webRtcToolCallStartedEvent));
              this.internalEventEmitter.emit(InternalEvent.WEBRTC_TOOL_CALL_STARTED_EVENT_RECEIVED, webRtcToolCallStartedEvent);
              break;
            case DataChannelMessage.TOOL_CALL_COMPLETED_EVENT:
              const webRtcToolCallCompletedEvent = message.data;
              this.publicEventEmitter.emit(AnamEvent.TOOL_CALL_COMPLETED, this.toolCallManager.webRTCToolCallCompletedEventToToolCallCompletedPayload(webRtcToolCallCompletedEvent));
              this.internalEventEmitter.emit(InternalEvent.WEBRTC_TOOL_CALL_COMPLETED_EVENT_RECEIVED, webRtcToolCallCompletedEvent);
              break;
            case DataChannelMessage.TOOL_CALL_FAILED_EVENT:
              const webRtcToolCallFailedEvent = message.data;
              this.publicEventEmitter.emit(AnamEvent.TOOL_CALL_FAILED, this.toolCallManager.webRTCToolCallFailedEventToToolCallFailedPayload(webRtcToolCallFailedEvent));
              this.internalEventEmitter.emit(InternalEvent.WEBRTC_TOOL_CALL_FAILED_EVENT_RECEIVED, webRtcToolCallFailedEvent);
              break;
            case DataChannelMessage.REASONING_TEXT:
              this.internalEventEmitter.emit(InternalEvent.WEBRTC_REASONING_TEXT_MESSAGE_RECEIVED, message.data);
              break;
            case DataChannelMessage.USER_SPEECH_STARTED:
              this.publicEventEmitter.emit(AnamEvent.USER_SPEECH_STARTED, (_b = (_a2 = message.data) === null || _a2 === void 0 ? void 0 : _a2.user_action_correlation_id) !== null && _b !== void 0 ? _b : "unknown");
              break;
            case DataChannelMessage.USER_SPEECH_ENDED:
              this.publicEventEmitter.emit(AnamEvent.USER_SPEECH_ENDED, (_d = (_c = message.data) === null || _c === void 0 ? void 0 : _c.user_action_correlation_id) !== null && _d !== void 0 ? _d : "unknown");
              break;
            case DataChannelMessage.DIRECTOR_NOTE_CUE_APPLIED:
              const cueAppliedEvent = message.data;
              this.publicEventEmitter.emit(AnamEvent.DIRECTOR_NOTE_CUE_APPLIED, {
                cueTag: (_e = cueAppliedEvent === null || cueAppliedEvent === void 0 ? void 0 : cueAppliedEvent.cue_tag) !== null && _e !== void 0 ? _e : "unknown",
                correlationId: (_f = cueAppliedEvent === null || cueAppliedEvent === void 0 ? void 0 : cueAppliedEvent.user_action_correlation_id) !== null && _f !== void 0 ? _f : "unknown"
              });
              break;
            case DataChannelMessage.PERSONA_CONFIG_UPDATE_APPLIED:
              const updateAppliedEvent = message.data;
              this.publicEventEmitter.emit(AnamEvent.PERSONA_CONFIG_UPDATE_APPLIED, {
                changedFields: (_g = updateAppliedEvent === null || updateAppliedEvent === void 0 ? void 0 : updateAppliedEvent.changed_fields) !== null && _g !== void 0 ? _g : {}
              });
              break;
            // Unknown message types are silently ignored to maintain forward compatibility
            default:
              break;
          }
        } catch (error) {
          console.error("Failed to parse data channel message:", error);
        }
      };
    });
  }
  /**
   * Request microphone permission asynchronously without blocking connection
   */
  requestMicrophonePermissionAsync() {
    return __awaiter7(this, void 0, void 0, function* () {
      var _a, _b, _c;
      if (this.inputAudioState.permissionState === AudioPermissionState.PENDING) {
        return;
      }
      this.inputAudioState = Object.assign(Object.assign({}, this.inputAudioState), { permissionState: AudioPermissionState.PENDING });
      (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("microphone_permission_pending");
      this.publicEventEmitter.emit(AnamEvent.MIC_PERMISSION_PENDING);
      try {
        const audioConstraints = buildInputAudioConstraints(this.audioDeviceId);
        const captureConnection = this.peerConnection;
        const capturedStream = yield navigator.mediaDevices.getUserMedia({
          audio: audioConstraints
        });
        if (!captureConnection || this.peerConnection !== captureConnection || captureConnection.connectionState === "closed" || this.iceRestartStopped) {
          capturedStream.getTracks().forEach((track) => track.stop());
          return;
        }
        this.inputAudioStream = capturedStream;
        this.inputAudioState = Object.assign(Object.assign({}, this.inputAudioState), { permissionState: AudioPermissionState.GRANTED });
        (_b = this.connectionMilestones) === null || _b === void 0 ? void 0 : _b.record("microphone_permission_granted");
        this.publicEventEmitter.emit(AnamEvent.MIC_PERMISSION_GRANTED);
        yield this.setupAudioTrack("initial");
      } catch (error) {
        console.error("Failed to get microphone permission:", error);
        this.inputAudioState = Object.assign(Object.assign({}, this.inputAudioState), { permissionState: AudioPermissionState.DENIED });
        (_c = this.connectionMilestones) === null || _c === void 0 ? void 0 : _c.record("microphone_permission_denied", Object.assign({}, getErrorTags(error)));
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.publicEventEmitter.emit(AnamEvent.MIC_PERMISSION_DENIED, errorMessage);
      }
    });
  }
  /**
   * Set up audio track and add it to the peer connection using replaceTrack
   */
  setupAudioTrack(capturePath) {
    return __awaiter7(this, void 0, void 0, function* () {
      var _a;
      if (!this.peerConnection || !this.inputAudioStream) {
        return;
      }
      if (!this.inputAudioStream.getAudioTracks().length) {
        console.error("StreamingClient - setupAudioTrack: stream does not have audio tracks");
        return;
      }
      if (this.inputAudioState.isMuted) {
        this.muteAllAudioTracks();
      }
      const audioTrack = this.inputAudioStream.getAudioTracks()[0];
      const existingSenders = this.peerConnection.getSenders();
      const audioSender = existingSenders.find((sender) => {
        var _a2;
        return ((_a2 = sender.track) === null || _a2 === void 0 ? void 0 : _a2.kind) === "audio" || sender.track === null && sender.dtmf !== null;
      });
      if (audioSender) {
        try {
          yield audioSender.replaceTrack(audioTrack);
        } catch (error) {
          console.error("Failed to replace audio track:", error);
          this.peerConnection.addTrack(audioTrack, this.inputAudioStream);
        }
      } else {
        this.peerConnection.addTrack(audioTrack, this.inputAudioStream);
      }
      reportInputAudioSettings(audioTrack, capturePath);
      (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("input_audio_stream_started", {
        audioTrackCount: this.inputAudioStream.getAudioTracks().length
      });
      this.publicEventEmitter.emit(AnamEvent.INPUT_AUDIO_STREAM_STARTED, this.inputAudioStream);
    });
  }
  initPeerConnectionAndSendOffer() {
    return __awaiter7(this, void 0, void 0, function* () {
      var _a, _b, _c, _d, _e, _f;
      yield this.initPeerConnection();
      if (!this.peerConnection) {
        console.error("StreamingClient - initPeerConnectionAndSendOffer: peer connection is not initialized");
        return;
      }
      try {
        (_a = this.connectionMilestones) === null || _a === void 0 ? void 0 : _a.record("offer_creation_started");
        const offer = yield this.peerConnection.createOffer();
        (_b = this.connectionMilestones) === null || _b === void 0 ? void 0 : _b.record("offer_creation_completed");
        yield this.peerConnection.setLocalDescription(offer);
        (_c = this.connectionMilestones) === null || _c === void 0 ? void 0 : _c.record("local_description_set");
      } catch (error) {
        console.error("StreamingClient - initPeerConnectionAndSendOffer: error creating offer", error);
        (_d = this.connectionMilestones) === null || _d === void 0 ? void 0 : _d.record("offer_creation_failed", Object.assign({}, getErrorTags(error)));
        (_e = this.connectionMilestones) === null || _e === void 0 ? void 0 : _e.publishFailure(Object.assign({ failureStage: "offer_creation" }, getErrorTags(error)));
      }
      if (!this.peerConnection.localDescription) {
        throw new Error("StreamingClient - initPeerConnectionAndSendOffer: local description is null");
      }
      yield this.signallingClient.sendOffer(this.peerConnection.localDescription);
      (_f = this.connectionMilestones) === null || _f === void 0 ? void 0 : _f.record("offer_sent");
    });
  }
  shutdown() {
    return __awaiter7(this, void 0, void 0, function* () {
      var _a;
      this.iceRestartStopped = true;
      this.cancelIceRestart();
      if (this.showPeerConnectionStatsReport) {
        const stats = yield (_a = this.peerConnection) === null || _a === void 0 ? void 0 : _a.getStats();
        if (stats) {
          const report = createRTCStatsReport(stats, this.peerConnectionStatsReportOutputFormat);
          if (report) {
            console.log(report, void 0, 2);
          }
        }
      }
      if (this.statsCollectionInterval) {
        clearInterval(this.statsCollectionInterval);
        this.statsCollectionInterval = null;
      }
      if (this.successMetricPoller) {
        clearInterval(this.successMetricPoller);
        this.successMetricPoller = null;
      }
      this.successMetricFired = false;
      try {
        if (this.inputAudioStream) {
          this.inputAudioStream.getTracks().forEach((track) => {
            track.stop();
          });
        }
        this.inputAudioStream = null;
      } catch (error) {
        console.error("StreamingClient - shutdown: error stopping input audio stream", error);
      }
      try {
        this.signallingClient.stop();
      } catch (error) {
        console.error("StreamingClient - shutdown: error stopping signallilng", error);
      }
      try {
        if (this.peerConnection && this.peerConnection.connectionState !== "closed") {
          this.peerConnection.onconnectionstatechange = null;
          this.peerConnection.close();
          this.peerConnection = null;
        }
      } catch (error) {
        console.error("StreamingClient - shutdown: error closing peer connection", error);
      }
    });
  }
};
var getIceCandidateMilestoneTags = (candidate) => {
  const safeCandidate = candidate;
  return removeEmptyTags({
    candidateType: safeCandidate.type,
    protocol: safeCandidate.protocol,
    relayProtocol: safeCandidate.relayProtocol,
    tcpType: safeCandidate.tcpType,
    component: safeCandidate.component
  });
};
var getErrorTags = (error) => {
  if (error instanceof Error) {
    return removeEmptyTags({ errorName: error.name });
  }
  if (typeof error === "object" && error !== null) {
    const possibleError = error;
    return removeEmptyTags({
      errorName: typeof possibleError.name === "string" ? possibleError.name : void 0,
      errorCode: typeof possibleError.code === "string" || typeof possibleError.code === "number" ? possibleError.code : void 0
    });
  }
  return {};
};
var removeEmptyTags = (tags) => {
  const sanitizedTags = {};
  Object.entries(tags).forEach(([key, value]) => {
    if (value !== void 0) {
      sanitizedTags[key] = value;
    }
  });
  return sanitizedTags;
};

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/modules/ReasoningHistoryClient.js
var ReasoningHistoryClient = class {
  constructor(publicEventEmitter, internalEventEmitter) {
    this.reasoning_messages = [];
    this.publicEventEmitter = publicEventEmitter;
    this.internalEventEmitter = internalEventEmitter;
    this.internalEventEmitter.addListener(InternalEvent.WEBRTC_REASONING_TEXT_MESSAGE_RECEIVED, this.processWebRtcReasoningTextMessageEvent.bind(this));
  }
  webRtcTextMessageEventToReasoningStreamEvent(event) {
    return {
      id: `${event.role}::${event.message_id}`,
      content: event.content,
      endOfThought: event.end_of_thought,
      role: event.role
    };
  }
  processWebRtcReasoningTextMessageEvent(event) {
    const ReasoningStreamEvent = this.webRtcTextMessageEventToReasoningStreamEvent(event);
    this.publicEventEmitter.emit(AnamEvent.REASONING_STREAM_EVENT_RECEIVED, ReasoningStreamEvent);
    const message = {
      id: ReasoningStreamEvent.id,
      content: ReasoningStreamEvent.content,
      role: ReasoningStreamEvent.role
    };
    const existingMessageIndex = this.reasoning_messages.findIndex((m) => m.id === message.id);
    if (existingMessageIndex !== -1) {
      const existingMessage = this.reasoning_messages[existingMessageIndex];
      existingMessage.content += message.content;
      this.reasoning_messages[existingMessageIndex] = existingMessage;
    } else {
      this.reasoning_messages.push(message);
    }
    if (ReasoningStreamEvent.endOfThought) {
      this.publicEventEmitter.emit(AnamEvent.REASONING_HISTORY_UPDATED, this.reasoning_messages);
    }
  }
};

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/AnamClient.js
var __awaiter8 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var AnamClient = class {
  constructor(sessionToken, personaConfig, options) {
    var _a, _b, _c, _d, _e;
    this.inputAudioState = {
      isMuted: false,
      permissionState: AudioPermissionState.NOT_REQUESTED
    };
    this.sessionId = null;
    this.servedRegion = null;
    this.organizationId = null;
    this.streamingClient = null;
    this._isStreaming = false;
    const configError = this.validateClientConfig(sessionToken, personaConfig, options);
    if (configError) {
      throw new ClientError(configError, ErrorCode.CLIENT_ERROR_CODE_CONFIGURATION_ERROR, 400);
    }
    this.personaConfig = personaConfig;
    this.clientOptions = options;
    if (((_a = options === null || options === void 0 ? void 0 : options.api) === null || _a === void 0 ? void 0 : _a.baseUrl) || ((_b = options === null || options === void 0 ? void 0 : options.api) === null || _b === void 0 ? void 0 : _b.apiVersion)) {
      setClientMetricsBaseUrl(options.api.baseUrl || DEFAULT_ANAM_METRICS_BASE_URL, options.api.apiVersion || DEFAULT_ANAM_API_VERSION);
    }
    if ((_d = (_c = options === null || options === void 0 ? void 0 : options.api) === null || _c === void 0 ? void 0 : _c.apiGateway) === null || _d === void 0 ? void 0 : _d.enabled) {
      setClientMetricsApiGateway(options.api.apiGateway);
    }
    if ((_e = options === null || options === void 0 ? void 0 : options.metrics) === null || _e === void 0 ? void 0 : _e.disableClientMetrics) {
      setClientMetricsDisabled(true);
    }
    this.publicEventEmitter = new PublicEventEmitter();
    this.internalEventEmitter = new InternalEventEmitter();
    this.toolCallManager = new ToolCallManager(this.publicEventEmitter, this.internalEventEmitter);
    this.apiClient = new CoreApiRestClient(sessionToken, options === null || options === void 0 ? void 0 : options.apiKey, options === null || options === void 0 ? void 0 : options.api);
    this.messageHistoryClient = new MessageHistoryClient(this.publicEventEmitter, this.internalEventEmitter);
    this.reasoningHistoryClient = new ReasoningHistoryClient(this.publicEventEmitter, this.internalEventEmitter);
  }
  decodeJwt(token) {
    try {
      const base64Payload = token.split(".")[1];
      const payloadString = import_buffer.Buffer.from(base64Payload, "base64").toString("utf8");
      const payload = JSON.parse(payloadString);
      return payload;
    } catch (error) {
      throw new Error("Invalid session token format");
    }
  }
  validateClientConfig(sessionToken, personaConfig, options) {
    var _a, _b;
    if (!sessionToken && !(options === null || options === void 0 ? void 0 : options.apiKey)) {
      return "Either sessionToken or apiKey must be provided";
    }
    if ((options === null || options === void 0 ? void 0 : options.apiKey) && sessionToken) {
      return "Only one of sessionToken or apiKey should be used";
    }
    const apiGatewayError = validateApiGatewayConfig((_a = options === null || options === void 0 ? void 0 : options.api) === null || _a === void 0 ? void 0 : _a.apiGateway);
    if (apiGatewayError) {
      return apiGatewayError;
    }
    if (sessionToken) {
      const decodedToken = this.decodeJwt(sessionToken);
      this.organizationId = decodedToken.accountId;
      setMetricsContext({
        organizationId: this.organizationId
      });
      const tokenType = (_b = decodedToken.type) === null || _b === void 0 ? void 0 : _b.toLowerCase();
      if (tokenType === "legacy") {
        return "Legacy session tokens are no longer supported. Please define your persona when creating your session token. See https://docs.anam.ai/resources/migrating-legacy for more information.";
      } else if (tokenType === "ephemeral" || tokenType === "stateful") {
        if (personaConfig) {
          return "This session token already contains a persona configuration. Please remove the personaConfig parameter.";
        }
      }
    } else {
      if (!personaConfig) {
        return "Missing persona config. Persona configuration must be provided when using apiKey";
      }
    }
    const personaConfigError = getPersonaConfigValidationError(personaConfig);
    if (personaConfigError) {
      return personaConfigError;
    }
    if (options === null || options === void 0 ? void 0 : options.voiceDetection) {
      if (options.disableInputAudio) {
        return "Voice detection is disabled because input audio is disabled. Please set disableInputAudio to false to enable voice detection.";
      }
      if (options.voiceDetection.endOfSpeechSensitivity !== void 0) {
        if (typeof options.voiceDetection.endOfSpeechSensitivity !== "number") {
          return "End of speech sensitivity must be a number";
        }
        if (options.voiceDetection.endOfSpeechSensitivity < 0 || options.voiceDetection.endOfSpeechSensitivity > 1) {
          return "End of speech sensitivity must be between 0 and 1";
        }
      }
    }
    return void 0;
  }
  buildStartSessionOptionsForClient() {
    var _a;
    const sessionOptions = {};
    if ((_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.voiceDetection) {
      sessionOptions.voiceDetection = this.clientOptions.voiceDetection;
    }
    if (Object.keys(sessionOptions).length === 0) {
      return void 0;
    }
    return sessionOptions;
  }
  startConnectionAttempt() {
    var _a, _b, _c, _d;
    const attemptCorrelationId = generateCorrelationId();
    setMetricsContext({
      attemptCorrelationId,
      sessionId: null,
      organizationId: this.organizationId
    });
    const connectionMilestones = new ClientConnectionMilestoneRecorder({
      context: {
        attemptCorrelationId,
        sessionId: null,
        organizationId: this.organizationId
      },
      connectionMilestoneSampleRatio: (_b = (_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.metrics) === null || _b === void 0 ? void 0 : _b.connectionMilestoneSampleRatio,
      slowConnectionThresholdMs: (_d = (_c = this.clientOptions) === null || _c === void 0 ? void 0 : _c.metrics) === null || _d === void 0 ? void 0 : _d.slowConnectionThresholdMs
    });
    sendClientMetric(ClientMetricMeasurement.CLIENT_METRIC_MEASUREMENT_SESSION_ATTEMPT, "1");
    return connectionMilestones;
  }
  startSession(userProvidedAudioStream, connectionMilestones) {
    return __awaiter8(this, void 0, void 0, function* () {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
      const config = this.personaConfig;
      this.validatePersonaConfigOrThrow(config);
      const sessionOptions = this.buildStartSessionOptionsForClient();
      connectionMilestones === null || connectionMilestones === void 0 ? void 0 : connectionMilestones.record("start_session_request_started");
      let response;
      try {
        response = yield this.apiClient.startSession(config, sessionOptions);
        connectionMilestones === null || connectionMilestones === void 0 ? void 0 : connectionMilestones.record("start_session_request_completed");
      } catch (error) {
        connectionMilestones === null || connectionMilestones === void 0 ? void 0 : connectionMilestones.record("start_session_request_failed", Object.assign({}, getErrorMilestoneTags(error)));
        connectionMilestones === null || connectionMilestones === void 0 ? void 0 : connectionMilestones.publishFailure(Object.assign({ failureStage: "start_session_request" }, getErrorMilestoneTags(error)));
        throw error;
      }
      const { sessionId, clientConfig, engineHost, engineProtocol, signallingEndpoint, region } = response;
      const { heartbeatIntervalSeconds, maxWsReconnectionAttempts, iceServers: defaultIceServers, iceTransportPolicy } = clientConfig;
      this.sessionId = sessionId;
      this.servedRegion = region !== null && region !== void 0 ? region : null;
      this.toolCallManager.setActiveSession(sessionId);
      setMetricsContext({
        sessionId: this.sessionId
      });
      connectionMilestones === null || connectionMilestones === void 0 ? void 0 : connectionMilestones.updateContext({
        sessionId: this.sessionId,
        organizationId: this.organizationId
      });
      const iceServers = (_e = (_b = (_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.iceServers) !== null && _b !== void 0 ? _b : (_d = (_c = this.clientOptions) === null || _c === void 0 ? void 0 : _c.rtcConfiguration) === null || _d === void 0 ? void 0 : _d.iceServers) !== null && _e !== void 0 ? _e : defaultIceServers;
      try {
        this.streamingClient = new StreamingClient(sessionId, {
          engine: {
            baseUrl: `${engineProtocol}://${engineHost}`
          },
          signalling: {
            heartbeatIntervalSeconds,
            maxWsReconnectionAttempts,
            url: {
              baseUrl: engineHost,
              protocol: engineProtocol,
              signallingPath: signallingEndpoint
            }
          },
          iceServers,
          iceTransportPolicy,
          rtcConfiguration: (_f = this.clientOptions) === null || _f === void 0 ? void 0 : _f.rtcConfiguration,
          inputAudio: {
            inputAudioState: this.inputAudioState,
            userProvidedMediaStream: ((_g = this.clientOptions) === null || _g === void 0 ? void 0 : _g.disableInputAudio) ? void 0 : userProvidedAudioStream,
            audioDeviceId: (_h = this.clientOptions) === null || _h === void 0 ? void 0 : _h.audioDeviceId,
            disableInputAudio: (_j = this.clientOptions) === null || _j === void 0 ? void 0 : _j.disableInputAudio
          },
          apiGateway: (_l = (_k = this.clientOptions) === null || _k === void 0 ? void 0 : _k.api) === null || _l === void 0 ? void 0 : _l.apiGateway,
          metrics: {
            showPeerConnectionStatsReport: (_p = (_o = (_m = this.clientOptions) === null || _m === void 0 ? void 0 : _m.metrics) === null || _o === void 0 ? void 0 : _o.showPeerConnectionStatsReport) !== null && _p !== void 0 ? _p : false,
            peerConnectionStatsReportOutputFormat: (_s = (_r = (_q = this.clientOptions) === null || _q === void 0 ? void 0 : _q.metrics) === null || _r === void 0 ? void 0 : _r.peerConnectionStatsReportOutputFormat) !== null && _s !== void 0 ? _s : "console"
          }
        }, this.publicEventEmitter, this.internalEventEmitter, this.toolCallManager, connectionMilestones);
      } catch (error) {
        connectionMilestones === null || connectionMilestones === void 0 ? void 0 : connectionMilestones.publishFailure(Object.assign({ failureStage: "streaming_client_initialization" }, getErrorMilestoneTags(error)));
        this.toolCallManager.clearSessionState();
        this.servedRegion = null;
        setMetricsContext({
          sessionId: null
        });
        throw new ClientError("Failed to initialize streaming client", ErrorCode.CLIENT_ERROR_CODE_SERVER_ERROR, 500, {
          cause: error instanceof Error ? error.message : String(error),
          sessionId
        });
      }
      return sessionId;
    });
  }
  startSessionIfNeeded(userProvidedAudioStream, connectionMilestones) {
    return __awaiter8(this, void 0, void 0, function* () {
      if (!this.sessionId || !this.streamingClient) {
        yield this.startSession(userProvidedAudioStream, connectionMilestones);
        if (!this.sessionId || !this.streamingClient) {
          connectionMilestones === null || connectionMilestones === void 0 ? void 0 : connectionMilestones.publishFailure({
            failureStage: "start_session_validation"
          });
          throw new ClientError("Session ID or streaming client is not available after starting session", ErrorCode.CLIENT_ERROR_CODE_SERVER_ERROR, 500, {
            cause: "Failed to initialize session properly"
          });
        }
      }
    });
  }
  stream(userProvidedAudioStream) {
    return __awaiter8(this, void 0, void 0, function* () {
      var _a;
      if (this._isStreaming) {
        throw new Error("Already streaming");
      }
      const connectionMilestones = this.startConnectionAttempt();
      if (((_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.disableInputAudio) && userProvidedAudioStream) {
        console.warn("AnamClient: Input audio is disabled. User-provided audio stream will be ignored.");
      }
      try {
        yield this.startSessionIfNeeded(userProvidedAudioStream, connectionMilestones);
      } catch (error) {
        connectionMilestones.publishFailure(Object.assign({ failureStage: "start_session" }, getErrorMilestoneTags(error)));
        throw error;
      }
      this._isStreaming = true;
      return new Promise((resolve) => {
        var _a2;
        const streams = [];
        let videoReceived = false;
        let audioReceived = false;
        this.publicEventEmitter.addListener(AnamEvent.VIDEO_STREAM_STARTED, (videoStream) => {
          streams.push(videoStream);
          videoReceived = true;
          if (audioReceived) {
            resolve(streams);
          }
        });
        this.publicEventEmitter.addListener(AnamEvent.AUDIO_STREAM_STARTED, (audioStream) => {
          streams.push(audioStream);
          audioReceived = true;
          if (videoReceived) {
            resolve(streams);
          }
        });
        (_a2 = this.streamingClient) === null || _a2 === void 0 ? void 0 : _a2.startConnection();
      });
    });
  }
  /**
   * @deprecated This method is deprecated. Please use streamToVideoElement instead.
   */
  streamToVideoAndAudioElements(videoElementId, audioElementId, userProvidedAudioStream) {
    return __awaiter8(this, void 0, void 0, function* () {
      console.warn("AnamClient: streamToVideoAndAudioElements is deprecated. To avoid possible audio issues, please use streamToVideoElement instead.");
      yield this.streamToVideoElement(videoElementId, userProvidedAudioStream);
    });
  }
  streamToVideoElement(videoElementId, userProvidedAudioStream) {
    return __awaiter8(this, void 0, void 0, function* () {
      var _a;
      const connectionMilestones = this.startConnectionAttempt();
      if (((_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.disableInputAudio) && userProvidedAudioStream) {
        console.warn("AnamClient: Input audio is disabled. User-provided audio stream will be ignored.");
      }
      try {
        yield this.startSessionIfNeeded(userProvidedAudioStream, connectionMilestones);
      } catch (error) {
        connectionMilestones.publishFailure(Object.assign({ failureStage: "start_session" }, getErrorMilestoneTags(error)));
        if (error instanceof ClientError) {
          throw error;
        }
        throw new ClientError("Failed to start session", ErrorCode.CLIENT_ERROR_CODE_SERVER_ERROR, 500, {
          cause: error instanceof Error ? error.message : String(error),
          sessionId: this.sessionId
        });
      }
      if (this._isStreaming) {
        connectionMilestones.publishFailure({
          failureStage: "already_streaming"
        });
        throw new Error("Already streaming");
      }
      this._isStreaming = true;
      if (!this.streamingClient) {
        connectionMilestones.publishFailure({
          failureStage: "streaming_client_missing"
        });
        throw new Error("Failed to stream: streaming client is not available");
      }
      try {
        this.streamingClient.setMediaStreamTargetById(videoElementId);
        this.streamingClient.startConnection();
      } catch (error) {
        connectionMilestones.publishFailure(Object.assign({ failureStage: "start_connection" }, getErrorMilestoneTags(error)));
        throw error;
      }
    });
  }
  /**
   * Send a talk command to make the persona speak the provided content.
   * @param content - The text content for the persona to speak
   * @throws Error if session is not started or not currently streaming
   */
  talk(content) {
    return __awaiter8(this, void 0, void 0, function* () {
      if (!this.streamingClient) {
        throw new Error("Failed to send talk command: session is not started. Have you called startSession?");
      }
      if (!this._isStreaming) {
        throw new Error("Failed to send talk command: not currently streaming. Have you called stream?");
      }
      yield this.streamingClient.sendTalkCommand(content);
      return;
    });
  }
  /**
   * Send a raw data message through the WebRTC data channel.
   * @param message - The message string to send through the data channel
   * @throws Error if session is not started
   */
  sendDataMessage(message) {
    if (this.streamingClient) {
      this.streamingClient.sendDataMessage(message);
    } else {
      throw new Error("Failed to send message: session is not started.");
    }
  }
  /**
   * Send a user text message in the active streaming session.
   * @param content - The text message content to send
   * @throws Error if not currently streaming or session is not started
   */
  sendUserMessage(content) {
    if (!this._isStreaming) {
      console.warn("AnamClient: Not currently streaming. User message will not be sent.");
      throw new Error("Failed to send user message: not currently streaming");
    }
    const sessionId = this.getActiveSessionId();
    if (!sessionId) {
      throw new Error("Failed to send user message: no active session");
    }
    const currentTimestamp = (/* @__PURE__ */ new Date()).toISOString().replace("Z", "");
    const body = JSON.stringify({
      content,
      timestamp: currentTimestamp,
      session_id: sessionId,
      message_type: "speech"
    });
    this.sendDataMessage(body);
  }
  interruptPersona() {
    if (!this._isStreaming) {
      throw new Error("Failed to send interrupt command: not currently streaming");
    }
    const sessionId = this.getActiveSessionId();
    if (!sessionId) {
      throw new Error("Failed to send interrupt command: no active session");
    }
    const body = JSON.stringify({
      message_type: "interrupt",
      session_id: sessionId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
      // Removing the trailing Z is unnecessary.
    });
    this.sendDataMessage(body);
  }
  /**
   * Add context information to the active streaming session.
   * This allows injecting additional context (e.g., DOM state, user actions)
   * that the persona can use to inform its responses.
   * @param content - The context content string to send
   * @throws Error if not currently streaming or no active session
   */
  addContext(content) {
    if (!this._isStreaming) {
      throw new Error("Failed to add context: not currently streaming");
    }
    const sessionId = this.getActiveSessionId();
    if (!sessionId) {
      throw new Error("Failed to add context: no active session");
    }
    const body = JSON.stringify({
      message_type: "context",
      session_id: sessionId,
      content
    });
    this.sendDataMessage(body);
  }
  /**
   * Send a Director Note cue to the active streaming session without purging
   * buffered audio or video (Cara 4 avatars only).
   *
   * Omit timing to apply the cue immediately. `inSeconds` delays from now;
   * `atSeconds` targets an absolute offset from the start of persona speech.
   *
   * @param tag - Runtime performance cue understood by the engine.
   * @param options - Optional mutually exclusive cue timing.
   * @throws Error if not currently streaming, if the data channel is not open,
   * or if the cue is invalid
   */
  sendDirectorNoteCue(tag, options = {}) {
    var _a;
    if (!this._isStreaming) {
      throw new Error("Failed to send Director Note cue: not currently streaming");
    }
    if (typeof tag !== "string" || tag.length === 0) {
      throw new Error("Failed to send Director Note cue: tag must not be empty");
    }
    if (import_buffer.Buffer.byteLength(tag, "utf8") > 64) {
      throw new Error("Failed to send Director Note cue: tag must not exceed 64 bytes");
    }
    if (!DIRECTOR_NOTE_CUE_TAGS.includes(tag)) {
      throw new Error(`Failed to send Director Note cue: unsupported tag "${tag}"`);
    }
    const { inSeconds, atSeconds } = options;
    if (inSeconds !== void 0 && atSeconds !== void 0) {
      throw new Error("Failed to send Director Note cue: provide only one of inSeconds or atSeconds");
    }
    for (const [name, value] of [
      ["inSeconds", inSeconds],
      ["atSeconds", atSeconds]
    ]) {
      if (value !== void 0 && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) {
        throw new Error(`Failed to send Director Note cue: ${name} must be a finite non-negative number`);
      }
    }
    const body = JSON.stringify(Object.assign(Object.assign({ message_type: "director_note_cue", cue: { tag } }, inSeconds !== void 0 ? { in_seconds: inSeconds } : {}), atSeconds !== void 0 ? { at_seconds: atSeconds } : {}));
    if (!((_a = this.streamingClient) === null || _a === void 0 ? void 0 : _a.sendDataMessage(body))) {
      throw new Error("Failed to send Director Note cue: data channel is not open");
    }
  }
  stopStreaming() {
    return __awaiter8(this, void 0, void 0, function* () {
      if (this.streamingClient) {
        this.publicEventEmitter.emit(AnamEvent.CONNECTION_CLOSED, ConnectionClosedCode.NORMAL);
        this.toolCallManager.clearSessionState();
        yield this.streamingClient.stopConnection();
        this.streamingClient = null;
        this.sessionId = null;
        this.servedRegion = null;
        setMetricsContext({
          attemptCorrelationId: null,
          sessionId: null,
          organizationId: this.organizationId
        });
        this._isStreaming = false;
      }
    });
  }
  isStreaming() {
    return this._isStreaming;
  }
  setPersonaConfig(personaConfig) {
    this.validatePersonaConfigOrThrow(personaConfig);
    this.personaConfig = personaConfig;
  }
  getPersonaConfig() {
    return this.personaConfig;
  }
  getInputAudioState() {
    var _a;
    if ((_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.disableInputAudio) {
      console.warn("AnamClient: Audio state will not be used because input audio is disabled.");
    }
    if (this.streamingClient) {
      this.inputAudioState = this.streamingClient.getInputAudioState();
    }
    return this.inputAudioState;
  }
  muteInputAudio() {
    var _a, _b;
    if ((_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.disableInputAudio) {
      console.warn("AnamClient: Input audio is disabled. Muting input audio will have no effect.");
    }
    if (this.streamingClient && !((_b = this.clientOptions) === null || _b === void 0 ? void 0 : _b.disableInputAudio)) {
      this.inputAudioState = this.streamingClient.muteInputAudio();
    } else {
      this.inputAudioState = Object.assign(Object.assign({}, this.inputAudioState), { isMuted: true });
    }
    return this.inputAudioState;
  }
  unmuteInputAudio() {
    var _a, _b;
    if ((_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.disableInputAudio) {
      console.warn("AnamClient: Input audio is disabled. Unmuting input audio will have no effect.");
    }
    if (this.streamingClient && !((_b = this.clientOptions) === null || _b === void 0 ? void 0 : _b.disableInputAudio)) {
      this.inputAudioState = this.streamingClient.unmuteInputAudio();
    } else {
      this.inputAudioState = Object.assign(Object.assign({}, this.inputAudioState), { isMuted: false });
    }
    return this.inputAudioState;
  }
  changeAudioInputDevice(deviceId) {
    return __awaiter8(this, void 0, void 0, function* () {
      var _a;
      if ((_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.disableInputAudio) {
        throw new Error("AnamClient: Cannot change audio input device because input audio is disabled.");
      }
      if (!this._isStreaming) {
        throw new Error("AnamClient: Cannot change audio input device while not streaming. Start streaming first.");
      }
      if (!this.streamingClient) {
        throw new Error("AnamClient: Cannot change audio input device because streaming client is not available. Start streaming first.");
      }
      yield this.streamingClient.changeAudioInputDevice(deviceId);
    });
  }
  /**
   * Create a talk message stream for sending text chunks to TTS.
   *
   * The stream manages the correlationId internally so you don't need to track it across
   * chunks. Use this for streaming LLM output, or for speech before and after a tool
   * call. Set an utteranceId on the first chunk of an utterance, then omit it on
   * continuation chunks. A new utteranceId queues the next utterance after the current
   * one while keeping both in the same speech sequence. All chunks in the sequence share
   * one correlationId for interruption handling.
   */
  createTalkMessageStream(correlationId) {
    if (!this.streamingClient) {
      throw new Error("Failed to start talk message stream: session is not started.");
    }
    if (correlationId && correlationId.trim() === "") {
      throw new Error("Failed to start talk message stream: correlationId is empty");
    }
    return this.streamingClient.startTalkMessageStream(correlationId);
  }
  createAgentAudioInputStream(config) {
    if (!this.streamingClient) {
      throw new Error("Failed to create agent audio input stream: session is not started.");
    }
    return this.streamingClient.createAgentAudioInputStream(config);
  }
  /**
   * Event handling
   */
  addListener(event, callback) {
    this.publicEventEmitter.addListener(event, callback);
  }
  removeListener(event, callback) {
    this.publicEventEmitter.removeListener(event, callback);
  }
  getActiveSessionId() {
    return this.sessionId;
  }
  getActiveSessionRegion() {
    return this.servedRegion;
  }
  registerToolCallHandler(toolName, handler) {
    return this.toolCallManager.registerHandler(toolName, handler);
  }
  validatePersonaConfigOrThrow(personaConfig) {
    const configError = getPersonaConfigValidationError(personaConfig);
    if (configError) {
      throw new ClientError(configError, ErrorCode.CLIENT_ERROR_CODE_CONFIGURATION_ERROR, 400);
    }
  }
};
var getErrorMilestoneTags = (error) => {
  if (error instanceof ClientError) {
    return {
      errorName: error.name,
      errorCode: error.code,
      httpStatusCode: error.statusCode
    };
  }
  if (error instanceof Error) {
    return { errorName: error.name };
  }
  return {};
};
var isValidDirectorNotesExpressivity = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
var getPersonaConfigValidationError = (personaConfig) => {
  var _a;
  const directorNotesExpressivity = (_a = personaConfig === null || personaConfig === void 0 ? void 0 : personaConfig.directorNotes) === null || _a === void 0 ? void 0 : _a.expressivity;
  if (directorNotesExpressivity !== void 0 && !isValidDirectorNotesExpressivity(directorNotesExpressivity)) {
    return "Director Notes expressivity must be a finite number between 0 and 1";
  }
  return void 0;
};

// vendor/anam-sdk/node_modules/@anam-ai/js-sdk/dist/module/index.js
var createClient = (sessionToken, options) => {
  return new AnamClient(sessionToken, void 0, options);
};
var unsafe_createClientWithApiKey = (apiKey, personaConfig, options) => {
  return new AnamClient(void 0, personaConfig, Object.assign(Object.assign({}, options), { apiKey }));
};
export {
  AgentAudioInputStream,
  AnamEvent,
  AudioPermissionState,
  ClientError,
  ConnectionClosedCode,
  DIRECTOR_NOTE_CUE_TAGS,
  DataChannelMessage,
  ErrorCode,
  InternalEvent,
  MessageRole,
  SignalMessageAction,
  createClient,
  unsafe_createClientWithApiKey
};
