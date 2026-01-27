import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { FaTrophy, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const WidgetContainer = styled.div`
    position: fixed;
    top: calc(var(--header-height, 90px) + 24px);
    left: 24px;
    width: 250px;
    background-color: rgba(5, 10, 24, 0.9);
    backdrop-filter: blur(12px);
    border-radius: 16px;
    padding: 22px;
    color: var(--color-text-main);
    z-index: 90;
    font-family: var(--font-en);
    box-shadow: 0 10px 40px rgba(0,0,0,0.6);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform: ${props => props.isOpen ? 'translateX(0)' : 'translateX(calc(-100% - 24px))'};

    /* Ultra-thin Gradient Border Effect */
    border: 0.5px solid transparent;
    background-image: linear-gradient(rgba(5, 10, 24, 0.95), rgba(5, 10, 24, 0.95)), 
                      linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #22d3ee 100%);
    background-origin: border-box;
    background-clip: content-box, border-box;
    
    /* Subtle glow */
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.1), 0 15px 35px rgba(0,0,0,0.5);

    @media (max-width: 1200px) {
        display: ${props => props.isOpen ? 'block' : 'none'};
    }
`;

const WidgetHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    h3 {
        margin: 0;
        font-size: 1rem;
        color: var(--color-accent);
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 8px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
    }
`;

const ToggleButton = styled.button`
    position: absolute;
    right: -32px;
    top: 24px;
    width: 32px;
    height: 32px;
    background-color: var(--color-bg-card);
    border: 0.5px solid #3b82f6; 
    border-left: none;
    border-radius: 0 8px 8px 0;
    color: var(--color-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.8rem;
    box-shadow: 4px 0 10px rgba(0,0,0,0.3);
    transition: all 0.2s;

    &:hover {
        background: var(--color-accent-gradient);
        color: #020617;
        border-color: #22d3ee;
    }
`;

const RankList = styled.ul`
    list-style: none;
    padding: 0;
    margin: 0;
`;

const RankItem = styled.li`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-size: 0.85rem;
    padding: 6px 0;
    border-radius: 4px;
    transition: background 0.2s;

    &:last-child {
        margin-bottom: 0;
    }
`;

const RankNumber = styled.span`
    font-weight: 800;
    color: ${props => props.rank === 1 ? 'var(--color-gold)' : 'var(--color-text-muted)'};
    width: 24px;
    font-size: 0.75rem;
    opacity: 0.8;
`;

const LeaderName = styled.span`
    flex: 1;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 8px;
    color: #ffffff;
`;

const Score = styled.span`
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-accent);
`;

const RankingWidget = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTopRanking = useCallback(async () => {
        try {
            const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                ? 'http://127.0.0.1:8000' 
                : `http://${window.location.hostname}:8000`;
            
            const resp = await axios.get(`${apiBase}/api/power-ranking?limit=10`, { timeout: 10000 });
            const items = resp.data.items || [];

            if (items.length > 0) {
                // Apply the same NRII normalization logic for consistency
                const logScores = items.map(item => Math.log((item.influence || 0) + 1.001));
                const maxLog = Math.max(...logScores);
                const minLog = Math.min(...logScores);
                const logRange = maxLog - minLog;

                items.forEach((item, idx) => {
                    if (logRange > 0) {
                        let normalized = (logScores[idx] - minLog) / logRange;
                        let nonLinear = Math.pow(normalized, 0.7);
                        item.relativeScore = 10 + (nonLinear * 80);
                    } else {
                        item.relativeScore = 50;
                    }
                });

                // Apply outlier bonus for #1
                if (items.length > 1) {
                    const raw1 = items[0].influence || 0;
                    const raw2 = items[1].influence || 0;
                    const ratio = raw2 !== 0 ? (raw1 / raw2) : 1.0;
                    if (ratio > 1.1) {
                        const bonus = Math.min(5, (ratio - 1.1) * 10);
                        items[0].relativeScore += bonus;
                    }
                }
            }
            setRows(items);
        } catch (err) {
            console.error("Widget fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTopRanking();
        // Refresh every 15 minutes to stay in sync with server cache
        const interval = setInterval(fetchTopRanking, 15 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchTopRanking]);

    return (
        <WidgetContainer isOpen={isOpen}>
            <ToggleButton onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <FaChevronLeft /> : <FaChevronRight />}
            </ToggleButton>
            
            <WidgetHeader>
                <h3><FaTrophy /> TOP 10 INFLUENCE</h3>
            </WidgetHeader>
            
            <RankList>
                {loading ? (
                    <li style={{ fontSize: '0.75rem', opacity: 0.5, textAlign: 'center', padding: '10px' }}>Loading...</li>
                ) : rows.length > 0 ? (
                    rows.map((r) => (
                        <RankItem key={`widget-${r.rank}-${r.name}`}>
                            <RankNumber rank={r.rank}>{String(r.rank).padStart(2, '0')}</RankNumber>
                            <LeaderName>{r.name}</LeaderName>
                            <Score>{r.relativeScore ? r.relativeScore.toFixed(1) : '0.0'}%</Score>
                        </RankItem>
                    ))
                ) : (
                    <li style={{ fontSize: '0.75rem', opacity: 0.5, textAlign: 'center', padding: '10px' }}>No data</li>
                )}
            </RankList>
        </WidgetContainer>
    );
};

export default RankingWidget;
