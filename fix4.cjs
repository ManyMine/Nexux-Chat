const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');

const target = `          {/* Messages List Area */}
          <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
          <div className="absolute bottom-40 right-6 flex flex-col space-y-2 z-20">
            <button 
              onClick={() => scrollRef.current?.scrollTo({top: 0, behavior: 'smooth'})}
              className={cn("p-2 bg-bg-secondary border border-border-primary rounded-full hover:bg-bg-tertiary shadow-lg text-text-primary transition-opacity duration-200", showScrollToTop ? "opacity-100" : "opacity-0 pointer-events-none")}
              title="Ir para o topo"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
          </div>
          <div 
            ref={scrollRef}`;

const replacement = `          {/* Messages List Area */}
          <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
          <div className="absolute bottom-40 right-6 flex flex-col space-y-2 z-20">
            <button 
              onClick={() => scrollRef.current?.scrollTo({top: 0, behavior: 'smooth'})}
              className={cn("p-2 bg-bg-secondary border border-border-primary rounded-full hover:bg-bg-tertiary shadow-lg text-text-primary transition-opacity duration-200", showScrollToTop ? "opacity-100" : "opacity-0 pointer-events-none")}
              title="Ir para o topo"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
          <div 
            ref={scrollRef}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/Chat/ChatArea.tsx', code);
