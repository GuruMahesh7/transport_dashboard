const fs = require('fs');
let yaml = fs.readFileSync('lib/api-spec/openapi.yaml', 'utf8');

const replacement = `    Hub:
      type: object
      required: [id, hubName, hubCode, address, contactNumber, isActive, createdAt]
      properties:
        id:
          type: integer
        hubName:
          type: string
        hubCode:
          type: string
        address:
          type: string
        contactNumber:
          type: string
        isActive:
          type: boolean
        createdAt:
          type: string

    HubInput:
      type: object
      required: [hubName, hubCode, address, contactNumber]
      properties:
        hubName:
          type: string
        hubCode:
          type: string
        address:
          type: string
        contactNumber:
          type: string

    HubUpdate:
      type: object
      properties:
        hubName:
          type: string
        hubCode:
          type: string
        address:
          type: string
        contactNumber:
          type: string`;

yaml = yaml.replace(/    Hub:\n      type: object\n      required: \[id, hubName, hubCode, address, contactNumber, isActive, createdAt\]\n      properties:\n        id:\n          type: integer\n        isActive:\n          type: boolean\n        createdAt:\n          type: string\n\n    HubInput:\n      type: object\n      required: \[hubName, hubCode, address, contactNumber\]\n      properties:\n        isActive:\n          type: boolean\n        createdAt:\n          type: string/, replacement);

fs.writeFileSync('lib/api-spec/openapi.yaml', yaml);
