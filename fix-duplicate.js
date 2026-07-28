const fs = require('fs');
let yaml = fs.readFileSync('lib/api-spec/openapi.yaml', 'utf8');

const str = `    StaffInput:
      type: object
      required: [name, phone, email, password, role]
      properties:
        name:
          type: string
        phone:
          type: string
        email:
          type: string
        password:
          type: string
        role:
          type: string

    StaffUpdate:
      type: object
      properties:
        name:
          type: string
        phone:
          type: string
        email:
          type: string
        role:
          type: string
`;

yaml = yaml.replace(str, ''); // this should remove the first occurrence or second
fs.writeFileSync('lib/api-spec/openapi.yaml', yaml);
