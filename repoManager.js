const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

class RepoManager {

    /**
     * @param {string} root path to directory containing all the repos
     * @param {string} repoUrl The prefix of all repository URLs
     */
    constructor(root, repoUrl) {
        this.root = root;
        if (!repoUrl.endsWith('/')) repoUrl += '/';
        this.repoUrl = repoUrl;
        this.tagFile = path.join(__dirname, 'tags.json');

        if (!fs.existsSync(this.root)) {
            console.log(`Root directory "${this.root}" does not exist, creating it now.`);
            fs.mkdirSync(this.root);
        }

        if (!fs.existsSync(this.tagFile)) {
            console.log(`Tags file "${this.tagFile}" does not exist, creating it now.`);
            fs.writeFileSync(this.tagFile, '{}');
        }
    }

    /**
     * @returns Array of {path, url}
     */
    getRepos() {
        const tags = this.getTags();
        return fs.readdirSync(this.root)
            .map(name => {
                const repo = {
                    path: path.join(this.root, name),
                    url: this.repoUrl + name
                };
                if (name in tags) {
                    repo.tag = tags[name];
                }
                return repo;
            })
            .filter(repo => {
                const stat = fs.lstatSync(repo.path);
                return stat.isDirectory();
            });
    }

    /**
     * Create a repository with the given name in the root directory
     *
     * @param {string} name The name of the repository
     * @returns {Promise} Promise with the result of the git init command
     */
    createRepo(name) {
        return new Promise((resolve, reject) => {
            const repoPath = path.join(this.root, name);

            if (fs.existsSync(repoPath)) {
                return reject(`Repository already exists at path: ${repoPath}`);
            }

            fs.mkdirSync(repoPath);

            exec('git init --bare', {
                cwd: repoPath
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else if (stderr.length > 0) {
                    reject(stderr);
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    /**
     * @returns {object} Mapping from repo to tag
     */
    getTags() {
        return JSON.parse(fs.readFileSync(this.tagFile, 'utf-8'));
    }

    /**
     * Set a repo's tag
     *
     * @param {string} repo The repo
     * @param {string} tag The new tag for the repo, or null
     */
    setTag(repo, tag) {
        const tags = this.getTags();

        if (tag) {
            tags[repo] = tag;
        } else {
            delete tags[repo];
        }

        fs.writeFileSync(this.tagFile, JSON.stringify(tags, null, 2));
    }
}

module.exports = RepoManager;