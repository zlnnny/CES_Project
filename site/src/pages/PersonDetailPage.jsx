import React, { useEffect, useMemo, useState, useCallback } from 'react';
import styled from 'styled-components';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';

const Page = styled.main`
  padding: 2.25rem 0 4rem 0;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-muted);
  text-decoration: none;
  font-family: var(--font-en);
  font-weight: 600;
  margin-bottom: 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    color: var(--color-accent);
    transform: translateX(-4px);
  }
`;

const Hero = styled.section`
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
`;

const HeroRow = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  @media (max-width: 600px) {
    flex-direction: column;
    text-align: center;
  }
`;

const Avatar = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 24px;
  overflow: hidden;
  border: 2px solid var(--color-accent);
  background: var(--color-accent-gradient);
  flex: 0 0 auto;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const HeroText = styled.div`
  flex: 1;
  min-width: 0;
`;

const Name = styled.h2`
  margin: 0;
  font-family: var(--font-en);
  font-weight: 800;
  color: #ffffff;
  font-size: 2.5rem;
  letter-spacing: -0.02em;
`;

const Subtitle = styled.div`
  margin-top: 8px;
  font-family: var(--font-en);
  color: var(--color-text-muted);
  font-size: 1.1rem;
  font-weight: 400;
  opacity: 0.9;
`;

const HeroStats = styled.div`
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Stat = styled.div`
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.01);
  border-radius: 16px;
  padding: 16px;
`;

const StatLabel = styled.div`
  font-family: var(--font-en);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
`;

const StatValue = styled.div`
  font-family: var(--font-en);
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 700;
`;

const Grid = styled.section`
  margin-top: 24px;
  display: grid;
  grid-template-columns: 450px 1fr;
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 20px;
  padding: 24px;
  height: 100%;
`;

const PanelTitle = styled.h3`
  margin: 0 0 20px 0;
  font-family: var(--font-en);
  font-weight: 700;
  color: #ffffff;
  font-size: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const AssetCard = styled.div`
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.015);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--color-accent);
    background: rgba(103, 232, 249, 0.05);
    transform: translateY(-2px);
  }
`;

const AssetTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const AssetTicker = styled.div`
  font-family: var(--font-en);
  color: var(--color-accent);
  font-weight: 700;
  font-size: 1.1rem;
`;

const BarContainer = styled.div`
  height: 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  margin: 12px 0;
`;

const BarFill = styled.div`
  height: 100%;
  width: ${p => p.$pct}%;
  background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
  border-radius: 10px;
`;

const NewsItem = styled.a`
  display: block;
  text-decoration: none;
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.015);
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 16px;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--color-accent);
    background: rgba(255, 255, 255, 0.04);
    transform: translateY(-2px);
  }
`;

const NewsMeta = styled.div`
  font-family: var(--font-en);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  margin-bottom: 10px;
  display: flex;
  gap: 12px;
  font-weight: 500;
`;

const NewsTitle = styled.div`
  font-family: var(--font-en);
  color: #ffffff;
  font-weight: 600;
  font-size: 1.1rem;
  line-height: 1.4;
`;

const apiBase = 'http://localhost:8000';

export default function PersonDetailPage() {
  const params = useParams();
  const leaderName = useMemo(() => decodeURIComponent(params?.name || ''), [params?.name]);

  const [entity, setEntity] = useState(null);
  const [rankingItem, setRankingItem] = useState(null);
  const [relativeScore, setRelativeScore] = useState(0);
  const [assets, setAssets] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  const calculateNRII = useCallback((items, currentName) => {
    if (!items || items.length === 0) return 0;
    
    // NRII Logic: log scaling -> min-max normalization -> power correction -> mapping
    const logScores = items.map(item => Math.log((item.influence || 0) + 1.001));
    const maxLog = Math.max(...logScores);
    const minLog = Math.min(...logScores);
    const logRange = maxLog - minLog;

    const currentItem = items.find(x => x.name === currentName);
    if (!currentItem) return 0;

    const currentLog = Math.log((currentItem.influence || 0) + 1.001);
    
    if (logRange <= 0) return 50;

    let normalized = (currentLog - minLog) / logRange;
    let nonLinear = Math.pow(normalized, 0.7);
    let finalScore = 10 + (nonLinear * 80);

    // Super-leader bonus
    if (items.length > 1) {
      const raw1 = items[0].influence;
      const raw2 = items[1].influence;
      const ratio = raw1 / (raw2 || 0.001);
      if (items[0].name === currentName && ratio > 1.1) {
        const bonus = Math.min(5, (ratio - 1.1) * 10);
        finalScore += bonus;
      }
    }
    return finalScore;
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function run() {
      setLoading(true);
      try {
        const [entityResp, rankingResp, assetsResp, newsResp] = await Promise.all([
          axios.get(`${apiBase}/api/entities/person/${encodeURIComponent(leaderName)}`).catch(() => null),
          axios.get(`${apiBase}/api/power-ranking?limit=200`).catch(() => null),
          axios.get(`${apiBase}/api/leader/${encodeURIComponent(leaderName)}/assets`).catch(() => []),
          axios.get(`${apiBase}/api/news?leader=${encodeURIComponent(leaderName)}&limit=10`).catch(() => [])
        ]);

        if (!isMounted) return;

        if (entityResp?.data) setEntity(entityResp.data);
        
        if (rankingResp?.data?.items) {
          const items = rankingResp.data.items;
          const item = items.find(x => x?.name === leaderName) || null;
          setRankingItem(item);
          setRelativeScore(calculateNRII(items, leaderName));
        }

        setAssets(Array.isArray(assetsResp?.data) ? assetsResp.data : []);
        setNews(Array.isArray(newsResp?.data) ? newsResp.data : []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (leaderName) run();
    return () => { isMounted = false; };
  }, [leaderName, calculateNRII]);

  const title = entity?.title_or_company || rankingItem?.title_or_company || '';
  const industry = entity?.category || rankingItem?.category || '';
  const maxAssetScore = Math.max(1, ...assets.map(a => Number(a?.score || 0)));

  return (
    <Page className="container">
      <BackLink to="/power-rankings">← Back to Rankings</BackLink>

      <Hero>
        <HeroRow>
          <Avatar>
            {rankingItem?.photoUrl
              ? <img src={rankingItem.photoUrl} alt={leaderName} />
              : <img src={`https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(leaderName)}`} alt="" />
            }
          </Avatar>
          <HeroText>
            <Name>{leaderName}</Name>
            <Subtitle>{title || 'Market Influencer'}</Subtitle>
          </HeroText>
        </HeroRow>

        <HeroStats>
          <Stat>
            <StatLabel>Influence Index</StatLabel>
            <StatValue>{relativeScore.toFixed(1)}%</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Market Focus</StatLabel>
            <StatValue>{industry || 'General'}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Primary Role</StatLabel>
            <StatValue>{(title || '-').length > 15 ? (title || '-').substring(0, 15) + '..' : (title || '-')}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Linked Assets</StatLabel>
            <StatValue>{assets?.length ?? 0}</StatValue>
          </Stat>
        </HeroStats>
      </Hero>

      <Grid>
        <div>
          <Panel>
            <PanelTitle>
              Top Correlated Assets
              {loading && <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Loading...</span>}
            </PanelTitle>

            {assets.length > 0 ? assets.map((a, idx) => {
              const score = Number(a?.score || 0);
              const pct = Math.max(5, Math.min(100, Math.round((score / maxAssetScore) * 100)));
              return (
                <AssetCard key={`${a?.symbol}-${idx}`}>
                  <AssetTop>
                    <AssetTicker>{a?.symbol}</AssetTicker>
                    <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9rem' }}>{pct}% Match</span>
                  </AssetTop>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>{a?.name}</div>
                  <BarContainer><BarFill $pct={pct} /></BarContainer>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                    Strength: <strong>{score.toFixed(2)}</strong>
                  </div>
                </AssetCard>
              );
            }) : !loading && (
              <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px' }}>
                No assets linked to this leader yet.
              </div>
            )}
          </Panel>
        </div>

        <div>
          <Panel>
            <PanelTitle>
              Recent News Coverage
              {loading && <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Loading...</span>}
            </PanelTitle>

            {news.length > 0 ? news.map((n, idx) => (
              <NewsItem key={`${n?.url || idx}`} href={n?.url || '#'} target="_blank" rel="noreferrer">
                <NewsMeta>
                  <span style={{ color: 'var(--color-accent)' }}>{n?.source || 'Global News'}</span>
                  <span>•</span>
                  <span>{n?.published_at?.split('T')[0] || n?.published_at?.split(' ')[0]}</span>
                  {n?.tone && (
                    <>
                      <span>•</span>
                      <span style={{ color: n.tone === 'Hawkish' ? '#ff6347' : n.tone === 'Dovish' ? '#6495ed' : 'inherit' }}>
                        {n.tone}
                      </span>
                    </>
                  )}
                </NewsMeta>
                <NewsTitle>{n?.title}</NewsTitle>
              </NewsItem>
            )) : !loading && (
              <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px' }}>
                No recent news found.
              </div>
            )}
          </Panel>
        </div>
      </Grid>
    </Page>
  );
}
