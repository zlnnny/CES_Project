import React, { useEffect, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import axios from 'axios';
import { FaSearch, FaFire, FaMagic, FaSpinner, FaNewspaper, FaFilter, FaListUl, FaArrowUp, FaArrowDown, FaBalanceScale } from 'react-icons/fa';

// --- Constants ---
const QUICK_FILTERS = [
    { label: "Elon Musk" },
    { label: "Tesla" },
    { label: "Bitcoin" },
    { label: "Nvidia" },
    { label: "Jerome Powell" },
    { label: "Apple" },
    { label: "AI Regulation" }
];

const PRIORITY_CRAWL_TARGETS = {
    "Elon Musk": ["Tesla", "SpaceX", "Bitcoin"],
    "Mark Zuckerberg": ["Meta", "Virtual Reality"],
    "Tim Cook": ["Apple", "Tech"],
    "Jensen Huang": ["Nvidia", "AI Chips"],
    "Sam Altman": ["Microsoft", "OpenAI"],
    "Joe Biden": ["USD", "Oil"],
    "Donald Trump": ["Tariffs", "USD"],
    "Jerome Powell": ["Treasury", "S&P 500"],
    "Satya Nadella": ["Microsoft", "Cloud"],
    "Sundar Pichai": ["Google", "Search"]
};

// --- Animations ---
const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

// --- Styled Components ---
const PageContainer = styled.div`
    width: 100%;
    min-height: 100vh;
    background-color: var(--color-bg-main, #0a192f);
    color: var(--color-text-main, #e6f1ff);
    padding: 80px 20px 60px;
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const ContentWrapper = styled.div`
    width: 100%;
    max-width: 1200px;
`;

const Header = styled.div`
    margin-bottom: 2.5rem;
    h1 {
        font-family: var(--font-en, sans-serif);
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
        span { color: var(--color-accent, #64ffda); }
    }
    p { color: var(--color-text-muted, #8892b0); font-size: 1.1rem; }
`;

// [Section 1] Manual Crawl Section
const CrawlSection = styled.div`
    background: var(--color-bg-card, #112240);
    border: 1px solid var(--color-border, #233554);
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 3rem;
    display: flex; gap: 15px; flex-wrap: wrap; align-items: flex-end;
    box-shadow: 0 10px 30px -10px rgba(2,12,27,0.7);
    transition: all 0.3s;

    ${props => props.$loading && css`
        border-color: var(--color-accent);
        opacity: 0.9;
        pointer-events: none;
    `}

    .input-group {
        flex-grow: 1;
        label {
            display: block;
            color: var(--color-accent, #64ffda);
            margin-bottom: 8px;
            font-size: 0.9rem;
            font-family: var(--font-en, sans-serif);
            font-weight: 600;
        }
        input {
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--color-border, #233554);
            color: #fff;
            padding: 14px;
            border-radius: 6px;
            font-size: 1rem;
            transition: border-color 0.2s;
            &:focus { outline: none; border-color: var(--color-accent, #64ffda); }
        }
    }
    button {
        background: ${props => props.$loading ? 'rgba(100, 255, 218, 0.1)' : 'transparent'};
        color: var(--color-accent, #64ffda);
        border: 1px solid var(--color-accent, #64ffda);
        font-family: var(--font-en, sans-serif);
        font-weight: bold;
        padding: 14px 28px;
        border-radius: 6px;
        cursor: pointer;
        display: flex; align-items: center; gap: 10px;
        transition: all 0.2s;
        min-width: 140px;
        justify-content: center;
        
        &:hover { background: rgba(100, 255, 218, 0.1); }
        svg { font-size: 1.1rem; }
        svg.spinner { animation: ${spin} 1s linear infinite; }
    }
`;

// [Section 2] Headlines
const HeadlineSection = styled.div`
    margin-bottom: 3rem;
`;
const SectionTitle = styled.h3`
    font-size: 1.3rem;
    color: var(--color-accent, #64ffda);
    margin-bottom: 1.5rem;
    display: flex; align-items: center; gap: 10px;
    font-family: var(--font-en);
`;

const HeadlineGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.5rem;
`;

const HeadlineCard = styled.div`
    background: linear-gradient(145deg, #112240 0%, #0a192f 100%);
    border: 1px solid var(--color-border, #233554);
    padding: 1.5rem;
    border-radius: 12px;
    position: relative;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    
    &:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 30px -15px rgba(100, 255, 218, 0.3);
        border-color: var(--color-accent);
    }

    .badge {
        position: absolute; top: 1rem; right: 1rem;
        background: rgba(239, 68, 68, 0.2); color: #ef4444;
        padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;
        border: 1px solid rgba(239, 68, 68, 0.3);
    }

    h3 {
        font-size: 1.2rem;
        margin: 1.8rem 0 1rem;
        line-height: 1.5;
        color: #e6f1ff;
    }
    .info {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        display: flex; justify-content: space-between;
        border-top: 1px solid rgba(255,255,255,0.05);
        padding-top: 10px;
    }
`;

// [Section 3] Control Panel (Smart Filters)
const PanelHeader = styled.div`
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    .title {
        font-size: 1.2rem; font-weight: 700;
        color: var(--color-text-main);
        font-family: var(--font-en);
        display: flex; align-items: center; gap: 10px;
    }
    .icon { color: var(--color-accent); font-size: 1.1rem; }
    
    .subtitle {
        font-size: 0.85rem; color: var(--color-text-muted);
    }
`;

const ControlPanel = styled.div`
    background: var(--color-bg-card, #112240);
    border: 1px solid var(--color-border, #233554);
    border-radius: 12px;
    padding: 1.8rem;
    margin-bottom: 2rem;
    position: relative;
`;

const SearchRow = styled.div`
    display: flex; gap: 1rem; margin-bottom: 1.5rem;
    
    .search-box {
        flex-grow: 1; position: relative;
        input {
            width: 100%; height: 50px;
            background: rgba(0,0,0,0.2);
            border: 1px solid var(--color-border, #233554);
            color: #fff; padding-left: 45px; border-radius: 8px; font-size: 1rem;
            &:focus { outline: none; border-color: var(--color-accent); }
        }
        svg {
            position: absolute; left: 15px; top: 50%;
            transform: translateY(-50%); color: var(--color-text-muted);
        }
    }
`;

const QuickChips = styled.div`
    display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
    margin-bottom: 1.5rem;
    
    .label { font-size: 0.9rem; color: var(--color-text-muted); margin-right: 5px; }
    
    button {
        background: rgba(255,255,255,0.03);
        border: 1px solid var(--color-border);
        color: var(--color-text-muted);
        padding: 6px 14px; border-radius: 20px;
        font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
        
        &:hover { border-color: var(--color-accent); color: var(--color-accent); }
        &.active {
            background: rgba(100, 255, 218, 0.1);
            border-color: var(--color-accent);
            color: var(--color-accent);
        }
    }
`;

const FilterTabs = styled.div`
    display: flex; gap: 15px; flex-wrap: wrap;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 15px;
    
    button {
        background: transparent; border: 1px solid var(--color-border);
        color: var(--color-text-muted);
        font-size: 0.95rem; font-family: var(--font-en);
        cursor: pointer; padding: 8px 16px; border-radius: 8px;
        display: flex; align-items: center; gap: 8px;
        transition: all 0.2s;
        
        &:hover { border-color: #fff; color: #fff; }
        
        &.active {
            background: rgba(255, 255, 255, 0.1);
            border-color: var(--color-accent);
            color: var(--color-accent);
            font-weight: bold;
        }
    }
`;

// [Section 4] News List
const NewsList = styled.div`
    display: flex; flex-direction: column; gap: 1rem;
`;

const NewsItem = styled.div`
    background: var(--color-bg-card, #112240);
    border: 1px solid var(--color-border, #233554);
    padding: 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s, background 0.2s;
    border-left: 4px solid ${props => props.$color};

    &:hover {
        transform: translateY(-3px);
        background: #172a4d;
    }

    .header {
        display: flex; justify-content: space-between;
        font-size: 0.85rem; color: var(--color-text-muted);
        margin-bottom: 0.5rem;
    }
    h3 {
        margin: 0 0 0.8rem 0;
        font-size: 1.25rem;
        color: #e6f1ff;
        line-height: 1.4;
    }
    .footer {
        display: flex; align-items: center; justify-content: space-between;
        margin-top: 1rem;
    }
    .tags { display: flex; gap: 8px; flex-wrap: wrap; }
    .tag {
        font-size: 0.75rem; padding: 3px 10px; border-radius: 12px;
        background: rgba(255,255,255,0.05); color: var(--color-text-muted);
    }
    .leader-tag {
        background: rgba(100, 255, 218, 0.1); color: var(--color-accent);
    }
    
    .sentiment-badge {
        font-size: 0.8rem; font-weight: bold; padding: 2px 8px; border-radius: 4px;
        background: rgba(255,255,255,0.05);
        color: ${props => props.$color};
    }
`;

// --- Main Component ---
const NewsPage = () => {
    // Data States
    const [headlines, setHeadlines] = useState([]);
    const [news, setNews] = useState([]);
    const [stats, setStats] = useState({ positive: 0, negative: 0, neutral: 0 });
    
    // UI States
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // 'all' | 'Bullish' | 'Bearish' | 'Hawkish' | 'Dovish'
    const [loading, setLoading] = useState(false);
    
    // Crawl States
    const [crawlQuery, setCrawlQuery] = useState('');
    const [isCrawling, setIsCrawling] = useState(false);
    const [crawlMode, setCrawlMode] = useState(null); // "single" | "priority" | null

    // Initial Load
    useEffect(() => {
        fetchHeadlines();
        fetchNews();
        fetchStats();
    }, []);

    // API Functions
    const fetchHeadlines = async () => {
        try {
            const resp = await axios.get('http://localhost:8000/api/news', {
                params: { limit: 3, sort_by: 'importance' }
            });
            setHeadlines(resp.data);
        } catch (e) { console.error(e); }
    };

    const fetchNews = async (searchTerm = search, toneFilter = filter) => {
        setLoading(true);
        try {
            const params = {
                limit: 50,
                search: searchTerm || undefined,
                // [변경] 백엔드에 'tone_filter' 파라미터로 보냄
                tone_filter: toneFilter === 'all' ? undefined : toneFilter,
                sort_by: searchTerm ? 'importance' : 'latest'
            };
            const resp = await axios.get('http://localhost:8000/api/news', { params });
            setNews(resp.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchStats = async () => {
        try {
            const resp = await axios.get('http://localhost:8000/api/news/stats');
            setStats(resp.data);
        } catch (e) { console.error(e); }
    };

    // [New Logic] Determine visual type based on active filter
    const getNewsType = (item) => {
        // 1. 활성 필터가 있다면, 해당 속성을 최우선으로 보여줌 (사용자가 선택한 걸 보여줘야 하므로)
        if (filter === 'Bullish' && item.sentiment > 0.1) return { label: 'Bullish', color: '#4ade80' };
        if (filter === 'Bearish' && item.sentiment < -0.1) return { label: 'Bearish', color: '#f87171' };
        if (filter === 'Hawkish' && item.tone === 'Hawkish') return { label: 'Hawkish', color: '#f59e0b' };
        if (filter === 'Dovish' && item.tone === 'Dovish') return { label: 'Dovish', color: '#3b82f6' };

        // 2. 필터가 'All'이거나 매칭 안될 때의 기본 우선순위
        // Tone(금융적 의미)이 Sentiment(단순 긍부정)보다 보통 더 중요한 정보임
        if (item.tone === 'Hawkish') return { label: 'Hawkish', color: '#f59e0b' };
        if (item.tone === 'Dovish') return { label: 'Dovish', color: '#3b82f6' };
        
        // 그 다음 Sentiment 확인
        if (item.sentiment > 0.1) return { label: 'Bullish', color: '#4ade80' };
        if (item.sentiment < -0.1) return { label: 'Bearish', color: '#f87171' };
        
        return { label: 'Neutral', color: '#94a3b8' };
    };

    // Handlers
    const handleCrawl = async () => {
        if (!crawlQuery.trim()) return;
        setCrawlMode('single');
        setIsCrawling(true);
        try {
            await axios.post(`http://localhost:8000/api/news/crawl?query=${encodeURIComponent(crawlQuery)}`);
            setSearch(crawlQuery);
            await fetchNews(crawlQuery, filter);
            fetchStats();
            setCrawlQuery('');
        } catch (err) {
            console.error("Crawl error:", err);
            alert("Failed to analyze news. Please try again.");
        } finally {
            setIsCrawling(false);
            setCrawlMode(null);
        }
    };

    const handlePriorityCrawl = async () => {
        setCrawlMode('priority');
        setIsCrawling(true);
        try {
            const queue = Object.keys(PRIORITY_CRAWL_TARGETS).slice(0, 5);
            for (const target of queue) {
                await axios.post(`http://localhost:8000/api/news/crawl?query=${encodeURIComponent(target)}`);
            }
            await fetchNews(search, filter);
            fetchStats();
            fetchHeadlines();
        } catch (err) {
            console.error("Priority crawl error:", err);
            alert("Failed to run priority crawl. Please try again.");
        } finally {
            setIsCrawling(false);
            setCrawlMode(null);
        }
    };

    const handleQuickFilter = (keyword) => {
        const newSearch = search === keyword ? '' : keyword;
        setSearch(newSearch);
        fetchNews(newSearch, filter);
    };

    const handleTabChange = (newFilter) => {
        setFilter(newFilter);
        fetchNews(search, newFilter);
    };

    return (
        <PageContainer>
            <ContentWrapper>
                <Header>
                    <h1>Today's <span>News</span></h1>
                    <p>Track the narratives moving the global markets.</p>
                </Header>

                {/* [1] Targeted Intelligence (Crawl) */}
                <CrawlSection $loading={isCrawling}>
                    <div className="input-group">
                        <label>AI-Powered Targeted News Engine</label>
                        <input 
                            placeholder="Enter any company, person, or topic to analyze related news (e.g., 'Samsung Electronics', 'Rate Cut')" 
                            value={crawlQuery}
                            onChange={(e) => setCrawlQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCrawl()}
                            disabled={isCrawling}
                        />
                    </div>
                    <button onClick={handleCrawl} disabled={isCrawling}>
                        {isCrawling && crawlMode === 'single' ? (
                            <><FaSpinner className="spinner"/> Scanning...</>
                        ) : (
                            <><FaMagic /> Analyze</>
                        )}
                    </button>
                    <button onClick={handlePriorityCrawl} disabled={isCrawling}>
                        {isCrawling && crawlMode === 'priority' ? (
                            <><FaSpinner className="spinner"/> Priority Scan...</>
                        ) : (
                            <><FaNewspaper /> Refresh News</>
                        )}
                    </button>
                </CrawlSection>

                {/* [2] Headlines (Only visible when not searching) */}
                {!search && headlines.length > 0 && (
                    <HeadlineSection>
                        <SectionTitle><FaFire /> Breaking Headlines</SectionTitle>
                        <HeadlineGrid>
                            {headlines.map((item, idx) => (
                                <HeadlineCard key={idx} onClick={() => window.open(item.url, '_blank')}>
                                    <div className="badge">MUST READ</div>
                                    <h3>{item.title}</h3>
                                    <div className="info">
                                        <span>{item.leader_name}</span>
                                        <span>{new Date(item.published_at).toLocaleDateString()}</span>
                                    </div>
                                </HeadlineCard>
                            ))}
                        </HeadlineGrid>
                    </HeadlineSection>
                )}

                {/* [3] Control Panel (Feed Filter) */}
                <ControlPanel>
                    <PanelHeader>
                        <div className="title">
                            <FaFilter className="icon" /> Smart News Filter
                        </div>
                        <div className="subtitle">
                            Filter and search within {news.length} loaded articles
                        </div>
                    </PanelHeader>

                    <SearchRow>
                        <div className="search-box">
                            <FaSearch />
                            <input 
                                placeholder="Filter loaded articles by asset, company, or person (e.g. 'Tesla')" 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchNews(search, filter)}
                            />
                        </div>
                    </SearchRow>

                    <QuickChips>
                        <span className="label"><FaListUl /> Quick Select:</span>
                        {QUICK_FILTERS.map((chip) => (
                            <button 
                                key={chip.label} 
                                className={search === chip.label ? 'active' : ''}
                                onClick={() => handleQuickFilter(chip.label)}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </QuickChips>

                    <FilterTabs>
                        <button className={filter === 'all' ? 'active' : ''} onClick={() => handleTabChange('all')}>
                            All News
                        </button>
                        <button className={filter === 'Dovish' ? 'active' : ''} onClick={() => handleTabChange('Dovish')}>
                            <FaBalanceScale /> Dovish
                        </button>
                        <button className={filter === 'Hawkish' ? 'active' : ''} onClick={() => handleTabChange('Hawkish')}>
                            <FaBalanceScale /> Hawkish
                        </button>
                        <button className={filter === 'Bullish' ? 'active' : ''} onClick={() => handleTabChange('Bullish')}>
                            <FaArrowUp /> Bullish
                        </button>
                        <button className={filter === 'Bearish' ? 'active' : ''} onClick={() => handleTabChange('Bearish')}>
                            <FaArrowDown /> Bearish
                        </button>
                    </FilterTabs>
                </ControlPanel>

                {/* [4] News List */}
                <NewsList>
                    {loading ? (
                        <p style={{textAlign:'center', padding:'2rem', color:'#8892b0'}}>Loading market data...</p>
                    ) : news.length > 0 ? (
                        news.map((item, idx) => {
                            const { label, color } = getNewsType(item);
                            return (
                                <NewsItem 
                                    key={idx} 
                                    $color={color}
                                    onClick={() => window.open(item.url, '_blank')}
                                >
                                    <div className="header">
                                        <span>{item.source} • {new Date(item.published_at).toLocaleString()}</span>
                                        <span className="sentiment-badge" style={{color: color, background: `${color}15`}}>
                                            {label}
                                        </span>
                                    </div>
                                    <h3>{item.title}</h3>
                                    <div className="footer">
                                        <div className="tags">
                                            <span className="tag leader-tag">{item.leader_name}</span>
                                            {item.impact_assets?.map(asset => (
                                                <span key={asset} className="tag">{asset}</span>
                                            ))}
                                        </div>
                                    </div>
                                </NewsItem>
                            );
                        })
                    ) : (
                        <div style={{textAlign:'center', padding:'4rem', border:'1px dashed var(--color-border)', borderRadius:'8px', color:'#8892b0'}}>
                            No news found in this category.
                        </div>
                    )}
                </NewsList>

            </ContentWrapper>
        </PageContainer>
    );
};

export default NewsPage;