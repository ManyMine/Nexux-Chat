const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');

const target = `                    )}
                  </div>
                  </div>
                );`;

const replacement = `                    )}
                  </div>
                );`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/Chat/ChatArea.tsx', code);
