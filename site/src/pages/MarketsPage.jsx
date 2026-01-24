import React from 'react';
import styled from 'styled-components';
import Charts from '../components/Charts';

const PageContainer = styled.div`
    padding-top: var(--header-height, 80px);
    min-height: 100vh;
`;

const MarketsPage = () => {
    return (
        <PageContainer>
            <div className="container">
                <Charts />
            </div>
        </PageContainer>
    );
};

export default MarketsPage;

