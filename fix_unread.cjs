const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace state definition
code = code.replace(
  'const [unreadChannels, setUnreadChannels] = useState<Set<string>>(new Set());',
  `const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const unreadChannels = React.useMemo(() => new Set(Object.keys(unreadCounts).filter(k => unreadCounts[k] > 0)), [unreadCounts]);
  const totalUnreadCount = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);`
);

// Replace active channel clear
code = code.replace(
  `setUnreadChannels(prev => {
        const next = new Set(prev);
        next.delete(activeChannel.id);
        return next;
      });`,
  `setUnreadCounts(prev => {
        if (prev[activeChannel.id] === 0 || prev[activeChannel.id] === undefined) return prev;
        return { ...prev, [activeChannel.id]: 0 };
      });`
);

// Replace new message logic
code = code.replace(
  `setUnreadChannels(prev => new Set(prev).add(channel.id));`,
  `setUnreadCounts(prev => ({ ...prev, [channel.id]: (prev[channel.id] || 0) + 1 }));
                import('@/src/lib/notification').then(m => m.playNotificationSound());`
);

// Replace clear logic
code = code.replace(
  `setUnreadChannels(prev => {
      const next = new Set(prev);
      channelIds.forEach(id => next.delete(id));
      return next;
    });`,
  `setUnreadCounts(prev => {
      const next = { ...prev };
      channelIds.forEach(id => { next[id] = 0; });
      return next;
    });`
);

// Now, handle the document.title and favicon
// We can insert a useEffect right after the totalUnreadCount calculation

const titleEffect = `
  useEffect(() => {
    if (totalUnreadCount > 0) {
      document.title = \`(\${totalUnreadCount}) Noton Nexus\`;
      // Update favicon to a red dot one or similar. For simplicity, just use a data URI of a red circle on top of existing favicon or a generic one.
      const link: any = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/svg+xml';
      link.rel = 'icon';
      link.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23f23f42"/></svg>';
      document.getElementsByTagName('head')[0].appendChild(link);
    } else {
      document.title = 'Noton Nexus';
      const link: any = document.querySelector("link[rel*='icon']");
      if (link) {
        link.href = '/vite.svg'; // Default favicon
      }
    }
  }, [totalUnreadCount]);
`;

code = code.replace(
  'const totalUnreadCount = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);',
  'const totalUnreadCount = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);\n' + titleEffect
);

fs.writeFileSync('src/App.tsx', code);
