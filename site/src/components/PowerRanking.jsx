import React from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CardsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    margin-top: 1.25rem;

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
    }
`;

const Card = styled.button`
    display: block;
    width: 100%;
    text-align: left;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(35, 53, 84, 0.9);
    border-radius: 14px;
    padding: 18px 18px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.2s ease, background 0.2s ease;

    &:hover {
        transform: translateY(-2px);
        border-color: rgba(100, 255, 218, 0.9);
        box-shadow: 0 20px 55px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(100, 255, 218, 0.18);
        background: rgba(100, 255, 218, 0.04);
    }

    &:focus-visible {
        outline: none;
        border-color: rgba(100, 255, 218, 0.95);
        box-shadow: 0 0 0 3px rgba(100, 255, 218, 0.22), 0 20px 55px rgba(0, 0, 0, 0.28);
    }
`;

const CardTop = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
`;

const RankBadge = styled.div`
    font-family: var(--font-en);
    font-weight: 900;
    font-size: 1.25rem;
    color: var(--color-text-main);
    letter-spacing: 0.4px;
`;

const ScorePill = styled.div`
    font-family: var(--font-en);
    font-weight: 900;
    font-size: 1.05rem;
    color: ${props => props.$value >= 0 ? '#ff4d4d' : '#3b82f6'};
`;

const CardMain = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
`;

const CardText = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const PersonName = styled.div`
    font-family: var(--font-en);
    color: var(--color-text-main);
    font-weight: 900;
    font-size: 1.35rem; /* 이름 더 크게 */
    line-height: 1.2;

    @media (max-width: 520px) {
        font-size: 1.15rem;
    }
`;

const StocksRow = styled.div`
    margin-top: 12px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const StockChip = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(100, 255, 218, 0.35);
    background: rgba(100, 255, 218, 0.06);
    color: var(--color-text-main);
    font-family: var(--font-en);
    font-weight: 800;
    font-size: 0.85rem;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const MetaLine = styled.div`
    font-family: var(--font-en);
    color: var(--color-text-muted);
    font-size: 0.92rem;
    opacity: 0.9;
`;

const CountLine = styled.div`
    margin-top: 0.75rem;
    font-family: var(--font-en);
    color: var(--color-text-muted);
    font-size: 0.95rem;
    opacity: 0.9;
`;

const ControlsRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    margin: 1.5rem 0 1rem 0;
`;

const Segmented = styled.div`
    display: inline-flex;
    gap: 10px;
`;

const SegmentButton = styled.button`
    padding: 0.7rem 1.2rem;
    border-radius: 6px;
    border: 1px solid ${props => props.active ? 'rgba(100,255,218,0.65)' : 'rgba(100,255,218,0.28)'};
    background: ${props => props.active
        ? 'linear-gradient(180deg, rgba(122,255,229,1) 0%, rgba(100,255,218,1) 40%, rgba(62,214,186,1) 100%)'
        : 'linear-gradient(180deg, rgba(100,255,218,0.22) 0%, rgba(23,42,70,1) 55%, rgba(10,25,47,1) 100%)'
    };
    color: ${props => props.active ? 'rgba(10,25,47,1)' : 'var(--color-text-main)'};
    font-family: var(--font-en);
    font-weight: 700;
    cursor: pointer;
    position: relative;
    text-shadow: ${props => props.active ? 'none' : '0 1px 0 rgba(0,0,0,0.35)'};
    box-shadow:
        ${props => props.active
            ? '0 14px 28px rgba(0,0,0,0.48), 0 0 0 1px rgba(100,255,218,0.18), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -10px 18px rgba(0,0,0,0.18)'
            : '0 12px 24px rgba(0,0,0,0.48), 0 0 0 1px rgba(100,255,218,0.12), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -10px 18px rgba(0,0,0,0.25)'
        };
    transform: translateY(${props => props.active ? '-2px' : '-1px'});
    transition: opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease;

    &:hover {
        opacity: 0.9;
        transform: translateY(-2px);
    }

    &:active {
        transform: translateY(0px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.45), inset 0 2px 14px rgba(0,0,0,0.28);
    }

    &::before {
        content: '';
        position: absolute;
        inset: 1px 1px auto 1px;
        height: 44%;
        border-radius: 5px;
        background: linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 100%);
        pointer-events: none;
        opacity: ${props => props.active ? 0.6 : 0.35};
    }

    &::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: 10px;
        background: radial-gradient(circle at 50% 20%, rgba(100,255,218,0.22), rgba(100,255,218,0) 60%);
        pointer-events: none;
        opacity: ${props => props.active ? 0.9 : 0.6};
    }
`;

const StockText = styled.span`
    font-family: var(--font-en);
    font-weight: 700;
    color: var(--color-text-main);
`;

const Avatar = styled.div`
    width: 64px;
    height: 64px;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(100, 255, 218, 0.25), rgba(100, 255, 218, 0.05));
    border: 1px solid rgba(100, 255, 218, 0.35);
    display: grid;
    place-items: center;
    color: var(--color-text-main);
    font-family: var(--font-en);
    font-weight: 800;
    overflow: hidden;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }
`;

const PowerRanking = () => {
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [lastUpdatedAt, setLastUpdatedAt] = React.useState(null);
    const [refreshing, setRefreshing] = React.useState(false);
    const navigate = useNavigate();

    const LIMIT = 30;

    const fetchRanking = React.useCallback(async () => {
        try {
            setError(null);
            const resp = await axios.get(`http://localhost:8000/api/power-ranking?limit=${LIMIT}`, { timeout: 9000 });
            const items = resp?.data?.items;
            if (Array.isArray(items)) setRows(items);
            if (Array.isArray(items)) setLastUpdatedAt(new Date());
        } catch (e) {
            setError('Failed to load ranking');
        } finally {
            setLoading(false);
        }
    }, [LIMIT]);

    const refreshScores = React.useCallback(async () => {
        try {
            setRefreshing(true);
            await axios.post('http://localhost:8000/api/news/refresh?count=5&limit_per_person=1');
        } catch {
            // ignore
        } finally {
            setRefreshing(false);
        }
    }, []);

    React.useEffect(() => {
        fetchRanking();
        const id = setInterval(fetchRanking, 20000);
        return () => clearInterval(id);
    }, [fetchRanking]);

    const handleRowClick = (person) => {
        const encoded = encodeURIComponent(person?.name || '');
        if (!encoded) return;
        navigate(`/power-rankings/${encoded}`);
    };

    const renderAvatar = (r) => (
        <Avatar aria-hidden="true">
            {r.photoUrl
                ? <img src={r.photoUrl} alt="" />
                : (r.name || '').split(' ').map(s => s[0]).slice(0, 2).join('')
            }
        </Avatar>
    );

    const displayRows = React.useMemo(() => {
        if (Array.isArray(rows) && rows.length >= LIMIT) return rows.slice(0, LIMIT);
        if (Array.isArray(rows) && rows.length > 0) {
            const filled = rows.slice(0, LIMIT);
            while (filled.length < LIMIT) {
                filled.push({ rank: filled.length + 1, name: '', influence: 0, stocks: '-', delta: 0, __skeleton: true });
            }
            return filled;
        }
        return Array.from({ length: LIMIT }, (_, i) => ({
            rank: i + 1,
            name: '',
            influence: 0,
            stocks: '-',
            delta: 0,
            __skeleton: true,
        }));
    }, [rows]);

    return (
        <section id="ranking" className="container section-padding">
            <h2 className="section-title">Power Ranking</h2>
            <CountLine>Showing {displayRows.length || 0} influential figures</CountLine>

            <ControlsRow>
                <Segmented>
                    <SegmentButton type="button" active onClick={refreshScores} disabled={refreshing}>
                        {refreshing ? 'Updating…' : 'Update scores'}
                    </SegmentButton>
                </Segmented>
            </ControlsRow>

            {!loading && error && <StockText>{error}</StockText>}

            <CardsGrid>
                {displayRows.map((r) => {
                    const stocks = (r.stocks || '')
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean)
                        .slice(0, 2);
                    return (
                        <Card
                            key={`card-${r.rank}-${r.name || 'skeleton'}`}
                            type="button"
                            onClick={() => !r.__skeleton && handleRowClick(r)}
                            aria-label={r.__skeleton ? `Loading rank ${r.rank}` : `Open details for ${r.name}`}
                            disabled={!!r.__skeleton}
                            style={r.__skeleton ? { opacity: 0.55, cursor: 'default' } : undefined}
                        >
                            <CardTop>
                                <RankBadge>{String(r.rank).padStart(2, '0')}</RankBadge>
                                <ScorePill $value={r.influence}>
                                    {r.__skeleton ? '—' : (typeof r.influence === 'number' ? r.influence.toFixed(2) : r.influence)}
                                </ScorePill>
                            </CardTop>

                            <CardMain>
                                {r.__skeleton ? <Avatar aria-hidden="true" /> : renderAvatar(r)}
                                <CardText>
                                    <PersonName>{r.__skeleton ? '—' : r.name}</PersonName>
                                    {!r.__skeleton && (
                                        <MetaLine>
                                            {r.title_or_company || r.category || ''}
                                        </MetaLine>
                                    )}
                                </CardText>
                            </CardMain>

                            <StocksRow>
                                {(r.__skeleton ? ['—', '—'] : (stocks.length ? stocks : ['-','-'])).slice(0, 2).map((s, idx) => (
                                    <StockChip key={`${r.rank}-${r.name || 'skeleton'}-stock-${idx}`}>{s}</StockChip>
                                ))}
                            </StocksRow>
                        </Card>
                    );
                })}
            </CardsGrid>
        </section>
    );
};

export default PowerRanking;

