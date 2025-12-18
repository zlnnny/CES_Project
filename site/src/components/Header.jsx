import React from 'react';
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
`;

const SearchInputWrapper = styled.div`
    position: relative;
    width: 100%;
    max-width: 500px;
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
        text-decoration: none;
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
    /* margin-left는 NavMenu에서 일괄 관리하므로 여기서 제거 */
    
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
    background-color: rgba(230, 241, 255, 0.9); /* 흰색 배경에 투명도 추가 */
    backdrop-filter: blur(5px); /* 배경 흐림 효과 */
    min-width: 140px;
    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
    z-index: 200;
    border-radius: 5px;
    top: 100%;
    left: 0;
    padding: 0.5rem 0;
    border: 1px solid rgba(255, 255, 255, 0.1); /* 경계선 살짝 추가 */

    a {
        color: var(--color-bg-main);
        padding: 10px 12px; /* 좌우 패딩을 16px -> 12px로 줄여서 여백 감소 */
        display: block;
        margin-left: 0;
        font-family: var(--font-ko);
        font-size: 0.9rem;
        text-align: left;
        white-space: nowrap;
        transition: background-color 0.2s;

        &:hover {
            background-color: rgba(255, 255, 255, 0.5); /* 호버 시 밝게 */
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
                    
                    <SearchContainer>
                        <SearchInputWrapper>
                            <SearchInput type="text" placeholder="Search leaders, policies, or assets..." />
                            <SearchIcon>
                                <FaSearch />
                            </SearchIcon>
                        </SearchInputWrapper>
                    </SearchContainer>

                    <NavMenu>
                        <Dropdown>
                            <DropdownBtn>Analysis</DropdownBtn>
                            <DropdownContent className="dropdown-content">
                                <Link to="/analysis/nlp">NLP 감성 분석</Link>
                                <Link to="/analysis/mapping">종목 자동 매핑</Link>
                                <Link to="/analysis/impact">영향력 시각화</Link>
                            </DropdownContent>
                        </Dropdown>
                        
                        <a href="#charts">Charts</a>
                    </NavMenu>
                </NavContent>
            </div>
        </HeaderContainer>
    );
};

export default Header;

