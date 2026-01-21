import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GlobalStyles from './styles/GlobalStyles';
import Header from './components/Header';
import Charts from './components/Charts';
import PowerRanking from './components/PowerRanking';
import RankingWidget from './components/RankingWidget';
import TodaysNews from './components/TodaysNews';
import Footer from './components/Footer';
import PersonDetailPage from './pages/PersonDetailPage';
import NewsPage from './pages/NewsPage';

// 메인 페이지 컴포넌트
const Home = () => {
    return (
        <main>
            <PowerRanking />
            <TodaysNews />
            <Charts />
            <RankingWidget />
        </main>
    );
};

function App() {
    return (
        <Router>
            <GlobalStyles />
            <Header />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/power-rankings/:name" element={<PersonDetailPage />} />
                <Route path="/news" element={<NewsPage />} />
                {/* 추후 추가될 라우트들 */}
                {/* <Route path="/analysis/nlp" element={<NLPAnalysis />} /> */}
                {/* <Route path="/analysis/mapping" element={<AssetMapping />} /> */}
                {/* <Route path="/analysis/impact" element={<ImpactViz />} /> */}
            </Routes>
            <Footer />
        </Router>
    );
}

export default App;
