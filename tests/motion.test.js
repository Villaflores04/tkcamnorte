import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import {SourceTextModule} from 'node:vm';

async function sceneFixture(reduce = false) {
  const dom = new JSDOM('<section data-parallax><a href="/calendar.html">Schedule</a></section>', {runScripts:'outside-only',pretendToBeVisual:true});
  const w = dom.window;
  const callbacks = new Map();
  let id = 0, onPreference;
  const preference = {matches:reduce,addEventListener(_name, callback){onPreference=callback;}};
  w.matchMedia = () => preference;
  w.requestAnimationFrame = callback => {callbacks.set(++id,callback);return id;};
  w.cancelAnimationFrame = key => callbacks.delete(key);
  const module = new SourceTextModule(await readFile('public/js/motion.js','utf8'),{context:dom.getInternalVMContext()});
  await module.link(()=>{throw Error('Unexpected dependency');});await module.evaluate();
  const scene = w.document.querySelector('section');
  scene.getBoundingClientRect = () => ({top:100,left:0,width:600,height:300});
  return {dom,w,scene,callbacks,preference,init:module.namespace.initParallax,toggle(){preference.matches=!preference.matches;onPreference();},flush(){const jobs=[...callbacks.values()];callbacks.clear();jobs.forEach(cb=>cb());}};
}
test('parallax coalesces scroll events and does not run continuously',async()=>{
  const f=await sceneFixture();f.init();assert.equal(f.callbacks.size,1);f.flush();assert.equal(f.callbacks.size,0);
  assert.ok(f.scene.style.getPropertyValue('--scene-y'));
  for(let i=0;i<10;i++)f.w.dispatchEvent(new f.w.Event('scroll'));
  assert.equal(f.callbacks.size,1);f.flush();assert.equal(f.callbacks.size,0);
  f.dom.window.close();
});
test('reduced motion cancels pending frames and restores static artwork',async()=>{
  const f=await sceneFixture();f.init();f.flush();assert.ok(f.scene.style.getPropertyValue('--scene-y'));
  f.w.dispatchEvent(new f.w.Event('scroll'));assert.equal(f.callbacks.size,1);
  f.toggle();assert.equal(f.callbacks.size,0);assert.equal(f.scene.style.getPropertyValue('--scene-y'),'');
  f.w.dispatchEvent(new f.w.Event('scroll'));assert.equal(f.callbacks.size,0);
  assert.equal(f.scene.querySelector('a').getAttribute('href'),'/calendar.html');f.dom.window.close();
});
test('a member who already prefers reduced motion gets static artwork immediately',async()=>{
  const f=await sceneFixture(true);f.init();assert.equal(f.callbacks.size,0);assert.equal(f.scene.style.getPropertyValue('--scene-y'),'');f.dom.window.close();
});
