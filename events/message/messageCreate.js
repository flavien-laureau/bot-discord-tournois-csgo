/* 
  Cet event est trigger lorsqu'un message est écrit.
  Il y a une série de vérification du message (bot, prefix, permissions, ...),
  pour savoir comment le traiter avant d'arriver à la fin du code (command.run).
*/
const { Collection } = require('discord.js');

module.exports = async (client, message) => {
  if (message.content.includes('discord.gg/')) {
    message.delete();
    //TODO: Faire un système d'avertissement.
  }

  const prefix = await client.getSetting('prefix');

  if (message.author.bot) return; //Si le message est écrit par un bot.
  if (!message.content.startsWith(prefix)) return; //Si le message n'a pas de préfix.

  const args = message.content.slice(prefix.length).split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName) || client.commands.find((cmd) => cmd.help.aliases && cmd.help.aliases.includes(commandName));
  if (!command) return;

  if (command.help.isPermissionsRequired && !message.member.permissions.has('BAN_MEMBERS')) {
    //Si l'utilisateur n'a pas les droits
    return message.reply("Tu n'a pas les permissions pour taper cette commande !");
  }

  if (command.help.isArgumentRequired && !args.length) {
    //Si la commande n'a pas d'argmument, alors qu'elle en necessite au moins un. (args = true)
    let noArgsReply = `Votre commande est incomplète, ${message.author} !`;
    if (command.help.usage) {
      //Si on est ici, c'est que l'utilisateur a oublié le/les argument(s). Donc on va lui préciser comment utiliser la commande.
      noArgsReply += `\nVoici comment utiliser la commande: ${prefix}${command.help.name} ${command.help.usage}`;
    }
    return message.channel.send(noArgsReply);
  }

  if (command.help.needUserMention) {
    let user = message.mentions.users.first();

    if (user === undefined) return message.reply('Il faut mentionner un utilisateur.');
    if (user.bot) return message.reply('Vous ne pouvez pas mentionner un bot.');

    if (!command.help.canAdminMention && message.guild.members.cache.get(user.id).permissions.has('BAN_MEMBERS')) {
      //Si la cible de la commande est un admin/modo
      return message.reply('Tu ne peux pas utiliser cette commande sur cette utilisateur.');
    }
  }

  if (command.help.needRoleMention) {
    let role = message.mentions.roles.first();

    if (role === undefined) return message.reply('Il faut mentionner un role.');
    if (!role.mentionable) return message.reply('Vous ne pouvez pas mentionner ce role');
  }

  if (!client.cooldowns.has(command.help.name)) {
    client.cooldowns.set(command.help.name, new Collection());
  }

  const timeNow = Date.now();
  const timestamps = client.cooldowns.get(command.help.name);
  const cooldownAmount = command.help.cooldown * 1000;

  if (timestamps.has(message.author.id)) {
    const cooldownExpirationTime = timestamps.get(message.author.id) + cooldownAmount;

    if (timeNow < cooldownExpirationTime) {
      const timeleft = (cooldownExpirationTime - timeNow) / 1000;
      return message.reply(`Merci d'attendre ${timeleft.toFixed(0)} seconde(s) avant de ré-utiliser la commande ${command.help.name}.`);
    }
  }

  timestamps.set(message.author.id, timeNow);
  setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

  command.run(client, message, args);
};