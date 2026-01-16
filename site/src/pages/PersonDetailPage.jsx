import React, { useEffect, useMemo, useState } from 'react';
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
  font-weight: 800;
  margin-bottom: 1.25rem;

  &:hover {
    color: var(--color-accent);
  }
`;

const Hero = styled.section`
  border: 1px solid rgba(35, 53, 84, 0.9);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  padding: 18px 18px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
`;

const HeroRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const Avatar = styled.div`
  width: 84px;
  height: 84px;
  border-radius: 999px;
  overflow: hidden;
  border: 2px solid rgba(100, 255, 218, 0.55);
  background: linear-gradient(135deg, rgba(100, 255, 218, 0.2), rgba(100, 255, 218, 0.04));
  flex: 0 0 auto;

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
  font-weight: 900;
  color: var(--color-text-main);
  font-size: 2rem;
`;

const Subtitle = styled.div`
  margin-top: 6px;
  font-family: var(--font-en);
  color: var(--color-text-muted);
  font-size: 1rem;
  opacity: 0.95;
`;

const HeroStats = styled.div`
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Stat = styled.div`
  border: 1px solid rgba(35, 53, 84, 0.8);
  background: rgba(255, 255, 255, 0.015);
  border-radius: 12px;
  padding: 12px 12px;
`;

const StatLabel = styled.div`
  font-family: var(--font-en);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  opacity: 0.9;
`;

const StatValue = styled.div`
  margin-top: 6px;
  font-family: var(--font-en);
  color: var(--color-text-main);
  font-size: 1.25rem;
  font-weight: 900;
`;

const Grid = styled.section`
  margin-top: 24px;
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 20px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const PanelTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-family: var(--font-en);
  font-weight: 900;
  color: var(--color-text-main);
`;

const Panel = styled.div`
  border: 1px solid rgba(35, 53, 84, 0.9);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  padding: 16px 16px;
`;

const AssetCard = styled.div`
  border: 1px solid rgba(35, 53, 84, 0.8);
  background: rgba(255, 255, 255, 0.015);
  border-radius: 12px;
  padding: 14px 14px;
  margin-bottom: 12px;
`;

const AssetTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const AssetName = styled.div`
  font-family: var(--font-en);
  color: var(--color-text-main);
  font-weight: 900;
`;

const AssetMeta = styled.div`
  font-family: var(--font-en);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  opacity: 0.9;
  margin-top: 4px;
`;

const Bar = styled.div`
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
  margin-top: 10px;
`;

const BarFill = styled.div`
  height: 100%;
  width: ${p => p.$pct}%;
  background: linear-gradient(90deg, rgba(100, 255, 218, 0.9), rgba(45, 212, 191, 0.9));
`;

const Small = styled.span`
  opacity: 0.85;
`;

const NewsItem = styled.a`
  display: block;
  text-decoration: none;
  border: 1px solid rgba(35, 53, 84, 0.8);
  background: rgba(255, 255, 255, 0.015);
  border-radius: 12px;
  padding: 14px 14px;
  margin-bottom: 12px;
  transition: border-color 0.2s ease, background 0.2s ease;

  &:hover {
    border-color: rgba(100, 255, 218, 0.8);
    background: rgba(100, 255, 218, 0.03);
  }
`;

const NewsSource = styled.div`
  font-family: var(--font-en);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  opacity: 0.9;
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
`;

const NewsTitle = styled.div`
  font-family: var(--font-en);
  color: var(--color-text-main);
  font-weight: 900;
  line-height: 1.35;
`;

const apiBase = 'http://localhost:8000';

export default function PersonDetailPage() {
  const params = useParams();
  const leaderName = useMemo(() => decodeURIComponent(params?.name || ''), [params?.name]);

  const [entity, setEntity] = useState(null);
  const [rankingItem, setRankingItem] = useState(null);
  const [assets, setAssets] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function run() {
      setLoading(true);
      try {
        // entity profile (works for any person in DB)
        const e = await axios.get(`${apiBase}/api/entities/person/${encodeURIComponent(leaderName)}`, { timeout: 9000 });
        if (isMounted) setEntity(e?.data || null);

        // rank (best-effort)
        const pr = await axios.get(`${apiBase}/api/power-ranking?limit=200`, { timeout: 9000 });
        const item = (pr?.data?.items || []).find(x => x?.name === leaderName) || null;
        if (isMounted) setRankingItem(item);

        // correlated assets (best-effort)
        const a = await axios.get(`${apiBase}/api/leader/${encodeURIComponent(leaderName)}/assets`, { timeout: 9000 });
        if (isMounted) setAssets(Array.isArray(a.data) ? a.data : []);

        // leader news via crawler (best-effort)
        const n = await axios.get(`${apiBase}/api/news?leader=${encodeURIComponent(leaderName)}&limit=5`, { timeout: 9000 });
        if (isMounted) setNews(Array.isArray(n.data) ? n.data : []);
      } catch {
        // keep partials if any
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (leaderName) run();
    return () => { isMounted = false; };
  }, [leaderName]);

  const photoUrl = rankingItem?.photoUrl || null;
  const title = entity?.title_or_company || rankingItem?.title_or_company || '';
  const industry = entity?.category || rankingItem?.category || '';

  const maxAssetScore = Math.max(1, ...assets.map(a => Number(a?.score || 0)));

  return (
    <Page className="container">
      <BackLink to="/#ranking">← Back to Rankings</BackLink>

      <Hero>
        <HeroRow>
          <Avatar aria-hidden="true">
            {photoUrl
              ? <img src={photoUrl} alt="" />
              : <img src={`https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(leaderName)}`} alt="" />
            }
          </Avatar>
          <HeroText>
            <Name>{leaderName}</Name>
            <Subtitle>{title || '-'}</Subtitle>
          </HeroText>
        </HeroRow>

        <HeroStats>
          <Stat>
            <StatLabel>Influence Score</StatLabel>
            <StatValue>
              {typeof rankingItem?.influence === 'number'
                ? rankingItem.influence.toFixed(2)
                : (rankingItem?.influence ?? '0.00')}
            </StatValue>
          </Stat>
          <Stat>
            <StatLabel>Industry</StatLabel>
            <StatValue>{industry || '-'}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Company / Country</StatLabel>
            <StatValue>{title || '-'}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Connected Assets</StatLabel>
            <StatValue>{assets?.length ?? 0}</StatValue>
          </Stat>
        </HeroStats>
      </Hero>

      <Grid>
        <div>
          <Panel>
            <PanelTitleRow>
              <PanelTitle>Top Correlated Assets</PanelTitle>
              {loading && <Small>Loading…</Small>}
            </PanelTitleRow>

            {assets.slice(0, 5).map((a, idx) => {
              const score = Number(a?.score || 0);
              const pct = Math.max(0, Math.min(100, Math.round((score / maxAssetScore) * 100)));
              return (
                <AssetCard key={`${a?.name}-${idx}`}>
                  <AssetTop>
                    <AssetName>{a?.symbol || '—'}</AssetName>
                    <Small>{pct}%</Small>
                  </AssetTop>
                  <AssetMeta>{a?.name || ''}</AssetMeta>
                  <Bar><BarFill $pct={pct} /></Bar>
                  <AssetMeta>
                    Influence Strength:{' '}
                    <strong style={{ color: 'var(--color-text-main)' }}>{score.toFixed(2)}</strong>
                  </AssetMeta>
                </AssetCard>
              );
            })}

            {!loading && assets.length === 0 && <Small>No correlated assets yet.</Small>}
          </Panel>
        </div>

        <div>
          <Panel>
            <PanelTitleRow>
              <PanelTitle>Recent News Coverage</PanelTitle>
              {loading && <Small>Loading…</Small>}
            </PanelTitleRow>

            {news.slice(0, 6).map((n, idx) => (
              <NewsItem key={`${n?.url || idx}`} href={n?.url || '#'} target="_blank" rel="noreferrer">
                <NewsSource>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 900 }}>{n?.source || 'news'}</span>
                  <Small>{n?.published_at ? String(n.published_at).split('T')[0] : String(n?.published_at || '').split(' ')[0]}</Small>
                  {n?.tone && <Small>· {n.tone}</Small>}
                </NewsSource>
                <NewsTitle>{n?.title || ''}</NewsTitle>
              </NewsItem>
            ))}

            {!loading && news.length === 0 && <Small>No recent news yet.</Small>}
          </Panel>
        </div>
      </Grid>
    </Page>
  );
}

