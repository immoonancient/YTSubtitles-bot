function cheer(name) {

  const templates = [
    "{name} you're awesome!",
    "{name} you did such a great job!",
    "Great work {name}!",
    "What an achievement {name}!",
    "Your contribution matters {name}!",
    "Thank you for your contribution {name}!",
    "Thanks for the hard work {name}!",
    "Marvelous, {name}!",
    "Fantastic, {name}!"
  ];

  const index = Math.floor(Math.random() * templates.length);
  return templates[index].replace('{name}', `@${name}`);
}

module.exports = cheer;