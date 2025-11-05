import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const ForbiddenUsernamesPath = path.resolve(__dirname, './ForbiddenUsernames.json');
const ForbiddenUsernames = JSON.parse(fs.readFileSync(ForbiddenUsernamesPath, 'utf-8'));

export function isUsernameForbidden(username) {
    return ForbiddenUsernames.includes(username.toLowerCase());
}

export { ForbiddenUsernames };