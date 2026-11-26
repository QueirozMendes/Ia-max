import test from 'node:test';
import assert from 'node:assert/strict';
import {expressionForText,speechText} from '../public/expression-cues.js';
test('speech omits emojis, flags and joined emoji while preserving the message',()=>{
 assert.equal(speechText('Oi, Gabriel! 😊❤️ 👩🏽‍💻 🇧🇷 1️⃣ Estou aqui.'),'Oi, Gabriel! Estou aqui.');
 assert.equal(speechText('**Olá!** [fonte](https://example.org)'),'Olá! fonte');
});
test('emotions select supported expressions instead of spoken stage directions',()=>{
 assert.equal(expressionForText('Que bom! 😊'),'Smile');assert.equal(expressionForText('Ops 😳'),'Surprised');
 assert.equal(expressionForText('💕'),'Blushing');assert.equal(expressionForText('😢'),'Sad');assert.equal(expressionForText('😡'),'Angry');
 assert.equal(expressionForText('😊 Depois 😢'),'Sad');assert.equal(expressionForText('Texto sem emoji'),'Normal');
 assert.equal(speechText('*sorri* Tudo bem. [mexe no cabelo]'),'Tudo bem.');
 assert.equal(expressionForText('*sorri* Tudo bem.'),'Smile');
});
