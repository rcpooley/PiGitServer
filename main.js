const RepoManager = require('./repoManager');
const Web = require('./web');
const config = require('./config.json');

const manager = new RepoManager(config.reposRoot, config.repoUrl);
new Web(manager, config.port, config.password);