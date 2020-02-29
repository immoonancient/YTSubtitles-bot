const Auth = require('../auth.js');

test('Authentication as app', async () => {
  const octokit = await Auth();
  const limit = await octokit.rateLimit.get();
  expect(limit.data.rate.limit).toBeGreaterThanOrEqual(5000);
});