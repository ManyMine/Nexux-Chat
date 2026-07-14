const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');

const target = `                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {/* Message Input */}`;

const replacement = `                      </div>
                    )}
                  </div>
                  </div>
                );
              })
            )}
          </div>
          {/* Message Input */}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/Chat/ChatArea.tsx', code);
