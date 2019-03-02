const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const NodeRSA = require('node-rsa');

class Web {
    constructor(manager, port, password) {
        this.manager = manager;
        this.port = port;
        this.password = password;

        this.initRSA();
        this.createApp();
        this.middleware();
        this.routes();
        this.createServer();
        this.listen();
    }

    initRSA() {
        const privateKeyPath = path.join(__dirname, 'private.key');
        const publicKeyPath = path.join(__dirname, 'public.key');
        if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
            const key = new NodeRSA({b: 512});
            fs.writeFileSync(privateKeyPath, key.exportKey('pkcs8-private-pem'));
            fs.writeFileSync(publicKeyPath, key.exportKey('pkcs8-public-pem'));
        }

        this.privateKey = fs.readFileSync(privateKeyPath);
        this.publicKey = fs.readFileSync(publicKeyPath);
    }

    createApp() {
        this.app = express();
    }

    middleware() {
        this.app.use(bodyParser.urlencoded({extended: false}));
        this.app.use(bodyParser.json());
    }

    route(path, args, cb) {
        this.app.post(path, (req, res) => {
            if (req.body) {
                for (let i = 0; i < args.length; i++) {
                    if (!(args[i] in req.body)) {
                        res.json({error: `Missing argument: ${args[i]}`});
                        return;
                    }
                }
                cb(req, res);
            } else {
                res.json({error: 'No body in request'});
            }
        });
    }

    authRoute(path, args, cb) {
        this.route(path, ['token', ...args], (req, res) => {
            jwt.verify(req.body.token, this.publicKey, (err, decoded) => {
                if (err || !decoded.auth) {
                    res.json({error: 'Invalid token'});
                } else {
                    cb(req, res);
                }
            })
        });
    }

    routes() {
        this.route('/auth', ['password'], (req, res) => {
            if (req.body.password === this.password) {
                const token = jwt.sign({auth: true}, this.privateKey, {algorithm: 'RS256'});
                res.json({
                    success: true,
                    token
                });
            } else {
                res.json({success: false});
            }
        });

        this.authRoute('/repos', [], (req, res) => {
            res.json({repos: this.manager.getRepos()});
        });

        this.authRoute('/addrepo', ['name'], (req, res) => {
            this.manager.createRepo(req.body.name)
                .then(() => {
                    res.json({success: true});
                })
                .catch(err => {
                    res.json({
                        success: false,
                        error: err
                    });
                });
        });

        this.authRoute('/settag', ['repo', 'tag'], (req, res) => {
            this.manager.setTag(req.body.repo, req.body.tag);
            res.json({success: true});
        });

        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    createServer() {
        this.server = http.createServer(this.app);
    }

    listen() {
        this.server.listen(this.port, () => {
            console.log(`Listening on *:${this.port}`);
        });
    }
}

module.exports = Web;