import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { FaExternalLinkAlt } from 'react-icons/fa';

const NewsSection = styled.section`
    padding: 4rem 0;
    background-color: var(--color-bg-main);
`;

const Container = styled.div`
    width: 90%;
    max-width: 1200px;
    margin: 0 auto;
`;

const SectionTitle = styled.h2`
    font-size: 2rem;
    color: var(--color-text-main);
    margin-bottom: 2rem;
    font-family: var(--font-heading);
    border-left: 5px solid var(--color-accent);
    padding-left: 1rem;
`;

const CardGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 2rem;
`;

const NewsCard = styled.div`
    background-color: var(--color-bg-card, #1e1e1e);
    border: 1px solid var(--color-border, #333);
    border-radius: 10px;
    padding: 1.5rem;
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    &:hover {
        transform: translateY(-5px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    }
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
`;

const LeaderBadge = styled.span`
    font-size: 0.8rem;
    background-color: var(--color-accent, #007bff);
    color: white;
    padding: 0.3rem 0.6rem;
    border-radius: 20px;
    font-weight: bold;
`;

const DateText = styled.span`
    font-size: 0.8rem;
    color: var(--color-text-muted, #888);
`;

const NewsTitle = styled.h3`
    font-size: 1.2rem;
    color: var(--color-text-main, #fff);
    margin-bottom: 1rem;
    line-height: 1.4;
    font-family: var(--font-ko);
`;

const AnalysisBox = styled.div`
    background-color: rgba(255, 255, 255, 0.05);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
`;

// $tone (Transient Prop) 적용
const ImpactTag = styled.span`
    display: inline-block;
    font-size: 0.75rem;
    background-color: ${props => props.$tone === 'Hawkish' ? 'rgba(255, 99, 71, 0.2)' : props.$tone === 'Dovish' ? 'rgba(100, 149, 237, 0.2)' : 'rgba(128, 128, 128, 0.2)'};
    color: ${props => props.$tone === 'Hawkish' ? '#ff6347' : props.$tone === 'Dovish' ? '#6495ed' : '#ccc'};
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    margin-right: 0.5rem;
    margin-bottom: 0.5rem;
`;

const LinkButton = styled.a`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 0.8rem;
    background-color: transparent;
    border: 1px solid var(--color-border, #555);
    color: var(--color-text-main, #fff);
    border-radius: 5px;
    text-decoration: none;
    font-weight: bold;
    transition: background 0.2s;

    &:hover {
        background-color: var(--color-border, #333);
    }
    
    svg {
        margin-left: 0.5rem;
    }
`;

// 데이터가 없을 때 보여줄 메시지 스타일
const EmptyMessage = styled.div`
    text-align: center;
    padding: 3rem;
    color: var(--color-text-muted, #888);
    background-color: rgba(255, 255, 255, 0.02);
    border-radius: 10px;
    font-size: 1.1rem;
`;

const TodaysNews = () => {
    const [newsData, setNewsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const response = await axios.get('http://localhost:8000/api/news');
                console.log("서버 응답:", response.data); // 이 로그를 확인해야 함

                if (Array.isArray(response.data)) {
                    setNewsData(response.data);
                } else {
                    // 만약 또 Object 에러가 나면, 그 내용이 뭔지 출력
                    console.error("데이터 형식 오류 내용:", JSON.stringify(response.data));
                    setNewsData([]); 
                    // 에러 메시지가 있다면 화면에 띄우기
                    if(response.data.error) setError(response.data.error);
                }
            } catch (err) {
                console.error("통신 에러:", err);
                setError("서버 연결 실패");
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, []);

    // 렌더링 로직: 조건부 렌더링을 SectionTitle 아래로 이동
    return (
        <NewsSection>
            <Container>
                {/* 제목은 언제나 보임 */}
                <SectionTitle>Today's Event</SectionTitle>

                {/* 1. 로딩 중일 때 */}
                {loading && (
                    <EmptyMessage>뉴스 데이터를 불러오는 중...</EmptyMessage>
                )}

                {/* 2. 로딩 끝났는데, 에러가 있거나 데이터가 비어있을 때 */}
                {!loading && (error || !Array.isArray(newsData) || newsData.length === 0) && (
                    <EmptyMessage>
                        표시할 뉴스가 없습니다.
                        {/* 디버깅용 에러 메시지 (필요 없으면 주석 처리) */}
                        {/* <br/><small style={{fontSize:'0.8em', opacity: 0.5}}>({error || "데이터 없음"})</small> */}
                    </EmptyMessage>
                )}

                {/* 3. 정상적으로 데이터가 있을 때 */}
                {!loading && !error && Array.isArray(newsData) && newsData.length > 0 && (
                    <CardGrid>
                        {newsData.map((item, index) => {
                            const analysis = item.analysis || {};
                            const tone = analysis.tone || 'Neutral';
                            
                            return (
                                <NewsCard key={index}>
                                    <div>
                                        <Header>
                                            <LeaderBadge>{item.leader}</LeaderBadge>
                                            <DateText>
                                                {item.pub_date ? new Date(item.pub_date).toLocaleDateString() : '-'}
                                            </DateText>
                                        </Header>
                                        <NewsTitle>{item.title}</NewsTitle>
                                        <AnalysisBox>
                                            <div style={{marginBottom: '0.5rem'}}>
                                                <ImpactTag $tone={tone}>{tone}</ImpactTag>
                                                <span style={{fontSize: '0.8rem', color:'#aaa'}}>
                                                    Score: {analysis.sentiment_score}
                                                </span>
                                            </div>
                                            <div>
                                                {(analysis.impact_assets || []).map((asset, i) => (
                                                    <ImpactTag key={i}>{asset}</ImpactTag>
                                                ))}
                                            </div>
                                        </AnalysisBox>
                                    </div>
                                    <LinkButton href={item.link} target="_blank">
                                        View News <FaExternalLinkAlt size={12} />
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