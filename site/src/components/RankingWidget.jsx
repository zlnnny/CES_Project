import React, { useState } from 'react';
import styled from 'styled-components';
import { FaTrophy, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const WidgetContainer = styled.div`
    position: fixed;
    top: 100px; /* 헤더 높이만큼 띄움 */
    left: 20px;
    width: 220px;
    background-color: rgba(10, 25, 47, 0.85); /* 반투명 네이비 */
    backdrop-filter: blur(5px);
    border: 2px solid var(--color-accent); /* 민트색 테두리 */
    border-radius: 10px;
    padding: 15px;
    color: var(--color-text-main);
    z-index: 90;
    font-family: var(--font-ko);
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
    right: -30px; /* 위젯 바깥으로 뺌 */
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
    font-weight: bold; /* 볼드체 요청 반영 */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 5px;
`;

const Score = styled.span`
    font-size: 0.85rem;
    font-weight: bold;
    color: var(--color-text-main); /* 흰색 */
`;

const RankingWidget = () => {
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
                <RankItem>
                    <RankNumber rank={1}>1</RankNumber>
                    <LeaderName>Jerome Powell</LeaderName>
                    <Score>95.8</Score>
                </RankItem>
                <RankItem>
                    <RankNumber rank={2}>2</RankNumber>
                    <LeaderName>Andrew Bailey</LeaderName>
                    <Score>81.2</Score>
                </RankItem>
                <RankItem>
                    <RankNumber rank={3}>3</RankNumber>
                    <LeaderName>Ueda Kazuo</LeaderName>
                    <Score>77.5</Score>
                </RankItem>
                <RankItem>
                    <RankNumber rank={4}>4</RankNumber>
                    <LeaderName>Justin Trudeau</LeaderName>
                    <Score>64.0</Score>
                </RankItem>
                <RankItem>
                    <RankNumber rank={5}>5</RankNumber>
                    <LeaderName>Xi Jinping</LeaderName>
                    <Score>60.5</Score>
                </RankItem>
                <RankItem>
                    <RankNumber rank={6}>6</RankNumber>
                    <LeaderName>Christine Lagarde</LeaderName>
                    <Score>58.2</Score>
                </RankItem>
                <RankItem>
                    <RankNumber rank={7}>7</RankNumber>
                    <LeaderName>Joe Biden</LeaderName>
                    <Score>55.9</Score>
                </RankItem>
                <RankItem>
                    <RankNumber rank={8}>8</RankNumber>
                    <LeaderName>Emmanuel Macron</LeaderName>
                    <Score>49.3</Score>
                </RankItem>
                <RankItem>
                    <RankNumber rank={9}>9</RankNumber>
                    <LeaderName>Olaf Scholz</LeaderName>
                    <Score>45.1</Score>
                </RankItem>
                <RankItem>
                    <RankNumber rank={10}>10</RankNumber>
                    <LeaderName>Narendra Modi</LeaderName>
                    <Score>41.8</Score>
                </RankItem>
            </RankList>
        </WidgetContainer>
    );
};

export default RankingWidget;

