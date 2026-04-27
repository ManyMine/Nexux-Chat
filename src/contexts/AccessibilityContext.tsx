import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilitySettings {
  autismTheme: boolean;
  morseCode: boolean;
  libras: boolean;
  adhdFocus: boolean;
  dyslexiaFont: boolean;
  textToSpeech: boolean;
  highContrast: boolean;
  studentMode: boolean;
  ttsVoiceName: string;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
}

const defaultSettings: AccessibilitySettings = {
  autismTheme: false,
  morseCode: false,
  libras: false,
  adhdFocus: false,
  dyslexiaFont: false,
  textToSpeech: false,
  highContrast: false,
  studentMode: false,
  ttsVoiceName: '',
};

const AccessibilityContext = createContext<AccessibilityContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
});

export const useAccessibility = () => useContext(AccessibilityContext);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const saved = localStorage.getItem('accessibility_settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('accessibility_settings', JSON.stringify(settings));
    
    // Apply Autism Theme
    if (settings.autismTheme) {
      document.body.classList.add('theme-autism');
    } else {
      document.body.classList.remove('theme-autism');
    }

    // Apply ADHD Focus
    if (settings.adhdFocus) {
      document.body.classList.add('theme-adhd');
    } else {
      document.body.classList.remove('theme-adhd');
    }

    // Apply Dyslexia Font
    if (settings.dyslexiaFont) {
      document.body.classList.add('theme-dyslexia');
    } else {
      document.body.classList.remove('theme-dyslexia');
    }

    // Apply High Contrast
    if (settings.highContrast) {
      document.body.classList.add('theme-high-contrast');
    } else {
      document.body.classList.remove('theme-high-contrast');
    }

    // Apply Student Mode
    if (settings.studentMode) {
      document.body.classList.add('theme-student');
    } else {
      document.body.classList.remove('theme-student');
    }

    // Libras Widget
    if (settings.libras) {
      const scriptId = 'vlibras-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
        script.onload = () => {
          if ((window as any).VLibras) {
            new (window as any).VLibras.Widget('https://vlibras.gov.br/app');
          }
        };
        document.body.appendChild(script);
        
        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'vlibras-widget';
        widgetContainer.innerHTML = `
          <div vw class="enabled">
            <div vw-access-button class="active"></div>
            <div vw-plugin-wrapper>
              <div class="vw-plugin-top-wrapper"></div>
            </div>
          </div>
        `;
        document.body.appendChild(widgetContainer);
      }
    } else {
      const script = document.getElementById('vlibras-script');
      if (script) script.remove();
      const widget = document.getElementById('vlibras-widget');
      if (widget) widget.remove();
      // Also remove any injected VLibras elements
      const injectedVlibras = document.querySelector('[vw]');
      if (injectedVlibras) injectedVlibras.remove();
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <AccessibilityContext.Provider value={{ settings, updateSettings }}>
      {children}
    </AccessibilityContext.Provider>
  );
};
