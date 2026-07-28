const fs = require('fs');
let lines = fs.readFileSync('lib/api-spec/openapi.yaml', 'utf8').split('\n');
const insertIdx = lines.findIndex(l => l === '    StaffInput:');
if (insertIdx !== -1) {
  const staffUpdateSchema = [
    '    StaffUpdate:',
    '      type: object',
    '      properties:',
    '        name:',
    '          type: string',
    '        phone:',
    '          type: string',
    '        email:',
    '          type: string',
    '        role:',
    '          type: string'
  ];
  lines.splice(insertIdx, 0, ...staffUpdateSchema, '');
  fs.writeFileSync('lib/api-spec/openapi.yaml', lines.join('\n'));
}
