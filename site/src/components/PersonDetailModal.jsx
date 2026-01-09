import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';
// [확인] 여기 FaExpand, FaCompress가 있어야 화살표가 나옵니다.
import { FaTimes, FaNewspaper, FaChartLine, FaExpand, FaCompress } from 'react-icons/fa';

// 애니메이션
const fadeIn = keyframes` from { opacity: 0; } to { opacity: 1; } `;
const slideUp = keyframes` from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } `;

// 스타일 컴포넌트
const Overlay = styled.div`
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(5px);
    display: flex; justify-content: center; align-items: center;
    z-index: 1000;
    animation: ${fadeIn} 0.2s ease-out;
`;

const ModalContainer = styled.div`
    background: var(--color-bg-card, #1e1e1e);
    border: 1px solid var(--color-accent);
    
    /* isMaximized 상태에 따라 크기와 위치 스타일 변경 */
    width: ${props => props.$isMaximized ? '100vw' : '90%'};
    height: ${props => props.$isMaximized ? '100vh' : 'auto'};
    max-width: ${props => props.$isMaximized ? 'none' : '800px'};
    max-height: ${props => props.$isMaximized ? 'none' : '90vh'};
    border-radius: ${props => props.$isMaximized ? '0' : '12px'};
    
    overflow-y: auto;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    animation: ${slideUp} 0.3s ease-out;
    position: relative;
    padding: 2rem;
    transition: all 0.3s ease-in-out;

    &::-webkit-scrollbar { width: 8px; }
    &::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
`;

const ActionButton = styled.button`
    position: absolute; 
    top: 1.5rem;
    background: none; border: none; color: #aaa;
    font-size: 1.2rem; cursor: pointer; transition: color 0.2s, transform 0.2s;
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 50%;
    
    &:hover { 
        color: #fff; 
        background: rgba(255,255,255,0.1);
    }
`;

const Header = styled.div`
    display: flex; align-items: center; gap: 20px;
    margin-bottom: 2rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 1.5rem;
    margin-top: 1rem;
`;

const AvatarLarge = styled.div`
    width: 100px; height: 100px; border-radius: 50%;
    background: linear-gradient(135deg, rgba(100, 255, 218, 0.2), rgba(100, 255, 218, 0.05));
    border: 2px solid var(--color-accent);
    overflow: hidden; display: grid; place-items: center;
    flex-shrink: 0;
    
    img { width: 100%; height: 100%; object-fit: cover; }
    span { font-size: 2rem; font-weight: bold; color: var(--color-accent); }
`;

const InfoSection = styled.div`
    h2 { margin: 0; font-family: var(--font-en); font-size: 2rem; color: #fff; }
    p { color: var(--color-text-muted); margin-top: 0.5rem; }
`;

const ScoreBadge = styled.span`
    display: inline-block; margin-top: 10px;
    padding: 5px 12px; border-radius: 20px;
    background: ${props => props.score >= 0 ? 'rgba(255, 77, 77, 0.2)' : 'rgba(59, 130, 246, 0.2)'};
    color: ${props => props.score >= 0 ? '#ff4d4d' : '#3b82f6'};
    font-weight: bold; font-family: var(--font-en);
`;

const SectionTitle = styled.h3`
    display: flex; align-items: center; gap: 10px;
    color: var(--color-text-main); margin: 2rem 0 1rem 0; font-family: var(--font-en);
    svg { color: var(--color-accent); }
`;

const AssetGrid = styled.div`
    display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem;
`;

const AssetCard = styled.div`
    background: rgba(255,255,255,0.03); border: 1px solid #333;
    padding: 1rem; border-radius: 8px; text-align: center;
    transition: transform 0.2s;
    &:hover { transform: translateY(-3px); border-color: var(--color-accent); }
    
    h4 { margin: 0 0 5px 0; color: #fff; }
    div { font-size: 0.9rem; color: #aaa; }
    span { font-weight: bold; color: ${props => props.score >= 0 ? '#ff4d4d' : '#3b82f6'}; }
`;

const NewsList = styled.div`
    display: flex; flex-direction: column; gap: 1rem;
`;

const NewsItem = styled.a`
    display: block; text-decoration: none;
    background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px;
    border-left: 3px solid var(--color-accent);
    transition: background 0.2s;
    &:hover { background: rgba(255,255,255,0.05); }

    h4 { margin: 0 0 5px 0; color: #eee; font-size: 1rem; }
    span { font-size: 0.8rem; color: #888; }
`;

const PersonDetailModal = ({ person, onClose }) => {
    const [assets, setAssets] = useState([]);
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if (!person) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const newsResp = await axios.get(`http://localhost:8000/api/news?leader=${person.name}`);
                setNews(newsResp.data.slice(0, 3)); 

                const assetResp = await axios.get(`http://localhost:8000/api/leader/${person.name}/assets`);
                setAssets(assetResp.data);

            } catch (err) {
                console.error("Detail fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [person]);

    if (!person) return null;

    return (
        <Overlay onClick={onClose}>
            <ModalContainer 
                $isMaximized={isMaximized} 
                onClick={(e) => e.stopPropagation()}
            >
                {/* [확인] 여기가 화살표 아이콘 부분입니다 */}
                <ActionButton 
                    style={{ right: '4.5rem' }} 
                    onClick={() => setIsMaximized(!isMaximized)}
                    title={isMaximized ? "축소" : "확대"}
                >
                    {isMaximized ? <FaCompress size={18} /> : <FaExpand size={16} />}
                </ActionButton>

                <ActionButton 
                    style={{ right: '1.5rem' }} 
                    onClick={onClose}
                    title="닫기"
                >
                    <FaTimes size={18} />
                </ActionButton>

                <Header>
                    <AvatarLarge>
                         {person.photoUrl 
                            ? <img src={person.photoUrl} alt={person.name} />
                            : <span>{person.name.substring(0, 2)}</span>
                        }
                    </AvatarLarge>
                    <InfoSection>
                        <h2>{person.name}</h2>
                        <p>Total Influence Score</p>
                        <ScoreBadge score={person.influence}>
                            {person.influence > 0 ? '+' : ''}{typeof person.influence === 'number' ? person.influence.toFixed(2) : person.influence}
                        </ScoreBadge>
                    </InfoSection>
                </Header>
                
                {/* ... 아래 내용은 동일 ... */}
                <SectionTitle><FaChartLine /> Top Impacted Assets</SectionTitle>
                <AssetGrid>
                    {loading ? <p style={{color:'#666'}}>Loading assets...</p> : 
                     assets.length > 0 ? assets.map((asset, i) => (
                        <AssetCard key={i} score={asset.score}>
                            <h4>{asset.symbol}</h4> 
                            <div>{asset.name}</div>
                            <span>Score: {asset.score > 0 ? '+' : ''}{asset.score}</span>
                        </AssetCard>
                    )) : <p style={{color:'#666'}}>No impacted assets found yet.</p>}
                </AssetGrid>

                <SectionTitle><FaNewspaper /> Recent News</SectionTitle>
                <NewsList>
                    {loading ? <p style={{color:'#666'}}>Loading news...</p> : news.length > 0 ? news.map((item, i) => (
                        <NewsItem key={i} href={item.url} target="_blank">
                            <h4>{item.title}</h4>
                            <span>{item.published_at?.split(' ')[0]} • {item.source}</span>
                        </NewsItem>
                    )) : <p style={{color:'#666'}}>No recent news found.</p>}
                </NewsList>
            </ModalContainer>
        </Overlay>
    );
};

export default PersonDetailModal;