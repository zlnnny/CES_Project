import React, { useState } from 'react';
import styled from 'styled-components';
import { FaTrophy, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { totalRows } from '../data/powerRankingDummy';

const WidgetContainer = styled.div`
    position: fixed;
    top: calc(var(--header-height, 90px) + 14px); /* Automatically adjust below the header */
    left: 20px;
    width: 220px;
    background-color: rgba(10, 25, 47, 0.85); /* Semi-transparent navy */
    backdrop-filter: blur(5px);
    border: 2px solid var(--color-accent); /* Mint border */
    border-radius: 10px;
    padding: 15px;
    color: var(--color-text-main);
    z-index: 90;
    font-family: var(--font-en);
    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
    transition: transform 0.3s ease;
    transform: ${props => props.isOpen ? 'translateX(0)' : 'translateX(calc(-100% - 20px))'};
`;

const WidgetHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(100, 255, 218, 0.3);

    h3 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--color-accent);
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 8px;
    }
`;

const ToggleButton = styled.button`
    position: absolute;
    right: -30px; /* Positioned outside the widget */
    top: 15px;
    width: 30px;
    height: 30px;
    background-color: var(--color-accent);
    border: none;
    border-radius: 0 5px 5px 0;
    color: var(--color-bg-main);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.8rem;
    box-shadow: 2px 0 5px rgba(0,0,0,0.2);
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
    font-size: 0.9rem;

    &:last-child {
        margin-bottom: 0;
    }
`;

const RankNumber = styled.span`
    font-weight: bold;
    color: ${props => props.rank === 1 ? 'var(--color-gold)' : 'var(--color-accent)'};
    width: 20px;
`;

const LeaderName = styled.span`
    flex: 1;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 5px;
`;

const Score = styled.span`
    font-size: 0.85rem;
    font-weight: bold;
    color: var(--color-text-main); /* White */
`;

const RankingWidget = ({ rows = totalRows }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <WidgetContainer isOpen={isOpen}>
            <ToggleButton onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <FaChevronLeft /> : <FaChevronRight />}
            </ToggleButton>
            
            <WidgetHeader>
                <h3><FaTrophy /> Power Rank</h3>
            </WidgetHeader>
            
            <RankList>
                {rows.slice(0, 10).map((r) => (
                    <RankItem key={`widget-${r.rank}-${r.name}`}>
                        <RankNumber rank={r.rank}>{r.rank}</RankNumber>
                        <LeaderName>{r.name}</LeaderName>
                        <Score>{typeof r.influence === 'number' ? r.influence.toFixed(1) : r.influence}</Score>
                    </RankItem>
                ))}
            </RankList>
        </WidgetContainer>
    );
};

export default RankingWidget;
