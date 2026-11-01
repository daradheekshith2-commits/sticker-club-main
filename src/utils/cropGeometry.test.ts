import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cropExportDimensions} from './cropGeometry';

test('square crop exports a square PNG',()=>{
 assert.deepEqual(cropExportDimensions({width:720,height:720}),{width:1200,height:1200});
});
test('16:9 landscape crop exports a correctly sized PNG',()=>{
 assert.deepEqual(cropExportDimensions({width:720,height:405}),{width:1200,height:675});
});
test('4:5 portrait crop exports a correctly sized PNG',()=>{
 assert.deepEqual(cropExportDimensions({width:576,height:720}),{width:960,height:1200});
});
test('very narrow crops remain at least one pixel wide',()=>{
 assert.deepEqual(cropExportDimensions({width:1,height:5000}),{width:1,height:1200});
});
test('invalid crop dimensions cannot be exported',()=>{
 assert.throws(()=>cropExportDimensions({width:0,height:200}),/Invalid crop size/);
 assert.throws(()=>cropExportDimensions({width:-50,height:200}),/Invalid crop size/);
 assert.throws(()=>cropExportDimensions({width:Number.NaN,height:200}),/Invalid crop size/);
});
