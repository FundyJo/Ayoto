import { V as VTTParser, a as VTTBlock, b as VTTCue } from "./prod-B8yLbOr7.js";
import "./index-Cut7exT-.js";
import "./vendor-CIv96BDj.js";
import "./lodash-DWwsNxpa.js";
const MILLISECOND_SEP_RE = /,/g, TIMESTAMP_SEP = "-->";
class SRTParser extends VTTParser {
  parse(line, lineCount) {
    var _a, _b;
    if (line === "") {
      if (this.c) {
        this.l.push(this.c);
        (_b = (_a = this.h).onCue) == null ? void 0 : _b.call(_a, this.c);
        this.c = null;
      }
      this.e = VTTBlock.None;
    } else if (this.e === VTTBlock.Cue) {
      this.c.text += (this.c.text ? "\n" : "") + line;
    } else if (line.includes(TIMESTAMP_SEP)) {
      const result = this.q(line, lineCount);
      if (result) {
        this.c = new VTTCue(result[0], result[1], result[2].join(" "));
        this.c.id = this.n;
        this.e = VTTBlock.Cue;
      }
    }
    this.n = line;
  }
  q(line, lineCount) {
    return super.q(line.replace(MILLISECOND_SEP_RE, "."), lineCount);
  }
}
function createSRTParser() {
  return new SRTParser();
}
export {
  SRTParser,
  createSRTParser as default
};
//# sourceMappingURL=srt-parser-_6UrKeYK.js.map
