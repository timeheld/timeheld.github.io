import test from 'node:test';
import assert from 'node:assert/strict';
import { DemoClock, formatTime, shieldCopy } from '../dist/demo-clock.mjs';
function fixture() { let time = 0; return { clock: new DemoClock(() => time), advance(ms) { time += ms; } }; }
test('timer protects immediately and unlocks at ten seconds, including delayed ticks', () => {
 const {clock,advance}=fixture(); assert.equal(clock.snapshot().remaining,10);clock.toggle();assert.equal(clock.snapshot().protected,true);advance(9100);assert.equal(clock.snapshot().remaining,1);advance(1900);assert.equal(clock.snapshot().phase,'complete');assert.equal(clock.snapshot().protected,false);assert.equal(clock.snapshot().remaining,0);clock.toggle();assert.equal(clock.snapshot().remaining,10);assert.equal(clock.snapshot().protected,true);
});
test('pause releases protection and excludes time spent paused', () => {
 const {clock,advance}=fixture();clock.toggle();advance(2500);clock.toggle();assert.equal(clock.snapshot().phase,'paused');assert.equal(clock.snapshot().protected,false);advance(50000);assert.equal(clock.snapshot().remaining,8);clock.toggle();advance(7400);assert.equal(clock.snapshot().remaining,1);advance(100);assert.equal(clock.snapshot().phase,'complete');
});
test('stopwatch keeps counting past ten seconds and excludes paused time', () => {
 const {clock,advance}=fixture();clock.select('stopwatch');clock.toggle();advance(65000);assert.equal(clock.snapshot().elapsed,65);assert.equal(clock.snapshot().phase,'running');assert.equal(clock.snapshot().protected,true);assert.equal(clock.snapshot().remaining,null);assert.equal(clock.snapshot().progress,null);clock.toggle();advance(120000);assert.equal(clock.snapshot().elapsed,65);assert.equal(clock.snapshot().protected,false);clock.toggle();advance(3600000);assert.equal(clock.snapshot().elapsed,3665);assert.equal(clock.snapshot().protected,true);clock.reset();assert.equal(clock.snapshot().elapsed,0);assert.equal(clock.snapshot().protected,false);
});
test('Superfocus cannot pause, reset, or switch modes while committed', () => {
 const {clock,advance}=fixture();clock.select('superfocus');clock.toggle();advance(1000);assert.equal(clock.toggle(),false);assert.equal(clock.reset(),false);assert.equal(clock.select('timer'),false);assert.equal(clock.snapshot().mode,'superfocus');assert.equal(clock.snapshot().locked,true);advance(9000);assert.equal(clock.snapshot().locked,false);assert.equal(clock.select('timer'),true);assert.equal(clock.snapshot().remaining,10);
});
test('mode changes and reset discard partial regular sessions', () => {
 const {clock,advance}=fixture();clock.toggle();advance(4100);clock.select('stopwatch');assert.equal(clock.snapshot().phase,'idle');assert.equal(clock.snapshot().elapsed,0);clock.toggle();advance(1200);clock.reset();assert.equal(clock.snapshot().protected,false);assert.equal(clock.snapshot().elapsed,0);
});
test('elapsed time formats minutes and hours without a countdown rollover', () => {
 assert.equal(formatTime(0),'00:00');assert.equal(formatTime(10),'00:10');assert.equal(formatTime(65),'01:05');assert.equal(formatTime(3665),'1:01:05');
});
test('shield uses native iPhone copy for each focus mode', () => {
 assert.equal(shieldCopy('timer').title,'Timeheld is on');assert.equal(shieldCopy('timer').subtitle,'Back to focus. About 1 minute left.');assert.equal(shieldCopy('stopwatch').subtitle,'Your study stopwatch is running. Return to Timeheld to pause or finish.');assert.equal(shieldCopy('superfocus').title,'Superfocus is on');assert.match(shieldCopy('superfocus').subtitle,/until your Mac finishes/);
});

test('start and pause are explicit and idempotent across repeated activations', () => {
 const {clock,advance}=fixture();clock.select('stopwatch');assert.equal(clock.start(),true);assert.equal(clock.start(),false);advance(1700);assert.equal(clock.pause(),true);assert.equal(clock.pause(),false);advance(5000);assert.equal(clock.snapshot().elapsed,1);assert.equal(clock.start(),true);advance(1300);assert.equal(clock.snapshot().elapsed,3);
});
