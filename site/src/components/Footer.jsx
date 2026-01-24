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
                <p>&copy; 2026 Echonomics | CES Team Project. All Rights Reserved.</p>
                <p>All financial data is provided for informational purposes only and does not constitute investment advice.</p>
            </div>
        </FooterContainer>
    );
};

export default Footer;

