import { useState } from 'react';
import styled from 'styled-components';
import { FaUser, FaBook, FaInfoCircle, FaLifeRing, FaPuzzlePiece, FaFlask, FaDiscord, FaBell, FaLanguage } from 'react-icons/fa';

const PageContainer = styled.div`
  display: flex;
  max-width: 80rem;
  margin: 0 auto;
  padding: 1rem;
  gap: 1rem;
  flex-wrap: wrap;
`;

const Sidebar = styled.nav`
  width: 18rem;
  padding: 1rem;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 100%;
    margin-bottom: 1rem;
  }
`;

const Content = styled.div`
  flex: 1;
  padding: 1.5rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
`;

const Card = styled.div`
  width: 100%;
  max-width: 60rem;
  padding: 2rem;
  background-color: #3331;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    max-width: 100%;
    padding: 1rem;
  }
`;

const SidebarItem = styled.button<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background: none;
  border: none;
  padding: 0.8rem;
  font-size: 1rem;
  cursor: pointer;
  text-align: left;
  color: ${(props) => (props.active ? '#fff' : '#333')};
  background-color: ${(props) => (props.active ? '#744aff' : 'transparent')};
  border-radius: 8px;

  &:hover {
    background-color: ${(props) => (props.active ? '#744aff' : '#f4f4f4')};
  }
`;

const SectionTitle = styled.h2`
  margin: 0 0 1rem;
  font-size: 1.5rem;
`;

const Switch = styled.button<{ isOn: boolean }>`
  width: 40px;
  height: 20px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  background-color: ${(props) => (props.isOn ? '#5865F2' : '#72767d')};
  position: relative;
  transition: background-color 0.3s ease;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${(props) => (props.isOn ? '22px' : '3px')};
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background-color: white;
    transition: left 0.3s ease;
  }
`;

const ExperimentalWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ExperimentalLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  span {
    font-family: 'Roboto', sans-serif;
    font-size: 1rem;
    font-weight: 500;
    color: #555;
  }

  .tag {
    background-color: #744aff;
    color: #fff;
    font-size: 0.8rem;
    padding: 0.2rem 0.6rem;
    border-radius: 8px;
    font-weight: bold;
  }
`;

const SettingsSection = () => {
  const [fastCache, setFastCache] = useState(false);
  const [discordRPC, setDiscordRPC] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('en');

  return (
      <>
        <SectionTitle>Einstellungen</SectionTitle>

        <ExperimentalWrapper>
          <ExperimentalLabel>
            <FaFlask />
            <span>Fast Cache</span>
            <span className="tag">experimental</span>
          </ExperimentalLabel>
          <Switch isOn={fastCache} onClick={() => setFastCache((prev) => !prev)} aria-label="Toggle Fast Cache" />
        </ExperimentalWrapper>

        <ExperimentalWrapper>
          <ExperimentalLabel>
            <FaDiscord />
            <span>Discord RPC</span>
          </ExperimentalLabel>
          <Switch isOn={discordRPC} onClick={() => setDiscordRPC((prev) => !prev)} aria-label="Toggle Discord RPC" />
        </ExperimentalWrapper>

        <ExperimentalWrapper>
          <ExperimentalLabel>
            <FaBell />
            <span>Benachrichtigungen</span>
          </ExperimentalLabel>
          <Switch isOn={notifications} onClick={() => setNotifications((prev) => !prev)} aria-label="Toggle Notifications" />
        </ExperimentalWrapper>

        <ExperimentalWrapper>
          <ExperimentalLabel>
            <FaLanguage />
            <span>Sprache</span>
          </ExperimentalLabel>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Change Language">
            <option value="en">Englisch</option>
            <option value="de">Deutsch</option>
            <option value="fr">Französisch</option>
            <option value="es">Spanisch</option>
          </select>
        </ExperimentalWrapper>
      </>
  );
};

const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState<string>('settings');

  const sections: Record<string, { label: string; icon: JSX.Element }> = {
    settings: { label: 'Einstellungen', icon: <FaPuzzlePiece /> },
    account: { label: 'Konto', icon: <FaUser /> },
    library: { label: 'Library', icon: <FaBook /> },
    about: { label: 'About Us', icon: <FaInfoCircle /> },
    support: { label: 'Support', icon: <FaLifeRing /> },
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'settings':
        return <SettingsSection />;
      case 'account':
        return <SectionTitle>Konto-Einstellungen</SectionTitle>;
      case 'library':
        return <SectionTitle>Library-Management</SectionTitle>;
      case 'about':
        return <SectionTitle>Über uns</SectionTitle>;
      case 'support':
        return <SectionTitle>Support & Hilfe</SectionTitle>;
      default:
        return null;
    }
  };

  return (
      <PageContainer>
        <Sidebar>
          {Object.entries(sections).map(([key, { label, icon }]) => (
              <SidebarItem key={key} active={activeSection === key} onClick={() => setActiveSection(key)}>
                {icon}
                {label}
              </SidebarItem>
          ))}
        </Sidebar>
        <Content>
          <Card>{renderSection()}</Card>
        </Content>
      </PageContainer>
  );
};

export default SettingsPage;
