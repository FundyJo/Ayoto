import{V as r,a as i,b as h}from"./prod-DUKomxNY.js";import"./index-DF45R1ZS.js";import"./vendor-CSMGp4Xa.js";import"./lodash-Cpj98o6Y.js";const c=/,/g,a="-->";class n extends r{parse(s,e){if(s==="")this.c&&(this.l.push(this.c),this.h.onCue?.(this.c),this.c=null),this.e=i.None;else if(this.e===i.Cue)this.c.text+=(this.c.text?`
`:"")+s;else if(s.includes(a)){const t=this.q(s,e);t&&(this.c=new h(t[0],t[1],t[2].join(" ")),this.c.id=this.n,this.e=i.Cue)}this.n=s}q(s,e){return super.q(s.replace(c,"."),e)}}function l(){return new n}export{n as SRTParser,l as default};
