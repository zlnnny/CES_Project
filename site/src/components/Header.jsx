import React, { useLayoutEffect, useRef } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';


const HeaderContainer = styled.header`
    background-color: var(--color-bg-header);
    padding: 1rem 0;
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(12px);

    @media (max-width: 768px) {
        padding: 0.8rem 0;
    }
`;

const NavContent = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
`;

const SearchContainer = styled.div`
    flex: 1;
    display: flex;
    justify-content: center;
    
    @media (max-width: 900px) {
        display: none; /* Hide main search on tablets/phones to save space */
    }
`;

const LogoStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    line-height: 1;
    flex-shrink: 0;
`;

const SearchInputWrapper = styled.div`
    position: relative;
    width: 100%;
    max-width: 400px;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 8px 16px;
    padding-right: 40px;
    border: 1.5px solid var(--color-accent);
    border-radius: 8px;
    background-color: rgba(34, 211, 238, 0.03);
    color: var(--color-text-main);
    font-family: var(--font-en);
    font-size: 0.95rem;
    font-weight: 400;
    transition: all 0.2s ease;

    &:focus {
        outline: none;
        box-shadow: 0 0 15px rgba(34, 211, 238, 0.2);
    }
`;

const SearchIcon = styled.div`
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-muted);
    font-size: 0.8rem;
    opacity: 0.6;
`;

const Logo = styled(Link)`
    font-size: 1.6rem;
    font-weight: 600;
    color: var(--color-accent);
    font-family: var(--font-heading);
    letter-spacing: -0.02em;
    text-decoration: none;
    
    @media (max-width: 480px) {
        font-size: 1.3rem;
    }
`;

const LogoTagline = styled.div`
    font-family: var(--font-en);
    color: var(--color-text-muted);
    font-size: 0.7rem;
    font-weight: 400;
    opacity: 0.8;
    letter-spacing: 0.08em;

    @media (max-width: 480px) {
        display: none;
    }
`;

const NavMenu = styled.nav`
    display: flex;
    align-items: center;
    gap: 24px;
    flex-shrink: 0;

    a {
        color: var(--color-text-muted);
        font-size: 0.95rem;
        font-weight: 500;
        text-decoration: none;
        transition: all 0.2s;
        font-family: var(--font-en);
        
        &:hover {
            color: var(--color-accent);
        }
    }

    @media (max-width: 600px) {
        gap: 12px;
        a {
            font-size: 0.85rem;
        }
    }
`;

const Header = () => {
    const headerRef = useRef(null);

    useLayoutEffect(() => {
        const el = headerRef.current;
        if (!el) return;

        const apply = () => {
            const h = el.getBoundingClientRect().height;
            document.documentElement.style.setProperty('--header-height', `${Math.ceil(h)}px`);
        };

        apply();
            window.addEventListener('resize', apply);
        return () => window.removeEventListener('resize', apply);
    }, []);

    return (
        <HeaderContainer ref={headerRef}>
            <div className="container">
                <NavContent>
                    <LogoStack>
                        <Logo to="/">Echonomics</Logo>
                        <LogoTagline>AI-DRIVEN ANALYTICS</LogoTagline>
                    </LogoStack>
                    
                    <SearchContainer>
                            <SearchInputWrapper>
                            <SearchInput type="text" placeholder="Search..." />
                                <SearchIcon>
                                    <FaSearch />
                                </SearchIcon>
                            </SearchInputWrapper>
                    </SearchContainer>

                    <NavMenu>
                        <Link to="/power-rankings">Rank</Link>
                        <Link to="/news">News</Link>
                        <Link to="/markets">Markets</Link>
                    </NavMenu>
                </NavContent>
            </div>
        </HeaderContainer>
    );
};

export default Header;
