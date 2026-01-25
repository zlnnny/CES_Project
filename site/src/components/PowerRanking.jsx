import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';

const CardsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
    margin-top: 2rem;

    @media (max-width: 1024px) {
        gap: 16px;
    }

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
    }
`;

const SearchRow = styled.div`
    background: var(--color-bg-card, #112240);
    border: 1px solid var(--color-border, #233554);
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-shadow: 0 10px 30px -10px rgba(2, 12, 27, 0.7);
`;

const SearchBar = styled.form`
    width: 100%;
    display: flex;
    gap: 12px;
`;

const SearchBox = styled.div`
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;

    svg {
        position: absolute;
        left: 16px;
        color: var(--color-text-muted);
        font-size: 0.9rem;
        pointer-events: none;
    }
`;

const SearchInput = styled.input`
    width: 100%;
    height: 50px;
    padding: 0 16px 0 45px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: rgba(0, 0, 0, 0.2);
    color: #ffffff;
    font-size: 1rem;
    font-weight: 400;
    transition: all 0.2s ease;
    
    &:focus {
        outline: none;
        border-color: var(--color-accent);
        background: rgba(0, 0, 0, 0.3);
    }

    &::placeholder {
        color: var(--color-text-muted);
        opacity: 0.6;
    }

    @media (max-width: 480px) {
        height: 44px;
        padding-left: 40px;
        font-size: 0.9rem;
    }
`;

const SearchButton = styled.button`
    height: 50px;
    padding: 0 1.8rem;
    border-radius: 8px;
    border: none;
    background: var(--color-accent-gradient);
    color: #020617;
    font-weight: 600;
    transition: all 0.3s ease;

    &:hover {
        transform: translateY(-2px);
        filter: brightness(1.1);
    }

    @media (max-width: 480px) {
        height: 44px;
        padding: 0 1.2rem;
        font-size: 0.9rem;
    }
`;

const FilterGroup = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const FilterButton = styled.button`
    padding: 0.6rem 1.2rem;
    border-radius: 50px;
    border: 1px solid ${props => props.$active ? 'var(--color-accent)' : 'var(--color-border)'};
    background: ${props => props.$active ? 'rgba(34, 211, 238, 0.1)' : 'transparent'};
    color: ${props => props.$active ? 'var(--color-accent)' : 'var(--color-text-muted)'};
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--color-accent);
        color: #ffffff;
    }
`;

const Card = styled.button`
    display: block;
    width: 100%;
    text-align: left;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--color-border);
    border-radius: 20px;
    padding: 28px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &.highlight {
        border-color: var(--color-accent);
        background: rgba(34, 211, 238, 0.08);
        box-shadow: 0 0 30px rgba(34, 211, 238, 0.2);
    }

    &:hover {
        transform: translateY(-6px);
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(255, 255, 255, 0.2);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }

    @media (max-width: 1024px) {
        padding: 20px;
    }

    @media (max-width: 480px) {
        padding: 16px;
        border-radius: 16px;
    }
`;

const CardTop = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;

    @media (max-width: 480px) {
        margin-bottom: 12px;
    }
`;

const Rank = styled.span`
    font-size: 2rem;
    font-weight: 600;
    color: #ffffff;
    opacity: 0.9;
    letter-spacing: -0.03em;

    @media (max-width: 480px) {
        font-size: 1.5rem;
    }
`;

const ScoreWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    margin: 0 15px;
`;

const ProgressBarContainer = styled.div`
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 2px;
    overflow: hidden;
`;

const ProgressBar = styled.div`
    height: 100%;
    width: ${props => props.$width}%;
    background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
    border-radius: 2px;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
`;

const Score = styled.span`
    font-weight: 500;
    color: ${props => props.$value >= 0 ? '#10b981' : '#ef4444'};
    font-size: 1.1rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 10px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);

    @media (max-width: 480px) {
        font-size: 0.9rem;
        padding: 2px 8px;
    }
`;

const CardBody = styled.div`
    display: flex;
    gap: 20px;
    align-items: center;

    @media (max-width: 480px) {
        gap: 12px;
    }
`;

const Avatar = styled.div`
    width: 80px;
    height: 80px;
    border-radius: 18px;
    background: var(--color-accent-gradient);
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 1.6rem;
    color: #ffffff;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    @media (max-width: 480px) {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        font-size: 1.2rem;
    }
`;

const Info = styled.div`
    flex: 1;
    min-width: 0;
    padding-left: 4px;
`;

const NameRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
`;

const Name = styled.h3`
    font-size: 1.4rem;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
    letter-spacing: -0.02em;

    @media (max-width: 480px) {
        font-size: 1.1rem;
    }
`;

const Description = styled.p`
    font-size: 0.95rem;
    color: var(--color-text-muted);
    margin: 0;
    font-weight: 400;
    line-height: 1.4;
    opacity: 0.85;

    @media (max-width: 480px) {
        font-size: 0.8rem;
    }
`;

const StocksContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-end;
    margin-left: 20px;
    min-width: 120px;

    @media (max-width: 600px) {
        display: none;
    }
`;

const MobileStocksRow = styled.div`
    display: none;
    @media (max-width: 600px) {
        display: flex;
        gap: 6px;
        margin-top: 10px;
    }
`;

const StockChip = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 6px 14px;
    border-radius: 10px;
    border: 1px solid rgba(103, 232, 249, 0.4);
    background: rgba(103, 232, 249, 0.12);
    color: #67e8f9;
    font-family: var(--font-en);
    font-weight: 600;
    font-size: 0.85rem;
    white-space: nowrap;
    transition: all 0.2s ease;

    @media (max-width: 480px) {
        padding: 3px 10px;
        font-size: 0.7rem;
        border-radius: 6px;
    }
`;

const PowerRanking = ({ limit = 30 }) => {
    const [allRows, setAllRows] = useState([]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchError, setSearchMessage] = useState('');
    const [highlightedId, setHighlightedId] = useState(null);
    const [activeFilter, setFilter] = useState('All');
    const navigate = useNavigate();
    const itemRefs = useRef({});

    const filters = ['All', 'Technology', 'CEO', 'Financial', 'Global Leader'];

    const applyFilters = useCallback((query, filter, data) => {
        let filtered = [...data];
        
        if (filter !== 'All') {
            filtered = filtered.filter(r => {
                const title = (r.title_or_company || '').toLowerCase();
                const category = (r.category || '').toLowerCase();
                if (filter === 'Technology') return title.includes('tech') || title.includes('nvidia') || title.includes('google') || title.includes('tesla') || title.includes('microsoft') || title.includes('apple') || title.includes('meta') || title.includes('amazon');
                if (filter === 'CEO') return title.includes('ceo') || category.includes('ceo');
                if (filter === 'Financial') return title.includes('finance') || title.includes('bank') || title.includes('invest') || title.includes('blackrock');
                if (filter === 'Global Leader') return category.includes('global') || title.includes('president') || title.includes('minister');
                return true;
            });
        }

        if (query.trim()) {
            const term = query.toLowerCase();
            filtered = filtered.filter(r => r.name.toLowerCase().includes(term));
        }

        setRows(limit ? filtered.slice(0, limit) : filtered);
    }, [limit]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [rankingResp, allPeopleResp] = await Promise.all([
                axios.get('http://localhost:8000/api/power-ranking?limit=200'),
                axios.get('http://localhost:8000/api/entities?entity_type=person')
            ]);

            const ranked = rankingResp.data.items || [];
            const allPeople = allPeopleResp.data || [];

            const rankedNames = new Set(ranked.map(r => r.name.toLowerCase()));
            const unranked = allPeople
                .filter(p => !rankedNames.has(p.name.toLowerCase()))
                .map(p => ({
                    name: p.name,
                    title_or_company: p.title_or_company,
                    influence: 0,
                    delta: 0,
                    category: p.category,
                    stocks: '-'
                }));

            const combined = [...ranked, ...unranked].map((item, idx) => ({
                ...item,
                rank: idx + 1
            }));

            // NRII 정규화 로직 (10-95% 범위)
            if (combined.length > 0) {
                const logScores = combined.map(item => Math.log(item.influence + 1.001));
                const maxLog = Math.max(...logScores);
                const minLog = Math.min(...logScores);
                const logRange = maxLog - minLog;

                combined.forEach((item, idx) => {
                    if (logRange > 0) {
                        let normalized = (logScores[idx] - minLog) / logRange;
                        let nonLinear = Math.pow(normalized, 0.7);
                        item.relativeScore = 10 + (nonLinear * 80);
                    } else {
                        item.relativeScore = 50;
                    }
                });

                if (combined.length > 1) {
                    const raw1 = combined[0].influence;
                    const raw2 = combined[1].influence;
                    const ratio = raw1 / (raw2 || 0.001);
                    if (ratio > 1.1) {
                        const bonus = Math.min(5, (ratio - 1.1) * 10);
                        combined[0].relativeScore += bonus;
                    }
                }
            }

            setAllRows(combined);
            // 초기 로딩 시 필터 적용
            applyFilters(searchQuery, activeFilter, combined);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [limit]); // searchQuery, activeFilter 의존성 제거

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 검색어나 필터가 바뀔 때 서버 호출 없이 클라이언트에서 즉시 필터링
    useEffect(() => {
        if (allRows.length > 0) {
            applyFilters(searchQuery, activeFilter, allRows);
        }
    }, [searchQuery, activeFilter, allRows, applyFilters]);

    const handleSearch = (e) => {
        e.preventDefault();
        // applyFilters useEffect가 이미 처리하므로 하이라이트/스크롤 로직만 수행
        const term = searchQuery.trim().toLowerCase();
        if (!term) return;

        const found = allRows.find(r => r.name.toLowerCase().includes(term));
        if (found) {
            setSearchMessage('');
            setHighlightedId(found.rank);
            const el = itemRefs.current[found.rank];
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            setSearchMessage('This person is not in the ranking.');
            setHighlightedId(null);
        }
    };

    const handleFilterChange = (newFilter) => {
        setFilter(newFilter);
        applyFilters(searchQuery, newFilter, allRows);
    };

    if (loading) return (
        <div className="container" style={{ padding: '10rem 0', textAlign: 'center' }}>
            <h3 style={{ color: '#94a3b8', fontWeight: 300, letterSpacing: '0.1em' }}>
                LOADING RANKINGS...
            </h3>
        </div>
    );

    return (
        <section className="container section-padding">
            <h2 className="section-title" style={{fontWeight: 600}}>Power <span style={{ background: 'linear-gradient(135deg, #67e8f9 0%, #22d3ee 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Rankings</span></h2>
            <p className="section-subtitle" style={{ opacity: 0.6, fontWeight: 400 }}>Real-time market influence rankings driven by AI</p>

            <SearchRow>
                <SearchBar onSubmit={handleSearch}>
                    <SearchBox>
                        <FaSearch />
                        <SearchInput 
                            placeholder="Search by name (ex. Trump, Musk, Warren Buffett)..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </SearchBox>
                    <SearchButton type="submit">Search</SearchButton>
                </SearchBar>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Quick Filter:</span>
                    <FilterGroup>
                        {filters.map(f => (
                            <FilterButton 
                                key={f} 
                                $active={activeFilter === f}
                                onClick={() => handleFilterChange(f)}
                            >
                                {f}
                            </FilterButton>
                        ))}
                    </FilterGroup>
                </div>
                
                {searchError && <SearchMessage>{searchError}</SearchMessage>}
            </SearchRow>

            <CardsGrid>
                {rows.map((r) => {
                    const stockList = (r.stocks || '').split(',')
                        .map(s => s.trim())
                        .filter(Boolean)
                        .filter(s => s !== '-')
                        .map(s => {
                            if (s.toUpperCase() === 'NONE') {
                                const company = r.title_or_company || '';
                                return company.length > 15 ? company.substring(0, 15) + '..' : company;
                            }
                            return s;
                        })
                        .slice(0, 2);
                    return (
                        <Card 
                            key={r.rank} 
                            ref={el => itemRefs.current[r.rank] = el}
                            className={highlightedId === r.rank ? 'highlight' : ''}
                            onClick={() => navigate(`/power-rankings/${encodeURIComponent(r.name)}`)}
                        >
                            <CardTop>
                                <Rank>{String(r.rank).padStart(2, '0')}</Rank>
                                <ScoreWrapper>
                                    <ProgressBarContainer>
                                        <ProgressBar $width={r.relativeScore} />
                                    </ProgressBarContainer>
                                </ScoreWrapper>
                                <Score $value={r.relativeScore}>
                                    {r.relativeScore.toFixed(1)}%
                                </Score>
                            </CardTop>
                            <CardBody>
                                <Avatar>
                                    {r.photoUrl ? <img src={r.photoUrl} alt={r.name} /> : r.name[0]}
                                </Avatar>
                                <Info>
                                    <NameRow>
                                        <Name>{r.name}</Name>
                                    </NameRow>
                                    <Description>{r.title_or_company || 'Global Market Leader'}</Description>
                                    <MobileStocksRow>
                                        {stockList.map((s, idx) => (
                                            <StockChip key={idx}>{s}</StockChip>
                                        ))}
                                    </MobileStocksRow>
                                </Info>
                                {stockList.length > 0 && (
                                    <StocksContainer>
                                        {stockList.map((s, idx) => (
                                            <StockChip key={idx}>{s}</StockChip>
                                        ))}
                                    </StocksContainer>
                                )}
                            </CardBody>
                        </Card>
                    );
                })}
            </CardsGrid>
        </section>
    );
};

export default PowerRanking;
