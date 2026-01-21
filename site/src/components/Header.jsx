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
    backdrop-filter: blur(10px);
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
    padding-top: 8px; /* 검색바를 살짝 아래로 */
`;

const LogoStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    line-height: 1.1;
`;

const SearchStack = styled.div`
    width: 100%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const SearchInputWrapper = styled.div`
    position: relative;
    width: 100%;
    max-width: 500px;
`;

const Tagline = styled.div`
    font-family: var(--font-ko);
    color: var(--color-text-muted);
    font-size: 0.75rem; /* 문구 크기 더 작게 */
    line-height: 1.25;
    opacity: 0.7;
    padding-left: 8px;

    strong {
        font-family: var(--font-heading);
        color: var(--color-text-muted);
        font-weight: 500;
        margin-right: 6px;
    }
`;

const LogoTagline = styled.div`
    font-family: var(--font-heading);
    color: var(--color-text-muted);
    font-size: 0.85rem;
    letter-spacing: 0.2px;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 10px 15px;
    padding-right: 40px;
    border: 2px solid var(--color-accent);
    border-radius: 20px;
    background-color: rgba(10, 25, 47, 0.8);
    color: var(--color-text-main);
    font-family: var(--font-ko);
    font-size: 0.95rem;
    transition: all 0.3s ease;

    &:focus {
        outline: none;
        box-shadow: 0 0 10px rgba(100, 255, 218, 0.3);
        background-color: var(--color-bg-main);
    }

    &::placeholder {
        color: var(--color-text-muted);
        opacity: 0.7;
    }
`;

const SearchIcon = styled.div`
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-accent);
    cursor: pointer;
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

    /* 네비게이션 항목들 (Analysis, Power Ranking, Charts) 사이 간격 */
    & > * {
        margin-left: 20px; /* 간격 조정 (30px -> 20px) */
    }

    /* 첫 번째 항목은 왼쪽 마진 제거 */
    & > *:first-child {
        margin-left: 0;
    }

    a {
        color: var(--color-text-main);
        font-size: 1.1rem;
        font-weight: 800;
        text-decoration: none;
        transition: color 0.3s;
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
                        <Logo to="/">Market Voice</Logo>
                        <LogoTagline>Words Move Markets.</LogoTagline>
                    </LogoStack>
                    
                    <SearchContainer>
                        <SearchStack>
                            <SearchInputWrapper>
                                <SearchInput type="text" placeholder="Search leaders, policies, or assets..." />
                                <SearchIcon>
                                    <FaSearch />
                                </SearchIcon>
                            </SearchInputWrapper>
                            <Tagline>
                                <div><strong>How does speech move the markets?</strong></div>
                            </Tagline>
                        </SearchStack>
                    </SearchContainer>

                    <NavMenu>
                        <a href="#ranking">Power Ranking</a>
                        <Link to="/news">News</Link>
                        <a href="#charts">Charts</a>
                    </NavMenu>
                </NavContent>
            </div>
        </HeaderContainer>
    );
};

export default Header;

