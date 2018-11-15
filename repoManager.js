const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

class RepoManager {

    /**
     * @param root (String) path to directory containing all the repos
     */
    constructor(root, repoUrl) {
        this.root = root;
        if (!repoUrl.endsWith('/')) repoUrl += '/';
        this.repoUrl = repoUrl;
    }

    /**
     * @returns Array of {path, url}
     */
    getRepos() {
        return fs.readdirSync(this.root)
            .map(name => {
                return {
                    path: path.join(this.root, name),
                    url: this.repoUrl + name
                };
            })
            .filter(repo => {
                const stat = fs.lstatSync(repo.path);
                return stat.isDirectory();
            });
    }

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
}

module.exports = RepoManager;