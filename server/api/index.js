import app from './server.js';

export default async function handler(req, res) {
    return new Promise((resolve, reject) => {
        app(req, res, (err) => {
            if (err) reject(err);
            else resolve(undefined);
        });
    });
}