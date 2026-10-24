import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Exercise the real page controller with a deterministic clock and minimal DOM.
class Element {
  constructor() { this.attrs=new Map();this.dataset={};this.handlers=new Map();this.writes=0;this.value='';this.style={};this.hidden=false;this.disabled=false;this.classList={toggle(){}}; }
  get textContent(){return this.value;}
  set textContent(value){this.writes++;this.value=value;}
  setAttribute(key,value){this.attrs.set(key,value);}
  getAttribute(key){return this.attrs.get(key)??null;}
  addEventListener(name,handler){this.handlers.set(name,handler);}
  click(){if(!this.disabled)this.handlers.get('click')?.({});}
}
async function page(run) {
  const saved={document:globalThis.document,performance:globalThis.performance,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval};
  let now=0,id=0;const callbacks=new Map();const nodes=new Map();
  const node=selector=>{if(!nodes.has(selector))nodes.set(selector,new Element());return nodes.get(selector);};
  const tabs=['timer','stopwatch','superfocus'].map(mode=>{const el=new Element();el.dataset.mode=mode;return el;});
  const demo=node('[data-demo]');demo.querySelector=node;demo.querySelectorAll=()=>tabs;
  globalThis.document={querySelector(selector){return selector==='[data-demo]'?demo:null;},addEventListener(){}};
  Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
  globalThis.setInterval=callback=>{callbacks.set(++id,callback);return id;};
  globalThis.clearInterval=key=>callbacks.delete(key);
  try {
    const source=(await readFile(new URL('../dist/site.js',import.meta.url),'utf8')).replace("'./demo-clock.mjs'",JSON.stringify(new URL('../dist/demo-clock.mjs',import.meta.url).href));
    await import('data:text/javascript;base64,'+Buffer.from(source+`\n// harness ${Math.random()}`).toString('base64'));
    await run({node,tabs,advance(ms){now+=ms;for(const callback of [...callbacks.values()])callback();},callbacks});
  } finally {
    globalThis.document=saved.document;Object.defineProperty(globalThis,'performance',{configurable:true,value:saved.performance});globalThis.setInterval=saved.setInterval;globalThis.clearInterval=saved.clearInterval;
  }
}

test('clock ticks leave button labels and controls untouched between user actions',()=>page(({node,tabs,advance})=>{
 tabs[1].click();const button=node('[data-demo-start]');button.click();const writes=button.writes;
 for(let i=0;i<40;i++)advance(80);
 assert.equal(node('[data-demo-clock]').textContent,'00:03');
 assert.equal(button.writes,writes,'ticking must not replace a control under the pointer');
}));

test('repeated stopwatch pause/resume always restarts ticking and matches phone protection',()=>page(({node,tabs,advance,callbacks})=>{
 tabs[1].click();const button=node('[data-demo-start]');button.click();
 for(let i=0;i<50;i++){
  advance(200);button.click();const paused=node('[data-demo-clock]').textContent;
  assert.match(button.textContent,/Resume stopwatch/);assert.equal(node('[data-phone-shield]').hidden,true);assert.equal(callbacks.size,0);
  advance(3000);assert.equal(node('[data-demo-clock]').textContent,paused);
  button.click();assert.match(button.textContent,/Pause stopwatch/);assert.equal(node('[data-phone-shield]').hidden,false);assert.equal(callbacks.size,1);
 }
 advance(1000);assert.equal(node('[data-demo-clock]').textContent,'00:11');
 node('[data-demo-reset]').click();assert.equal(callbacks.size,0);assert.equal(node('[data-demo-clock]').textContent,'00:00');
}));
