import React from 'react';
import styled from 'styled-components';

const FooterContainer = styled.footer`
    background-color: #020c1b;
    color: var(--color-text-muted);
    text-align: center;
    padding: 2rem 0;
    margin-top: 4rem;
    font-family: var(--font-ko);
`;

const Footer = () => {
    return (
        <FooterContainer>
            <div className="container">
                <p>&copy; 2025 Market Voice | CES Team Project. All Rights Reserved.</p>
                <p>모든 금융 데이터는 정보 제공 목적으로만 사용되며, 투자 조언이 아닙니다.</p>
            </div>
        </FooterContainer>
    );
};

export default Footer;

