const fs = require('fs');
let yaml = fs.readFileSync('lib/api-spec/openapi.yaml', 'utf8');

yaml = yaml.replace(/        remarks:\n          type: \["string", "null"\]\n          type: integer\n          type: \["string", "null"\]\n          type: \["string", "null"\]/g,
'        remarks:\n          type: ["string", "null"]');

yaml = yaml.replace(/        remarks:\n          type: string\n          type: integer/g,
'        remarks:\n          type: string');

yaml = yaml.replace(/        remarks:\n          type: \["string", "null"\]\n          type: integer/g,
'        remarks:\n          type: ["string", "null"]');

yaml = yaml.replace(/        role:\n          type: string\n          type: \["integer", "null"\]\n          type: \["string", "null"\]\n          type: \["string", "null"\]/g,
'        role:\n          type: string');

yaml = yaml.replace(/        role:\n          type: string\n          type: \["integer", "null"\]/g,
'        role:\n          type: string');

yaml = yaml.replace(/        performedByName:\n          type: \["string", "null"\]\n          type: \["integer", "null"\]\n          type: \["string", "null"\]/g,
'        performedByName:\n          type: ["string", "null"]');

fs.writeFileSync('lib/api-spec/openapi.yaml', yaml);
