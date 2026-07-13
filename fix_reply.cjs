const fs = require('fs');
let chatArea = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf8');

const replyPreview = `             {replyingToMessage && (
               <div className="flex items-center justify-between bg-bg-secondary px-4 py-2 rounded-t-lg border-b border-border-primary">
                 <span className="text-xs text-text-secondary">Respondendo a {replyingToMessage.senderName}...</span>
                 <button onClick={() => setReplyingToMessage(null)} className="text-text-muted hover:text-text-secondary">
                   <X className="w-4 h-4" />
                 </button>
               </div>
             )}
             <form`;

// Looking for the exact line in ChatArea
chatArea = chatArea.replace('             <form', replyPreview);
fs.writeFileSync('src/components/Chat/ChatArea.tsx', chatArea);
