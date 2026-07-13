const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');
const newRule = `
    match /settings/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
`;
rules = rules.replace(/match \/reports\/\{reportId\} \{/, newRule + '    match /reports/{reportId} {');
fs.writeFileSync('firestore.rules', rules);
