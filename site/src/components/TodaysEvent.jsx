import React from 'react';
import styled from 'styled-components';

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;

    @media (max-width: 960px) {
        grid-template-columns: 1fr;
    }
`;

const Card = styled.article`
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    overflow: hidden;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 18px 40px rgba(0,0,0,0.35);
    }
`;

const Thumb = styled.div`
    width: 100%;
    height: 160px;
    background: linear-gradient(135deg, rgba(100,255,218,0.20), rgba(23,42,70,1));
    border-bottom: 1px solid var(--color-border);
`;

const Body = styled.div`
    padding: 16px 18px 18px 18px;
`;

const Title = styled.h4`
    margin: 0 0 8px 0;
    color: var(--color-text-main);
    font-family: var(--font-en);
    font-size: 1.05rem;
    line-height: 1.25;
`;

const Desc = styled.p`
    margin: 0;
    color: var(--color-text-muted);
    font-family: var(--font-ko);
    font-size: 0.95rem;
    line-height: 1.35;
`;

const TodaysEvent = () => {
    const items = [
        { title: 'Ukraine survives another crisis with Donald Trump', desc: 'A deal in Geneva salvages relations with America.' },
        { title: 'Ukraine survives another crisis with Donald Trump', desc: 'A deal in Geneva salvages relations with America.' },
        { title: 'Ukraine survives another crisis with Donald Trump', desc: 'A deal in Geneva salvages relations with America.' },
    ];

    return (
        <section id="news" className="container section-padding">
            <h2 className="section-title">Today’s event</h2>
            <Grid>
                {items.map((it, idx) => (
                    <Card key={`${it.title}-${idx}`}>
                        <Thumb aria-hidden="true" />
                        <Body>
                            <Title>{it.title}</Title>
                            <Desc>{it.desc}</Desc>
                        </Body>
                    </Card>
                ))}
            </Grid>
        </section>
    );
};

export default TodaysEvent;


