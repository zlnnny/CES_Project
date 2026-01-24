import React from 'react';
import styled from 'styled-components';
import PowerRanking from '../components/PowerRanking';

const PageContainer = styled.div`
    padding-top: var(--header-height, 80px);
    min-height: 100vh;
`;

const PowerRankingPage = () => {
    return (
        <PageContainer>
            <div className="container">
                <PowerRanking limit={null} />
            </div>
        </PageContainer>
    );
};

export default PowerRankingPage;

