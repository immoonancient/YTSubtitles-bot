class Channel {
	constructor(label, folder, nicknames) {
		this.label = label;
		this.folder = folder;
		this.nicknames = nicknames || [];
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

const channels = [];

channels.push(new Channel(
	'测试作者',
	'test-author',
	['测试']));

channels.push(new Channel(
	'美食作家王刚',
	'wang-gang',
	['王刚', '刚哥']));

channels.push(new Channel(
	'雪鱼探店',
	'xue-yu',
	['雪鱼', '胖鱼', '胖头鱼']));

channels.push(new Channel(
	'华农兄弟',
	'hua-nong-brothers',
	['华农', '村霸']));

function findChannelFromTitle(title) {
	return channels.find(channel => channel.match(title));
};

function findChannelFromLabels(labels) {
	return channels.find(channel => labels.indexOf(channel.label) !== -1);
}

module.exports = {
	channels: channels,
	findChannelFromTitle: findChannelFromTitle,
	findChannelFromLabels: findChannelFromLabels
};
