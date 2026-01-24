import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CardsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
    margin-top: 2rem;

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
    }
`;

const SearchRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 2.5rem;
    max-width: 600px;
`;

const SearchBar = styled.form`
    display: flex;
    gap: 10px;
`;

const SearchInput = styled.input`
    flex: 1;
    padding: 0.9rem 1.2rem;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: rgba(255, 255, 255, 0.03);
    color: #ffffff;
    font-size: 1rem;
    font-weight: 400;
    
    &:focus {
        outline: none;
        border-color: var(--color-accent);
        background: rgba(255, 255, 255, 0.05);
    }
`;

const SearchButton = styled.button`
    padding: 0.9rem 1.8rem;
    border-radius: 12px;
    border: none;
    background: var(--color-accent-gradient);
    color: #020617;
    font-weight: 600; /* Thinner than 700 */
    transition: all 0.3s ease;

    &:hover {
        transform: translateY(-2px);
        filter: brightness(1.1);
    }
`;

const SearchMessage = styled.p`
    color: #ff4d4d;
    font-size: 0.9rem;
    margin: 0;
    font-weight: 500;
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
`;

const CardTop = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between; /* Move score to the right */
    margin-bottom: 20px;
`;

const Rank = styled.span`
    font-size: 2rem;
    font-weight: 600;
    color: #ffffff;
    opacity: 0.9;
    letter-spacing: -0.03em;
`;

const Score = styled.span`
    font-weight: 500;
    color: ${props => props.$value >= 0 ? '#10b981' : '#ef4444'};
    font-size: 1.1rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 8px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
`;

const CardBody = styled.div`
    display: flex;
    gap: 20px;
    align-items: center; 
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
    /* Removed flex-wrap to keep role tag next to name */
`;

const Name = styled.h3`
    font-size: 1.4rem;
    font-weight: 600;
    color: #ffffff;
    margin: 0;
    letter-spacing: -0.02em;
`;

const RoleTag = styled.span`
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(34, 211, 238, 0.15);
    color: #22d3ee;
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

const Description = styled.p`
    font-size: 0.95rem;
    color: var(--color-text-muted);
    margin: 0;
    font-weight: 400; 
    line-height: 1.4;
    opacity: 0.85;
`;

const StocksContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-end; 
    margin-left: 20px;
    min-width: 120px;
`;

const StockChip = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 6px 14px; /* Increased padding */
    border-radius: 10px;
    border: 1px solid rgba(103, 232, 249, 0.4); /* More visible border */
    background: rgba(103, 232, 249, 0.12);
    color: #67e8f9;
    font-family: var(--font-en);
    font-weight: 600;
    font-size: 0.85rem; /* Increased font-size */
    white-space: nowrap;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(103, 232, 249, 0.2);
        transform: scale(1.05);
    }
`;

const PowerRanking = ({ limit = 30 }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchError, setSearchMessage] = useState('');
    const [highlightedId, setHighlightedId] = useState(null);
    const navigate = useNavigate();
    const itemRefs = useRef({});

    const getRole = (p) => {
        const title = (p.title_or_company || '').toLowerCase();
        if (title.includes('ceo')) return 'CEO';
        if (title.includes('president')) return 'President';
        if (title.includes('politician') || title.includes('minister')) return 'Politician';
        if (title.includes('chairman')) return 'Chairman';
        if (title.includes('founder')) return 'Founder';
        return 'Leader';
    };

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

            setRows(limit ? combined.slice(0, limit) : combined);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearch = (e) => {
        e.preventDefault();
        const term = searchQuery.trim().toLowerCase();
        if (!term) return;

        const found = rows.find(r => r.name.toLowerCase().includes(term));
        if (found) {
            setSearchMessage('');
            setHighlightedId(found.rank);
            const el = itemRefs.current[found.rank];
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            setSearchMessage('This person is not in the ranking.');
            setHighlightedId(null);
        }
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
            <h2 className="section-title" style={{fontWeight: 600}}>Power Rankings</h2>
            <p className="section-subtitle" style={{ opacity: 0.6, fontWeight: 400 }}>Real-time market influence rankings driven by AI</p>

            <SearchRow>
                <SearchBar onSubmit={handleSearch}>
                    <SearchInput 
                        placeholder="Search by name (e.g. Trump, Musk)..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <SearchButton type="submit">Search</SearchButton>
                </SearchBar>
                {searchError && <SearchMessage>{searchError}</SearchMessage>}
            </SearchRow>

            <CardsGrid>
                {rows.map((r) => {
                    const stockList = (r.stocks || '').split(',').map(s => s.trim()).filter(Boolean).filter(s => s !== '-').slice(0, 2);
                    return (
                        <Card 
                            key={r.rank} 
                            ref={el => itemRefs.current[r.rank] = el}
                            className={highlightedId === r.rank ? 'highlight' : ''}
                            onClick={() => navigate(`/power-rankings/${encodeURIComponent(r.name)}`)}
                        >
                            <CardTop>
                                <Rank>{String(r.rank).padStart(2, '0')}</Rank>
                                <Score $value={r.influence}>
                                    {r.influence.toFixed(2)} pts
                                </Score>
                            </CardTop>
                            <CardBody>
                                <Avatar>
                                    {r.photoUrl ? <img src={r.photoUrl} alt={r.name} /> : r.name[0]}
                                </Avatar>
                                <Info>
                                    <NameRow>
                                        <Name>{r.name}</Name>
                                        <RoleTag>{getRole(r)}</RoleTag>
                                    </NameRow>
                                    <Description>{r.title_or_company || 'Global Market Leader'}</Description>
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
