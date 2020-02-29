require('dotenv').config();

async function Auth() {
  const privateKey = require('fs').readFileSync(process.env.PRIVATE_KEY_PATH, {encoding: 'utf-8'});
  const { createAppAuth } = require("@octokit/auth-app");
  const auth = createAppAuth({
    id: process.env.APP_ID,
    installationId: process.env.INSTALLATION_ID,
    privateKey: privateKey,
  });
  const appAuthentication = await auth({ type: "installation" });

  const { Octokit } = require('@octokit/rest');
  return new Octokit({auth: appAuthentication.token});
}

module.exports = Auth;