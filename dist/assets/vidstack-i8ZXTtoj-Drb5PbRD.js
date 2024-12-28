var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { H as HTMLMediaProvider, s as scoped, a as HTMLAirPlayAdapter } from "./index-Cut7exT-.js";
import "./vendor-CIv96BDj.js";
import "./lodash-DWwsNxpa.js";
class AudioProvider extends HTMLMediaProvider {
  constructor(audio, ctx) {
    super(audio, ctx);
    __publicField(this, "$$PROVIDER_TYPE", "AUDIO");
    __publicField(this, "airPlay");
    scoped(() => {
      this.airPlay = new HTMLAirPlayAdapter(this.media, ctx);
    }, this.scope);
  }
  get type() {
    return "audio";
  }
  setup() {
    super.setup();
    if (this.type === "audio") this.ctx.notify("provider-setup", this);
  }
  /**
   * The native HTML `<audio>` element.
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement}
   */
  get audio() {
    return this.media;
  }
}
export {
  AudioProvider
};
//# sourceMappingURL=vidstack-i8ZXTtoj-Drb5PbRD.js.map
