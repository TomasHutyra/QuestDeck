function getPhase(today) {
  const d = today.toISOString().slice(0, 10);
  if (d >= '2026-07-17') return 'Post-Launch';
  if (d >= '2026-07-13') return 'Backup Launch';
  if (d >= '2026-07-06') return 'Launch Week';
  if (d >= '2026-06-29') return 'Production Review';
  if (d >= '2026-06-22') return 'Go / No-Go: June 25';
  if (d >= '2026-06-01') return 'Pre-Registration Active';
  return 'Store & App Preparation';
}

function getTMinus(today) {
  const launch = new Date('2026-07-09');
  const todayMidnight = new Date(today.toISOString().slice(0, 10));
  return Math.round((launch - todayMidnight) / (1000 * 60 * 60 * 24));
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getPhase, getTMinus, todayStr };
}
