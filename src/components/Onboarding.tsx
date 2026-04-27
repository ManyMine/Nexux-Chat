import React from 'react';
import { Joyride, Step } from 'react-joyride';

interface OnboardingProps {
  run: boolean;
  onCallback: (data: any) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ run, onCallback }) => {
  const JoyrideComponent = Joyride as any;
  const steps: any[] = [
    {
      target: '.sidebar',
      content: 'Bem-vindo ao Noton Nexus! Aqui você pode ver seus canais e servidores.',
      disableBeacon: true,
    },
    {
      target: '.create-channel-btn',
      content: 'Você pode criar comunidades, projetos ou servidores aqui!',
    },
    {
      target: '.chat-input',
      content: 'Envie mensagens para seus amigos e colegas aqui.',
    },
    {
      target: '.user-panel',
      content: 'Gerencie seu status e configurações de perfil aqui.',
    },
  ];

  return (
    <JoyrideComponent
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      callback={onCallback}
      styles={{
        options: {
          primaryColor: '#5865f2',
          textColor: '#ffffff',
          backgroundColor: '#1e1f22',
        },
      } as any}
    />
  );
};
