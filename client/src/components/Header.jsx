import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const HeaderContainer = styled.header`
    background-color: var(--color-bg-header);
    padding: 1rem 0;
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(10px);
`;

const NavContent = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const Logo = styled(Link)`
    font-size: 1.8rem;
    font-weight: bold;
    color: var(--color-accent);
    font-family: var(--font-heading);
`;

const NavMenu = styled.nav`
    display: flex;
    align-items: center;

    a {
        color: var(--color-text-main);
        font-size: 1.1rem;
        margin-left: 25px;
        transition: color 0.3s;
        font-family: var(--font-en);
        
        &:hover {
            color: var(--color-accent);
        }
    }
`;

const Dropdown = styled.div`
    position: relative;
    display: inline-block;
    margin-left: 25px;
    
    &:hover .dropdown-content {
        display: block;
    }
`;

const DropdownBtn = styled.span`
    color: var(--color-text-main);
    font-size: 1.1rem;
    cursor: pointer;
    font-family: var(--font-en);
    transition: color 0.3s;

    &:hover {
        color: var(--color-accent);
    }
`;

const DropdownContent = styled.div`
    display: none;
    position: absolute;
    background-color: var(--color-text-main);
    min-width: 160px;
    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
    z-index: 200;
    border-radius: 5px;
    top: 100%;
    right: 0;
    padding: 0.5rem 0;

    a {
        color: var(--color-bg-main);
        padding: 12px 16px;
        display: block;
        margin-left: 0;
        font-family: var(--font-ko);
        font-size: 0.95rem;

        &:hover {
            background-color: #f1f1f1;
            color: var(--color-bg-card);
        }
    }
`;

const Header = () => {
    return (
        <HeaderContainer>
            <div className="container">
                <NavContent>
                    <Logo to="/">Market Voice</Logo>
                    <NavMenu>
                        <a href="#charts">Charts</a>
                        <a href="#ranking">Power Ranking</a>
                        <Dropdown>
                            <DropdownBtn>Analysis</DropdownBtn>
                            <DropdownContent className="dropdown-content">
                                <Link to="/analysis/nlp">NLP 감성 분석</Link>
                                <Link to="/analysis/mapping">자산 자동 매핑</Link>
                                <Link to="/analysis/impact">영향력 시각화</Link>
                            </DropdownContent>
                        </Dropdown>
                    </NavMenu>
                </NavContent>
            </div>
        </HeaderContainer>
    );
};

export default Header;

