import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CategoryPage } from './pages/CategoryPage';
import { GrammarPracticePage } from './pages/GrammarPracticePage';
import { HomePage } from './pages/HomePage';
import { NewCardPage } from './pages/NewCardPage';
import { PracticePage } from './pages/PracticePage';
import { ReviewPage } from './pages/ReviewPage';

export default function App() {

  
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="category/:slug" element={<CategoryPage />} />
          <Route path="category/:slug/:subSlug" element={<CategoryPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="practice" element={<PracticePage />} />
          <Route path="grammar" element={<GrammarPracticePage />} />
          <Route path="new" element={<NewCardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
