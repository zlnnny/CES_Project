import React, { useEffect, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import axios from 'axios';
import { FaExternalLinkAlt, FaSyncAlt } from 'react-icons/fa';

// ... (기존 레이아웃 스타일들은 그대로 유지) ...
const NewsSection = styled.section` padding: 4rem 0; background-color: var(--color-bg-main); `;
const Container = styled.div` width: 90%; max-width: 1200px; margin: 0 auto; `;
const SectionTitle = styled.h2` font-size: 2rem; color: var(--color-text-main); margin-bottom: 0; font-family: var(--font-heading); border-left: 5px solid var(--color-accent); padding-left: 1rem; `;
const CardGrid = styled.div` display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem; `;
const NewsCard = styled.div` background-color: var(--color-bg-card, #1e1e1e); border: 1px solid var(--color-border, #333); border-radius: 10px; padding: 1.5rem; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; justify-content: space-between; &:hover { transform: translateY(-5px); box-shadow: 0 5px 15px rgba(0,0,0,0.3); } `;
const Header = styled.div` display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; `;
const LeaderBadge = styled.span` font-size: 0.8rem; background-color: var(--color-accent, #007bff); color: #0b0f14; padding: 0.3rem 0.6rem; border-radius: 20px; font-weight: bold; `;
const DateText = styled.span` font-size: 0.8rem; color: var(--color-text-muted, #888); `;
const NewsTitle = styled.h3` font-size: 1.2rem; color: var(--color-text-main, #fff); margin-bottom: 1rem; line-height: 1.4; font-family: var(--font-ko); `;
const AnalysisBox = styled.div` background-color: rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; `;
const ImpactTag = styled.span` display: inline-block; font-size: 0.75rem; background-color: ${props => props.$tone === 'Hawkish' ? 'rgba(255, 99, 71, 0.2)' : props.$tone === 'Dovish' ? 'rgba(100, 149, 237, 0.2)' : 'rgba(128, 128, 128, 0.2)'}; color: ${props => props.$tone === 'Hawkish' ? '#ff6347' : props.$tone === 'Dovish' ? '#6495ed' : '#ccc'}; padding: 0.2rem 0.5rem; border-radius: 4px; margin-right: 0.5rem; margin-bottom: 0.5rem; `;
const LinkButton = styled.a` display: flex; align-items: center; justify-content: center; width: 100%; padding: 0.8rem; background-color: transparent; border: 1px solid var(--color-border, #555); color: var(--color-text-main, #fff); border-radius: 5px; text-decoration: none; font-weight: bold; transition: background 0.2s; &:hover { background-color: var(--color-border, #333); } svg { margin-left: 0.5rem; } `;
const EmptyMessage = styled.div` text-align: center; padding: 3rem; color: var(--color-text-muted, #888); background-color: rgba(255, 255, 255, 0.02); border-radius: 10px; font-size: 1.1rem; `;

// [수정됨] 회전 애니메이션
const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// [수정됨] 상단 헤더 (제목과 리프레시 컨트롤 한 줄 배치)
const HeaderRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-end; /* 텍스트 베이스라인 맞춤 */
    margin-bottom: 2rem;
`;

// [수정됨] 리프레시 컨트롤 영역
const RefreshControl = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-text-muted, #aaa);
    font-size: 0.9rem;
`;

// [수정됨] 원형 아이콘 버튼 스타일
const IconButton = styled.button`
    background: transparent;
    border: 1px solid var(--color-border, #555); 
    color: var(--color-text-main, #fff);
    width: 32px;
    height: 32px;
    border-radius: 50%; /* 완전한 원형 */
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--color-accent, #007bff);
        border-color: var(--color-accent, #007bff);
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    svg {
        ${props => props.$loading && css`
            animation: ${rotate} 1s linear infinite;
        `}
    }
`;

const TimeText = styled.span`
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-text-muted, #888);
`;

const TodaysNews = () => {
    const [newsData, setNewsData] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchNews = async (force = false) => {
        if (force) setRefreshing(true);
        try {
            const url = `http://localhost:8000/api/news/today${force ? '?force_refresh=true' : ''}`;
            const response = await axios.get(url, { timeout: 12000 });
            
            const { news, last_updated, message } = response.data;

            if (Array.isArray(news)) {
                setNewsData(news);
                setLastUpdated(last_updated);
                if (message) console.log(message);
            } else {
                setNewsData([]);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNews(false);
    }, []);

    const handleRefresh = () => {
        fetchNews(true);
    };

    return (
        <NewsSection id="news">
            <Container>
                <HeaderRow>
                    <SectionTitle>Today's News</SectionTitle>
                    
                    {/* [UI 변경] 아이콘 버튼 + 시간 텍스트 */}
                    <RefreshControl>
                        <IconButton 
                            onClick={handleRefresh} 
                            disabled={refreshing || loading} 
                            $loading={refreshing}
                            title="Refresh News" // 마우스 올리면 툴팁
                        >
                            <FaSyncAlt size={14} />
                        </IconButton>
                        {lastUpdated && (
                            <TimeText>
                                Updated {lastUpdated.split(' ')[1].substring(0, 5)}
                            </TimeText>
                        )}
                    </RefreshControl>
                </HeaderRow>

                {loading && <EmptyMessage>Loading...</EmptyMessage>}
                
                {!loading && !error && newsData.length === 0 && (
                    <EmptyMessage>No news available.</EmptyMessage>
                )}

                {!loading && newsData.length > 0 && (
                    <CardGrid>
                        {newsData.map((item, index) => {
                            const { leader_name, published_at, title, tone, sentiment, impact_assets, url } = item;
                            return (
                                <NewsCard key={index}>
                                    <div>
                                        <Header>
                                            <LeaderBadge>{leader_name || "Global"}</LeaderBadge>
                                            <DateText>{published_at ? published_at.split(' ')[0] : '-'}</DateText>
                                        </Header>
                                        <NewsTitle>{title}</NewsTitle>
                                        <AnalysisBox>
                                            <div style={{marginBottom: '0.5rem'}}>
                                                <ImpactTag $tone={tone}>{tone || 'Neutral'}</ImpactTag>
                                                <span style={{fontSize: '0.8rem', color:'#aaa'}}>Sentiment: {sentiment ?? 0}</span>
                                            </div>
                                            <div>
                                                {(impact_assets || []).map((asset, i) => (
                                                    <ImpactTag key={i}>{asset}</ImpactTag>
                                                ))}
                                            </div>
                                        </AnalysisBox>
                                    </div>
                                    <LinkButton href={url} target="_blank" rel="noopener noreferrer">
                                        View Full Article <FaExternalLinkAlt size={12} />
                                    </LinkButton>
                                </NewsCard>
                            );
                        })}
                    </CardGrid>
                )}
            </Container>
        </NewsSection>
    );
};

export default TodaysNews;