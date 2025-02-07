import { useState } from 'react';
import styled from 'styled-components';
import {
    FaUser, FaPuzzlePiece, FaPlug, FaLanguage, FaFilm, FaGamepad, FaVideo,
} from 'react-icons/fa';

const PageContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #121212, #1e1e1e);
    color: #f5f5f5;
    padding: 2rem;
`;

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 650px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 2rem;
    border-radius: 16px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
`;

const Sidebar = styled.nav`
    display: flex;
    width: 100%;
    gap: 1rem;
    margin-bottom: 1.5rem;
`;

const SidebarItem = styled.button<{ active: boolean }>`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: ${(props) => (props.active ? '#7d5fff' : 'rgba(255, 255, 255, 0.1)')};
    color: ${(props) => (props.active ? '#fff' : '#ddd')};
    border: none;
    padding: 0.8rem;
    border-radius: 12px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
        background: #7d5fff;
        color: #fff;
    }
`;

const Card = styled.div`
    width: 100%;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
`;

const SectionTitle = styled.h2`
    margin-bottom: 1rem;
    font-size: 1.5rem;
    font-weight: 600;
    text-align: center;
`;

const Dropdown = styled.select`
    width: 100%;
    padding: 0.7rem;
    border-radius: 10px;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.3s;

    &:hover {
        background: rgba(255, 255, 255, 0.3);
    }
`;

const PluginList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    width: 100%;
`;

const PluginItem = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(255, 255, 255, 0.1);
    padding: 1rem;
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
`;

const SettingsSection = () => {
    const [language, setLanguage] = useState('en');

    return (
        <>
            <SectionTitle>⚙️ Einstellungen</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <FaLanguage size={20} />
                <Dropdown value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="en">🇬🇧 Englisch</option>
                    <option value="de">🇩🇪 Deutsch</option>
                    <option value="fr">🇫🇷 Französisch</option>
                    <option value="es">🇪🇸 Spanisch</option>
                </Dropdown>
            </div>
        </>
    );
};

const PluginsSection = () => {
    const plugins = [
        { name: 'AniWorld', version: '1.2.0', icon: <FaVideo size={28} /> },
        { name: 'CrunchyRoll+', version: '3.0.5', icon: <FaFilm size={28} /> },
        { name: 'Twitch Helper', version: '2.1.3', icon: <FaGamepad size={28} /> },
    ];

    return (
        <>
            <SectionTitle>🔌 Plugins</SectionTitle>
            <PluginList>
                {plugins.map((plugin, index) => (
                    <PluginItem key={index}>
                        {plugin.icon}
                        <div>
                            <strong>{plugin.name}</strong>
                            <p style={{ fontSize: '0.9rem', color: '#bbb' }}>Version {plugin.version}</p>
                        </div>
                    </PluginItem>
                ))}
            </PluginList>
        </>
    );
};

const SettingsPage = () => {
    const [activeSection, setActiveSection] = useState('settings');

    return (
        <PageContainer>
            <Wrapper>
                <Sidebar>
                    <SidebarItem active={activeSection === 'settings'} onClick={() => setActiveSection('settings')}>
                        <FaPuzzlePiece /> Einstellungen
                    </SidebarItem>
                    <SidebarItem active={activeSection === 'plugins'} onClick={() => setActiveSection('plugins')}>
                        <FaPlug /> Plugins
                    </SidebarItem>
                </Sidebar>
                <Card>{activeSection === 'settings' ? <SettingsSection /> : <PluginsSection />}</Card>
            </Wrapper>
        </PageContainer>
    );
};

export default SettingsPage;