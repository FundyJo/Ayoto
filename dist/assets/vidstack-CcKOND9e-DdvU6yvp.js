import{n as e,l as i,e as a,c as o,w as n,x as c,b as h}from"./index-DF45R1ZS.js";class g{#t;src=e("");referrerPolicy=null;get iframe(){return this.#t}constructor(t){this.#t=t,t.setAttribute("frameBorder","0"),t.setAttribute("aria-hidden","true"),t.setAttribute("allow","autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope"),this.referrerPolicy!==null&&t.setAttribute("referrerpolicy",this.referrerPolicy)}setup(){i(window,"message",this.#r.bind(this)),i(this.#t,"load",this.onLoad.bind(this)),a(this.#s.bind(this))}#s(){const t=this.src();if(!t.length){this.#t.setAttribute("src","");return}const s=o(()=>this.buildParams());this.#t.setAttribute("src",n(t,s))}postMessage(t,s){c||this.#t.contentWindow?.postMessage(JSON.stringify(t),s??"*")}#r(t){const s=this.getOrigin();if((t.source===null||t.source===this.#t?.contentWindow)&&(!h(s)||s===t.origin)){try{const r=JSON.parse(t.data);r&&this.onMessage(r,t);return}catch{}t.data&&this.onMessage(t.data,t)}}}export{g as E};
