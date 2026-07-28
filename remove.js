const fs = require('fs');
let c = fs.readFileSync('lib/api-zod/src/generated/api.ts', 'utf8');
c = c.replace(/.*?"receiver(Name|Phone|Email|Address)".*?\n/g, '');
fs.writeFileSync('lib/api-zod/src/generated/api.ts', c);
