require('dotenv').config();

const source = `https://raw.githubusercontent.com/${process.env.REPO_OWNER}/${process.env.REPO}/master/static/data/channels.json`;
const fetch = require('node-fetch');

class Channel {
  constructor(label, folder, nicknames, reviewers, subscriptionIssue) {
    this.label = label;
    this.folder = folder;
    this.nicknames = nicknames || [];
    this.reviewers = reviewers || [];
    this.subscriptionIssue = subscriptionIssue;
  }

  match(title)  {
    let names = this.label;
    if (this.nicknames.length)
      names = names + '|' + this.nicknames.join('|');
    const reString = `^[\\[【]${names}[】\\]]`;
    const re = new RegExp(reString);
    return title.match(reString);
  }
};

module.exports = function() {
  let channels;
  let timestamp;

  async function refreshChannels() {
    const response = await fetch(source).then(r => r.json());
    channels = response.map(c => new Channel(c.label, c.folder, c.nicknames, c.reviewers, c.subscription_issue));
    timestamp = new Date();
  }

  async function refreshIfNeeded() {
    if (!timestamp || (new Date() - timestamp > 3600 * 1000))
      await refreshChannels();
  }

  async function getChannels() {
    await refreshIfNeeded();
    return channels;
  }

  async function findChannelFromTitle(title) {
    await refreshIfNeeded();
    return channels.find(channel => channel.match(title));
  };

  async function findChannelFromLabels(labels) {
    await refreshIfNeeded();
    return channels.find(channel => labels.indexOf(channel.label) !== -1);
  }

  async function findChannelFromFolder(folder) {
    await refreshIfNeeded();
    return channels.find(channel => channel.folder === folder);
  }

  function addListChannelRoute(router, path) {
    router.get(path, async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(await getChannels());
    });
  }

  return {
    getChannels: getChannels,
    findChannelFromTitle: findChannelFromTitle,
    findChannelFromLabels: findChannelFromLabels,
    findChannelFromFolder: findChannelFromFolder,
    addListChannelRoute: addListChannelRoute
  };
}();
