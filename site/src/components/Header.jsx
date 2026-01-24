import React, { useLayoutEffect, useRef } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';


const HeaderContainer = styled.header`
    background-color: var(--color-bg-header);
    padding: 1.2rem 0; /* Increased padding for taller header */
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(12px);
`;

const NavContent = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const SearchContainer = styled.div`
    flex: 1;
    display: flex;
    justify-content: center;
    margin: 0 40px;
`;

const LogoStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    line-height: 1;
`;

const SearchInputWrapper = styled.div`
    position: relative;
    width: 100%;
    max-width: 450px; /* Slightly wider */
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 10px 18px;
    padding-right: 40px;
    border: 1.5px solid var(--color-accent); /* Mint border by default */
    border-radius: 10px;
    background-color: rgba(34, 211, 238, 0.03); /* Subtle mint tint */
    color: var(--color-text-main);
    font-family: var(--font-en);
    font-size: 1rem;
    font-weight: 400;
    transition: all 0.2s ease;

    &:focus {
        outline: none;
        box-shadow: 0 0 15px rgba(34, 211, 238, 0.2);
        background-color: rgba(34, 211, 238, 0.06);
    }

    &::placeholder {
        color: var(--color-text-muted);
        opacity: 0.6;
    }
`;

const SearchIcon = styled.div`
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-muted);
    font-size: 0.9rem;
    opacity: 0.6;
`;

const Logo = styled(Link)`
    font-size: 1.8rem;
    font-weight: 600; /* Slightly thinner than 700 */
    color: var(--color-accent);
    font-family: var(--font-heading);
    letter-spacing: -0.02em;
    text-decoration: none;
    
    &:hover {
        filter: brightness(1.1);
    }
`;

const LogoTagline = styled.div`
    font-family: var(--font-en);
    color: var(--color-text-muted);
    font-size: 0.8rem;
    font-weight: 400; /* Slightly thinner than 500 */
    opacity: 0.8;
    letter-spacing: 0.08em;
`;

const NavMenu = styled.nav`
    display: flex;
    align-items: center;
    gap: 32px;

    a {
        color: var(--color-text-muted);
        font-size: 1rem;
        font-weight: 400; /* Slightly thinner than 500 */
        text-decoration: none;
        transition: all 0.2s;
        font-family: var(--font-en);
        
        &:hover {
            color: var(--color-accent);
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

        let ro;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(() => apply());
            ro.observe(el);
        } else {
            window.addEventListener('resize', apply);
        }

        return () => {
            if (ro) ro.disconnect();
            window.removeEventListener('resize', apply);
        };
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
                        <Link to="/power-rankings">Power Ranking</Link>
                        <Link to="/news">News</Link>
                        <Link to="/markets">Markets</Link>
                    </NavMenu>
                </NavContent>
            </div>
        </HeaderContainer>
    );
};

export default Header;
