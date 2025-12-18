import React from 'react';
import styled from 'styled-components';

const HeroSection = styled.section`
    background-color: var(--color-bg-main);
    text-align: center;
    padding: 6rem 0;
    border-bottom: 1px solid var(--color-border);
`;

const Title = styled.h1`
    font-size: 4rem;
    font-style: italic;
    margin: 0 0 1rem 0;
    color: var(--color-text-main);
    font-family: var(--font-heading);
`;

const Subtitle = styled.p`
    font-size: 1.5rem;
    color: var(--color-text-muted);
    margin-bottom: 2.5rem;
    font-family: var(--font-ko);
`;

const SearchBar = styled.div`
    display: flex;
    justify-content: center;
    
    input {
        width: 50%;
        padding: 1rem;
        font-size: 1.1rem;
        font-family: var(--font-ko);
        border: 1px solid var(--color-border);
        border-radius: 5px 0 0 5px;
        background-color: var(--color-bg-card);
        color: var(--color-text-main);
        
        &::placeholder {
            color: var(--color-text-muted);
        }
    }
    
    button {
        padding: 1rem 2rem;
        font-size: 1.1rem;
        font-family: var(--font-ko);
        font-weight: bold;
        background-color: var(--color-accent);
        color: var(--color-bg-main);
        border: none;
        border-radius: 0 5px 5px 0;
        transition: opacity 0.3s;
        
        &:hover {
            opacity: 0.8;
        }
    }
`;

const Hero = () => {
    return (
        <HeroSection>
            <div className="container">
                <Title>"Words Move Markets."</Title>
                <Subtitle>리더의 발언이 시장을 어떻게 움직이는지 직관적으로 확인하세요.</Subtitle>
                <SearchBar>
                    <input type="text" placeholder="리더, 정책, 자산 검색 (예: Jerome Powell, AI Regulation, NASDAQ)" />
                    <button>분석</button>
                </SearchBar>
            </div>
        </HeroSection>
    );
};

export default Hero;

