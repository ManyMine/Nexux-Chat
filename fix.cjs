const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');

const target = `                          />
                        </div>
                      </div>
                    )}
          {/* Message Input - Fixed to bottom */}
          <div className="px-4 pb-4 pt-0 shrink-0 min-w-0 w-full bg-bg-primary">
            {/* ... Existing Input Form content ... */}
          </div>
        </div>
      </div>
    )}


                    {/* Deletion Confirmation Overlay */}`;

const replacement = `                          />
                        </div>
                      </div>
                    )}
                    {/* Deletion Confirmation Overlay */}`;

code = code.replace(target, replacement);

const target2 = `                      </div>
                    )}
                 {/* Message Input */}`;

const replacement2 = `                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {/* Message Input */}`;

code = code.replace(target2, replacement2);
fs.writeFileSync('src/components/Chat/ChatArea.tsx', code);
