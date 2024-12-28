const videoIdRE = /(?:https:\/\/)?(?:player\.)?vimeo(?:\.com)?\/(?:video\/)?(\d+)(?:(?:\?hash=|\?h=|\/)(.*))?/;
const infoCache = /* @__PURE__ */ new Map();
const pendingFetch = /* @__PURE__ */ new Map();
function resolveVimeoVideoId(src) {
  const matches = src.match(videoIdRE);
  return { videoId: matches == null ? void 0 : matches[1], hash: matches == null ? void 0 : matches[2] };
}
async function getVimeoVideoInfo(videoId, abort, videoHash) {
  if (infoCache.has(videoId)) return infoCache.get(videoId);
  if (pendingFetch.has(videoId)) return pendingFetch.get(videoId);
  let oembedSrc = `https://vimeo.com/api/oembed.json?url=https://player.vimeo.com/video/${videoId}`;
  if (videoHash) {
    oembedSrc = oembedSrc.concat(`?h=${videoHash}`);
  }
  const promise = window.fetch(oembedSrc, {
    mode: "cors",
    signal: abort.signal
  }).then((response) => response.json()).then((data) => {
    var _a, _b, _c, _d;
    const thumnailRegex = /vimeocdn.com\/video\/(.*)?_/, thumbnailId = (_b = (_a = data == null ? void 0 : data.thumbnail_url) == null ? void 0 : _a.match(thumnailRegex)) == null ? void 0 : _b[1], poster = thumbnailId ? `https://i.vimeocdn.com/video/${thumbnailId}_1920x1080.webp` : "", info = {
      title: (_c = data == null ? void 0 : data.title) != null ? _c : "",
      duration: (_d = data == null ? void 0 : data.duration) != null ? _d : 0,
      poster,
      pro: data.account_type !== "basic"
    };
    infoCache.set(videoId, info);
    return info;
  }).finally(() => pendingFetch.delete(videoId));
  pendingFetch.set(videoId, promise);
  return promise;
}
export {
  getVimeoVideoInfo,
  resolveVimeoVideoId
};
//# sourceMappingURL=vidstack-krOAtKMi-CwfBnO3v.js.map
