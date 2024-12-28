const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vidstack-7jdJQx_M-Y9joDgx9.js","assets/index-Cut7exT-.js","assets/vendor-CIv96BDj.js","assets/lodash-DWwsNxpa.js","assets/index-CXtu6Aoq.css"])))=>i.map(i=>d[i]);
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
var _player, _GoogleCastLoader_instances, loadCastFramework_fn, showPrompt_fn, setOptions_fn, notifyRemoteStateChange_fn, createError_fn;
import { l as listenEvent, I as IS_CHROME, y as IS_IOS, z as canGoogleCastSrc, c as peek, x as IS_SERVER, _ as __vitePreload, h as loadScript } from "./index-Cut7exT-.js";
import "./vendor-CIv96BDj.js";
import "./lodash-DWwsNxpa.js";
function getCastFrameworkURL() {
  return "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
}
function hasLoadedCastFramework() {
  var _a;
  return !!((_a = window.cast) == null ? void 0 : _a.framework);
}
function isCastAvailable() {
  var _a, _b;
  return !!((_b = (_a = window.chrome) == null ? void 0 : _a.cast) == null ? void 0 : _b.isAvailable);
}
function isCastConnected() {
  return getCastContext().getCastState() === cast.framework.CastState.CONNECTED;
}
function getCastContext() {
  return window.cast.framework.CastContext.getInstance();
}
function getCastSession() {
  return getCastContext().getCurrentSession();
}
function getCastSessionMedia() {
  var _a;
  return (_a = getCastSession()) == null ? void 0 : _a.getSessionObj().media[0];
}
function hasActiveCastSession(src) {
  var _a;
  const contentId = (_a = getCastSessionMedia()) == null ? void 0 : _a.media.contentId;
  return contentId === (src == null ? void 0 : src.src);
}
function getDefaultCastOptions() {
  return {
    language: "en-US",
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
    resumeSavedSession: true,
    androidReceiverCompatible: true
  };
}
function getCastErrorMessage(code) {
  const defaultMessage = `Google Cast Error Code: ${code}`;
  return defaultMessage;
}
function listenCastContextEvent(type, handler) {
  return listenEvent(getCastContext(), type, handler);
}
class GoogleCastLoader {
  constructor() {
    __privateAdd(this, _GoogleCastLoader_instances);
    __publicField(this, "name", "google-cast");
    __publicField(this, "target");
    __privateAdd(this, _player);
  }
  /**
   * @see {@link https://developers.google.com/cast/docs/reference/web_sender/cast.framework.CastContext}
   */
  get cast() {
    return getCastContext();
  }
  mediaType() {
    return "video";
  }
  canPlay(src) {
    return IS_CHROME && !IS_IOS && canGoogleCastSrc(src);
  }
  async prompt(ctx) {
    var _a, _b;
    let loadEvent, openEvent, errorEvent;
    try {
      loadEvent = await __privateMethod(this, _GoogleCastLoader_instances, loadCastFramework_fn).call(this, ctx);
      if (!__privateGet(this, _player)) {
        __privateSet(this, _player, new cast.framework.RemotePlayer());
        new cast.framework.RemotePlayerController(__privateGet(this, _player));
      }
      openEvent = ctx.player.createEvent("google-cast-prompt-open", {
        trigger: loadEvent
      });
      ctx.player.dispatchEvent(openEvent);
      __privateMethod(this, _GoogleCastLoader_instances, notifyRemoteStateChange_fn).call(this, ctx, "connecting", openEvent);
      await __privateMethod(this, _GoogleCastLoader_instances, showPrompt_fn).call(this, peek(ctx.$props.googleCast));
      ctx.$state.remotePlaybackInfo.set({
        deviceName: (_a = getCastSession()) == null ? void 0 : _a.getCastDevice().friendlyName
      });
      if (isCastConnected()) __privateMethod(this, _GoogleCastLoader_instances, notifyRemoteStateChange_fn).call(this, ctx, "connected", openEvent);
    } catch (code) {
      const error = code instanceof Error ? code : __privateMethod(this, _GoogleCastLoader_instances, createError_fn).call(this, (code + "").toUpperCase(), "Prompt failed.");
      errorEvent = ctx.player.createEvent("google-cast-prompt-error", {
        detail: error,
        trigger: openEvent != null ? openEvent : loadEvent,
        cancelable: true
      });
      ctx.player.dispatch(errorEvent);
      __privateMethod(this, _GoogleCastLoader_instances, notifyRemoteStateChange_fn).call(this, ctx, isCastConnected() ? "connected" : "disconnected", errorEvent);
      throw error;
    } finally {
      ctx.player.dispatch("google-cast-prompt-close", {
        trigger: (_b = errorEvent != null ? errorEvent : openEvent) != null ? _b : loadEvent
      });
    }
  }
  async load(ctx) {
    if (IS_SERVER) {
      throw Error("[vidstack] can not load google cast provider server-side");
    }
    if (!__privateGet(this, _player)) {
      throw Error("[vidstack] google cast player was not initialized");
    }
    return new (await __vitePreload(async () => {
      const { GoogleCastProvider } = await import("./vidstack-7jdJQx_M-Y9joDgx9.js");
      return { GoogleCastProvider };
    }, true ? __vite__mapDeps([0,1,2,3,4]) : void 0)).GoogleCastProvider(__privateGet(this, _player), ctx);
  }
}
_player = new WeakMap();
_GoogleCastLoader_instances = new WeakSet();
loadCastFramework_fn = async function(ctx) {
  if (hasLoadedCastFramework()) return;
  const loadStartEvent = ctx.player.createEvent("google-cast-load-start");
  ctx.player.dispatch(loadStartEvent);
  await loadScript(getCastFrameworkURL());
  await customElements.whenDefined("google-cast-launcher");
  const loadedEvent = ctx.player.createEvent("google-cast-loaded", { trigger: loadStartEvent });
  ctx.player.dispatch(loadedEvent);
  if (!isCastAvailable()) {
    throw __privateMethod(this, _GoogleCastLoader_instances, createError_fn).call(this, "CAST_NOT_AVAILABLE", "Google Cast not available on this platform.");
  }
  return loadedEvent;
};
showPrompt_fn = async function(options) {
  __privateMethod(this, _GoogleCastLoader_instances, setOptions_fn).call(this, options);
  const errorCode = await this.cast.requestSession();
  if (errorCode) {
    throw __privateMethod(this, _GoogleCastLoader_instances, createError_fn).call(this, errorCode.toUpperCase(), getCastErrorMessage(errorCode));
  }
};
setOptions_fn = function(options) {
  var _a;
  (_a = this.cast) == null ? void 0 : _a.setOptions({
    ...getDefaultCastOptions(),
    ...options
  });
};
notifyRemoteStateChange_fn = function(ctx, state, trigger) {
  const detail = { type: "google-cast", state };
  ctx.notify("remote-playback-change", detail, trigger);
};
createError_fn = function(code, message) {
  const error = Error(message);
  error.code = code;
  return error;
};
var loader = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  GoogleCastLoader
});
export {
  getCastContext,
  getCastErrorMessage,
  getCastSession,
  getCastSessionMedia,
  hasActiveCastSession,
  listenCastContextEvent,
  loader
};
//# sourceMappingURL=vidstack-BEzgE0Fx-z2pyOYnt.js.map
