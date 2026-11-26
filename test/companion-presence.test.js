import test from 'node:test';
import assert from 'node:assert/strict';
import {keepCompanionVisible} from '../desktop/companion-presence.js';
const displays=[{workArea:{x:0,y:0,width:1920,height:1080}}];
function fixture(){let events=[];let win={isDestroyed:()=>false,isMinimized:()=>true,isVisible:()=>false,getBounds:()=>({x:3000,y:2000,width:280,height:420})};for(const name of ['restore','setAlwaysOnTop','setSkipTaskbar','setPosition','showInactive','moveTop'])win[name]=(...args)=>events.push([name,...args]);return {win,events};}
test('presence recovers a hidden/minimized offscreen window without taking focus',()=>{const {win,events}=fixture();assert.equal(keepCompanionVisible(win,{displays}),true);assert.deepEqual(events,[['restore'],['setAlwaysOnTop',true,'screen-saver'],['setSkipTaskbar',true],['setPosition',1620,640],['showInactive'],['moveTop']]);});
test('presence does not show a window over a locked desktop or recreate an intentionally closed window',()=>{const {win,events}=fixture();assert.equal(keepCompanionVisible(win,{locked:true,displays}),false);assert.deepEqual(events,[]);assert.equal(keepCompanionVisible(null,{displays}),false);win.isDestroyed=()=>true;assert.equal(keepCompanionVisible(win,{displays}),false);});
