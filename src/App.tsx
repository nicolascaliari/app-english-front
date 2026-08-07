import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CategoryPage } from './pages/CategoryPage';
import { GrammarPracticePage } from './pages/GrammarPracticePage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NewCardPage } from './pages/NewCardPage';
import { PracticePage } from './pages/PracticePage';
import { RegisterPage } from './pages/RegisterPage';
import { ReviewPage } from './pages/ReviewPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="category/:slug" element={<CategoryPage />} />
              <Route path="category/:slug/:subSlug" element={<CategoryPage />} />
              <Route path="review" element={<ReviewPage />} />
              <Route path="practice" element={<PracticePage />} />
              <Route path="grammar" element={<GrammarPracticePage />} />
              <Route path="new" element={<NewCardPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
