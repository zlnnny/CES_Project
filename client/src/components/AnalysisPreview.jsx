import React from 'react';
import styled from 'styled-components';

const FeaturesGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 30px;
`;

const FeatureCard = styled.div`
    background-color: var(--color-bg-card);
    padding: 2.5rem;
    border-radius: 10px;
    transition: transform 0.3s;

    &:hover {
        transform: translateY(-5px);
        background-color: #203556;
    }

    h3 {
        margin-top: 0;
        font-size: 1.5rem;
        color: var(--color-text-main);
        margin-bottom: 1rem;
        font-family: var(--font-ko);
    }

    p {
        color: var(--color-text-muted);
        font-family: var(--font-ko);
    }
`;

const AnalysisPreview = () => {
    return (
        <section id="analysis" className="container section-padding">
            <h2 className="section-title">Primary Analysis</h2>
            <FeaturesGrid>
                <FeatureCard>
                    <h3>NLP 감성 분석</h3>
                    <p>발언의 긍·부정, 어조, 불확실성을 자연어 처리 기술로 정량화하여 분석합니다.</p>
                </FeatureCard>
                <FeatureCard>
                    <h3>자산 자동 매핑</h3>
                    <p>모든 발언을 연관성이 가장 높은 금융 자산(주가, ETF, 원자재 등)과 자동으로 연결합니다.</p>
                </FeatureCard>
                <FeatureCard>
                    <h3>영향력 시각화</h3>
                    <p>리더별, 주제별 시장 영향력을 직관적인 대시보드와 영향 감소 곡선으로 제공합니다.</p>
                </FeatureCard>
            </FeaturesGrid>
        </section>
    );
};

export default AnalysisPreview;

