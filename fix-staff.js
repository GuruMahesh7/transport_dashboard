const fs = require('fs');
let yaml = fs.readFileSync('lib/api-spec/openapi.yaml', 'utf8');

yaml = yaml.replace(/          type: string\n        hubId:\n          type: \["integer", "null"\]\n\n    StaffUpdate:\n      type: object\n      properties:\n        name:\n          type: string\n        phone:\n          type: string\n        email:\n          type: string\n        role:\n          type: string\n        hubId:\n          type: \["integer", "null"\]/g,
`    StaffMember:
      type: object
      required: [id, name, phone, email, role, isActive, createdAt]
      properties:
        id:
          type: integer
        name:
          type: string
        phone:
          type: string
        email:
          type: string
        role:
          type: string
        isActive:
          type: boolean
        createdAt:
          type: string

    StaffInput:
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
          type: string`);

fs.writeFileSync('lib/api-spec/openapi.yaml', yaml);
