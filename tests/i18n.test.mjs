import test from 'node:test';
import assert from 'node:assert/strict';
import {messages, preferredLanguage, translate} from '../src/i18n.js';

test('both languages cover every message and preserve interpolation values',()=>{
 assert.deepEqual(Object.keys(messages.en).sort(),Object.keys(messages.zh).sort());
 for(const key of Object.keys(messages.en)){
  const tokens=value=>[...value.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
  assert.deepEqual(tokens(messages.en[key]),tokens(messages.zh[key]),key);
  assert.ok(messages.en[key].length&&messages.zh[key].length,key);
 }
 assert.equal(translate('en','finalSeconds',{seconds:10}),'Final 10s');
 assert.equal(translate('zh','firstFinished',{seconds:10}),'第一只小鸭已冲线，还剩 10 秒。');
 assert.equal(translate('en','winnerCaption',{name:'Mint'}),'Mint takes first place. Cue the victory dance.');
});

test('a shared language URL overrides a saved choice; browser language provides the default',()=>{
 assert.equal(preferredLanguage({search:'?lang=en',stored:'zh',browser:'zh-CN'}),'en');
 assert.equal(preferredLanguage({search:'?lang=zh',stored:'en',browser:'en-US'}),'zh');
 assert.equal(preferredLanguage({search:'?lang=unknown',stored:'zh',browser:'en'}),'zh');
 assert.equal(preferredLanguage({browser:'zh-TW'}),'zh');
 assert.equal(preferredLanguage({browser:'fr-FR'}),'en');
});
