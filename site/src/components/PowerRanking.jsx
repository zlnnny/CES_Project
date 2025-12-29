import React from 'react';
import styled from 'styled-components';
import axios from 'axios';

const TableScroll = styled.div`
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 6px;
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

    /* 유광 하이라이트(입체감) */
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

    /* 은은한 민트 글로우 */
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

const TableFrame = styled.div`
    border: 2px solid var(--color-accent); /* 바깥선만 민트 굵은 테두리 */
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
`;

const Table = styled.table`
    width: 100%;
    min-width: 760px; /* 작은 화면에서 컬럼이 눌리지 않게 */
    border-collapse: collapse;
    background: var(--color-bg-card);
    border-radius: 10px;
    overflow: hidden;
    font-family: var(--font-ko);

    th, td {
        padding: 1.2rem;
        text-align: left;
        border-bottom: 1px solid var(--color-border);
        color: var(--color-text-muted);
    }

    /* 세로 구분선 */
    th:not(:last-child),
    td:not(:last-child) {
        border-right: 1px solid rgba(35, 53, 84, 0.8);
    }

    /* 1행(헤더) 가운데 정렬 */
    thead th {
        text-align: center;
    }

    thead {
        background-color: rgba(255, 255, 255, 0.05);
    }

    th {
        color: var(--color-text-main);
        font-weight: bold;
        font-family: var(--font-en);
    }

    tbody tr:hover {
        background-color: rgba(100, 255, 218, 0.05);
    }

    td.rank-1 {
        color: var(--color-gold);
    }

    @media (max-width: 820px) {
        min-width: 700px;

        th, td {
            padding: 1rem;
        }
    }

    @media (max-width: 520px) {
        min-width: 640px;

        th, td {
            padding: 0.9rem;
        }
    }
`;

const RankCell = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
    font-family: var(--font-en);
    font-weight: 700;
    color: var(--color-text-main);
`;

const Delta = styled.span`
    font-size: 0.95rem;
    font-weight: 800;
    color: ${props => props.value >= 0 ? '#ff4d4d' : '#3b82f6'};
`;

const FigureCell = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
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

    @media (max-width: 520px) {
        width: 54px;
        height: 54px;
    }
`;

const FigureText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Name = styled.div`
    font-family: var(--font-en);
    color: var(--color-text-main);
    font-weight: 800;
    font-size: 1.05rem;
`;

const SubLabel = styled.div`
    font-family: var(--font-en);
    color: var(--color-text-muted);
    font-size: 0.85rem;
    opacity: 0.85;
`;

const InfluenceScore = styled.span`
    font-family: var(--font-en);
    font-weight: 800;
    color: ${props => props.value >= 0 ? '#ff4d4d' : '#3b82f6'};
`;

const StockText = styled.span`
    font-family: var(--font-en);
    font-weight: 700;
    color: var(--color-text-main);
`;

const PowerRanking = () => {
    const [activeTab, setActiveTab] = React.useState('Total');
    const [rows, setRows] = React.useState([]);
    const [countryRows, setCountryRows] = React.useState([]);
    const [industryRows, setIndustryRows] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [lastUpdatedAt, setLastUpdatedAt] = React.useState(null);

    const fetchRanking = React.useCallback(async () => {
        try {
            setError(null);
            const resp = await axios.get('http://localhost:8000/api/power-ranking?limit=10');
            const items = resp?.data?.items;
            const cItems = resp?.data?.country_items;
            const iItems = resp?.data?.industry_items;
            if (Array.isArray(items)) setRows(items);
            if (Array.isArray(cItems)) setCountryRows(cItems);
            if (Array.isArray(iItems)) setIndustryRows(iItems);

            if (Array.isArray(items) || Array.isArray(cItems) || Array.isArray(iItems)) {
                setLastUpdatedAt(new Date());
            }
        } catch (e) {
            setError('Failed to load ranking');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchRanking();
        const id = setInterval(fetchRanking, 20000); // poll for near-real-time updates
        return () => clearInterval(id);
    }, [fetchRanking]);

    const renderAvatar = (r) => (
        <Avatar aria-hidden="true">
            {r.photoUrl
                ? <img src={r.photoUrl} alt="" />
                : r.name.split(' ').map(s => s[0]).slice(0, 2).join('')
            }
        </Avatar>
    );

    return (
        <section id="ranking" className="container section-padding">
            <h2 className="section-title">Power Ranking</h2>

            <ControlsRow>
                <Segmented>
                    <SegmentButton
                        type="button"
                        active={activeTab === 'Total'}
                        onClick={() => setActiveTab('Total')}
                    >
                        Total
                    </SegmentButton>
                    <SegmentButton
                        type="button"
                        active={activeTab === 'Country'}
                        onClick={() => setActiveTab('Country')}
                    >
                        Country
                    </SegmentButton>
                    <SegmentButton
                        type="button"
                        active={activeTab === 'Industry'}
                        onClick={() => setActiveTab('Industry')}
                    >
                        Industry
                    </SegmentButton>
                </Segmented>
            </ControlsRow>

            <TableFrame>
                <TableScroll aria-label="Power ranking table scroll container">
                    <Table>
                        <thead>
                            <tr>
                                <th>{activeTab === 'Industry' ? 'Field' : 'Rank'}</th>
                                <th>Figure</th>
                                <th>Influence Score</th>
                                <th>Stocks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeTab === 'Country' && !loading && !error && countryRows.length === 0 && (
                                <tr>
                                    <td colSpan={4}>
                                        <StockText>No country ranking yet. (Need events for country leaders.)</StockText>
                                    </td>
                                </tr>
                            )}

                            {activeTab === 'Industry' && !loading && !error && industryRows.length === 0 && (
                                <tr>
                                    <td colSpan={4}>
                                        <StockText>No industry ranking yet. (Need events for more figures.)</StockText>
                                    </td>
                                </tr>
                            )}

                            {activeTab === 'Total' && loading && (
                                <tr>
                                    <td colSpan={4}>
                                        <StockText>Loading ranking…</StockText>
                                    </td>
                                </tr>
                            )}

                            {activeTab === 'Total' && !loading && error && (
                                <tr>
                                    <td colSpan={4}>
                                        <StockText>{error}</StockText>
                                    </td>
                                </tr>
                            )}

                            {activeTab === 'Total' && !loading && !error && rows.length === 0 && (
                                <tr>
                                    <td colSpan={4}>
                                        <StockText>No ranking data yet. (Waiting for events to be ingested.)</StockText>
                                    </td>
                                </tr>
                            )}

                            {activeTab === 'Total' && rows.map((r) => (
                                <tr key={`total-${r.rank}-${r.name}`}>
                                    <td className={r.rank === 1 ? 'rank-1' : undefined}>
                                        <RankCell>
                                            <span>{r.rank}</span>
                                            {typeof r.delta === 'number' && r.delta !== 0 && (
                                                <Delta value={r.delta}>
                                                    {r.delta >= 0 ? `+${r.delta}` : r.delta}
                                                </Delta>
                                            )}
                                        </RankCell>
                                    </td>
                                    <td>
                                        <FigureCell>
                                            {renderAvatar(r)}
                                            <FigureText>
                                                <Name>{r.name}</Name>
                                                {lastUpdatedAt && (
                                                    <SubLabel>
                                                        Updated {lastUpdatedAt.toLocaleTimeString()}
                                                    </SubLabel>
                                                )}
                                            </FigureText>
                                        </FigureCell>
                                    </td>
                                    <td>
                                        <InfluenceScore value={r.influence}>
                                            {typeof r.influence === 'number' ? r.influence.toFixed(2) : r.influence}
                                        </InfluenceScore>
                                    </td>
                                    <td>
                                        <StockText>{r.stocks || '-'}</StockText>
                                    </td>
                                </tr>
                            ))}

                            {activeTab === 'Country' && countryRows.map((r) => (
                                <tr key={`country-${r.rank}-${r.name}`}>
                                    <td className={r.rank === 1 ? 'rank-1' : undefined}>
                                        <RankCell>
                                            <span>{r.rank}</span>
                                            {typeof r.delta === 'number' && r.delta !== 0 && (
                                                <Delta value={r.delta}>
                                                    {r.delta >= 0 ? `+${r.delta}` : r.delta}
                                                </Delta>
                                            )}
                                        </RankCell>
                                    </td>
                                    <td>
                                        <FigureCell>
                                            {renderAvatar(r)}
                                            <FigureText>
                                                <Name>{r.name}</Name>
                                                <SubLabel>{r.country || '-'}</SubLabel>
                                            </FigureText>
                                        </FigureCell>
                                    </td>
                                    <td>
                                        <InfluenceScore value={r.influence}>
                                            {typeof r.influence === 'number' ? r.influence.toFixed(2) : r.influence}
                                        </InfluenceScore>
                                    </td>
                                    <td>
                                        <StockText>{r.stocks || '-'}</StockText>
                                    </td>
                                </tr>
                            ))}

                            {activeTab === 'Industry' && industryRows.map((r) => (
                                <tr key={`industry-${r.rank}-${r.name}`}>
                                    <td>
                                        <StockText>{r.field || '-'}</StockText>
                                    </td>
                                    <td>
                                        <FigureCell>
                                            {renderAvatar(r)}
                                            <FigureText>
                                                <Name>{r.name}</Name>
                                            </FigureText>
                                        </FigureCell>
                                    </td>
                                    <td>
                                        <InfluenceScore value={r.influence}>
                                            {typeof r.influence === 'number' ? r.influence.toFixed(2) : r.influence}
                                        </InfluenceScore>
                                    </td>
                                    <td>
                                        <StockText>{r.stocks || '-'}</StockText>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </TableScroll>
            </TableFrame>
        </section>
    );
};

export default PowerRanking;

