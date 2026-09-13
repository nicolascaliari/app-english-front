import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ErrorDialogProvider } from './components/ErrorDialogProvider';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserOnlyRoute } from './components/UserOnlyRoute';
import { I18nProvider } from './i18n/I18nProvider';
import { AdminPage } from './pages/AdminPage';
import { CategoryPage } from './pages/CategoryPage';
import { GrammarPracticePage } from './pages/GrammarPracticePage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NewCardPage } from './pages/NewCardPage';
import { PracticeHubPage } from './pages/PracticeHubPage';
import { PracticePage } from './pages/PracticePage';
import { PinnedPracticePage } from './pages/PinnedPracticePage';
import { ReadingLibraryPage } from './pages/ReadingLibraryPage';
import { RegisterPage } from './pages/RegisterPage';
import { ReviewPage } from './pages/ReviewPage';
import { SettingsPage } from './pages/SettingsPage';

const ReadingReaderPage = lazy(() =>
  import('./pages/ReadingReaderPage').then((mod) => ({
    default: mod.ReadingReaderPage,
  })),
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <I18nProvider>
          <ErrorDialogProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                {/* Panel de administración: única pantalla para un admin. */}
                <Route path="admin" element={<AdminPage />} />

                {/* Todo lo demás es la app de estudio, vedada a los admins. */}
                <Route element={<UserOnlyRoute />}>
                <Route index element={<HomePage />} />
                <Route path="category/:slug" element={<CategoryPage />} />
                <Route path="category/:slug/:subSlug" element={<CategoryPage />} />
                <Route path="review" element={<ReviewPage />} />
                <Route path="practice" element={<PracticeHubPage />} />
                <Route path="practice/session" element={<PracticePage />} />
                <Route path="practice/pinned" element={<PinnedPracticePage />} />
                <Route path="reading" element={<ReadingLibraryPage />} />
                <Route
                  path="reading/:bookId"
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <ReadingReaderPage />
                    </Suspense>
                  }
                />
                <Route path="grammar" element={<GrammarPracticePage />} />
                <Route path="new" element={<NewCardPage />} />
                <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
          </ErrorDialogProvider>
        </I18nProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
