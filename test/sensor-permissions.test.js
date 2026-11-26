import test from 'node:test';
import assert from 'node:assert/strict';
import {sensorPermission} from '../lib/sensor-permissions.js';
test('no sensors without a session grant',()=>{
 for(const kind of ['media','display-capture','geolocation'])assert.equal(sensorPermission(kind,['video']),false);
});
test('screen permission does not grant camera or microphone',()=>{
 assert.equal(sensorPermission('display-capture',['video'],{screen:true}),true);
 assert.equal(sensorPermission('media',['video'],{screen:true}),false);
 assert.equal(sensorPermission('media',['audio'],{screen:true}),false);
});
test('combined camera and microphone request needs both grants',()=>{
 assert.equal(sensorPermission('media',['audio','video'],{microphone:true}),false);
 assert.equal(sensorPermission('media',['audio','video'],{microphone:true,camera:true}),true);
 assert.equal(sensorPermission('media',[],{microphone:true,camera:true}),false);
 assert.equal(sensorPermission('media',['unknown'],{microphone:true,camera:true}),false);
});
