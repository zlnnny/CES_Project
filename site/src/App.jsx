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
import PowerRankingPage from './pages/PowerRankingPage';
import MarketsPage from './pages/MarketsPage';

import Hero from './components/Hero';

// Main Home Component
const Home = () => {
    return (
        <main>
            <Hero />
            <section id="ranking-section">
                <PowerRanking limit={30} />
            </section>
            <TodaysNews />
            <section id="charts-section">
                <Charts />
            </section>
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
                <Route path="/power-rankings" element={<PowerRankingPage />} />
                <Route path="/markets" element={<MarketsPage />} />
                <Route path="/power-rankings/:name" element={<PersonDetailPage />} />
                <Route path="/news" element={<NewsPage />} />
                {/* Future routes */}
            </Routes>
            <Footer />
        </Router>
    );
}

export default App;
