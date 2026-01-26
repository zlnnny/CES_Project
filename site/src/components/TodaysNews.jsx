import React, { useEffect, useState, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import axios from 'axios';
import { FaExternalLinkAlt, FaSyncAlt } from 'react-icons/fa';

const NewsSection = styled.section` padding: 4rem 0; background-color: var(--color-bg-main); `;
const Container = styled.div` width: 90%; max-width: 1200px; margin: 0 auto; `;
const SectionTitle = styled.h2` font-size: 2rem; color: var(--color-text-main); margin-bottom: 0; font-family: var(--font-heading); border-left: 5px solid var(--color-accent); padding-left: 1rem; `;
const CardGrid = styled.div` display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem; `;
const NewsCard = styled.div` background-color: var(--color-bg-card, #1e1e1e); border: 1px solid var(--color-border, #333); border-radius: 10px; padding: 1.5rem; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; justify-content: space-between; &:hover { transform: translateY(-5px); box-shadow: 0 5px 15px rgba(0,0,0,0.3); } `;
const Header = styled.div` display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; `;
const LeaderBadge = styled.span` font-size: 0.8rem; background-color: var(--color-accent, #007bff); color: #0b0f14; padding: 0.3rem 0.6rem; border-radius: 20px; font-weight: bold; `;
const DateText = styled.span` font-size: 0.8rem; color: var(--color-text-muted, #888); `;
const NewsTitle = styled.h3` font-size: 1.2rem; color: var(--color-text-main, #fff); margin-bottom: 1rem; line-height: 1.4; font-family: var(--font-en); `;
const AnalysisBox = styled.div` background-color: rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; `;
const ImpactTag = styled.span` display: inline-block; font-size: 0.75rem; background-color: ${props => props.$tone === 'Hawkish' ? 'rgba(255, 99, 71, 0.2)' : props.$tone === 'Dovish' ? 'rgba(100, 149, 237, 0.2)' : 'rgba(128, 128, 128, 0.2)'}; color: ${props => props.$tone === 'Hawkish' ? '#ff6347' : props.$tone === 'Dovish' ? '#6495ed' : '#ccc'}; padding: 0.2rem 0.5rem; border-radius: 4px; margin-right: 0.5rem; margin-bottom: 0.5rem; `;
const LinkButton = styled.a` display: flex; align-items: center; justify-content: center; width: 100%; padding: 0.8rem; background-color: transparent; border: 1px solid var(--color-border, #555); color: var(--color-text-main, #fff); border-radius: 5px; text-decoration: none; font-weight: bold; transition: background 0.2s; &:hover { background-color: var(--color-border, #333); } svg { margin-left: 0.5rem; } `;
const EmptyMessage = styled.div` text-align: center; padding: 3rem; color: var(--color-text-muted, #888); background-color: rgba(255, 255, 255, 0.02); border-radius: 10px; font-size: 1.1rem; `;

// [New] Skeleton Loading UI
const pulse = keyframes` 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } `;
const SkeletonCard = styled.div`
    height: 300px; background: rgba(255,255,255,0.05); border-radius: 10px;
    animation: ${pulse} 1.5s infinite ease-in-out;
`;

const rotate = keyframes` from { transform: rotate(0deg); } to { transform: rotate(360deg); } `;
const HeaderRow = styled.div` display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; `;
const RefreshControl = styled.div` display: flex; align-items: center; gap: 8px; color: var(--color-text-muted, #aaa); font-size: 0.9rem; `;
const IconButton = styled.button`
    background: transparent; border: 1px solid var(--color-border, #555); color: var(--color-text-main, #fff);
    width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s; padding: 0;
    &:hover { background: rgba(255, 255, 255, 0.1); color: var(--color-accent, #007bff); border-color: var(--color-accent, #007bff); }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
    svg { ${props => props.$loading && css` animation: ${rotate} 1s linear infinite; `} }
`;
const TimeText = styled.span` font-size: 0.85rem; font-weight: 500; color: var(--color-text-muted, #888); `;

const TodaysNews = () => {
    const [newsData, setNewsData] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    
    // [중요] 자동 재시도 타이머 관리
    const retryTimeoutRef = useRef(null);

    const fetchNews = async (force = false) => {
        if (force) setRefreshing(true);
        setError(null);

        try {
            // 타임아웃을 넉넉하게 15초로 설정 (백엔드 크롤링 대기)
            const url = `http://localhost:8000/api/news/today${force ? '?force_refresh=true' : ''}`;
            const response = await axios.get(url, { timeout: 20000 });
            
            const { news, last_updated } = response.data;

            if (Array.isArray(news) && news.length > 0) {
                setNewsData(news);
                setLastUpdated(last_updated);
                setLoading(false);
            } else {
                // 데이터가 비어있으면 3초 뒤 재시도 (백엔드가 크롤링 중일 수 있음)
                if (!force) {
                    console.log("Empty data, retrying in 3s...");
                    retryTimeoutRef.current = setTimeout(() => fetchNews(false), 3000);
                } else {
                    setNewsData([]);
                    setLoading(false);
                }
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Failed to load news. Retrying...");
            // 에러 시에도 5초 뒤 재시도
            retryTimeoutRef.current = setTimeout(() => fetchNews(false), 5000);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNews(false);
        // 클린업: 컴포넌트 언마운트 시 타이머 취소
        return () => clearTimeout(retryTimeoutRef.current);
    }, []);

    const handleRefresh = () => {
        clearTimeout(retryTimeoutRef.current); // 수동 갱신 시 기존 타이머 취소
        fetchNews(true);
    };

    return (
        <NewsSection id="news">
            <Container>
                <HeaderRow>
                    <SectionTitle>Today's News</SectionTitle>
                    <RefreshControl>
                        <IconButton 
                            onClick={handleRefresh} 
                            disabled={refreshing || loading} 
                            $loading={refreshing}
                            title="Refresh News" 
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

                {/* 로딩 상태일 때도 기존 데이터가 있으면 유지 (깜빡임 방지) */}
                {loading && newsData.length === 0 && (
                    <CardGrid>
                        {[1, 2, 3].map(n => <SkeletonCard key={n} />)}
                    </CardGrid>
                )}
                
                {error && newsData.length === 0 && <EmptyMessage>{error}</EmptyMessage>}

                {!loading && newsData.length === 0 && !error && (
                    <EmptyMessage>No news found. Click refresh to scan.</EmptyMessage>
                )}

                {newsData.length > 0 && (
                    <CardGrid>
                        {newsData.map((item, index) => (
                            <NewsCard key={index}>
                                <div>
                                    <Header>
                                        <LeaderBadge>{item.leader_name || "Global"}</LeaderBadge>
                                        <DateText>{item.published_at ? item.published_at.split(' ')[0] : '-'}</DateText>
                                    </Header>
                                    <NewsTitle>{item.title}</NewsTitle>
                                    <AnalysisBox>
                                        <div style={{marginBottom: '0.5rem'}}>
                                            <ImpactTag $tone={item.tone}>{item.tone || 'Neutral'}</ImpactTag>
                                            <span style={{fontSize: '0.8rem', color:'#aaa', marginLeft:'5px'}}>
                                                Sent: {item.sentiment ?? 0}
                                            </span>
                                        </div>
                                        <div>
                                            {(item.impact_assets || []).map((asset, i) => (
                                                <ImpactTag key={i}>{asset}</ImpactTag>
                                            ))}
                                        </div>
                                    </AnalysisBox>
                                </div>
                                <LinkButton href={item.url} target="_blank" rel="noopener noreferrer">
                                    View Full Article <FaExternalLinkAlt size={12} />
                                </LinkButton>
                            </NewsCard>
                        ))}
                    </CardGrid>
                )}
            </Container>
        </NewsSection>
    );
};

export default TodaysNews;