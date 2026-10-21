const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
test('training records live only in a collapsed profile section, not in dashboards', () => {
  const dashboards = html.slice(html.indexOf('id="userDashboard"'), html.indexOf('<!-- User Manager Modal -->'));
  assert.equal(dashboards.includes('id="userSafetyTrainingList"'), false);
  assert.equal(dashboards.includes('showSafetyTrainingManager()'), false);
  assert.equal(dashboards.includes('openUserProfileModal()'), true);
  const section = html.match(/<details id="profileSafetyDetails"[\s\S]*?<\/details>/)[0];
  assert.equal(/<details[^>]*\sopen(?:\s|=|>)/.test(section), false);
  assert.equal(section.includes('id="userSafetyTrainingList"'), true);
  assert.equal(section.includes('<button'), false);
  const manager = html.slice(html.indexOf('id="userManager"'), html.indexOf('<!-- Generic Modal'));
  assert.equal(manager.includes('showSafetyTrainingManager()'), true);
});
