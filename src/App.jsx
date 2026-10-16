import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Title from './components/Title.jsx';
import Play from './components/Play.jsx';
import Shop from './components/Shop.jsx';
import Cheats from './components/Cheats.jsx';
import Settings from './components/Settings.jsx';
import HowTo from './components/HowTo.jsx';
import { useSave } from './store.js';
import { audio } from './audio/audio.js';

export default function App() {
  const settings = useSave((s) => s.settings);
  useEffect(() => {
    audio.setVolumes(settings.music, settings.sfx);
  }, [settings.music, settings.sfx]);
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Title />} />
        <Route path="/play" element={<Play />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/cheats" element={<Cheats />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/how" element={<HowTo />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
