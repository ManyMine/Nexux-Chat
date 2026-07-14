const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');

const target = `            )}
          </AnimatePresence>
        </div>
      </div>

      {selectedStatusUserId && (`;

const replacement = `            )}
          </AnimatePresence>
        </div>

      {selectedStatusUserId && (`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/Chat/ChatArea.tsx', code);
