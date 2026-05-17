const assert = require('assert');
const { getPhase, getTMinus, todayStr } = require('./utils');

function t(label, fn) {
  try { fn(); console.log('  ✓', label); }
  catch (e) { console.error('  ✗', label, '\n   ', e.message); process.exitCode = 1; }
}

t('getPhase: May 18 → Store & App Preparation', () => {
  assert.strictEqual(getPhase(new Date('2026-05-18')), 'Store & App Preparation');
  assert.strictEqual(getPhase(new Date('2026-05-31')), 'Store & App Preparation');
});
t('getPhase: Jun 1 → Pre-Registration Active', () => {
  assert.strictEqual(getPhase(new Date('2026-06-01')), 'Pre-Registration Active');
  assert.strictEqual(getPhase(new Date('2026-06-21')), 'Pre-Registration Active');
});
t('getPhase: Jun 22 → Go / No-Go: June 25', () => {
  assert.strictEqual(getPhase(new Date('2026-06-22')), 'Go / No-Go: June 25');
  assert.strictEqual(getPhase(new Date('2026-06-28')), 'Go / No-Go: June 25');
});
t('getPhase: Jun 29 → Production Review', () => {
  assert.strictEqual(getPhase(new Date('2026-06-29')), 'Production Review');
  assert.strictEqual(getPhase(new Date('2026-07-05')), 'Production Review');
});
t('getPhase: Jul 6 → Launch Week', () => {
  assert.strictEqual(getPhase(new Date('2026-07-06')), 'Launch Week');
  assert.strictEqual(getPhase(new Date('2026-07-12')), 'Launch Week');
});
t('getPhase: Jul 13 → Backup Launch', () => {
  assert.strictEqual(getPhase(new Date('2026-07-13')), 'Backup Launch');
  assert.strictEqual(getPhase(new Date('2026-07-16')), 'Backup Launch');
});
t('getPhase: Jul 17 → Post-Launch', () => {
  assert.strictEqual(getPhase(new Date('2026-07-17')), 'Post-Launch');
});
t('getTMinus: day before launch → 1', () => {
  assert.strictEqual(getTMinus(new Date('2026-07-08')), 1);
});
t('getTMinus: launch day → 0', () => {
  assert.strictEqual(getTMinus(new Date('2026-07-09')), 0);
});
t('getTMinus: day after launch → -1', () => {
  assert.strictEqual(getTMinus(new Date('2026-07-10')), -1);
});
t('todayStr returns YYYY-MM-DD', () => {
  assert(/^\d{4}-\d{2}-\d{2}$/.test(todayStr()), `got: ${todayStr()}`);
});

if (!process.exitCode) console.log('\nAll utils tests passed ✓');
