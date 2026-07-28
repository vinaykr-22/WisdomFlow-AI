import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { useThemeStore } from './stores/theme';
import Login from './routes/Login';
import Register from './routes/Register';
import ForgotPassword from './routes/ForgotPassword';
import ResetPassword from './routes/ResetPassword';
import ProtectedRoute from './routes/ProtectedRoute';
import Dashboard from './routes/Dashboard';
import Documents from './routes/Documents';
import Summarizer from './routes/Summarizer';
import Chat from './routes/Chat';
import Quizzes from './routes/Quizzes';
import Flashcards from './routes/Flashcards';
import Roadmap from './routes/Roadmap';
import Progress from './routes/Progress';
import Revision from './routes/Revision';
import VoiceTutor from './routes/VoiceTutor';
import Search from './routes/Search';

export default function App() {
  const isDark = useThemeStore((state) => state.isDark);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <BrowserRouter>
      <Analytics />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/summarize" element={<Summarizer />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/revision" element={<Revision />} />
          <Route path="/voice-tutor" element={<VoiceTutor />} />
          <Route path="/search" element={<Search />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
