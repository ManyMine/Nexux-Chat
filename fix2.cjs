const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');

const target = `                      </div>
                 {/* Message Input */}
          <div className="px-4 pb-4 pt-0 shrink-0 min-w-0 w-full bg-bg-primary">`;

const replacement = `                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {/* Message Input */}
          <div className="px-4 pb-4 pt-0 shrink-0 min-w-0 w-full bg-bg-primary">`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/Chat/ChatArea.tsx', code);
