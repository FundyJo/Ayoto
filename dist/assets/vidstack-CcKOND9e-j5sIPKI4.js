var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _iframe, _EmbedProvider_instances, watchSrc_fn, onWindowMessage_fn;
import { n as signal, l as listenEvent, e as effect, c as peek, w as appendParamsToURL, x as IS_SERVER, b as isString } from "./index-Cut7exT-.js";
class EmbedProvider {
  constructor(iframe) {
    __privateAdd(this, _EmbedProvider_instances);
    __privateAdd(this, _iframe);
    __publicField(this, "src", signal(""));
    /**
     * Defines which referrer is sent when fetching the resource.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/referrerPolicy}
     */
    __publicField(this, "referrerPolicy", null);
    __privateSet(this, _iframe, iframe);
    iframe.setAttribute("frameBorder", "0");
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute(
      "allow",
      "autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope"
    );
    if (this.referrerPolicy !== null) {
      iframe.setAttribute("referrerpolicy", this.referrerPolicy);
    }
  }
  get iframe() {
    return __privateGet(this, _iframe);
  }
  setup() {
    listenEvent(window, "message", __privateMethod(this, _EmbedProvider_instances, onWindowMessage_fn).bind(this));
    listenEvent(__privateGet(this, _iframe), "load", this.onLoad.bind(this));
    effect(__privateMethod(this, _EmbedProvider_instances, watchSrc_fn).bind(this));
  }
  postMessage(message, target) {
    var _a;
    if (IS_SERVER) return;
    (_a = __privateGet(this, _iframe).contentWindow) == null ? void 0 : _a.postMessage(JSON.stringify(message), target != null ? target : "*");
  }
}
_iframe = new WeakMap();
_EmbedProvider_instances = new WeakSet();
watchSrc_fn = function() {
  const src = this.src();
  if (!src.length) {
    __privateGet(this, _iframe).setAttribute("src", "");
    return;
  }
  const params = peek(() => this.buildParams());
  __privateGet(this, _iframe).setAttribute("src", appendParamsToURL(src, params));
};
onWindowMessage_fn = function(event) {
  var _a;
  const origin = this.getOrigin(), isOriginMatch = (event.source === null || event.source === ((_a = __privateGet(this, _iframe)) == null ? void 0 : _a.contentWindow)) && (!isString(origin) || origin === event.origin);
  if (!isOriginMatch) return;
  try {
    const message = JSON.parse(event.data);
    if (message) this.onMessage(message, event);
    return;
  } catch (e) {
  }
  if (event.data) this.onMessage(event.data, event);
};
export {
  EmbedProvider as E
};
//# sourceMappingURL=vidstack-CcKOND9e-j5sIPKI4.js.map
