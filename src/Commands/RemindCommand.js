const durationParser = require('duration-parser');
const humanizeDuration = require('humanize-duration');
const BaseCommand = require('../Structure/BaseCommand');
const handleDatabaseError = require('../Util/handleDatabaseError');

class Remind extends BaseCommand {
	constructor(bot, r) {
		super({
			command: 'remind',
			aliases: [
				'remindme',
				'setreminder'
			],
			description: 'Reminds you to do something at a specific time.',
			category: 'Utility',
			usage: 'remind <time> <message...>',
			hidden: false
		});
		this.bot = bot;
		this.r = r;
	}

	execute(msg, args) {
		if (args.length < 1) return msg.channel.createMessage(':question:   **»**   You must provide a duration.');
		if (args.length < 2) return msg.channel.createMessage(':question:   **»**   You must provide a message.');
		try {
			const duration = durationParser(args[0]);
			if (duration < 30000) return msg.channel.createMessage(':exclamation:   **»**   The duration time must be greater than or equal to 30 seconds.');
			this.r.table('reminders').insert({
				id: String(Math.floor(Math.random() * 1000000)),
				userID: msg.author.id,
				message: args.slice(1).join(' '),
				end: Date.now() + duration,
				duration
			}, { returnChanges: true }).run((error, result) => {
				if (error) return handleDatabaseError(error, msg);
				msg.channel.createMessage(':alarm_clock:   **»**   Okay, I\'ll remind you in ' + humanizeDuration(duration, { round: true }) + ' to `' + args.slice(1).join(' ') + '`.');
				if (duration > 2147483647) {
					const wait = () => {
						if (result.changes[0].new_val.end - Date.now() <= 2147483647) {
							setTimeout(() => {
								this.r.table('reminders').get(result.generated_keys[0]).delete().run((error) => {
									if (error) return handleDatabaseError(error);
									msg.author.getDMChannel().then((user) => {
										user.createMessage(':alarm_clock:   **»**   About ' + humanizeDuration(duration, { round: true }) + ' ago, you asked me to remind you about `' + args.slice(1).join(' ') + '`.');
									});
								});
							}, Math.max(result.changes[0].new_val.end - Date.now(), 0));
						} else {
							setTimeout(wait, 2147483647);
						}
					};
					wait();
				} else {
					setTimeout(() => {
						this.r.table('reminders').get(result.generated_keys[0]).delete().run((error) => {
							if (error) return handleDatabaseError(error);
							msg.author.getDMChannel().then((user) => {
								user.createMessage(':alarm_clock:   **»**   About ' + humanizeDuration(duration, { round: true }) + ' ago, you asked me to remind you about `' + args.slice(1).join(' ') + '`.');
							});
						});
					}, duration);
				}
			});
		} catch (e) {
			msg.channel.createMessage(':exclamation:   **»**   Unable to parse a duration from `' + args[0] + '`.');
		}
	}
}

module.exports = Remind;